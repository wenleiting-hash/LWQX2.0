import axios from 'axios';

// 开发环境通过 vite proxy (/api_proxy) 转发到腾讯云；生产环境直接使用完整 URL
// .env: VITE_API_BASE_URL (云函数域名), VITE_API_PATH (/admin_api)
const API_PATH = import.meta.env.VITE_API_PATH || '/admin_api';
const BASE_URL = import.meta.env.PROD
  ? `${import.meta.env.VITE_API_BASE_URL || ''}${API_PATH}`
  : `/api_proxy${API_PATH}`;

// Token 管理 (登录成功后存储)
export const getAdminToken = () => localStorage.getItem('adminToken') || '';
export const setAdminToken = (token: string) => localStorage.setItem('adminToken', token);
export const clearAdminToken = () => {
  localStorage.removeItem('adminToken');
  localStorage.removeItem('isLoggedIn');
  localStorage.removeItem('adminUsername');
  localStorage.removeItem('adminRole');
};

// 兼容旧代码：保留旧接口名但内部指向 token
export const getAdminSecret = getAdminToken;
export const setAdminSecret = setAdminToken;

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
});

// 请求拦截器：自动带上 Token
api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
    if (config.data && typeof config.data === 'object') {
      config.data.token = token;
    }
  }
  return config;
});

// 响应拦截器：统一处理业务状态码
api.interceptors.response.use(
  (response) => {
    const res = response.data;
    // 鉴权失败
    if (res.code === 401) {
      clearAdminToken();
      window.location.hash = '#/login';
      return Promise.reject(new Error('Unauthorized'));
    }
    // 业务错误 (非 0 且非 200 均视为错误)
    if (res.code !== 0 && res.code !== 200) {
      return Promise.reject(new Error(res.msg || 'API Error'));
    }
    // 统一返回 res.data (如果存在) 或整个 res
    return res.data !== undefined ? res.data : res;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// ---------------- 旧版 API 封装 (保持兼容) ----------------

// 配置中心 (旧版 cf-admin-api 格式)
export const fetchConfig = () => api.post('/', { action: 'getConfig' });
export const updateConfig = (id: string, updates: any) => api.post('/', { action: 'updateConfig', payload: { id, updates } });

export const getBulletinLogs = (params: { page: number, pageSize: number, platform?: string }) => 
  api.post('/', { action: 'get_bulletin_logs', payload: params });

// 昵称池
export const updateNicknamePool = (nicknames: string[]) => api.post('/', { action: 'updateNicknamePool', payload: { nicknames } });

// 晒单缓存
export const fetchShowcaseCache = (page: number, pageSize: number) => api.post('/', { action: 'getShowcaseCache', payload: { page, pageSize } });
export const cleanupShowcase = (beforeTimestamp: number) => api.post('/', { action: 'cleanupShowcase', payload: { beforeTimestamp } });

// 种子弹幕
export const fetchSeedBulletins = () => api.post('/', { action: 'getSeedBulletins' });
export const addSeedBulletin = (item: any) => api.post('/', { action: 'addSeedBulletin', payload: { item } });
export const deleteSeedBulletin = (docId: string) => api.post('/', { action: 'deleteSeedBulletin', payload: { docId } });

export default api;
