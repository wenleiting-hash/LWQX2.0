// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 辅助方法：确保集合存在
async function ensureCollection(collectionName) {
  try {
    await db.createCollection(collectionName);
    console.log(`集合 ${collectionName} 创建成功`);
  } catch (e) {
    // 如果集合已存在，或者没有权限建表，会走到这里（忽略即可）
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || (event.userInfo && event.userInfo.openId);

  if (!openid) {
    return { code: 401, msg: '未授权访问' };
  }

  const { action, payload } = event;

  try {
    switch (action) {
      case 'get_favorites':
        return await getFavorites(openid, payload);
      case 'add_favorite':
        return await addFavorite(openid, payload);
      case 'remove_favorite':
        return await removeFavorite(openid, payload);
      case 'sync_footprints':
        return await syncFootprints(openid, payload);
      case 'get_footprints':
        return await getFootprints(openid, payload);
      default:
        return { code: 400, msg: `未知动作指令: ${action}` };
    }
  } catch (err) {
    console.error(`[User Assets Error] ${action}:`, err);
    return { code: 500, msg: err.message || '内部服务错误' };
  }
};

async function getFavorites(openid, payload) {
  const { page = 1, pageSize = 20 } = payload;
  
  // 保证集合存在，不报错
  try {
    const totalRes = await db.collection('30_user_favorites').where({ openid }).count();
    const listRes = await db.collection('30_user_favorites').where({ openid })
      .orderBy('create_time', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
      
    return {
      code: 0,
      data: {
        list: listRes.data,
        total: totalRes.total
      }
    };
  } catch (e) {
    // 可能是集合不存在，返回空
    return { code: 0, data: { list: [], total: 0 } };
  }
}

async function addFavorite(openid, payload) {
  const { item } = payload;
  if (!item || (!item.id && !item.tao_id)) {
    return { code: 400, msg: '参数不完整' };
  }

  const itemId = item.id || item.tao_id;

  try {
    const exist = await db.collection('30_user_favorites').where({
      openid,
      'item.tao_id': itemId
    }).get();

    if (exist.data.length > 0) {
      return { code: 0, msg: '已收藏' };
    }

    await db.collection('30_user_favorites').add({
      data: {
        openid,
        item,
        create_time: db.serverDate()
      }
    });

    return { code: 0, msg: '收藏成功' };
  } catch (e) {
    // 如果提示集合不存在，则尝试自动建表并重新插入
    if (e.message && (e.message.includes('not exist') || e.message.includes('找不到'))) {
      await ensureCollection('30_user_favorites');
      await db.collection('30_user_favorites').add({
        data: {
          openid,
          item,
          create_time: db.serverDate()
        }
      });
      return { code: 0, msg: '收藏成功(并已自动建表)' };
    }
    return { code: 500, msg: '收藏失败，可能需要初始化数据库集合', error: e.message };
  }
}

async function removeFavorite(openid, payload) {
  const { itemId } = payload;
  
  try {
    await db.collection('30_user_favorites').where({
      openid,
      'item.tao_id': itemId
    }).remove();

    return { code: 0, msg: '取消收藏成功' };
  } catch (e) {
    return { code: 500, msg: '取消收藏失败' };
  }
}

async function syncFootprints(openid, payload) {
  const { footprints } = payload;
  if (!Array.isArray(footprints) || footprints.length === 0) {
    return { code: 0, msg: '无需同步' };
  }

  try {
    // 批量预取该用户已有足迹的 tao_id（避免 N+1 逐条查重）
    const existingIds = new Set();
    try {
      const existRes = await db.collection('30_user_footprints').where({ openid })
        .field({ 'item.id': true, 'item.tao_id': true })
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      existRes.data.forEach(d => {
        if (d.item) existingIds.add(String(d.item.id || d.item.tao_id));
      });
    } catch (e) {
      // 集合可能不存在，忽略
    }

    // 过滤出需要新增的足迹
    const newItems = [];
    for (const item of footprints) {
      const itemId = String(item.tao_id || item.id || '');
      if (!itemId || existingIds.has(itemId)) continue;

      newItems.push({
        openid,
        item: {
          id: itemId,
          tao_id: itemId,
          title: item.title,
          image: item.image_url || item.image || item.pict_url,
          price: item.price || item.coupon_price || item.zk_final_price,
          coupon_amount: item.coupon_amount || item.couponAmount || 0,
          platform: item.platform || 'taobao',
          timestamp: item.timestamp || item.viewTime || Date.now()
        },
        timestamp: item.timestamp || item.viewTime || Date.now(),
        create_time: db.serverDate()
      });
    }

    // 批量写入（微信云数据库单次 add 只能插1条，但我们避免了 N 次查重查询）
    if (newItems.length > 0) {
      const writePromises = newItems.map(data => 
        db.collection('30_user_footprints').add({ data }).catch(e => console.error('足迹写入失败:', e))
      );
      await Promise.all(writePromises);
    }

    return { code: 0, msg: `同步完成，新增 ${newItems.length} 条` };
  } catch (e) {
    if (e.message && (e.message.includes('not exist') || e.message.includes('找不到'))) {
      await ensureCollection('30_user_footprints');
      return { code: 0, msg: '已自动为您创建足迹集合，下次同步将生效' };
    }
    return { code: 500, msg: '同步失败', error: e.message };
  }
}

async function getFootprints(openid, payload) {
  const { page = 1, pageSize = 50 } = payload;
  
  try {
    const listRes = await db.collection('30_user_footprints').where({ openid })
      .orderBy('timestamp', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();
      
    return {
      code: 0,
      data: {
        list: listRes.data
      }
    };
  } catch (e) {
    return { code: 0, data: { list: [] } };
  }
}
