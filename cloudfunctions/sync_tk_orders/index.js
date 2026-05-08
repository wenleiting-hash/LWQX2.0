const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 获取 YYYY-MM-DD HH:mm:ss 格式的北京时间字符串
function getBeijingTimeStr(date) {
  // NodeJS 云函数默认 UTC零时区，加 8 小时转北京时间给淘宝去识别
  const bjDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${bjDate.getUTCFullYear()}-${pad(bjDate.getUTCMonth() + 1)}-${pad(bjDate.getUTCDate())} ${pad(bjDate.getUTCHours())}:${pad(bjDate.getUTCMinutes())}:${pad(bjDate.getUTCSeconds())}`;
}

exports.main = async (event, context) => {
  const startTime = new Date();
  let logId = '';
  
  // 1. 记录任务开始状态
  try {
    const logRes = await db.collection('30_task_logs').add({
      data: {
        taskId: 'sync_tk_orders',
        taskName: '同步折淘客后台订单',
        taskType: '订单同步',
        status: 'running',
        startTime: db.serverDate(),
        triggerSource: event.triggerSource || 'cron',
        createTime: db.serverDate()
      }
    });
    logId = logRes._id;
  } catch (e) {
    console.error('[日志] 创建初始日志失败:', e);
  }

  try {
    // 0. 优先从数据库读取折淘客全局配置
    const configRes = await db.collection('30_system_config').doc('taobao_config').get().catch(() => ({ data: {} }));
    const config = configRes.data || {};

    // 检查前端配置的任务开关
    if (config.taskEnabled === false && event.triggerSource !== 'manual') {
      console.log('任务已在后台关闭，本次跳过执行');
      await db.collection('30_task_logs').doc(logId).update({
        data: { status: 'skipped', duration: Date.now() - startTime.getTime(), endTime: db.serverDate(), errorMsg: '任务已被手动停止' }
      });
      return { code: 0, msg: '任务已被停止，跳过执行' };
    }

    const APP_KEY = config.ztk_appkey || config.zhetaokeAppKey || process.env.ZHETAOKE_APP_KEY;
    const SID = config.ztk_sid || config.zhetaokeSid || process.env.ZHETAOKE_SID;   

    if (!APP_KEY || !SID) {
      throw new Error('未配置折淘客 AppKey 或 SID');
    }

    // 1. 计算时间跨度
    let end_time = new Date(); 
    let start_time = new Date(end_time.getTime() - 120 * 60 * 1000);

    // [手动补单逻辑] 如果传入了起止时间，则优先使用传入的时间
    if (event.startTime && event.endTime) {
      start_time = new Date(event.startTime);
      end_time = new Date(event.endTime);
      console.log(`[手动补单] 使用自定义时间范围: ${event.startTime} - ${event.endTime}`);
    }

    // 2. 获取积分规则
    const activeRuleRes = await db.collection('points_rules').where({ status: 'active' }).limit(1).get().catch(() => ({ data: [] }));
    const activeRule = activeRuleRes.data[0] || { exchangeRate: 100, ruleName: "系统默认" };
    const exchangeRate = activeRule.exchangeRate || 100;

    const apiUrl = config.apiUrl || 'https://api.zhetaoke.com:10001/api/open_dingdanchaxun2.ashx';
    const params = {
      appkey: APP_KEY,
      sid: SID,
      signurl: 1,
      start_time: getBeijingTimeStr(start_time),
      end_time: getBeijingTimeStr(end_time),
      page: 1,
      page_size: 100,
      query_type: 4
    };
    
    console.log("[淘宝订单查询参数]:", params);
    const response = await axios.get(apiUrl, {
      params,
      timeout: 15000,
    });

    const resData = response.data;
    let successCount = 0;
    let stats = { total: 0, valid: 0, settled: 0, invalid: 0 };
    
    if (resData && resData.tbk_sc_order_details_get_response && resData.tbk_sc_order_details_get_response.data) {
      let resultsObj = resData.tbk_sc_order_details_get_response.data.results;
      let orderArray = resultsObj ? resultsObj.publisher_order_dto : [];
      if (!orderArray) orderArray = [];
      if (!Array.isArray(orderArray)) orderArray = [orderArray];

      const _ = db.command;

      // --- 【性能优化】批量预取本地订单，消除 N+1 查询 ---
      const orderIds = orderArray.map(item => String(item.trade_parent_id || item.trade_id || '')).filter(Boolean);
      const localOrdersMap = {};
      if (orderIds.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < orderIds.length; i += batchSize) {
          const batchIds = orderIds.slice(i, i + batchSize);
          try {
            const res = await db.collection('30_orders').where({ _id: _.in(batchIds) }).get();
            res.data.forEach(order => {
              localOrdersMap[order._id] = order;
            });
          } catch(e) {
            console.error('[同步引擎] 批量查询本地订单异常:', e);
          }
        }
      }

      // --- 【性能优化】批量预取足迹，消除 N+1 查询 ---
      const footprintItemIds = orderArray.filter(item => {
        let openid = item.special_id || item.external_id || "";
        return !openid && String(item.num_iid || item.item_id || item.tao_id || "");
      }).map(item => String(item.num_iid || item.item_id || item.tao_id || ""));
      
      const footprintMap = {};
      if (footprintItemIds.length > 0) {
        let minTime = Date.now();
        orderArray.forEach(item => {
           const tkTime = item.tk_create_time || item.create_time;
           if (tkTime) {
             const t = new Date(tkTime).getTime();
             if (t < minTime) minTime = t;
           }
        });
        const lookBackTime = new Date(minTime - 12 * 60 * 60 * 1000);
        
        const batchSize = 100;
        for (let i = 0; i < footprintItemIds.length; i += batchSize) {
          const batchIds = footprintItemIds.slice(i, i + batchSize);
          try {
            const res = await db.collection('tk_footprints').where({
              itemId: _.in(batchIds),
              createTime: _.gte(lookBackTime)
            }).orderBy('createTime', 'desc').limit(500).get();
            
            res.data.forEach(fp => {
              if (!footprintMap[fp.itemId]) {
                 footprintMap[fp.itemId] = fp._openid; // 保留最近的记录
              }
            });
          } catch(e) {
             console.error('[同步引擎] 批量查询足迹异常:', e);
          }
        }
      }

      const writePromises = [];

      for (let item of orderArray) {
        const orderNo = item.trade_parent_id || item.trade_id || '';
        if (!orderNo) continue;

        let statusCode = String(item.tk_status);
        let sType = 'all', sText = '未知';
        switch (statusCode) {
          case '12': sType = 'pending'; sText = '待结算'; break;
          case '3':
          case '14': sType = 'settled'; sText = '已入账'; break;
          case '13': sType = 'invalid'; sText = '已失效'; break;
        }

        // 使用内存中的预取数据进行终态过滤
        const localOrder = localOrdersMap[String(orderNo)];
        if (localOrder) {
           const localStat = localOrder.status;
           if (localStat === 'settled' || localStat === 'invalid') {
              continue; 
           }
        }

        const tkTime = item.tk_create_time || item.create_time || '';
        let serialNo = tkTime ? (tkTime.replace(/[- :]/g, '').substring(0, 12) + String(orderNo).slice(-4)) : ('SN' + orderNo);

        const originalPrice = parseFloat(item.item_price || item.zk_final_price || 0);
        const actualPrice = parseFloat(item.alipay_total_price || 0);
        const commission = parseFloat(item.pub_share_pre_fee || 0);
        const points = Number((commission * exchangeRate).toFixed(2));

        let alreadyMappedOpenid = item.special_id || item.external_id || "";
        
        // 🌟 [智能追单补丁] 如果没能带回身份参数，从内存映射中查找足迹绑定
        if (!alreadyMappedOpenid) {
            const rawItemId = String(item.num_iid || item.item_id || item.tao_id || "");
            if (rawItemId && footprintMap[rawItemId]) {
                alreadyMappedOpenid = footprintMap[rawItemId];
                console.log(`[智能追单成功] 借由足迹成功找回订单主人: ${alreadyMappedOpenid}, 订单号: ${orderNo}`);
            }
        }

        const docData = {
          orderId: String(orderNo),
          serialNo: serialNo,
          platform: "淘宝",
          productName: item.item_title || '精选商品',
          title: item.item_title || '精选商品',
          image: item.pict_url || item.item_pic || "", 
          originalPrice, actualPrice,
          couponAmount: Math.max(0, Number((originalPrice - actualPrice).toFixed(2))),
          orderAmount: actualPrice,
          commission, points,
          status: sType, statusText: sText,
          _openid: alreadyMappedOpenid, 
          pointsRule: activeRule.ruleName, 
          createTime: tkTime,
          updateTime: db.serverDate(),
          tk_status: item.tk_status
        };

        // 加入批量写入队列
        writePromises.push(db.collection('30_orders').doc(String(orderNo)).set({ data: docData }).catch(err => console.error("Write error:", err)));
        
        successCount++;
        stats.total++;
        if (sType === 'pending' || sType === 'settled') stats.valid++;
        if (sType === 'settled') stats.settled++;
        if (sType === 'invalid') stats.invalid++;
      }

      // --- 并发执行写入任务 ---
      if (writePromises.length > 0) {
        await Promise.all(writePromises);
      }
    }

    // 3. 聚合当日统计数据到 daily_stats
    await updateDailyStats();

    // 4. 更新日志为成功
    if (logId) {
      const endTime = new Date();
      await db.collection('30_task_logs').doc(logId).update({
        data: {
          status: 'success',
          endTime: db.serverDate(),
          duration: endTime.getTime() - startTime.getTime(),
          results: stats
        }
      });
    }

    return { success: true, synced: successCount };

  } catch (error) {
    console.error(`[同步引擎] 异常:`, error);
    if (logId) {
      const endTime = new Date();
      await db.collection('30_task_logs').doc(logId).update({
        data: {
          status: 'failed',
          endTime: db.serverDate(),
          duration: endTime.getTime() - startTime.getTime(),
          errorMessage: error.message
        }
      });
    }
    return { success: false, error: error.message };
  }
};

/**
 * 聚合当日统计数据到 daily_stats 集合
 * 为财务大盘提供趋势图数据源
 */
async function updateDailyStats() {
  try {
    const _ = db.command;
    const now = new Date();
    // 云函数 UTC 时间，加 8 小时转北京时间
    const bjNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
    const todayStr = `${bjNow.getUTCFullYear()}-${String(bjNow.getUTCMonth() + 1).padStart(2, '0')}-${String(bjNow.getUTCDate()).padStart(2, '0')}`;
    
    console.log(`[统计聚合] 正在计算当日 (${todayStr}) 汇总数据...`);

    // 获取当日所有非失效订单
    const res = await db.collection('30_orders')
      .where({
        createTime: _.gte(todayStr),
        status: _.neq('invalid'),
        platform: '淘宝'
      })
      .limit(1000)
      .get();
    
    const orders = res.data || [];
    const totalAmount = orders.reduce((acc, cur) => acc + (cur.commission || 0), 0);
    const orderCount = orders.length;

    // 更新或创建当日统计记录
    await db.collection('30_daily_stats').doc(todayStr).set({
      data: {
        amount: parseFloat(totalAmount.toFixed(2)),
        count: orderCount,
        date: todayStr,
        updateTime: db.serverDate()
      }
    });
    
    console.log(`[统计聚合] 成功更新日计表: 佣金 ￥${totalAmount.toFixed(2)}, 订单 ${orderCount}`);
  } catch (e) {
    console.error('[统计聚合] 失败:', e);
  }
}

