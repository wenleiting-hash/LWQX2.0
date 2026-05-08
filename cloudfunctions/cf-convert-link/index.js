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
  const { tao_id, item_id, title, platform = 'taobao', jd_url, is_search = false } = event;
  const id = tao_id || item_id;
  
  if (platform === 'taobao' && !id) return { code: -1, message: '淘宝商品ID不能为空' };
  
  try {
    const configDoc = platform === 'jd' ? 'jd_config' : 'taobao_config';
    const config = await getCachedConfig(configDoc);
    
    let APP_KEY = platform === 'jd' ? (config.zjk_appkey || config.zhetaokeAppKey) : (config.ztk_appkey || config.zhetaokeAppKey);
    let sid = config.ztk_sid || config.sid || config.zhetaokeSid || '';
    
    if (!APP_KEY) return { code: -1, message: '未配置APP_KEY' };
    
    if (platform === 'jd') {
      // 京东转链
      const jdParams = {
        appkey: APP_KEY,
        materialId: id || jd_url,
        positionId: config.jd_position_id || config.positionId || '',
        unionId: config.jd_union_id || config.jdUnionId || config.unionId || ''
      };
      console.log('发起京东转链请求参数:', jdParams);

      const res = await axios.get('http://api.zhetaoke.com:20000/api/open_jing_union_open_promotion_byunionid_get.ashx', {
        params: jdParams,
        timeout: 5000
      });
      const jdResp = res.data?.jd_union_open_promotion_byunionid_get_response;
      if (jdResp && jdResp.code === "0" && jdResp.result) {
        let parsedResult;
        try {
          parsedResult = typeof jdResp.result === 'string' ? JSON.parse(jdResp.result) : jdResp.result;
        } catch(e) {}
        
        if (parsedResult && parsedResult.code === 200) {
          // =========== 增加查券记录逻辑 START ===========
          if (is_search) {
            const wxContext = cloud.getWXContext();
            const openid = wxContext.OPENID || event.userInfo?.openId || '';
            try {
              await db.collection('30_search_queries').add({
                data: {
                  searchTime: new Date().toISOString(),
                  event_timestamp: Date.now(),
                  openid: openid,
                  queryContent: jd_url || `https://item.jd.com/${id}.html`,
                  platform: 'jd',
                  resultGoodsId: id || '',
                  resultTitle: title || '京东商品',
                  product_image: '',
                  originalPrice: 0,
                  finalPrice: 0,
                  couponAmount: 0,
                  has_coupon: true
                }
              });
            } catch(e) {
              console.error('JD search log failed', e);
            }
          }
          // =========== 增加查券记录逻辑 END ===========
          
          return {
            code: 0,
            data: {
              short_url: parsedResult.data.shortURL,
              click_url: parsedResult.data.shortURL,
              original_data: parsedResult.data
            }
          };
        }
      }
      
      console.error('京东转链 API 返回失败:', { req: jdParams, res: res.data });
      return { code: -3, message: '京东转链失败，请稍后重试' };
      
    } else {
      // 淘宝转链
      const tbParams = {
        appkey: APP_KEY,
        sid: sid,
        pid: config.taobao_pid || config.pid || config.zhetaokePid || '',
        num_iid: id,
        signurl: 5
      };
      
      // 如果配置了渠道关系ID，也加上
      const relationId = config.taobao_channel_id || config.relation_id || config.taobao_relation_id;
      if (relationId) {
        tbParams.relation_id = relationId;
      }

      console.log('发起淘宝转链请求参数:', tbParams);

      const res = await axios.get('https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian.ashx', {
        params: tbParams,
        timeout: 5000
      });
      
      if (res.data && res.data.status === 200 && res.data.content && res.data.content.length > 0) {
        let item = res.data.content[0];
        console.log('淘宝转链 API 成功返回:', item);
        
        // 拦截淘宝接口本身的报错（折淘客可能把淘宝报错包在 status 200 里）
        if (item.error_response) {
          console.error('淘宝转链失败(淘宝接口报错):', item.error_response);
          return { code: -3, message: item.error_response.msg || '淘宝授权或权限不足，转链失败' };
        }

        return {
          code: 0,
          data: {
            tkl: item.taokouling || item.tkl,
            short_url: item.short_url || item.coupon_short_url || item.item_url,
            click_url: item.coupon_click_url || item.item_url,
            original_data: item
          }
        };
      }
      
      console.error('淘宝转链 API 返回失败:', { req: tbParams, res: res.data });
      return { code: -3, message: '淘宝转链失败，可能无优惠券或佣金' };
    }
  } catch(e) {
    console.error('转链请求抛出异常:', e.message);
    return { code: -1, message: '转链异常: ' + e.message };
  }
};
