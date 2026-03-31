const cloud = require('wx-server-sdk');

// 初始化云环境 (DYNAMIC_CURRENT_ENV 自动匹配当前环境)
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();
const _ = db.command;

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

  const { action, ...payload } = params;

  // 2. 路由分发中心
  try {
    switch (action) {
      case 'login':
        return await handleLogin(payload);
      case 'get_dashboard':
        return await getDashboard(payload);
      case 'get_orders':
        return await getOrders(payload);
      case 'get_users':
        return await getUsers(payload);
      case 'toggle_user_status':
        return await toggleUserStatus(payload);
      // --- 系统设置模块 ---
      case 'get_manage_config':
        return await getManageConfig();
      case 'update_manage_config':
        return await updateManageConfig(payload);
      // --- 运营配置模块 ---
      case 'get_operations_config':
        return await getOperationsConfig();
      case 'update_operations_config':
        return await updateOperationsConfig(payload);
      // --- 积分规则模块 ---
      case 'get_points_rules':
        return await getPointsRules(payload);
      case 'get_points_rule':
        return await getPointsRule(payload);
      case 'create_points_rule':
        return await createPointsRule(payload);
      case 'update_points_rule':
        return await updatePointsRule(payload);
      case 'delete_points_rule':
        return await deletePointsRule(payload);
      // --- 系统说明书模块 ---
      case 'get_doc':
        return await getDoc();
      case 'update_doc':
        return await updateDoc(payload);
      // --- 定时任务模块 ---
      case 'get_cron_tasks':
        return await getCronTasks();
      case 'get_cron_logs':
        return await getCronLogs(payload);
      case 'run_cron_task':
        return await runCronTask(payload);
      default:
        return { code: 404, msg: `未知动作指令: ${action}` };
    }
  } catch (error) {
    console.error(`[Admin API Error] Action: ${action}`, error);
    return { code: 500, msg: "服务器内部错误", error: error.message };
  }
};

