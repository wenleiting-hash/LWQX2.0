const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 获取 YYYY-MM-DD HH:mm:ss 格式的北京时间字符串
function getBeijingTimeStr(date) {
  // NodeJS 云函数默认UTC零时区，加8小时转北京时间
  const bjDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
  const pad = (n) => (n < 10 ? '0' + n : n);
  return `${bjDate.getUTCFullYear()}-${pad(bjDate.getUTCMonth() + 1)}-${pad(bjDate.getUTCDate())} ${pad(bjDate.getUTCHours())}:${pad(bjDate.getUTCMinutes())}:${pad(bjDate.getUTCSeconds())}`;
}

exports.main = async (event, context) => {
  const startTimeObj = new Date();
  let logId = '';
  
    // 1. 记录任务开始状态
  try {
    const logRes = await db.collection('30_task_logs').add({
      data: {
        taskId: 'sync_jd_orders',
        taskName: '同步折京客后台订单',
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
    // 0. 从数据库读取全局配置
    const configRes = await db.collection('30_system_config').doc('jd_config').get().catch(() => ({ data: {} }));
    const config = configRes.data || {};

    // 检查前端配置的任务开关
    if (config.taskEnabled === false && event.triggerSource !== 'manual') {
      console.log('任务已在后台关闭，本次跳过执行');
      await db.collection('30_task_logs').doc(logId).update({
        data: { status: 'skipped', duration: Date.now() - startTimeObj.getTime(), endTime: db.serverDate(), errorMsg: '任务已被手动停止' }
      });
      return { code: 0, msg: '任务已被停止，跳过执行' };
    }

    const ZJK_APP_KEY = config.zjk_appkey;
    const JD_APP_KEY = config.jd_appkey || config.jdAppKey || config.JD_APPKEY;
    const JD_APP_SECRET = config.jd_appsecret || config.jd_app_secret || '';

    if (!ZJK_APP_KEY) {
      throw new Error('未配置折淘客 ZJK_APP_KEY');
    }

    // 1. 计算时间跨度 (最近 59 分钟)
    let end_time = new Date(); 
    let start_time = new Date(end_time.getTime() - 59 * 60 * 1000);

    if (event.startTime && event.endTime) {
      start_time = new Date(event.startTime);
      end_time = new Date(event.endTime);
      console.log(`[手动补单] 使用自定义时间范围: ${event.startTime} - ${event.endTime}`);
    }

    const apiUrl = config.apiUrl || 'http://api.zhetaoke.com:20000/api/open_jing_union_openz_order_row_query.ashx';
    
    // 兼容JD官方参数驼峰命名和折淘客下划线命名
    const params = {
      appkey: ZJK_APP_KEY,
      jd_app_key: JD_APP_KEY || '',
      jd_app_secret: JD_APP_SECRET || '',
      startTime: getBeijingTimeStr(start_time),
      endTime: getBeijingTimeStr(end_time),
      pageIndex: 1,
      pageSize: 100,
      type: 3
    };

    console.log("[京东订单查询参数]:", params);
    const response = await axios.get(apiUrl, { params, timeout: 20000 });
    const resData = response.data;
    let successCount = 0;
    let stats = { total: 0, valid: 0, settled: 0, invalid: 0 };
    
    // 根据京东官方/折淘客的响应结构解析数据
    let orderArray = [];
    if (resData && resData.jd_union_open_order_row_query_response) {
      const resultStr = resData.jd_union_open_order_row_query_response.result;
      if (resultStr) {
        const resultObj = typeof resultStr === 'string' ? JSON.parse(resultStr) : resultStr;
        orderArray = resultObj.data || [];
      }
    } else if (resData && resData.data) {
      // 兼容可能被折淘客简化的格式
      orderArray = Array.isArray(resData.data) ? resData.data : [];
    }

    if (!Array.isArray(orderArray)) orderArray = [orderArray];

    const _ = db.command;

    // --- 【性能优化】批量预取本地订单，消除 N+1 查询 ---
    const orderIds = orderArray.map(item => String(item.orderId || item.trade_id || '')).filter(Boolean);
    const localOrdersMap = {};
    if (orderIds.length > 0) {
      // 拆分以防单次 in 超过限制
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

    const writePromises = [];

    for (let item of orderArray) {
      const orderNo = item.orderId || item.trade_id || '';
      if (!orderNo) continue;

      let statusCode = String(item.validCode); // 15=待结算 16=已结算 17=已失效
      let sType = 'all', sText = '未知';
      switch (statusCode) {
        case '15': sType = 'pending'; sText = '待结算'; break;
        case '16':
        case '18': sType = 'settled'; sText = '已入账'; break;
        case '17': 
        case '19': sType = 'invalid'; sText = '已失效'; break;
        default: sType = 'pending'; sText = '待结算'; break;
      }

      // 使用内存中的预取数据进行终态过滤
      const localOrder = localOrdersMap[String(orderNo)];
      if (localOrder) {
         const localStat = localOrder.status;
         if (localStat === 'settled' || localStat === 'invalid') {
            continue; 
         }
      }

      const jdTime = item.orderTime || item.modifyTime || '';
      let serialNo = jdTime ? (jdTime.replace(/[- :]/g, '').substring(0, 12) + String(orderNo).slice(-4)) : ('SN' + orderNo);

      const actualPrice = parseFloat(item.estimateCosPrice || item.actualCosPrice || item.price || 0);
      const commission = parseFloat(item.estimateFee || item.actualFee || 0);

      // 寻找可用的 openId，若官方 API 未提供则留空或利用 subUnionId
      let openId = item.subUnionId || item.positionId || "";

      const docData = {
        orderId: String(orderNo),
        serialNo: serialNo,
        platform: "京东",
        productName: item.skuName || '京东精选商品',
        title: item.skuName || '京东精选商品',
        image: item.imageUrl || "", 
        actualPrice,
        orderAmount: actualPrice,
        commission, 
        status: sType, 
        statusText: sText,
        _openid: openId, 
        createTime: jdTime,
        updateTime: db.serverDate(),
        tk_status: item.validCode
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

    // 4. 更新日志为成功
    if (logId) {
      const taskEndTime = new Date();
      await db.collection('30_task_logs').doc(logId).update({
        data: {
          status: 'success',
          endTime: db.serverDate(),
          duration: taskEndTime.getTime() - startTimeObj.getTime(),
          results: stats
        }
      });
    }

    return { success: true, synced: successCount };

  } catch (error) {
    console.error(`[同步引擎] 异常:`, error);
    if (logId) {
      const taskEndTime = new Date();
      await db.collection('30_task_logs').doc(logId).update({
        data: {
          status: 'failed',
          endTime: db.serverDate(),
          duration: taskEndTime.getTime() - startTimeObj.getTime(),
          errorMessage: error.message
        }
      });
    }
    return { success: false, error: error.message };
  }
};
