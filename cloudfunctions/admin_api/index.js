const cloud = require('wx-server-sdk');
const crypto = require('crypto');

// 初始化云环境 (DYNAMIC_CURRENT_ENV 自动匹配当前环境)
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

// ==========================================
// Token 验证中间件
// ==========================================
async function verifyToken(token) {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const now = Date.now();

    // 检查 token 是否过期
    if (payload.exp && payload.exp < now) {
      return null;
    }

    // 验证签名
    const secret = 'lwqx_admin_secret_key_2024';
    const expectedSignature = crypto.createHmac('sha256', secret)
      .update(`${parts[0]}.${parts[1]}`)
      .digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      
    if (parts[2] !== expectedSignature) {
      return null;
    }

    // 验证数据库中的 token 是否有效
    const user = await db.collection('30_users').doc(payload.uid).get();
    if (!user.data || user.data.valid_token !== token) {
      return null;
    }

    return user.data;
  } catch (e) {
    console.error('[Token Verify Error]', e);
    return null;
  }
}

// 需要验证 token 的 actions 列表
const TOKEN_REQUIRED_ACTIONS = new Set([
  'get_dashboard',
  'get_orders',
  'get_search_logs',
  'get_manage_config',
  'update_manage_config',
  'get_operations_config',
  'update_operations_config',
  'get_doc',
  'update_doc',
  'get_cron_tasks',
  'get_cron_logs',
  'run_cron_task',
  'backfill_stats',
  'get_admin_users',
  'add_admin_user',
  'update_admin_user',
  'delete_admin_user'
]);

// ==========================================
// 操作日志记录
// ==========================================
async function logOperation(action, adminUser, payload = {}) {
  try {
    await db.collection('30_admin_logs').add({
      data: {
        action: action,
        admin_id: adminUser._id,
        admin_name: adminUser.username,
        payload: JSON.stringify(payload),
        created_at: db.serverDate(),
        ip: payload.ip || 'unknown'
      }
    });
  } catch (e) {
    if (e.message && e.message.includes('not exist')) {
      try {
        await db.createCollection('30_admin_logs');
        await db.collection('30_admin_logs').add({
          data: {
            action: action,
            admin_id: adminUser._id,
            admin_name: adminUser.username,
            payload: JSON.stringify(payload),
            created_at: db.serverDate(),
            ip: payload.ip || 'unknown'
          }
        });
      } catch (err) {
        console.error('[Log Operation Create Error]', err);
      }
    } else {
      console.error('[Log Operation Error]', e);
    }
  }
}

exports.main = async (event, context) => {
  // 1. 兼容性解析：处理 HTTP 网关触发 vs 微信原生调用的参数差异
  let params = event;
  if (event.httpMethod) {
    try {
      // 通过 API 网关 POST 过来的 JSON 数据通常在 event.body 中，且为字符串
      params = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } catch (e) {
      return { code: 400, msg: "请求体 JSON 解析失败" };
    }
  }

  const { action, token, ...payload } = params;

  // 2. Token 验证（登录接口除外）
  let adminUser = null;
  if (action !== 'login') {
    if (!token) {
      return { code: 401, msg: "未提供认证令牌" };
    }
    adminUser = await verifyToken(token);
    if (!adminUser) {
      return { code: 401, msg: "认证令牌无效或已过期" };
    }

    // 记录操作日志（排除查询类操作）
    if (TOKEN_REQUIRED_ACTIONS.has(action) && !action.startsWith('get_')) {
      await logOperation(action, adminUser, payload);
    }
  }

  // 3. 路由分发中心
  try {
    switch (action) {
      case 'login':
        return await handleLogin(payload);
      // --- 管理员用户管理模块 ---
      case 'get_admin_users':
        return await getAdminUsers(payload);
      case 'add_admin_user':
        return await addAdminUser(payload);
      case 'update_admin_user':
        return await updateAdminUser(payload);
      case 'delete_admin_user':
        return await deleteAdminUser(payload);
      case 'get_dashboard':
        return await getDashboard(payload);
      case 'get_orders':
        return await getOrders(payload);
      // --- 查券管理模块 ---
      case 'get_search_logs':
        return await getSearchLogs(payload);
      case 'get_bulletin_logs':
        return await getBulletinLogs(payload);
      // --- 系统设置模块 ---
      case 'get_manage_config':
        return await getManageConfig(payload);
      case 'update_manage_config':
        return await updateManageConfig(payload);
      // --- 运营配置模块 ---
      case 'get_operations_config':
        return await getOperationsConfig();
      case 'update_operations_config':
        return await updateOperationsConfig(payload);
      // --- 积分规则模块 (已废弃) ---
      // --- 系统说明书模块 ---
      case 'get_doc':
        return await getDoc();
      case 'update_doc':
        return await updateDoc(payload);
      // --- 定时任务模块 ---
      case 'get_cron_tasks':
        return await getCronTasks(payload);
      case 'get_cron_logs':
        return await getCronLogs(payload);
      case 'run_cron_task':
        return await runCronTask(payload);
      // --- 临时数据聚合 ---
      case 'backfill_stats':
        return await backfillStats(payload);
      // --- 操作日志 ---
      case 'get_operation_logs':
        return await getOperationLogs(payload);
      default:
        return { code: 404, msg: `未知动作指令: ${action}` };
    }
  } catch (error) {
    console.error(`[Admin API Error] Action: ${action}`, error);
    return { code: 500, msg: "服务器内部错误", error: error.message };
  }
};

