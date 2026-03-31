// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  try {
    const openid = wxContext.OPENID || (event.userInfo && event.userInfo.openId) || event.openid;
    if (!openid) {
      return { success: false, msg: '未获取到用户身份标识(OPENID)' };
    }

    // 1. 获取用户信息（验证是否已绑定档案）
    let userProfile = {};
    const userRes = await db.collection('users').where({ _openid: openid }).get();
    
    if (userRes.data && userRes.data.length > 0) {
      userProfile = {
        _id: userRes.data[0]._id,
        avatarUrl: userRes.data[0].avatarUrl || '',
        nickName: userRes.data[0].nickName || '',
        level: userRes.data[0].level || '普通会员'
      };
    } else {
      return { success: false, code: 'NOT_REGISTERED', msg: '未注册档案，请先授权登录' };
    }

    // 2. 统计订单资产
    // 限制最多拉取近期 1000 条订单进行求和（正常用户足够了）
    const MAX_LIMIT = 1000;
    const res = await db.collection('tk_orders')
      .where({
        _openid: openid,
        status: _.neq('invalid') // 排除取消/失效的订单
      })
      .limit(MAX_LIMIT)
      .get();

    let totalSaved = 0;
    let totalPoints = 0;
    
    res.data.forEach(order => {
      let fee = parseFloat(order.commission) || 0;
      totalSaved += fee;
      
      // 这里的积分规则：为防退款，积分将于确认收货后次月20日到账 (即状态为 settled)
      if (order.status === 'settled') {
        totalPoints += parseFloat(order.points) || 0;
      }
    });

    const availablePoints = Number(totalPoints.toFixed(2)); // 保留两位小数

    return {
      success: true,
      data: {
        totalSaved: totalSaved.toFixed(2),
        availablePoints: availablePoints,
        userInfo: userProfile // 将资料随统计一并下发
      },
      msg: 'success'
    };
  } catch (err) {
    console.error('[查库异常] 统计订单总省报错:', err);
    return {
      success: false,
      data: {
        totalSaved: '0.00',
        availablePoints: 0
      },
      msg: '查询统计记录失败'
    };
  }
};
