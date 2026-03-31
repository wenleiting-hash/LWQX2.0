const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || (event.userInfo && event.userInfo.openId) || event.openid;

  if (!openid) {
    return { success: false, msg: '未获取到用户身份标识' };
  }

  const { orderNo } = event;
  
  if (!orderNo || String(orderNo).trim() === '') {
    return { success: false, msg: '淘宝订单号不能为空' };
  }
  
  const targetNo = String(orderNo).trim();

  try {
    // 1. 查找是否存在该订单，匹配规则：前台传来的可能是完整单号也可能是后6位。
    // 但是这里推荐严谨匹配完整单号，或者截断匹配。淘宝订单通常是18位数字。
    // 我们可以用正在表达式或者精确匹配 orderId 或者 _id
    let queryCondition = [];
    if (targetNo.length >= 6) {
       // 如果用户属于完整单号
       queryCondition.push({ _id: targetNo });
       queryCondition.push({ orderId: targetNo });
       
       // 为了体验增强，即使输入后6位也能支持 (尾号匹配)
       queryCondition.push({ 
           orderId: db.RegExp({
              regexp: targetNo + '$',
              options: 'i',
           }) 
       });
    } else {
        return { success: false, msg: '单号过短，请至少提供6位及以上单号' };
    }

    const res = await db.collection('tk_orders').where(
      _.or(queryCondition)
    ).get();

    if (!res.data || res.data.length === 0) {
      return { 
        success: false, 
        msg: '未查找到该订单。平台同步可能有10-20分钟延迟，请稍后再试。' 
      };
    }

    const matchedOrder = res.data[0]; // 理论上应该只有一个
    
    // 2. 核心拦截规则：如果该记录 _openid 已存在且不等于当前用户，则驳回
    if (matchedOrder._openid && matchedOrder._openid.trim() !== '') {
        if (matchedOrder._openid === openid) {
            return { success: true, msg: '该订单本来就在您的名下，无需重复认领', alreadyOwned: true };
        } else {
            return { success: false, msg: '认领失败：该订单已被其他用户绑定' };
        }
    }

    // 3. 符合条件：_openid 为空，执行认领
    await db.collection('tk_orders').doc(matchedOrder._id).update({
      data: {
        _openid: openid,
        updateTime: db.serverDate(),
        claimMethod: 'manual_claim' // 打个手动认领的日志 Tag
      }
    });

    return {
      success: true,
      data: matchedOrder,
      msg: '订单找回成功！已划入您的资产中'
    };

  } catch (err) {
    console.error('[认领异常]', err);
    return { success: false, msg: '系统繁忙，找回失败请重试' };
  }
};