// ==========================================
// 模块 1: 超级管理员登录校验 (含自动初始化)
// ==========================================
async function handleLogin({ username, password }) {
  if (!username || !password) return { code: 400, msg: "账号密码不能为空" };

  // 自动初始化: 检查超级管理员是否已存在于数据库
  const superCheck = await db.collection('30_users').where({ username: 'Superuser' }).get();
  if (superCheck.data.length === 0) {
    // 首次启动系统，自动写入内置超级管理员
    await db.collection('30_users').add({
      data: {
        username: 'Superuser',
        password: 'password',
        role: 'superuser',
        created_at: db.serverDate(),
        last_login_time: null
      }
    });
    console.log('[Admin API] 超级管理员 Superuser 自动初始化完成');
  }

  // 兼容历史账号 SuperAdmin（仅当账号存在且没有 password 字段时才添加）
  const superAdminCheck = await db.collection('30_users').where({ username: 'SuperAdmin' }).get();
  if (superAdminCheck.data.length > 0) {
    const superAdmin = superAdminCheck.data[0];
    if (!superAdmin.password) {
      await db.collection('30_users').doc(superAdmin._id).update({
        data: { password: 'password' }
      });
      console.log('[Admin API] 历史账号 SuperAdmin 已添加密码字段');
    }
  }

  const res = await db.collection('30_users').where({ username, password }).get();

  if (res.data.length > 0) {
    const admin = res.data[0];
    // 更新最后登录时间
    await db.collection('30_users').doc(admin._id).update({
      data: { last_login_time: db.serverDate() }
    });

    // 生成简单的 JWT-like token（包含用户ID和过期时间）
    const now = Date.now();
    const expireAt = now + 7 * 24 * 60 * 60 * 1000; // 7天有效期
    const tokenData = {
      uid: admin._id,
      username: admin.username,
      role: admin.role || 'admin',
      exp: expireAt
    };

    // 使用 Base64 编码生成 token（生产环境建议使用真正的 JWT 库）
    const tokenHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const tokenPayload = Buffer.from(JSON.stringify(tokenData)).toString('base64');
    // 使用 HMAC 生成真实的签名
    const secret = 'lwqx_admin_secret_key_2024';
    const signature = crypto.createHmac('sha256', secret)
      .update(`${tokenHeader}.${tokenPayload}`)
      .digest('base64')
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

    const token = `${tokenHeader}.${tokenPayload}.${signature}`;

    // 存储有效 token 到数据库用于验证
    await db.collection('30_users').doc(admin._id).update({
      data: {
        valid_token: token,
        token_expire_at: expireAt
      }
    });

    return {
      code: 200,
      msg: "登录成功",
      data: {
        token: token,
        username: admin.username,
        role: admin.role || 'admin'
      } 
    };
  } else {
    return { code: 401, msg: "账号或密码错误" };
  }
}

