// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

/**
 * 更新或创建用户信息记录
 * event: { avatarUrl, nickName }
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;

  if (!openid) {
    return { success: false, msg: '获取 openid 失败' };
  }

  try {
    const { avatarUrl, nickName } = event;
    
    // 检查是否存在记录
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    
    if (userRes.data && userRes.data.length > 0) {
      // 更新现有记录
      await db.collection('users').doc(userRes.data[0]._id).update({
        data: {
          avatarUrl: avatarUrl || userRes.data[0].avatarUrl,
          nickName: nickName || userRes.data[0].nickName,
          updateTime: db.serverDate()
        }
      });
    } else {
      // 创建新记录
      await db.collection('users').add({
        data: {
          _openid: openid,
          openid: openid, // 兼容某些开发者手动创建的名为 idx_openid 且指向 openid 字段的唯一索引
          avatarUrl: avatarUrl || '',
          nickName: nickName || '',
          level: '普通会员',
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      });
    }

    return { success: true, msg: '用户信息同步成功' };
  } catch (err) {
    console.error('[同步异常]', err);
    return { success: false, msg: err.message || '内部错误' };
  }
};
