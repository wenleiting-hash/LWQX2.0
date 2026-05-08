// 共享的商品数据映射函数
// 将折淘客/京东联盟 API 返回的原始数据映射为统一的 Item 结构
// 被 cf-coupon-search、cf-feed-data、cf-product-detail 共同引用

function mapToItem(item, platformStr) {
  const original_price = parseFloat(item.size || item.zk_final_price || item.reserve_price || item.priceInfo?.price || 0);
  const coupon_amount = parseFloat(item.coupon_info_money || item.coupon_amount || item.discount || item.couponInfo?.couponList?.[0]?.discount || 0);
  
  // 尽量优先读取折淘客的 quanhou_jiage，否则自己算
  let coupon_price = parseFloat(item.quanhou_jiage || item.priceInfo?.lowestPrice || 0);
  if (coupon_price === 0) {
    coupon_price = original_price - coupon_amount;
  }
  // 防止负数
  if (coupon_price < 0) coupon_price = 0;

  return {
    tao_id: String(item.tao_id || item.item_id || item.num_iid || item.skuId || ''),
    title: item.title || item.item_title || item.skuName || '',
    image_url: item.pict_url || item.item_pic || item.whiteImage || item.imageInfo?.imageList?.[0]?.url || '',
    original_price: original_price,
    coupon_amount: coupon_amount,
    coupon_price: coupon_price,
    platform: platformStr,
    shop_name: item.shop_title || item.shop_name || item.shopInfo?.shopName || '',
    sales_num: parseInt(item.volume || item.sellCount || item.inOrderCount30Days || 0)
  }
}

module.exports = { mapToItem };
