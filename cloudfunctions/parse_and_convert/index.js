const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

// 🛠️ 引擎 A：0毫秒截胡 + 深层追踪器
async function extractTaobaoId(url, depth = 0) {
  if (depth > 3) return null; 

  let directMatch = url.match(/[?&]id=(\d{10,15})/i) || 
                    url.match(/\/i(\d{10,15})\.htm/i) ||
                    url.match(/[?&]itemIds?=(\d{10,15})/i); 
  
  if (directMatch && directMatch[1]) {
      console.log(`[自研追踪器] 极速截胡！直接发现 ID:`, directMatch[1]);
      return directMatch[1];
  }

  try {
    const res = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 Chrome/114.0.0.0 Mobile Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 3000, 
      maxRedirects: 5 
    });

    const finalUrl = res.request?.res?.responseUrl || url;
    const html = typeof res.data === 'string' ? res.data : JSON.stringify(res.data);

    const match = finalUrl.match(/[?&]id=(\d{10,15})/i) ||
                  finalUrl.match(/\/i(\d{10,15})\.htm/i) ||
                  finalUrl.match(/[?&]itemIds?=(\d{10,15})/i) ||
                  html.match(/[?&]id=(\d{10,15})/i) ||
                  html.match(/\/i(\d{10,15})\.htm/i) ||
                  html.match(/["']?itemIds?["']?\s*[:=]\s*["']?(\d{10,15})["']?/i) ||
                  html.match(/["']?num_iid["']?\s*[:=]\s*["']?(\d{10,15})["']?/i);

    if (match && match[1]) return match[1];

    const redirectMatch = html.match(/window\.location\.replace\(['"]([^'"]+)['"]\)/) ||
                          html.match(/window\.location\.href\s*=\s*['"]([^'"]+)['"]/) ||
                          html.match(/var\s+url\s*=\s*['"]([^'"]+)['"]/);

    if (redirectMatch && redirectMatch[1]) {
        let nextUrl = redirectMatch[1];
        if (nextUrl.startsWith('//')) nextUrl = 'https:' + nextUrl;
        console.log(`[自研追踪器] 发现第 ${depth + 1} 层隐藏跳转:`, nextUrl);
        return await extractTaobaoId(nextUrl, depth + 1);
    }

    return null;
  } catch (e) {
    if (e.response?.headers?.location) {
      const loc = e.response.headers.location;
      const match = loc.match(/[?&]id=(\d{10,15})/i) || loc.match(/\/i(\d{10,15})\.htm/i) || loc.match(/[?&]itemIds?=(\d{10,15})/i);
      if (match && match[1]) return match[1];

      return await extractTaobaoId(loc, depth + 1);
    }
    return null;
  }
}

exports.main = async (event, context) => {
  const { query } = event; 
  if (!query) return { success: false, msg: "链接为空" };

  // 0. 优先从数据库读取折淘客全局配置
  const configRes = await db.collection('system_config').doc('global_config').get().catch(() => ({ data: {} }));
  const config = configRes.data || {};

  const APP_KEY = config.zhetaokeAppKey || process.env.ZHETAOKE_APP_KEY;
  const PID = config.taobaoPid || process.env.ZHETAOKE_PID || process.env.TAOBAO_PID;     
  
  // 渠道 ID (SID) 优先从配置读取，若无则尝试从 PID 中解析 (mm_账户id_渠道id_推广位id)
  let SID = config.zhetaokeSid || process.env.ZHETAOKE_SID;
  if (!SID && PID && PID.includes('_')) {
    const parts = PID.split('_');
    if (parts.length >= 3) {
      SID = parts[2];
      console.log(`[智能解析] 从 PID 中提取渠道 ID (SID):`, SID);
    }
  }

  try {
    console.log("1. 收到文本:", query);

    // --- 第一阶段：一站式解析转链 (调用高佣转链 TKL 接口) ---
    // 该接口集解析、转链、抓取商品信息于一体，对官方 e.tb.cn 口令短链支持极佳
    let item = null;
    
    const wxContext = cloud.getWXContext();
    const openid = wxContext.OPENID || (event.userInfo && event.userInfo.openId) || "";

    console.log("1. 启动高佣转链 TKL 引擎(批量版)...");
    const tklUrl = 'https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian_tkl_piliang.ashx';
    const tklParams = {
        appkey: APP_KEY,
        sid: SID,
        pid: PID,
        tkl: encodeURIComponent(query), // 进行 Urlencode 编码
        signurl: 5, // 获取全面数据项
        relation_id: openid,
        external_id: openid
    };
    
    const tklRes = await axios.get(tklUrl, {
      params: tklParams,
      timeout: 3500
    }).catch((err) => {
      console.error("TKL 引擎请求报错:", err.message);
      return null;
    });

    // 🚀【新增测试测服日志】：完整打印 TKL 引擎的返回元数据
    console.log("====== 高佣转链 TKL (10001) 日志 ======");
    console.log("【入参 Params】:", JSON.stringify(tklParams, null, 2));
    console.log("【返回 Response】:", JSON.stringify(tklRes ? tklRes.data : "无响应", null, 2));
    console.log("=============================================");

    if (tklRes?.data?.status === 200 && Array.isArray(tklRes.data.content) && tklRes.data.content[0]?.title) {
      item = tklRes.data.content[0];
      // 💡折淘客批量接口通常用 taokouling 或 qian_taokouling 等字段返回，必须标准化映射！
      item.tkl = item.tkl || item.taokouling || item.qian_taokouling || item.kouling || "";
      console.log("1. TKL 引擎解析成功:", item.title, "提取口令:", item.tkl);
    }

    // --- 第二阶段：如果 TKL 引擎失败，则进入【商品 ID 提取 + 多级回退】逻辑 ---
    let itemId = item ? (item.tao_id || item.item_id || item.num_iid) : null;

    if (!item) {
        console.log("1. TKL 引擎未覆盖，启动 [引擎 B] 获取跳转URL提取 ID...");
        
        const locParams = { appkey: APP_KEY, sid: SID, pid: PID, content: encodeURIComponent(query), type: 1 };
        const locRes = await axios.get('https://api.zhetaoke.com:10001/api/open_get_location.ashx', {
            params: locParams,
            timeout: 3000
        }).catch(() => null);

        console.log("====== 获取跳转URL (open_get_location) 日志 ======");
        console.log("【入参 Params】:", JSON.stringify(locParams));
        console.log("【返回 Response】:", JSON.stringify(locRes ? locRes.data : "无响应"));
        console.log("==================================================");

        if (locRes?.data?.status === 200 && locRes.data.content) {
            const locContent = Array.isArray(locRes.data.content) ? locRes.data.content[0] : locRes.data.content;
            if (locContent && locContent.url_type == 1 && locContent.url) {
                const finalUrl = locContent.url;
                const match = finalUrl.match(/[?&]id=(\d+)/i) || 
                              finalUrl.match(/\/i(\d+)\.htm/i) || 
                              finalUrl.match(/[?&]itemIds?=(\d+)/i);
                if (match && match[1]) {
                    itemId = match[1];
                    console.log("1.1 成功通过 get_location API 解析出商品 ID:", itemId);
                }
            }
        }

        // 1.2 如果官方获取跳转链接 API 歇菜了，启动终极自研原生爬虫！保证坚不可摧
        if (!itemId) {
            console.log("1.2 官方跳转 API 均未能提取 ID，启用自有纯正则爬虫...");
            const urlMatch = query.match(/(https?:\/\/[^\s]+)/);
            if (urlMatch) {
                itemId = await extractTaobaoId(urlMatch[1]);
                console.log("1.2 原生自研引擎提取 ID 结果:", itemId);
            }
        }
    }

    if (!itemId && !item) {
      return { success: false, msg: "商品解析失败，请检查链接有效性" };
    }


    // 🌟 终极绝招：既然它不要纯数字，我们就按它的规矩，给它穿上标准淘宝链接的外衣！
    const standardUrl = `https://item.taobao.com/item.htm?id=${itemId}`;
    console.log("2. 伪装标准链接成功:", standardUrl, "准备调用详情接口...");

    // --- 第三阶段：调用全网商品详情API (并发加速版) ---
    // 🌟 此时 item 可能已经由 TKL 引擎或善源码引擎同步抓取到，但如果缺少 tkl (最重要的东西)，必须触发专属转链获取！
    
    // 【第一梯队并发抢跑】: 标准详情 A & 高佣转链 B（争夺高佣和丰富数据）
    if (!item || !item.title || !item.tkl) {
        console.log("3ab. 当前数据缺失 title 或 tkl，启动 [尝试 A/B] 第一梯队并发拉取强制弥补...");
        
        // 保证能有个可用的 standardUrl 或者 itemId
        const reqItemId = itemId || item?.item_id || item?.num_iid || item?.tao_id || "0";
        const standardUrl = `https://item.taobao.com/item.htm?id=${reqItemId}`;
        
        const paramsA = { appkey: APP_KEY, sid: SID, pid: PID, external_id: openid, tao_id: standardUrl };
        const fetchA = axios.get('https://api.zhetaoke.com:10002/api/api_detail.ashx', {
            params: paramsA,
            timeout: 3500,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36' }
        }).catch(() => null);

        const paramsB = { appkey: APP_KEY, sid: SID, pid: PID, num_iid: itemId, signurl: 5 };
        const fetchB = axios.get('https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian.ashx', {
            params: paramsB,
            timeout: 3500
        }).catch(() => null);

        const [resA, resB] = await Promise.all([fetchA, fetchB]);

        console.log("====== [尝试 A] api_detail 接口日志 ======");
        console.log("【入参 Params】:", JSON.stringify(paramsA));
        console.log("【返回 Response】:", JSON.stringify(resA ? resA.data : "无响应"));
        
        console.log("====== [尝试 B] 高佣转链 10001 接口日志 ======");
        console.log("【入参 Params】:", JSON.stringify(paramsB));
        console.log("【返回 Response】:", JSON.stringify(resB ? resB.data : "无响应"));
        console.log("============================================");

        if (resA?.data?.status === 200 && Array.isArray(resA.data.content) && resA.data.content[0]?.title) {
            item = resA.data.content[0];
            console.log("3a. [尝试 A] 详情接口并发胜出:", item.title);
            
            // 🚨 致命修复：api_detail 不返回口令！必须将 resB 的口令合并进去！
            if (resB?.data?.status === 200 && Array.isArray(resB.data.content) && resB.data.content[0]?.tkl) {
                item.tkl = resB.data.content[0].tkl;
                item.item_url = resB.data.content[0].item_url || item.item_url;
                console.log("3a-补丁: 提取 B 接口的 TKL 并入 A 接口结果:", item.tkl);
            }
        } else if (resB?.data?.status === 200 && Array.isArray(resB.data.content) && (resB.data.content[0]?.title || resB.data.content[0]?.item_title)) {
            item = resB.data.content[0];
            console.log("3b. [尝试 B] 转链回退并发补位成功:", item.title || item.item_title);
        }
    }

    // 第二梯队并发降级逻辑已被移除（因用户反馈无需只包含无优惠的兜底数据，同时为查找国补预留优化空间）

    // 【尝试 E】(完全兜底): 直接从文本提取，构造一个空壳商品对象
    if (!item || !(item.title || item.item_title)) {
        console.log("3e. [尝试 D] 依然失败，启动 [尝试 E] 文本提取兜底...");
        let extractedTitle = "精选好物";
        // 尝试匹配 「」 或 【】 及其变体，且长度越长越可能是标题
        const titleMatch = query.match(/[「【\[](.*?)[」】\]]/g);
        if (titleMatch && titleMatch.length > 0) {
            extractedTitle = titleMatch.reduce((a, b) => a.length > b.length ? a : b).replace(/[「」【】\[\]]/g, '').trim();
        } else {
            const rawText = query.replace(/(https?:\/\/[^\s]+)/g, '').replace(/[a-zA-Z0-9]{4,}/g, '').trim();
            if (rawText.length > 3) {
                extractedTitle = rawText.substring(0, 50);
            }
        }
        if (extractedTitle.length < 2) extractedTitle = "淘宝好物精选";

        let jumpUrl = `https://item.taobao.com/item.htm?id=${itemId}`;
        const urlMatch = query.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
            jumpUrl = urlMatch[1]; // 有短链就尽量返回短链，适配端内打开
        }

        item = {
            title: extractedTitle,
            item_url: jumpUrl,
            pict_url: '', // 移除坑人的全透明占位图片，直接让小程序前端折叠该块
            zk_final_price: "0",
            coupon_amount: "0"
        };
        console.log("3e. [尝试 E] 兜底成功:", item.title);
    }

    if (item && typeof item === 'object' && (item.title || item.item_title)) {
      // 3. 动态政府补贴/大促补贴检测
      let subsidyKeywords = ['补贴', '政府', '以旧换新'];
      let isSubsidy = false;
      const title = item.title || item.item_title || "";
      const desc = item.item_description || "";

      try {
        const oConfigRes = await db.collection('system_config').doc('operations_config').get();
        if (oConfigRes.data && oConfigRes.data.subsidyKeywords) {
          const kwArr = Array.isArray(oConfigRes.data.subsidyKeywords) 
            ? oConfigRes.data.subsidyKeywords 
            : String(oConfigRes.data.subsidyKeywords).split(/[,，]/).map(s => s.trim()).filter(Boolean);
          if (kwArr.length > 0) subsidyKeywords = kwArr;
        }
      } catch (e) {
        // 使用默认
      }

      isSubsidy = subsidyKeywords.some(kw => title.includes(kw) || desc.includes(kw));

      const getValidPrice = (vals) => {
        for (let v of vals) {
          if (v !== undefined && v !== null && parseFloat(v) > 0) return String(v);
        }
        return "0.00";
      };

      const getValidCoupon = (vals) => {
        for (let v of vals) {
          if (v !== undefined && v !== null && parseFloat(v) > 0) return String(v);
        }
        return "0";
      };

      const finalItemId = item.tao_id || item.item_id || item.num_iid || itemId;
      const defaultJumpUrl = finalItemId ? `https://item.taobao.com/item.htm?id=${finalItemId}` : query;
      let finalJumpUrl = item.item_url || item.coupon_click_url || defaultJumpUrl;
      let finalTkl = item.tkl || "";

      // 【核心体验补丁🔥】：如果穷尽所有引擎仍未拿到 TKL（如无佣金商品兜底），强行通过折淘客将其包装为标准口令！
      if (!finalTkl && finalJumpUrl && finalJumpUrl.includes('taobao.com')) {
          try {
              console.log("🔥 触发 TKL 强制包装机制...");
              const tklParams = { 
                  appkey: APP_KEY, 
                  sid: SID, 
                  text: title || "精选好物，快来看看吧", 
                  url: finalJumpUrl,
                  relation_id: openid,
                  external_id: openid
              };
              const fallbackTklRes = await axios.get('https://api.zhetaoke.com:10001/api/open_taokouling_create.ashx', {
                  params: tklParams,
                  timeout: 3000
              });
              if (fallbackTklRes?.data?.status === 200 && fallbackTklRes.data.content) {
                  finalTkl = fallbackTklRes.data.content;
                  console.log("🔥 TKL 兜底包装成功:", finalTkl);
              }
          } catch (e) {
              console.log("TKL 强制包装失败:", e.message);
          }
      }

      // 🌟 [智能追单埋点] 异步同步将本次查券意图写入 tk_footprints 集合
      if (openid && finalItemId) {
          try {
              // 注意: 这里即使报错也不会中断主流程给用户返回优惠口令
              db.collection('tk_footprints').add({
                  data: {
                      _openid: openid,
                      itemId: finalItemId,
                      createTime: db.serverDate()
                  }
              }).catch(e => console.log("[智能追单埋点异步写入] 失败:", e.message));
          } catch (e) { }
      }

      return {
        success: true,
        data: {
          title,
          price: getValidPrice([item.quanhou_jiage, item.size, item.zk_final_price, item.reserve_price]),
          coupon: getValidCoupon([item.coupon_info_money, item.coupon_amount]),
          tkl: finalTkl,
          jump_url: finalJumpUrl,
          image: item.pict_url || item.item_pic || "",
          subsidy: !!isSubsidy
        }
      };
    } else {
      return { success: false, msg: `商品库暂无该商品信息 (${itemId})，请换个链接试试` };
    }

  } catch (error) {
    console.error("异常:", error.message);
    return { success: false, msg: "查券引擎繁忙，请重试" };
  }
};