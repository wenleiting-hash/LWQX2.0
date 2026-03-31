const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

exports.main = async (event, context) => {
  try {
    // 1. 扫描 tk_orders 集合中所有字段不对齐的记录
    // 判定依据：没有 actualPrice 或者没有 image 字段的，说明是旧版结构
    const res = await db.collection('tk_orders').where(
      _.or([
        { actualPrice: _.exists(false) },
        { image: _.exists(false) },
        { productName: _.exists(false) }
      ])
    ).limit(100).get();

    if (!res.data || res.data.length === 0) {
      return { success: true, msg: '没有发现需要修复的旧数据', count: 0 };
    }

  let count = 0;
  for (let item of res.data) {
    const updateData = {};
    
    // 对齐字段：把旧字段的值搬运或计算到新字段
    if (item.orderAmount && !item.actualPrice) updateData.actualPrice = parseFloat(item.orderAmount);
    if (item.originalPrice && !item.orderAmount) updateData.orderAmount = parseFloat(item.orderAmount || item.actualPrice || 0);
    if (item.saved && !item.couponAmount) updateData.couponAmount = parseFloat(item.saved);
    if (item.title && !item.productName) updateData.productName = item.title;
    if (!item.platform) updateData.platform = "淘宝";
    
    // 补齐图片（由于旧数据库里可能已经有 image 字段或者 pict_url，我们做个兼容）
    if (!item.image && item.pict_url) updateData.image = item.pict_url;
    
    // 如果没有 serialNo，基于 orderId 补一个
    if (!item.serialNo) updateData.serialNo = String(item.orderNo || item.orderId || "");

    if (Object.keys(updateData).length > 0) {
      await db.collection('tk_orders').doc(item._id).update({
        data: updateData
      });
      count++;
    }
  }

  return { 
    success: true, 
    msg: `成功修复并对齐了 ${count} 条订单数据字段`,
    count: count
  };

  } catch (err) {
    console.error('[数据对齐脚本] 报错:', err);
    return { success: false, msg: err.message };
  }
};
