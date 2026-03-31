const cloud = require('wx-server-sdk');
const axios = require('axios');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  const { item_id } = event; 
  if (!item_id) return { success: false, msg: "商品ID丢失，请重试" };

  // 0. 优先从数据库读取折淘客全局配置
  const configRes = await db.collection('system_config').doc('global_config').get().catch(() => ({ data: {} }));
  const config = configRes.data || {};

  const APP_KEY = config.zhetaokeAppKey || process.env.ZHETAOKE_APP_KEY;
  const SID = config.zhetaokeSid || process.env.ZHETAOKE_SID;
  const PID = config.taobaoPid || process.env.ZHETAOKE_PID || process.env.TAOBAO_PID || event.pid;     

  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID || event.openid || "";

  if (!APP_KEY || !SID || !PID) {
    return { success: false, msg: '云端转链服务未配置密钥，请联系管理员' };
  }

  try {
    // 🌟 使用折淘客标准高佣转链 API
    const apiUrl = 'https://api.zhetaoke.com:10001/api/open_gaoyongzhuanlian.ashx';
    
    console.log(`[转链引擎] 开始为商品 ${item_id} (用户:${openid}) 生成专属口令...`);

    const response = await axios.get(apiUrl, {
      params: {
        appkey: APP_KEY,
        sid: SID,
        pid: PID,
        num_iid: item_id,
        external_id: openid, // 👈 增加外部 ID，用于订单追踪 
        signurl: 5 // 官方推荐核心参数：强制返回全套数据（包含 tkl 淘口令）
      },
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    const resData = response.data;
    console.log(`[转链引擎] 接口响应:`, JSON.stringify(resData));

    // 解析折淘客返回的数据格式
    if (resData.status === 200 && resData.content && resData.content.length > 0) {
      const item = resData.content[0];
      
      if (!item.tkl) {
        return { success: false, msg: "该商品暂无可用口令，可能已下架" };
      }

      return {
        success: true,
        data: {
          tkl: item.tkl // 完美提取淘口令
        }
      };
    } else {
      return { 
        success: false, 
        msg: `转链失败: ${resData.content || "该商品暂无佣金"}` 
      };
    }

  } catch (error) {
    console.error("[转链引擎] 崩溃:", error.message);
    return { success: false, msg: "网络开小差了，请稍后再试" };
  }
};