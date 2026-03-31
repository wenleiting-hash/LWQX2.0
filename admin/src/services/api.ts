import cloudbase from '@cloudbase/js-sdk';
import { message } from 'antd';

const envId = import.meta.env.VITE_CLOUD_ENV_ID || '';

// 初始化腾讯云前端 SDK
export const app = cloudbase.init({
  env: envId
});

// 开启本地缓存的鉴权登录
export const auth = app.auth({
  persistence: 'local'
});

// 定义一个与之前 Axios 一模一样的 `api.post` 通用转发中心，
// 这样您不用去改动任何业务请求代码（如 api/index.ts ），做到无缝切换！
const api = {
  post: async (url: string, payload: any) => {
    try {
      // 检查登录状态：如果没有身份，则自动调用匿名登录进行授权隧道打通
      if (!auth.hasLoginState()) {
        await auth.signInAnonymously();
      }

      // 发射请求到云端：目前所有的后端接口都放在了名为 admin_api 的唯一云函数中
      const res = await app.callFunction({
        name: 'admin_api', 
        data: payload
      });

      const result = res.result as any;

      if (!result) {
         throw new Error('网络异常：未收到服务器返回的数据');
      }

      // 从云端传回的 status code 校验 (您的代码中都是返回 200)
      if (result.code !== undefined && result.code !== 0 && result.code !== 200) {
        message.error(result.msg || result.message || '请求失败');
        return Promise.reject(new Error(result.msg || result.message || 'Error'));
      }

      // 组装成原先 axios 的格式： { data: { ... } }
      return { data: result.data !== undefined ? result.data : result };
    } catch (err: any) {
      console.error('☁️云开发隧道调用异常:', err);
      
      // 如果报错是因为“环境身份没开匿名访问”导致 auth fails，提个醒
      if (err.message && err.message.includes('anonymous')) {
        message.error('请到腾讯云控制台的 [访问管理/身份认证] 中开启 [匿名登录] 功能！', 5);
      } else {
        message.error(err.message || '网络异常，检查控制台日志');
      }
      return Promise.reject(err);
    }
  }
};

export default api;
