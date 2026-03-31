import api from '../api';

/**
 * ==========================================
 * 0. 登录 (Login)
 * ==========================================
 */
export const login = (data: any) => {
  return api.post('', { action: 'login', ...data });
};

/**
 * ==========================================
 * 1. 财务大盘 (Dashboard)
 * ==========================================
 */
export const getDashboardStats = () => {
  return api.post('', { action: 'get_dashboard' });
};

/**
 * ==========================================
 * 2. 基础设置 (System Config)
 * ==========================================
 */
export const getSystemConfig = () => {
  return api.post('', { action: 'get_manage_config' });
};

export const updateSystemConfig = (configData: any) => {
  return api.post('', { action: 'update_manage_config', data: configData });
};

/**
 * ==========================================
 * 2.5 运营配置 (Operations Config)
 * ==========================================
 */
export const getOperationsConfig = () => {
  return api.post('', { action: 'get_operations_config' });
};

export const updateOperationsConfig = (configData: any) => {
  return api.post('', { action: 'update_operations_config', data: configData });
};

/**
 * ==========================================
 * 3. 积分规则 (Points Rules)
 * ==========================================
 */
export const getPointsRules = () => {
  return api.post('', { action: 'get_points_rules' });
};

export const getPointsRule = (id: string) => {
  return api.post('', { action: 'get_points_rule', id });
};

export const createPointsRule = (ruleData: any) => {
  return api.post('', { action: 'create_points_rule', data: ruleData });
};

export const updatePointsRule = (id: string, ruleData: any) => {
  return api.post('', { action: 'update_points_rule', id, data: ruleData });
};

export const deletePointsRule = (id: string) => {
  return api.post('', { action: 'delete_points_rule', id });
};

/**
 * ==========================================
 * 4. 订单中心 (Order Center)
 * ==========================================
 */
export interface OrderQuery {
  page: number;
  pageSize: number;
  status?: string;
  orderId?: string;
}

export const getOrders = (query: OrderQuery) => {
  // 映射前端的 searchText (orderId) 为后端的 keyword
  return api.post('', { action: 'get_orders', page: query.page, pageSize: query.pageSize, keyword: query.orderId || '' });
};

/**
 * ==========================================
 * 5. 用户积分 (User Assets)
 * ==========================================
 */
export interface UserQuery {
  page: number;
  pageSize: number;
  userId?: string;
}

export const getUsers = (query: UserQuery) => {
  return api.post('', { action: 'get_users', page: query.page, pageSize: query.pageSize, keyword: query.userId || '' });
};

export const freezeUser = (userId: string, reason: string) => {
  return api.post('', { action: 'toggle_user_status', openid: userId, status: 0 }); // 0: 冻结
};

export const unfreezeUser = (userId: string) => {
  return api.post('', { action: 'toggle_user_status', openid: userId, status: 1 }); // 1: 正常
};

/**
 * ==========================================
 * 6. 任务调度 (Task Scheduler)
 * ==========================================
 */
export const getCronTasks = () => {
  return api.post('', { action: 'get_cron_tasks' });
};

export const getCronLogs = (params: { taskId: string; page?: number; pageSize?: number }) => {
  return api.post('', { action: 'get_cron_logs', ...params });
};

export const runCronTask = (taskId: string) => {
  return api.post('', { action: 'run_cron_task', taskId });
};

export const getDoc = () => {
  return api.post('', { action: 'get_doc' });
};

export const updateDoc = (content: string) => {
  return api.post('', { action: 'update_doc', data: content });
};