// ==========================================
// 模块 1.1: 管理员用户 CRUD
// ==========================================
async function getAdminUsers() {
  const res = await db.collection('30_users')
    .orderBy('created_at', 'desc')
    .get();
  // 脱敏: 不返回密码明文
  const list = res.data.map(u => ({
    _id: u._id,
    username: u.username,
    role: u.role || 'admin',
    created_at: u.created_at,
    last_login_time: u.last_login_time
  }));
  return { code: 200, data: { list, total: list.length } };
}

async function addAdminUser({ data }) {
  if (!data || !data.username || !data.password) {
    return { code: 400, msg: "用户名和密码不能为空" };
  }
  // 检查用户名是否已存在
  const existing = await db.collection('30_users').where({ username: data.username }).get();
  if (existing.data.length > 0) {
    return { code: 400, msg: "该用户名已存在" };
  }
  await db.collection('30_users').add({
    data: {
      username: data.username,
      password: data.password,
      role: data.role || 'admin',
      created_at: db.serverDate(),
      last_login_time: null
    }
  });
  return { code: 200, msg: "管理员创建成功" };
}

async function updateAdminUser({ id, data }) {
  if (!id || !data) return { code: 400, msg: "参数不完整" };
  const updateData = {};
  if (data.password) updateData.password = data.password;
  if (data.role) updateData.role = data.role;
  // 不允许修改 username
  await db.collection('30_users').doc(id).update({ data: updateData });
  return { code: 200, msg: "管理员信息更新成功" };
}

async function deleteAdminUser({ id }) {
  if (!id) return { code: 400, msg: "缺少用户 ID" };
  // 安全拦截: 不允许删除超级管理员
  const user = await db.collection('30_users').doc(id).get();
  if (user.data && user.data.username === 'Superuser') {
    return { code: 403, msg: "超级管理员不允许删除" };
  }
  await db.collection('30_users').doc(id).remove();
  return { code: 200, msg: "管理员已删除" };
}

