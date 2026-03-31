const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { page = 1, page_size = 20, status = 'all' } = event;

  try {
    // 构建基于前端状态字的数据库查询实体
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || (event.userInfo && event.userInfo.openId) || event.openid;

    if (!openid) {
      return { success: false, msg: '未获取到用户身份标识(OPENID)' };
    }

    // 检查是否受权注册过
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    if (!userRes.data || userRes.data.length === 0) {
      return { success: false, code: 'NOT_REGISTERED', msg: '未绑定用户档案，请先授权登录' };
    }
    let queryArgs = {
      _openid: openid
    };

    if (status !== 'all') {
      queryArgs.status = status;
    }

    // 经典的分页倒序拉库操作，稳得一塌糊涂
    const res = await db.collection('tk_orders')
      .where(queryArgs)
      .orderBy('createTime', 'desc') // 根据落单时间来降幂显示
      .skip((page - 1) * page_size)
      .limit(page_size)
      .get();

    return {
      success: true,
      data: res.data,
      msg: 'success'
    };
  } catch (err) {
    console.error('[查库异常] 前端云函数连库翻车:', err);
    return {
      success: false,
      msg: '查询订单记录失败，请检查数据库读权限'
    };
  }
};