// 云函数 cf-coupon-search：查券搜索代理（tkl/keyword/url）
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 进程级配置缓存（云函数热实例期间有效）
const _configCache = {};
const CACHE_TTL = 5 * 60 * 1000; // 5分钟

async function getCachedConfig(docId)
{
  const now = Date.now();
  if (_configCache[docId] && (now - _configCache[docId].time) < CACHE_TTL) {
    return _configCache[docId].data;
  }
  const res = await db.collection('30_system_config').doc(docId).get().catch(() => ({ data: {} }));
  _configCache[docId] = { data: res.data, time: now };
  return res.data;
}

// 引用共享的商品映射函数（部署前从 _shared/ 复制）
const { mapToItem } = require('./mapToItem');

// 脱敏昵称抽取
function maskNickname(pool)
{
  if (!pool || pool.length === 0) return '省钱达人'
  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}

exports.main = async (event, context) =>
{
  const { query, query_type, platform = 'auto', page = 1, page_size = 20, sort, order } = event

  if (!query) return { code: -4, message: '搜索内容不能为空' }

  try {
    // 使用缓存读取配置
    const configDoc = platform === 'jd' ? 'jd_config' : 'taobao_config';
    const config = await getCachedConfig(configDoc);

    // 如果是京东则需要 zjk_appkey，如果是淘宝则需要 zt_appkey
    let APP_KEY = '';
    if (platform === 'jd') {
      APP_KEY = config.zjk_appkey || config.zhetaokeAppKey;
    } else {
      APP_KEY = config.ztk_appkey || config.zhetaokeAppKey || config.ZHETAOKE_APP_KEY;
    }

    const PID = config.taobaoPid || config.taobao_pid || config.TAOBAO_PID; // 兼容旧写法
    const SID = config.sid || config.ztk_sid || config.zhetaokeSid || config.ZHETAOKE_SID || '';
    const RELATION_ID = config.relation_id || config.taobao_channel_id || config.taobaoChannelId || config.taobao_relation_id || '';

    if (!APP_KEY) {
      return { code: -1, message: '系统维护中，请稍后重试(未配置APPKEY)' } // 不暴露密钥缺失
    }

    let items = []
    let total = 0

    // 获取用户标识，用于转链追踪 (跟单/返利)
    const wxContext = cloud.getWXContext()
    const openid = wxContext.OPENID || event.userInfo?.openId || ''

    if (platform === 'jd') {
      // 京东原有逻辑保持不变
      if (query_type === 'keyword') {
        let apiUrl = 'http://api.zhetaoke.com:20000/api/api_quanwang.ashx'
        let sortParam = 'new'
        if (sort === 'price') {
          sortParam = order === 'asc' ? 'price_asc' : 'price_desc';
        } else if (sort === 'sales') {
          sortParam = order === 'asc' ? 'total_sale_num_asc' : 'total_sale_num_desc';
        }

        const res = await axios.get(apiUrl, {
          params: {
            appkey: APP_KEY,
            q: query,
            page: page,
            page_size: page_size,
            sort: sortParam
          },
          timeout: 5000
        })

        if (res.data && res.data.status === 200 && Array.isArray(res.data.content)) {
          items = res.data.content.map(it => mapToItem(it, 'jd'))
          total = res.data.total_results || items.length
        }
      } else {
        const params = {
          appkey: APP_KEY,
          materialId: query,
          positionId: config.jd_position_id || config.positionId || '',
          unionId: config.jd_union_id || config.jdUnionId || config.unionId || '',
          signurl: 5
        };
        console.log('[JD API Request]', params);

        const res = await axios.get('http://api.zhetaoke.com:20000/api/open_jing_union_open_promotion_byunionid_get.ashx', {
          params,
          timeout: 5000
        });
        console.log('[JD API Response]', res.data);

        if (res.data && res.data.status === 200 && Array.isArray(res.data.content) && res.data.content.length > 0) {
          let it = res.data.content[0];
          let size = parseFloat(it.size || it.zk_final_price || 0);
          let quanhou = parseFloat(it.quanhou_jiage || size || 0);
          let hasCoupon = size > quanhou;
          let promptMsg = hasCoupon ? '恭喜该商品发现优惠券。' : '抱歉该商品暂无更多优惠';

          items = [{
            ...mapToItem(it, 'jd'),
            isConvert: true,
            hasCoupon: hasCoupon,
            couponAmount: hasCoupon ? Number((size - quanhou).toFixed(2)) : parseFloat(it.coupon_info_money || 0),
            short_url: it.shorturl || '',
            tkl: it.tkl || '',
            item_url: it.item_url || '',
            promptMessage: promptMsg
          }];
          total = items.length;
        }
      }
    } else {
      // 淘宝(含自动)统一处理流程
      let isItemResolved = false;

      // 第一步：优先调用批量高拥转链API open_gaoyongzhuanlian_tkl_piliang.ashx
      try {
        const batchParams = {
          appkey: APP_KEY,
          sid: SID,
          pid: PID,
          relation_id: RELATION_ID,
          tkl: query,
          signurl: 5
        };
        console.log('[Taobao 批量高佣转链 Request]', batchParams);
        const batchRes = await axios.get('https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian_tkl_piliang.ashx', {
          params: batchParams,
          timeout: 5000
        });
        console.log('[Taobao 批量高佣转链 Response]', batchRes.data);

        if (batchRes.data && batchRes.data.status === 200 && Array.isArray(batchRes.data.content) && batchRes.data.content.length > 0) {
          let it = batchRes.data.content[0];
          if (it && it.title) {
            let size = parseFloat(it.size || it.zk_final_price || 0);
            let quanhou = parseFloat(it.quanhou_jiage || size || 0);
            let hasCoupon = size > quanhou;
            let promptMsg = hasCoupon ? '恭喜该商品发现优惠券。' : '抱歉该商品暂无更多优惠';

            let rawTkl = it.result_tkl || it.taokouling || '';
            let cleanTkl = rawTkl;
            const match = rawTkl.match(/([$￥(][a-zA-Z0-9]+[$￥)])/);
            if (match) {
              cleanTkl = `👉 复制本段文字打开电商App即可查看：\n${match[1]}`;
            }

            items = [{
              ...mapToItem(it, 'taobao'),
              isConvert: true,
              hasCoupon: hasCoupon,
              couponAmount: hasCoupon ? Number((size - quanhou).toFixed(2)) : parseFloat(it.coupon_info_money || 0),
              tkl: cleanTkl,
              short_url: it.result_url || it.short_url || '',
              item_url: it.item_url || '',
              promptMessage: promptMsg
            }];
            total = items.length;
            isItemResolved = true;
          }
        }
      } catch (e) {
        console.error('[Taobao 批量高佣转链 Error]', e.message);
      }

      if (!isItemResolved) {
        // 第二步：智能解析商品 ID open_shangpin_id.ashx
        let itemId = '';
        try {
          const parseParams = {
            appkey: APP_KEY,
            sid: SID,
            pid: PID,
            content: query,
            type: 1
          };
          const parseRes = await axios.get('https://api.zhetaoke.com:10001/api/open_shangpin_id.ashx', {
            params: parseParams,
            timeout: 5000
          });
          console.log('[Taobao 解析商品ID]', parseRes.data);
          if (parseRes.data && parseRes.data.status === 200 && parseRes.data.item_id) {
            itemId = parseRes.data.item_id;
          } else if (/^\d{9,13}$/.test(query)) {
            itemId = query;
          }
        } catch (e) {
          console.error('[Taobao 解析商品ID异常]', e.message);
          if (/^\d{9,13}$/.test(query)) itemId = query;
        }

        // 第三步：精准查询高佣和隐藏券 open_gaoyongzhuanlian.ashx
        if (itemId) {
          const params3 = {
            appkey: APP_KEY,
            sid: SID,
            pid: PID,
            relation_id: RELATION_ID,
            num_iid: itemId,
            signurl: 5
          };
          console.log('[Taobao 高佣接口 Request]', params3);
          try {
            const res3 = await axios.get('https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian.ashx', {
              params: params3,
              timeout: 5000
            });
            console.log('[Taobao 高佣接口 Response]', res3.data);

            if (res3.data && res3.data.status === 200) {
              let it = Array.isArray(res3.data.content) && res3.data.content.length > 0 ? res3.data.content[0] : (res3.data.title ? res3.data : null);
              if (it && it.title) {
                let size = parseFloat(it.size || it.zk_final_price || 0);
                let quanhou = parseFloat(it.quanhou_jiage || size || 0);
                let hasCoupon = size > quanhou;
                let promptMsg = hasCoupon ? '恭喜该商品发现优惠券。' : '抱歉该商品暂无更多优惠';

                let rawTkl = it.result_tkl || it.taokouling || '';
                let cleanTkl = rawTkl;
                const match = rawTkl.match(/([$￥(][a-zA-Z0-9]+[$￥)])/);
                if (match) {
                  cleanTkl = `👉 复制本段文字打开电商App即可查看：\n${match[1]}`;
                }

                items = [{
                  ...mapToItem(it, 'taobao'),
                  isConvert: true,
                  hasCoupon: hasCoupon,
                  couponAmount: hasCoupon ? Number((size - quanhou).toFixed(2)) : parseFloat(it.coupon_info_money || 0),
                  tkl: cleanTkl,
                  short_url: it.result_url || it.short_url || '',
                  item_url: it.item_url || '',
                  promptMessage: promptMsg
                }];
                total = items.length;
                isItemResolved = true;
              }
            }
          } catch (e) {
            console.error('[Taobao 高佣接口 Error]', e.message);
          }
        }
      }

      // 第四步：全网模糊搜索（兜底层）
      if (!isItemResolved) {
        // 3、如无商品返回，调用全网搜索商品API api_quanwang.ashx (对应文档 extend_lingquan_keywords.aspx)
        let apiUrl = 'https://api.zhetaoke.com:10003/api/api_quanwang.ashx';
        let sortParam = 'new';
        if (sort === 'price') {
          sortParam = order === 'asc' ? 'price_asc' : 'price_desc';
        } else if (sort === 'sales') {
          sortParam = order === 'asc' ? 'total_sale_num_asc' : 'total_sale_num_desc';
        }

        console.log('[Taobao 全网搜索 Request]', { q: query, page, page_size, sort: sortParam, sid: SID, pid: PID });
        try {
          const res = await axios.get(apiUrl, {
            params: {
              appkey: APP_KEY,
              sid: SID,
              pid: PID,
              q: query,
              page: page,
              page_size: page_size,
              sort: sortParam
            },
            timeout: 5000
          });

          if (res.data && res.data.status === 200 && Array.isArray(res.data.content)) {
            items = res.data.content.map(it => mapToItem(it, 'taobao'));
            total = res.data.total_results || items.length;
          }
        } catch (e) {
          console.error('[Taobao 全网搜索 Error]', e.message);
        }
      }
    }
    console.log('[Search Result Items]', items);

    // =========== 增加查券记录逻辑 START ===========
    // openid 已在前面获取，复用即可

    let searchLog = {
      searchTime: new Date().toISOString(),
      event_timestamp: Date.now(), // 用于按时间戳排序
      openid: openid,
      queryContent: query,
      platform: platform === 'auto' ? 'taobao' : platform,
      resultGoodsId: '',
      resultTitle: '',
      product_image: '',
      originalPrice: null,
      finalPrice: null,
      couponAmount: null,
      has_coupon: false
    }

    if (items && items.length > 0) {
      const bestItem = items[0]
      searchLog.resultGoodsId = bestItem.tao_id || ''
      searchLog.product_image = bestItem.image_url || ''
      searchLog.resultTitle = bestItem.title || ''
      searchLog.originalPrice = bestItem.original_price || 0
      searchLog.finalPrice = bestItem.coupon_price || 0
      searchLog.couponAmount = bestItem.coupon_amount || 0

      // 修复第三方接口可能返回原价等于券后价的问题
      if (searchLog.couponAmount > 0 && searchLog.originalPrice <= searchLog.finalPrice) {
        searchLog.originalPrice = Number((searchLog.finalPrice + searchLog.couponAmount).toFixed(2))
      }
      searchLog.has_coupon = !!bestItem.hasCoupon
      searchLog.platform = bestItem.platform || searchLog.platform
    }

    // 异步写入搜索日志，不阻塞用户响应
    db.collection('30_search_queries').add({
      data: searchLog
    }).catch(err => console.error('查券记录写入失败:', err))
    // =========== 增加查券记录逻辑 END ===========

    if (items.length === 0) {
      return { code: -3, message: '没有找到相关的优惠商品' }
    }

    // 写入弹幕记录（如果是第一页查券成功且存在优惠）
    if (page === 1) {
      const bestItem = items[0]
      if (bestItem.coupon_amount > 0) {
        // 从缓存获取运营配置的昵称池
        const opsConfig = await getCachedConfig('operations_config');
        const nicknamePool = opsConfig.nickname_pool || opsConfig.nicknamePool || ['省钱达人'];

        // 异步写入，不阻塞返回响应
        db.collection('bulletin_logs').add({
          data: {
            event_type: 'coupon',
            nickname: maskNickname(nicknamePool),
            product_title: bestItem.title.substring(0, 20),
            product_image: bestItem.image_url,
            platform: bestItem.platform,
            coupon_amount: bestItem.coupon_amount,
            event_timestamp: Date.now(),
            is_seed: false,
            created_at: new Date().toISOString()
          }
        }).catch(err => console.error('弹幕异步写入失败:', err))
      }
    }

    return {
      code: 0,
      data: {
        items,
        total,
        page
      }
    }

  } catch (error) {
    console.error('查券搜索异常:', error)
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return { code: -2, message: '查询超时，请重试' }
    }
    return { code: -1, message: '系统维护中，请稍后重试' }
  }
}