// ==========================================
// 模块 2: 财务大盘数据聚合
// ==========================================
async function getDashboard() {
  const _ = db.command;
  const now = new Date();
  const bjNow = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const todayStr = `${bjNow.getUTCFullYear()}-${String(bjNow.getUTCMonth() + 1).padStart(2, '0')}-${String(bjNow.getUTCDate()).padStart(2, '0')}`;
  const monthStart = new Date(bjNow.getUTCFullYear(), bjNow.getUTCMonth(), 1);
  const lastMonthStart = new Date(bjNow.getUTCFullYear(), bjNow.getUTCMonth() - 1, 1);
  
  // 2. 并发获取各项核心指标，使用 Promise.allSettled 防止未建表导致整个大盘崩溃
  const results = await Promise.allSettled([
    db.collection('30_members').count(),
    // 注意：30_members 历史数据可能使用 createTime 或 created_at，这里使用 createTime 兼容
    db.collection('30_members').where({ createTime: _.gte(new Date(now.setHours(0,0,0,0))) }).count(),
    db.collection('30_orders').count(),
    db.collection('30_orders').where({ createTime: _.gte(todayStr), status: _.neq('invalid') }).get(),
    db.collection('30_orders').orderBy('createTime', 'desc').limit(10).get(),
    db.collection('30_daily_stats').where({ _id: _.gte(dayFormat(monthStart)) }).get(),
    db.collection('30_daily_stats').where({ _id: _.and(_.gte(dayFormat(lastMonthStart)), _.lt(dayFormat(monthStart))) }).get(),
    db.collection('30_daily_stats').orderBy('_id', 'desc').limit(30).get()
  ]);

  // 辅助函数：从 allSettled 结果中安全提取数据
  const safeResult = (result, defaultVal) => result.status === 'fulfilled' ? result.value : defaultVal;

  const totalUsers = safeResult(results[0], { total: 0 });
  const todayUsers = safeResult(results[1], { total: 0 });
  const totalOrders = safeResult(results[2], { total: 0 });
  const todayOrdersRes = safeResult(results[3], { data: [] });
  const realtimeOrders = safeResult(results[4], { data: [] });
  const monthStatsRes = safeResult(results[5], { data: [] });
  const lastMonthStatsRes = safeResult(results[6], { data: [] });
  const monthTrendRes = safeResult(results[7], { data: [] });

  // 计算今日实时佣金
  const todayCommission = todayOrdersRes.data.reduce((acc, cur) => acc + (cur.commission || 0), 0);
  
  // 计算本月/上月总量用于增长率
  const currentMonthCommission = monthStatsRes.data.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const lastMonthCommission = lastMonthStatsRes.data.reduce((acc, cur) => acc + (cur.amount || 0), 0);
  const growthRate = lastMonthCommission > 0 
    ? ((currentMonthCommission - lastMonthCommission) / lastMonthCommission * 100).toFixed(1) 
    : "100.0";

  // 2. 构造关键业务指标
  const businessMetrics = {
    avgOrderValue: totalOrders.total > 0 ? (currentMonthCommission / (totalOrders.total || 1)).toFixed(2) : "0.00",
    conversionRate: totalUsers.total > 0 ? (totalOrders.total / totalUsers.total * 100).toFixed(1) + "%" : "0.0%",
    activeUsers: totalUsers.total, 
    monthlyGrowth: `${parseFloat(growthRate) >= 0 ? '+' : ''}${growthRate}%`
  };

  // 3. 构造 5 大 KPI 卡片
  const stats = [
    { title: "今日新增用户", value: todayUsers.total || 0, icon: "Users" },
    { title: "今日活跃订单", value: todayOrdersRes.data.length || 0, icon: "ShoppingCart" }, 
    { title: "今日预估佣金", value: `¥${todayCommission.toFixed(2)}`, icon: "TrendingUp" },
    { title: "本月预估佣金", value: `¥${currentMonthCommission.toFixed(2)}`, icon: "DollarSign" },
    { title: "系统用户总数", value: totalUsers.total || 0, icon: "Award" }
  ];

  return {
    code: 200,
    data: {
      stats,
      // 必须返回平铺字段，兼容前端 Dashboard.tsx 的取值逻辑
      totalUsers: totalUsers.total,
      todayNewUsers: todayUsers.total,
      todayOrders: todayOrdersRes.data.length,
      todayCommission: todayCommission,
      monthCommission: currentMonthCommission,
      // 其他图表数据，注意按日期升序排列以便图表从左到右显示
      // 数据库返回的是按 _id(日期) 降序排列的最新30条记录，所以这里需要 .reverse()
      monthTrend: [...monthTrendRes.data].reverse().map(item => ({
        date: item._id ? item._id.substring(5) : "",
        amount: item.amount || 0,
        orders: item.count || 0
      })),
      realtimeOrders: realtimeOrders.data.map(o => {
        const rawTime = o.createTime || o.create_time;
        // 原格式：2026-04-04 18:45:07 -> 目标格式：2026.04.04 18:45
        const timeStr = rawTime ? rawTime.substring(0, 16).replace(/-/g, '.') : "--:--";
        return {
          time: timeStr,
          user: maskNickname(o._openid || "匿名用户"),
          amount: (o.commission || 0).toFixed(2)
        };
      }),
      orderTrend: [...monthTrendRes.data].reverse().map(item => ({ 
        date: item._id ? item._id.substring(5) : "", 
        count: item.count || 0 
      })), 
      businessMetrics
    }
  };
}