// ==========================================
// 模块 1: 超级管理员登录校验
// ==========================================
async function handleLogin({ username, password }) {
  if (!username || !password) return { code: 400, msg: "账号密码不能为空" };

  const res = await db.collection('admin_users').where({ username, password }).get();
  
  if (res.data.length > 0) {
    const admin = res.data[0];
    // 更新最后登录时间
    await db.collection('admin_users').doc(admin._id).update({
      data: { last_login_time: db.serverDate() }
    });
    // 返回模拟 Token (实际生产可换成 JWT)
    return { 
      code: 200, 
      msg: "登录成功", 
      data: { token: `token_${new Date().getTime()}_${admin._id}`, username: admin.username } 
    };
  } else {
    return { code: 401, msg: "账号或密码错误" };
  }
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
  
  // 1. 并发获取各项核心指标
  const [
    totalUsers, 
    todayUsers, 
    totalOrders, 
    todayOrdersRes,
    realtimeOrders,
    monthStatsRes,
    lastMonthStatsRes,
    monthTrendRes
  ] = await Promise.all([
    db.collection('users').count(),
    db.collection('users').where({ created_at: _.gte(new Date(now.setHours(0,0,0,0))) }).count(),
    db.collection('tk_orders').count(),
    db.collection('tk_orders').where({ createTime: _.gte(todayStr), status: _.neq('invalid') }).get(), // 今日实时订单
    db.collection('tk_orders').orderBy('createTime', 'desc').limit(10).get(), // 实时订单流
    db.collection('daily_stats').where({ _id: _.gte(dayFormat(monthStart)) }).get(), // 本月流水
    db.collection('daily_stats').where({ _id: _.and(_.gte(dayFormat(lastMonthStart)), _.lt(dayFormat(monthStart))) }).get(), // 上月流水
    db.collection('daily_stats').orderBy('_id', 'asc').limit(30).get() // 30天趋势
  ]);

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
      monthTrend: monthTrendRes.data,
      realtimeOrders: realtimeOrders.data.map(o => {
        const timeStr = o.createTime ? (o.createTime.includes(' ') ? o.createTime.split(' ')[1].substring(0, 5) : "--:--") : "--:--";
        return {
          time: timeStr,
          user: maskNickname(o._openid || "匿名用户"),
          amount: (o.commission || 0).toFixed(2)
        };
      }),
      orderTrend: monthTrendRes.data.map(d => ({ date: d.date, count: d.count || 0 })), 
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
async function getOrders({ page = 1, pageSize = 10, orderId = '', status = '', keyword = '' }) {
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

  const collection = db.collection('tk_orders');
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
// 模块 4: 用户资产列表 (带分页、搜索)
// ==========================================
// ==========================================
// 模块 4: 用户资产列表 (带分页、搜索、积分聚合)
// ==========================================
async function getUsers({ page = 1, pageSize = 10, keyword = '' }) {
  let query = {};
  if (keyword) {
    query = _.or([
      { _openid: db.RegExp({ regexp: keyword, options: 'i' }) },
      { nickname: db.RegExp({ regexp: keyword, options: 'i' }) },
      { nickName: db.RegExp({ regexp: keyword, options: 'i' }) }
    ]);
  }

  const totalRes = await db.collection('users').where(query).count();
  const listRes = await db.collection('users').where(query)
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get();

  const users = listRes.data;
  if (users.length === 0) return { code: 200, data: { list: [], total: 0 } };

  const openids = users.map(u => u._openid);

  // 聚合积分数据
  const $ = db.command.aggregate;
  const pointsRes = await db.collection('tk_orders').aggregate()
    .match({
      _openid: _.in(openids)
    })
    .group({
      _id: '$_openid',
      settled: $.sum($.cond({
        if: $.eq(['$status', 'settled']),
        then: '$points',
        else: 0
      })),
      pending: $.sum($.cond({
        if: $.eq(['$status', 'pending']),
        then: '$points',
        else: 0
      }))
    })
    .end();

  const pointsMap = {};
  pointsRes.list.forEach(item => {
    pointsMap[item._id] = item;
  });

  const list = users.map(u => {
    const p = pointsMap[u._openid] || { settled: 0, pending: 0 };
    return {
      ...u,
      _openid: u._openid || u.openid || u._id,
      nickname: u.nickname || u.nickName || "小程序用户",
      totalPoints: Number(((p.settled || 0) + (p.pending || 0)).toFixed(2)),
      availablePoints: Number((p.settled || 0).toFixed(2)),
      frozenPoints: Number((p.pending || 0).toFixed(2)),
      status: u.status !== undefined ? u.status : 1, // 默认 1 (正常)
      registerTime: u.createTime || u.created_at || u._createTime || "",
      lastActiveTime: u.updateTime || u.updated_at || u._updateTime || u.createTime || u.created_at || ""
    };
  });

  return { code: 200, data: { list, total: totalRes.total } };
}

// ==========================================
// 模块 5: 核心风控 - 一键冻结/解冻用户
// ==========================================
async function toggleUserStatus({ openid, status }) {
  if (!openid || status === undefined) return { code: 400, msg: "参数不完整" };

  await db.collection('users').where({ _openid: openid }).update({
    data: { 
      status: status,
      updateTime: db.serverDate()
    }
  });

  return { code: 200, msg: status === 1 ? "账号已解冻" : "账号已冻结数据已同步" };
}

// ==================== [4] 系统设置 ====================
async function getManageConfig() {
  try {
    const res = await db.collection('system_config').doc('global_config').get();
    return { code: 200, data: res.data || {} };
  } catch (err) {
    // 第一次查不到说明还没初始化
    return { code: 200, data: { status: "未配置" } };
  }
}
async function updateManageConfig({ data }) {
  try {
    // 这里的 data 对应前端 updateSystemConfig 传来的配置对象
    const updateData = { ...data, updateTime: db.serverDate() };
    delete updateData._id;
    // 获取并更新或新建
    await db.collection('system_config').doc('global_config').set({ data: updateData });
    return { code: 200, msg: "配置保存成功" };
  } catch (err) {
    return { code: 500, msg: "配置保存失败: " + err.message };
  }
}
// ==================== [4.5] 运营配置 ====================
async function getOperationsConfig() {
  try {
    const res = await db.collection('system_config').doc('operations_config').get();
    return { code: 200, data: res.data || {} };
  } catch (err) {
    return { code: 200, data: { status: "未配置" } };
  }
}
async function updateOperationsConfig({ data }) {
  try {
    const updateData = { ...data, updateTime: db.serverDate() };
    delete updateData._id;
    await db.collection('system_config').doc('operations_config').set({ data: updateData });
    return { code: 200, msg: "运营配置保存成功" };
  } catch (err) {
    return { code: 500, msg: "运营配置保存失败: " + err.message };
  }
}
// ==================== [4.6] 系统说明书 ====================
async function getDoc() {
  try {
    const res = await db.collection('system_config').doc('documentation').get();
    if (res.data && res.data.content) {
      return { code: 200, data: res.data };
    }
    // 如果没有数据，返回默认预设内容
    const defaultData = [
      {
        title: "1. 关于积分",
        items: [
          { q: "什么是积分？", a: "积分是平台提供的福利，您在购买受支持的特权商品或参与邀请活动时均可获得可观的积分奖励。" },
          { q: "积分怎么拿到手？", a: "您通过本平台转化的订单若无退款，对应的奖励积分将在下个月的 20 号自动到账至此账号。" }
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
        title: "1. 关于积分",
        items: [
          { q: "什么是积分？", a: "积分是平台提供的福利，您在购买受支持的特权商品或参与邀请活动时均可获得可观的积分奖励。" },
          { q: "积分怎么拿到手？", a: "您通过本平台转化的订单若无退款，对应的奖励积分将在下个月的 20 号自动到账至此账号。" }
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
  try {
    const updateData = { content: data, updateTime: db.serverDate() };
    await db.collection('system_config').doc('documentation').set({ data: updateData });
    return { code: 200, msg: "说明书更新成功" };
  } catch (err) {
    return { code: 500, msg: "说明文档保存失败: " + err.message };
  }
}
// ==================== [5] 积分规则 ====================
async function getPointsRules({ keyword, page = 1, pageSize = 10 }) {
  const query = {};
  if (keyword) {
    // 使用正则模糊匹配规则名称
    query.ruleName = db.RegExp({ regexp: keyword, options: 'i' });
  }
  const collection = db.collection('points_rules');
  const countRes = await collection.where(query).count();
  const listRes = await collection.where(query)
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .orderBy('createTime', 'desc')
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
async function getPointsRule({ id }) {
  const res = await db.collection('points_rules').doc(id).get();
  return { code: 200, data: res.data };
}

async function createPointsRule({ data }) {
  const ruleData = {
    ...data,
    createTime: db.serverDate(),
    updateTime: db.serverDate(),
  };

  // 如果新规则是生效状态，先将所有现有规则置为失效
  if (ruleData.status === 'active') {
    await db.collection('points_rules').where({ status: 'active' }).update({
      data: { status: 'inactive', updateTime: db.serverDate() }
    });
  }

  await db.collection('points_rules').add({ data: ruleData });
  return { code: 200, msg: "规则创建成功" };
}

async function updatePointsRule({ id, data }) {
  const ruleData = {
    ...data,
    updateTime: db.serverDate(),
  };
  delete ruleData._id;
  delete ruleData.createTime;

  // 如果该规则被设置为生效，先将其它所有规则置为失效
  if (ruleData.status === 'active') {
    await db.collection('points_rules').where({ 
      _id: _.neq(id), 
      status: 'active' 
    }).update({
      data: { status: 'inactive', updateTime: db.serverDate() }
    });
  }

  await db.collection('points_rules').doc(id).update({ data: ruleData });
  return { code: 200, msg: "规则更新成功" };
}

async function deletePointsRule({ id }) {
  // 校验：不能删除生效中的规则
  const rule = await db.collection('points_rules').doc(id).get();
  if (rule.data && rule.data.status === 'active') {
    return { code: 400, msg: "无法删除当前生效的规则，请先切换生效规则" };
  }

  await db.collection('points_rules').doc(id).remove();
  return { code: 200, msg: "规则删除成功" };
}
async function runCronTask({ taskId }) {
  try {
    if (taskId === 'cron_1' || taskId.includes('sync')) {
      // 触发订单同步云函数 (异步调用)
      await cloud.callFunction({
        name: 'sync_tk_orders',
        data: { triggerSource: 'admin_manual' }
      });
      return { code: 200, msg: "同步任务已启动，请 1 分钟后查看订单列表" };
    }
    return { code: 400, msg: "暂不支持手动触发该类型任务" };
  } catch (err) {
    return { code: 500, msg: "手动触发失败: " + err.message };
  }
}

// ==================== [6] 定时任务日志 ====================
async function getCronTasks() {
  // 定义静态任务元数据
  const taskConfigs = [
    {
      taskId: 'sync_tk_orders',
      taskName: '同步折淘客后台订单',
      taskType: '订单同步',
      description: '从折淘客 API 拉取最近 40 分钟内的淘宝订单状态并同步到本地库',
      cronExpression: '0 0/10 * * * ?',
    },
    {
      taskId: 'recycle_points',
      taskName: '回收过期超时积分',
      taskType: '积分结算',
      description: '对超过 15 天未结算的订单积分进行系统回收或状态标记',
      cronExpression: '0 0 2 * * ?',
    }
  ];

  const taskList = [];

  for (const config of taskConfigs) {
    // 获取每个任务的最后一次执行记录
    const lastLog = await db.collection('task_logs')
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
  const countRes = await db.collection('task_logs').where({ taskId }).count();
  const listRes = await db.collection('task_logs')
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