// cloudfunctions/parse_and_convert/index.js
const cloud = require('wx-server-sdk');
const axios = require('axios');

// 初始化云环境，复用当前执行环境
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 内部合规中间件：现金转积分清洗函数
 * 【架构红线】：切断所有对外的现金展示，转化为系统积分
 * @param {number|string} commissionCash - 原始现金金额
 * @returns {string} - 安全的积分展示文案
 */
function formatMoneyToPoints(commissionCash) {
  const cash = parseFloat(commissionCash || 0);
  // 汇率计算：目前按 1:1 转换。若老温铺子权益成本为 50%，实际净赚 50%。
  const points = Math.floor(cash * 1); 
  // 绝对封杀“返现”字样
  return `预估可得 ${points} 积分`;
}

/**
 * 云函数主入口
 * @param {Object} event - 前端传入的 Request DTO { query, user_openid }
 */
exports.main = async (event, context) => {
  const { query, user_openid } = event;
  
  // 1. 从云端环境变量安全读取密钥（严禁硬编码）
  const APP_KEY = process.env.ZHETAOKE_APP_KEY; 
  const PID = process.env.TAOBAO_PID;

  if (!query || !user_openid) {
    return { success: false, msg: "参数缺失：无法识别查询内容或用户身份" };
  }

  // 2. 剪贴板文本清洗（提取 URL 或 淘口令）
  // 应对用户复制的类似 "【淘宝】https://m.tb.cn/h.xxx CZ0001 纸巾..." 的脏数据
  const urlRegex = /(http|https):\/\/[\w\-_]+(\.[\w\-_]+)+([\w\-\.,@?^=%&:/~\+#]*[\w\-\@?^=%&/~\+#])?/;
  const cleanQuery = query.match(urlRegex) ? query.match(urlRegex)[0] : query;

  try {
    // 3. 代理请求第三方 CPS 聚合接口 (以折淘客高佣转链 API 为例)
    // 实际生产中可根据文档替换具体的 API URL
    const response = await axios.get(`https://api.zhetaoke.com/api/open_gaoyongzhuanlian.ashx`, {
      params: {
        appkey: APP_KEY,
        sid: PID,
        content: cleanQuery,
        type: 1 // 1:强制高佣转链
      },
      timeout: 3000 // 性能基线：控制 API 响应超时，防止前端死等
    });

    const data = response.data;

    // 4. 解析结果与 DTO 组装
    if (data && data.status === 200 && data.content && data.content.length > 0) {
      const item = data.content[0];
      
      // 执行合规清洗，剥离 item.commission_money
      const safePointsDisplay = formatMoneyToPoints(item.commission_money);
      
      // 注入归因参数 (source & openid) 用于后期的 Webhook 对账
      const jumpUrlWithAttribution = `${item.tkmoney_url}&source=search&openid=${user_openid}`;

      // 返回符合《白皮书 V2.0》标准的 Response DTO
      return {
        success: true,
        data: {
          title: item.title,
          pic: item.pict_url,
          origin_price: parseFloat(item.size || 0),
          coupon_price: parseFloat(item.quanhou_jiage || 0),
          points_display: safePointsDisplay, 
          jump_url: jumpUrlWithAttribution
        }
      };
    } else {
      // API 返回失败或无佣金商品
      return { success: false, msg: "该商品暂无专属优惠" };
    }

  } catch (error) {
    console.error("[系统异常] 查券引擎调用失败:", error.message);
    // 兜底容错流，确保前端不会崩溃
    return { success: false, msg: "系统繁忙，请稍后再试" };
  }
};