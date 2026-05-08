const cloud = require('wx-server-sdk');
const axios = require('axios');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 进程级配置缓存
const _configCache = {};
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedConfig(docId) {
  const now = Date.now();
  if (_configCache[docId] && (now - _configCache[docId].time) < CACHE_TTL) {
    return _configCache[docId].data;
  }
  const res = await db.collection('30_system_config').doc(docId).get().catch(() => ({ data: {} }));
  _configCache[docId] = { data: res.data, time: now };
  return res.data;
}

exports.main = async (event, context) => {
  const { tao_id, item_id, platform = 'taobao' } = event;
  const id = tao_id || item_id;
  
  if (!id) return { code: -1, message: '商品ID不能为空' };
  
  try {
    // 获取配置
    const configDoc = platform === 'jd' ? 'jd_config' : 'taobao_config';
    const config = await getCachedConfig(configDoc);
    
    let APP_KEY = platform === 'jd' ? (config.zjk_appkey || config.zhetaokeAppKey) : (config.ztk_appkey || config.zhetaokeAppKey);
    if (!APP_KEY) return { code: -1, message: '未配置APP_KEY' };
    
    let apiUrl = platform === 'jd' 
      ? 'http://api.zhetaoke.com:20000/api/api_detail.ashx'
      : 'https://api.zhetaoke.com:10002/api/api_detail.ashx';
      
    let params = platform === 'jd'
      ? { appkey: APP_KEY, tao_id: id }
      : { appkey: APP_KEY, sid: '', pid: '', tao_id: id };

    const res = await axios.get(apiUrl, {
      params: params,
      timeout: 5000
    });
    
    if (res.data && res.data.status === 200 && res.data.content && res.data.content.length > 0) {
      let item = res.data.content[0];
      // Map it to standardized format
      return {
        code: 0,
        data: {
          tao_id: item.tao_id || item.item_id || item.skuId,
          title: item.title || item.item_title || item.skuName,
          image_url: item.pict_url || item.item_pic || item.whiteImage,
          images: item.small_images ? item.small_images.split('|') : [item.pict_url || item.item_pic || item.whiteImage],
          original_price: parseFloat(item.size || item.zk_final_price || item.reserve_price || item.priceInfo?.price || 0),
          coupon_price: parseFloat(item.quanhou_jiage || item.priceInfo?.lowestPrice || 0) || (parseFloat(item.size || item.zk_final_price || item.reserve_price || item.priceInfo?.price || 0) - parseFloat(item.coupon_info_money || item.coupon_amount || item.discount || 0)),
          coupon_amount: parseFloat(item.coupon_info_money || item.coupon_amount || item.discount || 0),
          sales_num: parseInt(item.volume || item.sellCount || item.inOrderCount30Days || 0),
          shop_name: item.shop_title || item.shop_name || item.shopInfo?.shopName || '',
          content: item.item_description || '',
          platform: platform
        }
      };
    }
    
    return { code: -3, message: '找不到该商品详情' };
  } catch(e) {
    return { code: -1, message: '详情获取失败: ' + e.message };
  }
};
