const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const { page = 1, pageSize = 20 } = event;
  
  try {
    const skip = (page - 1) * pageSize;
    // 1. 获取总数 (从独立播报表获取)
    let total = 0;
    try {
      const countRes = await db.collection('30_showcase_events_cache').count();
      total = countRes.total;
    } catch(e) {
      console.error('Count error:', e);
    }
    
    // 2. 分页获取展示列表
    let items = [];
    try {
      const res = await db.collection('30_showcase_events_cache')
        .orderBy('event_timestamp', 'desc')
        .skip(skip)
        .limit(pageSize)
        .get();
        
      items = res.data.map(item => {
        return {
          _id: item._id,
          created_at: item.created_at || new Date(item.event_timestamp).toISOString(),
          title: item.product_title || '优选商品',
          image_url: item.product_image || '',
          platform: item.platform === '京东' || item.platform === 'jd' ? 'jd' : 'taobao',
          coupon_amount: item.saved_amount || item.coupon_amount || 0,
          coupon_price: item.coupon_price || 0,
          original_price: item.original_price || 0,
          tao_id: item.tao_id || item.orderId || '',
          nickname: item.nickname_masked || item.nickname || '省钱达人'
        };
      });
    } catch(e) {
      console.error('Query error:', e);
    }
    
    // 3. 获取今日大盘统计数据 (从 30_daily_stats)
    let dailyStats = { amount: 0, count: 0 };
    try {
      const now = new Date();
      // 转换为北京时间
      const bjNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
      const todayStr = `${bjNow.getUTCFullYear()}-${String(bjNow.getUTCMonth() + 1).padStart(2, '0')}-${String(bjNow.getUTCDate()).padStart(2, '0')}`;
      
      const statsRes = await db.collection('30_daily_stats').doc(todayStr).get();
      if (statsRes.data) {
        dailyStats = {
          amount: statsRes.data.amount || 0,
          count: statsRes.data.count || 0
        };
      }
    } catch(e) {
      // 找不到记录是正常的（比如当天还没有订单）
      console.log('今日尚无统计记录');
    }
    
    return {
      code: 0,
      data: {
        items: items,
        newCount: 0,
        dailyStats: dailyStats,
        hasMore: (skip + items.length) < total
      }
    };
  } catch (err) {
    console.error('Overall error:', err);
    return { code: -1, message: err.message };
  }
};