// 辅助工具函数
function dayFormat(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatTime(date) {
  if (!date) return "--:--";
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function maskNickname(str) {
  if (str.length <= 4) return "****";
  return str.substring(0, 2) + "****" + str.substring(str.length - 4);
}


// ==========================================
// 模块 3: 对账中心 (带分页、搜索、排序)
// ==========================================
async function getOrders({ page = 1, pageSize = 10, orderId = '', status = '', keyword = '', platform = '' }) {
  let query = {};
  
  // 兼顾多种搜索参数
  const searchKey = orderId || keyword;
  if (searchKey) {
    query = _.or([
      { orderId: db.RegExp({ regexp: searchKey, options: 'i' }) },
      { productName: db.RegExp({ regexp: searchKey, options: 'i' }) },
      { _openid: db.RegExp({ regexp: searchKey, options: 'i' }) }
    ]);
  }

  if (status && status !== 'all') {
    query.status = status;
  }
  
  if (platform) {
    query.platform = platform;
  }

  const collection = db.collection('30_orders');
  const totalRes = await collection.where(query).count();
  const listRes = await collection.where(query)
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  // 映射字段以符合前端 OrderCenter.tsx 的 OrderData 定义
  const list = listRes.data.map(item => {
    // 兼容可能存在的嵌套 data 结构
    const core = item.data || item;
    
    // 1. 处理时间对象与字符串的兼容性 (北京时间转换)
    const rawTime = core.createTime || item._createTime;
    let beijingTimeStr = "";
    if (rawTime) {
      const d = new Date(rawTime);
      if (!isNaN(d.getTime())) {
        const pad = (n) => (n < 10 ? '0' + n : n);
        // 如果是 Date 对象或非法格式字符串，统一转为标准 YYYY-MM-DD HH:mm:ss
        beijingTimeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      }
    }

    const resPayload = {
      ...core,
      platform: core.platform || "淘宝",
      _id: item._id,
      key: item._id,
      orderId: core.orderId || item._id, // 淘宝单号
      productName: core.productName || core.title || "未知商品",
      openId: core._openid || core.openid || core.bind_openid || "未绑定",
      pointsRule: core.pointsRule || "系统默认",
      createTime: beijingTimeStr || core.createTime || "",
      updateTime: core.updateTime || item._updateTime || beijingTimeStr || "",
      // 增强财务字段回退
      originalPrice: parseFloat(core.originalPrice || core.zk_final_price || core.item_price || 0),
      actualPrice: parseFloat(core.actualPrice || core.orderAmount || core.alipay_total_price || 0),
      couponAmount: parseFloat(core.couponAmount || 0),
      points: parseInt(core.points || (core.commission * 100) || 0)
    };
    
    // 自动补全节省金额 (如果缺失)
    if (resPayload.couponAmount === 0 && resPayload.originalPrice > resPayload.actualPrice) {
      resPayload.couponAmount = parseFloat((resPayload.originalPrice - resPayload.actualPrice).toFixed(2));
    }
    
    // 2. 动态生成或修正流水号 (YYYYMMDDHHmm + 后4位)
    // 确保结果总是 16 位数字 (即使缺失时间也补齐 YYYYMMDDHHmm)
    if (!resPayload.serialNo || resPayload.serialNo.startsWith('SN')) {
      const dateSource = beijingTimeStr || core.createTime || item._createTime || core.updateTime || item._updateTime || "2024-01-01 00:00:00";
      const d = new Date(dateSource);
      const pad = (n) => (n < 10 ? '0' + n : n);
      const datePart = isNaN(d.getTime()) ? "202401010000" : `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;
      const tailPart = String(resPayload.orderId || item._id).slice(-4).padStart(4, '0');
      resPayload.serialNo = datePart + tailPart;
    }
    
    return resPayload;
  });

  return { code: 200, data: { list, total: totalRes.total } };
}

// ==========================================
// 模块 5.1: 查券行为日志管理
// ==========================================
async function getBulletinLogs({ page = 1, pageSize = 10, platform = '' }) {
  let query = {};
  if (platform) {
    query.platform = platform;
  }

  const totalRes = await db.collection('bulletin_logs').where(query).count();
  const listRes = await db.collection('bulletin_logs')
    .where(query)
    .orderBy('event_timestamp', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    code: 200,
    data: {
      list: listRes.data,
      total: totalRes.total,
      page,
      pageSize
    }
  };
}

// ==========================================
// 模块 5.2: 真实查券行为日志查询 (30_search_logs)
// ==========================================
async function getSearchLogs({ page = 1, pageSize = 10, platform = '' }) {
  let query = {};
  if (platform) {
    query.platform = platform;
  }

  try {
    const totalRes = await db.collection('30_search_queries').where(query).count();
    const listRes = await db.collection('30_search_queries')
      .where(query)
      .orderBy('event_timestamp', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get();

    const fixedList = listRes.data.map(item => {
      // 修复历史遗留的脏数据：如果原价等于券后价，且存在优惠券，则真正的原价应该是券后价+优惠券金额
      if (item.originalPrice && item.finalPrice && item.couponAmount > 0) {
        if (Number(item.originalPrice) === Number(item.finalPrice)) {
          item.originalPrice = Number((Number(item.finalPrice) + Number(item.couponAmount)).toFixed(2));
        }
      }
      return item;
    });

    return {
      code: 200,
      data: {
        list: fixedList,
        total: totalRes.total,
        page,
        pageSize
      }
    };
  } catch (e) {
    // 集合不存在时返回空数据
    return {
      code: 200,
      data: {
        list: [],
        total: 0,
        page,
        pageSize
      }
    };
  }
}

// ==================== [4] 系统设置 ====================
async function getManageConfig(payload) {
  const configId = payload.config_id || 'global';
  try {
    const res = await db.collection('30_system_config').doc(configId).get();
    return { code: 200, data: res.data || {} };
  } catch (err) {
    // 第一次查不到说明还没初始化
    return { code: 200, data: { status: "未配置" } };
  }
}
async function updateManageConfig(payload) {
  const configId = payload.config_id || 'global';
  const updateData = { ...payload.data, updateTime: db.serverDate() };
  delete updateData._id;
  try {
    const docRef = db.collection('30_system_config').doc(configId);
    let exists = false;
    try {
      await docRef.get();
      exists = true;
    } catch (getErr) {
      exists = false;
    }

    if (exists) {
      await docRef.update({ data: updateData });
    } else {
      await docRef.set({ data: updateData });
    }
    
    return { code: 200, msg: "配置保存成功" };
  } catch (err) {
    if (err.message && err.message.includes('collection not exists')) {
      try {
        await db.createCollection('30_system_config');
        await db.collection('30_system_config').doc('global').set({ data: updateData });
        return { code: 200, msg: "配置保存成功" };
      } catch (createErr) {
        return { code: 500, msg: "需要手动创建系统集合: 请在云开发控制台数据库中新建集合 system_config" };
      }
    }
    return { code: 500, msg: "配置保存失败: " + err.message };
  }
}
// ==================== [4.5] 运营配置 ====================
async function getOperationsConfig() {
  try {
    const res = await db.collection('30_system_config').doc('operations_config').get();
    return { code: 200, data: res.data || {} };
  } catch (err) {
    return { code: 200, data: { status: "未配置" } };
  }
}
async function updateOperationsConfig({ data }) {
  const updateData = { ...data, updateTime: db.serverDate() };
  delete updateData._id;
  try {
    await db.collection('30_system_config').doc('operations_config').set({ data: updateData });
    return { code: 200, msg: "运营配置保存成功" };
  } catch (err) {
    if (err.message && err.message.includes('collection not exists')) {
      try {
        await db.createCollection('30_system_config');
        await db.collection('30_system_config').doc('operations_config').set({ data: updateData });
        return { code: 200, msg: "运营配置保存成功" };
      } catch (e) {
        return { code: 500, msg: "需要手动创建系统集合: 请在云开发控制台新建集合 system_config" };
      }
    }
    return { code: 500, msg: "运营配置保存失败: " + err.message };
  }
}
// ==================== [4.6] 系统说明书 ====================
async function getDoc() {
  try {
    const res = await db.collection('30_system_config').doc('documentation').get();
    if (res.data && res.data.content) {
      return { code: 200, data: res.data };
    }
    // 如果没有数据，返回默认预设内容
    const defaultData = [
      {
        title: "1. 订单同步逻辑",
        items: [
          { q: "订单什么时候同步？", a: "订单一般在用户下单后的 15-30 分钟内同步到系统。" },
          { q: "为什么订单状态没有更新？", a: "订单状态每天定时更新，如果是刚刚确认收货，请等待明天刷新。" }
        ]
      },
      {
        title: "2. 关于查券",
        items: [
          { q: "如何查询隐藏优惠？", a: "前往淘宝等 App 复制商品口令或分享链接，回到本小程序将自动进行弹窗解析；您也可以通过底部的搜索框手工查找全网商品。" }
        ]
      }
    ];
    return { 
      code: 200, 
      data: { 
        status: "已启用", 
        content: JSON.stringify(defaultData) 
      } 
    };
  } catch (err) {
    // 同样返回默认预设
    const defaultData = [
      {
        title: "1. 订单同步逻辑",
        items: [
          { q: "订单什么时候同步？", a: "订单一般在用户下单后的 15-30 分钟内同步到系统。" },
          { q: "为什么订单状态没有更新？", a: "订单状态每天定时更新，如果是刚刚确认收货，请等待明天刷新。" }
        ]
      },
      {
        title: "2. 关于查券",
        items: [
          { q: "如何查询隐藏优惠？", a: "前往淘宝等 App 复制商品口令或分享链接，回到本小程序将自动进行弹窗解析；您也可以通过底部的搜索框手工查找全网商品。" }
        ]
      }
    ];
    return { 
      code: 200, 
      data: { 
        status: "已启用", 
        content: JSON.stringify(defaultData) 
      } 
    };
  }
}
async function updateDoc({ data }) {
  const updateData = { content: data, updateTime: db.serverDate() };
  try {
    await db.collection('30_system_config').doc('documentation').set({ data: updateData });
    return { code: 200, msg: "说明书更新成功" };
  } catch (err) {
    if (err.message && err.message.includes('collection not exists')) {
      try {
        await db.createCollection('30_system_config');
        await db.collection('30_system_config').doc('documentation').set({ data: updateData });
        return { code: 200, msg: "说明书更新成功" };
      } catch (e) {
        return { code: 500, msg: "需要手动创建系统集合: 请在云开发控制台新建集合 system_config" };
      }
    }
    return { code: 500, msg: "说明文档保存失败: " + err.message };
  }
}
// ==================== [5] 手动触发任务 ====================
async function runCronTask(payload) {
  const taskId = payload.taskId;
  const startTime = payload.startTime;
  const endTime = payload.endTime;

  try {
    if (taskId && taskId.includes('sync')) {
      // 触发订单同步云函数 (异步调用)
      // 注意：为了防止 API 网关 15s 超时，发出请求后不阻塞等待其完成，从而避免 504 Gateway Timeout
      cloud.callFunction({
        name: taskId,
        data: { triggerSource: 'admin_manual', startTime, endTime }
      }).catch(e => console.error("[Admin API] 异步调用云函数异常:", e));
      
      return { code: 200, msg: "同步任务已启动，后台正在执行中" };
    }
    return { code: 400, msg: "暂不支持手动触发该类型任务" };
  } catch (err) {
    return { code: 500, msg: "手动触发失败: " + err.message };
  }
}

// ==================== [6] 定时任务日志 ====================
async function getCronTasks({ platform }) {
  // 定义静态任务元数据
  const taskConfigs = [
    {
      taskId: 'sync_tk_orders',
      taskName: '同步折淘客后台订单',
      taskType: '订单同步',
      platform: '淘宝',
      description: '从折淘客 API 拉取最近 40 分钟内的淘宝订单状态并同步到本地库',
      cronExpression: '0 0/10 * * * ?',
    },
    {
      taskId: 'sync_jd_orders',
      taskName: '同步折京客后台订单',
      taskType: '订单同步',
      platform: '京东',
      description: '从折京客 API 拉取最近 2 小时内的京东订单状态并同步到本地库',
      cronExpression: '0 */10 * * * * *',
    }
  ];

  let filteredConfigs = taskConfigs;
  if (platform) {
    filteredConfigs = taskConfigs.filter(t => t.platform === platform);
  }

  const taskList = [];

  for (const config of filteredConfigs) {
    // 获取每个任务的最后一次执行记录
    const lastLog = await db.collection('30_task_logs')
      .where({ taskId: config.taskId })
      .orderBy('startTime', 'desc')
      .limit(1)
      .get()
      .catch(() => ({ data: [] }));

    const logData = lastLog.data[0] || {};
    
    taskList.push({
      _id: config.taskId,
      ...config,
      status: logData.status || 'success', // 默认 success 如果从未运行
      lastRunTime: logData.startTime || '从未运行',
      duration: logData.duration || 0,
      errorMessage: logData.errorMessage || '',
      nextRunTime: '由云函数触发器控制'
    });
  }

  return {
    code: 200,
    data: {
      list: taskList,
      total: taskList.length
    }
  };
}

async function getCronLogs({ taskId, page = 1, pageSize = 10 }) {
  const countRes = await db.collection('30_task_logs').where({ taskId }).count();
  const listRes = await db.collection('30_task_logs')
    .where({ taskId })
    .orderBy('startTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  return {
    code: 200,
    data: {
      list: listRes.data,
      total: countRes.total,
      page,
      pageSize
    }
  };
}

// ==========================================
// 临时数据聚合：将历史 30_orders 数据汇总到 30_daily_stats
// ==========================================
async function backfillStats() {
  try {
    const _ = db.command;
    // 获取所有的非失效订单，进行聚合。由于这里只作单次补数据使用，最大获取1000条即可
    const res = await db.collection('30_orders').where({
      status: _.neq('invalid')
    }).limit(1000).get();

    const orders = res.data || [];
    if (orders.length === 0) {
      return { code: 200, msg: "没有需要聚合的历史订单数据" };
    }

    const statsMap = {};
    orders.forEach(order => {
      // 兼容历史表可能使用的其他时间字段
      let dTime = order.createTime || order.create_time || order.created_at || order.tk_create_time || order.time || order.pay_time;
      
      // 如果是个 Date 对象，转成字符串
      if (dTime && typeof dTime.toISOString === 'function') {
        dTime = dTime.toISOString();
      }

      if (!dTime || typeof dTime !== 'string') return;
      
      const dateStr = dTime.substring(0, 10); // 取 YYYY-MM-DD
      
      if (!statsMap[dateStr]) {
        statsMap[dateStr] = { amount: 0, count: 0, date: dateStr };
      }
      statsMap[dateStr].amount += (order.commission || order.commission_fee || 0);
      statsMap[dateStr].count += 1;
    });

    if (Object.keys(statsMap).length === 0) {
      return { 
        code: 200, 
        msg: "遍历了订单，但没有找到有效的时间字段导致无法聚合", 
        debug_sample_order: orders[0] 
      };
    }

    // 写入数据库
    const promises = Object.keys(statsMap).map(dateStr => {
      const stat = statsMap[dateStr];
      stat.amount = parseFloat(stat.amount.toFixed(2));
      stat.updateTime = db.serverDate();
      
      return db.collection('30_daily_stats').doc(dateStr).set({
        data: stat
      });
    });

    await Promise.all(promises);

    return { 
      code: 200, 
      msg: `历史大盘数据聚合成功，共计更新了 ${Object.keys(statsMap).length} 天的数据！`,
      data: statsMap
    };
  } catch (error) {
    return { code: 500, msg: "历史数据聚合失败: " + error.message };
  }
}

// ==========================================
// 模块 10: 操作日志查询
// ==========================================
async function getOperationLogs({ page = 1, pageSize = 20 }) {
  try {
    const skip = (page - 1) * pageSize;
    const countRes = await db.collection('30_admin_logs').count();
    const total = countRes.total;

    const res = await db.collection('30_admin_logs')
      .orderBy('created_at', 'desc')
      .skip(skip)
      .limit(pageSize)
      .get();

    return {
      code: 200,
      data: {
        items: res.data,
        total: total,
        page: page,
        pageSize: pageSize
      }
    };
  } catch (err) {
    if (err.message && err.message.includes('not exist')) {
      return {
        code: 200,
        data: {
          items: [],
          total: 0,
          page: page,
          pageSize: pageSize
        }
      };
    }
    return { code: 500, msg: "获取日志失败: " + err.message };
  }
}
