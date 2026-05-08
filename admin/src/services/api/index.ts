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
 * 0.5 管理员用户管理 (Admin Users)
 * ==========================================
 */
export const getAdminUsers = () => {
  return api.post('', { action: 'get_admin_users' });
};

export const addAdminUser = (data: { username: string; password: string; role?: string }) => {
  return api.post('', { action: 'add_admin_user', data });
};

export const updateAdminUser = (id: string, data: { password?: string; role?: string }) => {
  return api.post('', { action: 'update_admin_user', id, data });
};

export const deleteAdminUser = (id: string) => {
  return api.post('', { action: 'delete_admin_user', id });
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
export const getSystemConfig = (configId: string = 'global') => {
  return api.post('', { action: 'get_manage_config', config_id: configId });
};

export const updateSystemConfig = (configId: string, configData: any) => {
  return api.post('', { action: 'update_manage_config', config_id: configId, data: configData });
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


export interface OrderQuery {
  page: number;
  pageSize: number;
  status?: string;
  orderId?: string;
  platform?: string;
}

export const getOrders = (query: OrderQuery) => {
  // 映射前端的 searchText (orderId) 为后端的 keyword，并透传 platform 参数
  return api.post('', { 
    action: 'get_orders', 
    page: query.page, 
    pageSize: query.pageSize, 
    keyword: query.orderId || '',
    platform: query.platform
  });
};


export const getCronTasks = (platform?: string) => {
  return api.post('', { action: 'get_cron_tasks', platform });
};

export const getCronLogs = (params: { taskId: string; page?: number; pageSize?: number }) => {
  return api.post('', { action: 'get_cron_logs', ...params });
};

export const runCronTask = (taskId: string, extraPayload?: any) => {
  return api.post('', { action: 'run_cron_task', taskId, ...extraPayload });
};

/**
 * ==========================================
 * 8. 操作日志 (Operation Logs)
 * ==========================================
 */
export const getOperationLogs = (params: { page?: number; pageSize?: number }) => {
  return api.post('', { action: 'get_operation_logs', ...params });
};

export const getDoc = () => {
  return api.post('', { action: 'get_doc' });
};

export const updateDoc = (content: string) => {
  return api.post('', { action: 'update_doc', data: content });
};

export const getSearchLogs = (params?: any) => {
  return api.post('', { action: 'get_search_logs', ...params });
};
