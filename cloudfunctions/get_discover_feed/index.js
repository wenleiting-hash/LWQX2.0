const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  // 1. 接收前端指令：要看什么类型的数据？要第几页？什么类目？
  const tabId = event.tabId || 'shenquan';
  const page = event.page || 1;
  const pageSize = event.pageSize || 20;
  const cid = event.cid || '';
  const q = event.q || ''; // 新增：搜索关键字

  // 0. 优先从数据库读取折淘客全局配置
  const configRes = await db.collection('system_config').doc('global_config').get().catch(() => ({ data: {} }));
  const config = configRes.data || {};

  const APP_KEY = config.zhetaokeAppKey || process.env.ZHETAOKE_APP_KEY;
  const SID = config.zhetaokeSid || process.env.ZHETAOKE_SID;
  const PID = config.taobaoPid || process.env.ZHETAOKE_PID || process.env.TAOBAO_PID;

  // 统一使用折淘客最全能的“全站商品API”作为超级引擎
  // 注意：官方文档显示 api_all.ashx 需使用 10001 端口
  let apiUrl = 'https://api.zhetaoke.com:10001/api/api_all.ashx';
  
  // 基础参数检查
  if (!APP_KEY || !SID || !PID) {
    console.error(`[数据厨房] 关键配置缺失！请检查云端环境变量配置：`, {
      hasAppKey: !!APP_KEY,
      hasSid: !!SID,
      hasPid: !!PID
    });
    return { success: false, msg: "服务器配置未就绪，请联系管理员配置环境变量" };
  }

  // 基础参数（该API本身只返回领券商品，无需 has_coupon）
  let requestParams = {
    appkey: APP_KEY,
    sid: SID,
    pid: PID, // 必填参数
    page: page,
    page_size: pageSize // 动态拉取数量
  };

  // 如果有搜索词，动态加上
  if (q) {
    requestParams.q = q;
  }

  // 2. 🌟 智能路由：根据前端传的 tabId，动态动态组装 apiUrl 和 查询参数
  // 默认使用全站商品API，默认按最新(new)排序，后续各自覆盖
  apiUrl = 'https://api.zhetaoke.com:10001/api/api_all.ashx';
  requestParams.sort = 'new';

  switch (tabId) {
    case 'shenquan': // 大额神券 (要求只出大额神券 tag=1)
      requestParams.tag = 1;
      // apiUrl 维持默认 api_all.ashx
      break;
    
    case 'hot': // 疯抢榜 (实时人气排行榜)
      apiUrl = 'https://api.zhetaoke.com:10001/api/api_shishi.ashx';
      // 用户提示中有 cid= （这里如果前端没传cid就不赋值，或者传空值，默认不限制）
      break;

    case 'brand': // 大牌特卖 (天猫标识 tj=tmall)
      requestParams.tj = 'tmall';
      // apiUrl 维持默认 api_all.ashx
      break;
      
    case 'chaosheng': // 超省好物 (券额过滤 >= 100)
      requestParams.coupon_amount_start = 100;
      requestParams.sort = 'coupon_info_money_desc'; // 按券额倒序
      break;

    case 'high_sale': // 超高销售 (总销量过滤 >= 10000)
      requestParams.sale_num_start = 10000;
      requestParams.sort = 'total_sale_num_desc'; // 按总销量倒序
      break;

    case 'high_rate': // 超高好评 (店铺DSR评分 >= 4.9)
      requestParams.dsr_start = 4.9;
      delete requestParams.sort; // 删去 new 限制，使用接口默认权重
      break;
    
    case '9.9': // 9.9包邮 (价格过滤 price=0.0-9.9)
      requestParams.price = '0.0-9.9';
      // apiUrl 维持默认 api_all.ashx
      break;

    case 'category': // 金刚区垂直分类 (女装、美妆等)
      // apiUrl 维持默认 api_all.ashx
      if (cid) requestParams.cid = cid; 
      break;

    case '19.9': // 19.9购 (价格过滤 price=0.0-19.9)
      requestParams.price = '0.0-19.9';
      // apiUrl 维持默认 api_all.ashx
      break;
      
    default: // 兜底推荐 (猜你喜欢/全天销量榜)
      apiUrl = 'https://api.zhetaoke.com:10001/api/api_quantian.ashx';
      if (cid) requestParams.cid = cid;
      break;
  }

  try {
    console.log(`[数据厨房] 开始烹饪 ${tabId} 数据，第 ${page} 页...`);
    console.log(`[数据厨房] 请求URL: ${apiUrl}`);
    console.log(`[数据厨房] 请求参数(已掩码):`, JSON.stringify({
      ...requestParams,
      appkey: '***',
      sid: '***',
      pid: '***'
    }));
    
    const response = await axios.get(apiUrl, {
      params: requestParams,
      timeout: 15000, 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*'
      }
    });

    const resData = response.data;

    // 3. 🌟 数据清洗：只吐出前端 UI 需要的干净字段
    if (resData.status === 200 && resData.content && Array.isArray(resData.content) && resData.content.length > 0) {
      
      const cleanList = resData.content.map(item => {
        const price = parseFloat(item.quanhou_jiage || item.size || item.zk_final_price || 0);
        const coupon = parseFloat(item.coupon_info_money || 0);
        const originPrice = (price + coupon).toFixed(2);

        // 计算预估积分 (假设 10% 预估佣金，1元=1积分，最低给1积分防零)
        const estimatedCommission = price * 0.1;
        const points = Math.max(Math.floor(estimatedCommission), 1);

        // 动态组装角标
        let badge = '';
        if (coupon >= 50) {
          badge = `立减${coupon}`;
        } else if (item.shop_type === 1) {
          badge = '天猫正品';
        } else if (coupon > 0) {
          badge = '隐藏券';
        }

        return {
          _id: item.tao_id || item.item_id || item.num_iid, // 前端绑定的主键
          title: item.title,
          image: item.pict_url,
          price: price.toFixed(2),
          originalPrice: originPrice, // 修正为 originalPrice，匹配前端
          coupon: coupon,
          points: points,
          badge: badge, // 新增 badge 属性以点亮瀑布流角标
          volume: item.volume || item.sellCount || 0 // 已售数量
        };
      });

      console.log(`[数据厨房] 成功出餐 ${cleanList.length} 条数据`);
      return { success: true, data: cleanList };

    } else {
      // 接口通了，但没数据 (可能滑到底了)
      return { success: true, data: [], msg: "没有更多数据啦" };
    }

  } catch (error) {
    console.error("[数据厨房] 烹饪失败:", error.message);
    return { success: false, msg: "网络开小差了，请下拉重试" };
  }
};