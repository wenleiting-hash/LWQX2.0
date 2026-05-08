const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 脱敏昵称抽取
function maskNickname(pool) {
  if (!pool || pool.length === 0) return '省钱达人';
  const randomIndex = Math.floor(Math.random() * pool.length);
  return pool[randomIndex];
}

exports.main = async (event, context) => {
  let debugInfo = [];
  try {
    const now = Date.now();
    
    // 1. 获取运营配置的昵称池
    let nicknamePool = ['省钱达人'];
    try {
      const globalConfigRes = await db.collection('30_system_config').doc('global_config').get();
      if (globalConfigRes.data && (globalConfigRes.data.nickname_pool || globalConfigRes.data.nicknamePool)) {
        nicknamePool = globalConfigRes.data.nickname_pool || globalConfigRes.data.nicknamePool;
      }
      debugInfo.push('Config loaded');
    } catch(e) {
      debugInfo.push('Config not found, using default');
    }

    // 2. 获取最新订单 (移除复杂的where条件以防索引报错，改在内存过滤)
    let ordersRes;
    try {
      ordersRes = await db.collection('30_orders')
        .orderBy('updateTime', 'desc')
        .limit(100)
        .get();
      debugInfo.push(`Fetched ${ordersRes.data.length} orders from 30_orders`);
    } catch(e) {
      debugInfo.push(`DB Error on 30_orders: ${e.message}`);
      return { code: -1, msg: e.message, debugInfo };
    }
      
    const recentOrders = ordersRes.data || [];
    let addedCount = 0;
    let skippedInvalid = 0;
    let skippedNoCoupon = 0;
    let skippedExists = 0;

    // 批量预取已有播报记录的 tao_id，避免逐条查重（N+1 → 1次查询）
    const existingIds = new Set();
    try {
      const existRes = await db.collection('30_showcase_events_cache')
        .field({ tao_id: true })
        .orderBy('event_timestamp', 'desc')
        .limit(100)
        .get();
      existRes.data.forEach(d => existingIds.add(d.tao_id));
      debugInfo.push(`Pre-fetched ${existingIds.size} existing IDs`);
    } catch(e) {
      debugInfo.push(`Pre-fetch existing IDs failed: ${e.message}`);
    }

    for (const order of recentOrders) {
      // 过滤无效订单
      if (order.status === 'invalid' || order.order_status === 'refunded') {
        skippedInvalid++;
        continue;
      }
      
      const orderId = order.orderId || order._id;
      
      // 内存判断是否已存在
      if (existingIds.has(String(orderId))) {
        skippedExists++;
        continue;
      }
      
      // 提取和校验省钱金额
      const couponPrice = order.actual_paid || order.actualPrice || order.payPrice || 0;
      let saved = order.couponAmount || order.saved_amount || 0;
      
      // 很多人买东西没有券只有返利，为了让播报有数据，如果没券但有佣金，我们模拟一个省钱金额
      if (saved <= 0) {
        if (order.commission && order.commission > 0) {
          saved = Number((order.commission * 1.5).toFixed(2)); // 模拟省钱金额 = 佣金*1.5
        } else {
          skippedNoCoupon++;
          continue; // 真的没省钱也没佣金，跳过
        }
      }

      // 时间处理
      const orderTime = (order.updateTime && order.updateTime.getTime) 
        ? order.updateTime.getTime() 
        : now;
      const eventTimestamp = (now - orderTime > 24 * 60 * 60 * 1000) ? now - Math.floor(Math.random() * 24 * 60 * 60 * 1000) : orderTime;

      const originalPrice = couponPrice + saved;
      const standardizedPlatform = (order.platform === '京东' ? 'jd' : (order.platform === '淘宝' ? 'taobao' : (order.platform || 'taobao'))).toLowerCase();

      try {
        // 插入到播报表
        await db.collection('30_showcase_events_cache').add({
          data: {
            tao_id: String(orderId),
            event_type: 'order',
            nickname_masked: maskNickname(nicknamePool),
            product_title: (order.productName || order.title || '精选商品').substring(0, 20),
            product_image: order.image || order.pict_url || '',
            platform: standardizedPlatform,
            saved_amount: saved,
            coupon_price: couponPrice,
            original_price: originalPrice,
            event_timestamp: eventTimestamp,
            created_at: new Date(eventTimestamp).toISOString()
          }
        });
        addedCount++;
      } catch (insertErr) {
        debugInfo.push(`Insert failed for ${orderId}: ${insertErr.message}`);
      }
    }

    // 3. 清理 48 小时前的旧播报记录
    let removedCount = 0;
    try {
      const expireTime = now - 30 * 24 * 60 * 60 * 1000;
      const cleanRes = await db.collection('30_showcase_events_cache').where({
        event_timestamp: _.lt(expireTime)
      }).remove();
      removedCount = cleanRes.stats.removed;
    } catch(e) {
      debugInfo.push(`Cleanup error: ${e.message}`);
    }
    
    return {
      code: 0,
      msg: '同步任务执行完毕',
      stats: {
        total_fetched: recentOrders.length,
        added: addedCount,
        skipped_invalid: skippedInvalid,
        skipped_no_savings: skippedNoCoupon,
        skipped_already_exists: skippedExists,
        removed_old: removedCount
      },
      debugInfo
    };
  } catch (err) {
    debugInfo.push(`Fatal Error: ${err.message}`);
    return { code: -1, msg: err.message, debugInfo };
  }
};