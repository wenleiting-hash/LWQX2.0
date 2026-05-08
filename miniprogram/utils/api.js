// 统一云端 API 接口封装层
// 拦截异常、处理 loading 状态、标准化返回格式

const callCloudFunction = (name, data = {}, options = {}) =>
{
  const { showLoading = false, loadingText = '加载中...', retries = 1 } = options;

  if (showLoading) {
    wx.showLoading({ title: loadingText, mask: true });
  }

  // 动态获取 app 实例中配置的全局环境 ID
  const app = getApp();
  const envId = app ? app.globalEnvId : 'cloud1-9ggm1mvv7a25a4cb';

  const attempt = (retriesLeft) =>
  {
    return new Promise((resolve, reject) =>
    {
      wx.cloud.callFunction({
        name,
        data,
        config: { env: envId }
      }).then(res =>
      {
        if (showLoading) wx.hideLoading();

        const result = res.result;
        if (result && result.code === 0) {
          resolve(result.data);
        } else {
          const errorMsg = result?.message || '请求失败，请稍后重试';
          reject(new Error(errorMsg));
        }
      }).catch(err =>
      {
        // 网络超时自动重试一次
        if (retriesLeft > 0 && (err.errMsg?.includes('timeout') || err.errMsg?.includes('request:fail'))) {
          console.warn(`[API Retry] ${name} 超时，剩余重试 ${retriesLeft} 次`);
          return attempt(retriesLeft - 1).then(resolve).catch(reject);
        }
        if (showLoading) wx.hideLoading();
        console.error(`[API Error] ${name}:`, err);
        reject(new Error('网络连接异常，请检查网络设置'));
      });
    });
  };

  return attempt(retries);
};

export const API = {
  /**
   * 获取系统全局配置
   * @param {Array<string>} keys - 需要获取的字段名，不传则返回全部非敏感字段
   */
  getConfig: (keys = []) =>
    callCloudFunction('cf-get-config', { keys }),

  /**
   * 查券搜索代理
   * @param {Object} options - 参数对象
   * @param {string} options.query - 搜索内容（关键词/淘口令/链接）
   * @param {string} [options.query_type='keyword'] - 'keyword' | 'tkl' | 'url'
   * @param {string} [options.platform='taobao'] - 'taobao' | 'jd' | 'auto'
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.page_size=20] - 每页数量
   * @param {string} [options.sort='default'] - 排序类型
   * @param {string} [options.order='asc'] - 排序顺序
   */
  searchCoupon: ({ query, query_type = 'keyword', platform = 'taobao', page = 1, page_size = 20, sort, order }) =>
    callCloudFunction('cf-coupon-search', { query, query_type, platform, page, page_size, sort, order }),

  /**
   * 获取各个栏目的信息流（金刚区/榜单/热推）
   * @param {Object} options 
   * @param {string} options.feed_type - 栏目类型（e.g. 'taoqianggou', 'hot_circle', 'rank_2hour'）
   * @param {string} [options.platform='taobao'] - 'taobao' | 'jd'
   * @param {number} [options.page=1] 
   * @param {number} [options.page_size=20]
   */
  getFeedData: (options) =>
    callCloudFunction('cf-feed-data', options),

  /**
   * 高佣转链代理
   * @param {Object} options
   * @param {string} options.tao_id - 商品 ID
   * @param {string} [options.platform='taobao'] - 'taobao' | 'jd'
   */
  convertLink: ({ tao_id, jd_url, platform = 'taobao', is_search = false }) =>
    callCloudFunction('cf-convert-link', { tao_id, jd_url, platform, is_search }, { showLoading: true, loadingText: '正在为您查找...' }),

  /**
   * 获取商品详情
   * @param {Object} options
   * @param {string} options.tao_id - 商品 ID
   * @param {string} [options.platform='taobao'] - 'taobao' | 'jd'
   */
  getProductDetail: ({ tao_id, platform = 'taobao' }) =>
    callCloudFunction('cf-product-detail', { tao_id, platform }, { showLoading: true, loadingText: '正在加载详情...' }),

  /**
   * 获取实时晒单数据
   * @param {number} page - 页码
   * @param {number} page_size - 每页数量
   */
  getShowcaseEvents: (page = 1, page_size = 20) =>
    callCloudFunction('cf-get-showcase', { page, pageSize: page_size }),

  /**
   * 静默登录换取身份标识
   */
  login: () =>
    callCloudFunction('cf-login', {}, { showLoading: false }),

  /**
   * 用户资产管理 (收藏)
   */
  userAssets: (action, payload = {}) =>
    callCloudFunction('cf-user-assets', { action, payload }, { showLoading: false })
};
