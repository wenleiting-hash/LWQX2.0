const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// 回收过期超时积分：每天晚上同步过期超时的积分。不支持后台配置（硬编码策略）
exports.main = async (event, context) => {
  console.log('开始执行过期积分回收任务...');
  
  // 策略：假设超过 180 天的未结算订单或者冻结积分标记为失效
  // 此处根据业务，回收 tk_orders 中过久的待结算订单
  const expireDate = new Date();
  expireDate.setDate(expireDate.getDate() - 180); // 180天超时
  
  const pad = (n) => (n < 10 ? '0' + n : n);
  const timeStr = `${expireDate.getUTCFullYear()}-${pad(expireDate.getUTCMonth() + 1)}-${pad(expireDate.getUTCDate())}`;

  try {
    const res = await db.collection('tk_orders').where({
      status: 'pending',
      createTime: _.lt(timeStr)
    }).update({
      data: {
        status: 'invalid',
        statusText: '已失效(超时回收)',
        updateTime: db.serverDate()
      }
    });

    console.log('回收超时积分完成，影响行数：', res.stats.updated);
    return { success: true, updated: res.stats.updated };
  } catch(e) {
    console.error('回收失败', e);
    return { success: false, error: e };
  }
};
