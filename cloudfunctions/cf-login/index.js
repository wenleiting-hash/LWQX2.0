// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }); // 使用当前云环境
const db = cloud.database();
const _ = db.command;

async function ensureCollection(collectionName) {
  try {
    await db.createCollection(collectionName);
    console.log(`集合 ${collectionName} 创建成功`);
  } catch (e) {
    // 忽略
  }
}

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || (event.userInfo && event.userInfo.openId);
  const unionid = wxContext.UNIONID;
  
  if (!openid) {
      return { code: -1, message: '获取openid失败' };
  }
  
  try {
    // 检查是否是新用户
    const memberRes = await db.collection('30_members').where({
      openid: openid
    }).get();
    
    let isNewUser = false;
    
    if (memberRes.data.length === 0) {
      isNewUser = true;
      // 自动注册
      await db.collection('30_members').add({
        data: {
          openid: openid,
          unionid: unionid || '',
          avatarUrl: '',
          nickName: '微信用户',
          points: 0,
          role: 'user',
          created_at: db.serverDate(),
          updated_at: db.serverDate(),
          last_login_at: db.serverDate()
        }
      });
    } else {
      // 更新最后登录时间
      await db.collection('30_members').where({
        openid: openid
      }).update({
        data: {
          last_login_at: db.serverDate()
        }
      });
    }
    
    // 记录登录日志
    await db.collection('30_login_logs').add({
      data: {
        openid: openid,
        login_time: db.serverDate(),
        client_ip: wxContext.CLIENTIP || '',
        client_ipv6: wxContext.CLIENTIPV6 || ''
      }
    });
    
    return {
      code: 0,
      data: {
        openid: openid,
        isNewUser: isNewUser
      }
    };
  } catch (err) {
    // 如果提示集合不存在，尝试自动建表
    if (err.message && (err.message.includes('not exist') || err.message.includes('找不到'))) {
      await ensureCollection('30_members');
      await ensureCollection('30_login_logs');
      return { code: -1, message: '集合初始化完成，请重试' };
    }
    console.error('登录逻辑异常:', err);
    return {
      code: -1,
      message: '登录逻辑异常'
    };
  }
}