// 云函数 cf-feed-data：榜单/信息流代理（支持14种类型）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 进程级配置缓存（云函数热实例期间有效）
const _configCache = {};
const CACHE_TTL = 5 * 60 * 1000;

async function getCachedConfig(docId) {
  const now = Date.now();
  if (_configCache[docId] && (now - _configCache[docId].time) < CACHE_TTL) {
    return _configCache[docId].data;
  }
  const res = await db.collection('30_system_config').doc(docId).get();
  _configCache[docId] = { data: res.data, time: now };
  return res.data;
}

// 引用共享的商品映射函数（部署前从 _shared/ 复制）
const { mapToItem } = require('./mapToItem');

exports.main = async (event, context) => {
  const { feed_type, platform = 'taobao', page = 1, page_size = 20, cid, price, q, sort, order } = event

  if (!feed_type) {
    return { code: -4, message: 'feed_type 不能为空' }
  }

  let config;
  try {
    const configDoc = platform === 'jd' ? 'jd_config' : 'taobao_config';
    config = await getCachedConfig(configDoc);
  } catch (err) {
    console.error('获取系统配置失败:', err);
    return { code: -1, message: `系统未配置，请先在后台设置参数 (详细错误: ${err.message})` }
  }

  try {
    const APP_KEY = config.zhetaokeAppKey || config.ztk_appkey || config.zjk_appkey

    if (!APP_KEY) {
      return { code: -1, message: '请先在后台配置折淘客APPKEY' }
    }

    let baseUrl = platform === 'jd' 
      ? 'http://api.zhetaoke.com:20000/api/' 
      : 'https://api.zhetaoke.com:10001/api/';

    let endpoint = 'api_all.ashx'
    let extraParams = { sort: 'new' }

    // 根据不同信息流类型配置接口和参数
    switch (feed_type) {
      case 'coupon_hall': 
      case 'quanzhan': break; // 神券大厅
      case 'hot_circle': extraParams.tag = 1; break; // 朋友圈热销
      case 'nine_nine': extraParams.price = '0.0-9.9'; break; // 9.9包邮
      case 'ju_hua_suan': 
      case 'juhuasuan': extraParams.jt = 'juhuasuan'; break; // 聚划算
      case 'today': extraParams.today = 1; break; // 今日商品
      case 'high_sales': extraParams.sale_num_start = 10000; break; // 超高销量
      case 'taoqianggou': extraParams.jt = 'taoqianggou'; break; // 淘宝特卖
      case 'pinpai': extraParams.pinpai = 1; break; // 品牌精选
      case 'tmall': extraParams.tj = 'tmall'; break; // 天猫优选
      case 'jd_zy': extraParams.owner = 'g'; break; // 京东自营
      case 'jd_ps': extraParams.deliveryType = 1; break; // 京东配送
      case 'taoxi': extraParams.taote = 1; break; // 淘喜商品(淘特)
      case 'jingxi': extraParams.isJingxi = 1; break; // 京喜商品
      case 'tejia': extraParams.price = price || '0.0-9.9'; break; // 特价专区
      case 'high_rating': extraParams.dsr_start = 4.9; break; // 超高评分
      case 'high_coupon':
        if (platform === 'jd') {
          extraParams.coupon_amount_start = 100;
        } else {
          extraParams.commission_rate_start = 50; 
        }
        break;
      case 'rank_2hour': endpoint = 'api_xiaoshi.ashx'; break; // 实时爆单榜
      case 'rank_popularity': endpoint = 'api_shishi.ashx'; break; // 实时人气榜
      case 'rank_day': endpoint = 'api_quantian.ashx'; break; // 全天销量榜
      case 'rank_month': endpoint = 'api_quantian.ashx'; break; // 月度销售榜 (接口与全天相同，折淘客配置)
      default: break;
    }

    if (cid) extraParams.cid = cid;
    if (q) extraParams.q = q;
    if (sort) {
      // 修复前端传入的 sort 参数与接口兼容性，按照折淘客规范映射
      let finalSort = sort;
      if (sort === 'sales') {
        finalSort = order === 'asc' ? 'total_sale_num_asc' : 'total_sale_num_desc';
      } else if (sort.includes('sale_num')) {
        // 如果前端已经传了 total_sale_num_desc 等，直接保留
        finalSort = sort;
      } else if (sort === 'price') {
        finalSort = order === 'asc' ? 'price_asc' : 'price_desc';
      } else if (sort.includes('price')) {
        // 如果前端已经传了 price_asc 等，直接保留
        finalSort = sort;
      }
      extraParams.sort = finalSort;
    }

    const res = await axios.get(`${baseUrl}${endpoint}`, {
      params: {
        appkey: APP_KEY,
        page,
        page_size,
        ...extraParams
      },
      timeout: 5000
    })

    if (res.data && res.data.status === 200 && Array.isArray(res.data.content)) {
      const items = res.data.content.map(it => mapToItem(it, platform))
      return {
        code: 0,
        data: {
          items,
          total: res.data.total_results || items.length,
          page
        }
      }
    } else {
      if (res.data && res.data.status === 301) {
        return { code: -3, message: 'APPKEY不正确，请在后台重新配置' }
      }
      return { code: -3, message: '暂无数据' }
    }

  } catch (error) {
    console.error('获取信息流数据异常:', error)
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return { code: -2, message: '请求超时，请重试' }
    }
    return { code: -1, message: '系统报错:' + error.message }
  }
}
