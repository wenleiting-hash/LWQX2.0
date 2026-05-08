// 将云环境 ID 提出来统一配置，方便未来切换测试/生产环境
const CLOUD_ENV_ID = 'cloud1-9ggm1mvv7a25a4cb';

App({
  globalEnvId: CLOUD_ENV_ID,
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
        // 使用统一定义的环境 ID
        env: CLOUD_ENV_ID
      });
    }

    // 初始化全局数据
    if (!this.globalData) this.globalData = {};
    this.globalData._navItem = null; // 详情页跳转中转数据

    // 执行本地存储清理策略
    this.cleanExpiredStorage();

    // 获取系统配置（包含主题色等）
    this.fetchSystemConfig();

    // 静默登录获取 OpenID（统一走 API 层）
    const { API } = require('./utils/api');
    API.login().then(loginData => {
      if (loginData && loginData.openid) {
        this.globalData.openid = loginData.openid;
        console.log('【App】静默登录成功', loginData);
      }
    }).catch(err => {
      console.error('【App】静默登录失败', err);
    });

    // 获取系统信息及胶囊位置
    let systemInfo = wx.getSystemInfoSync();
    let menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    // 稳定性检查：如果获取胶囊位置失败（部分环境冷启动可能返回全0），进行轮询或设置默认值
    if (!menuButtonInfo || !menuButtonInfo.width || !menuButtonInfo.top) {
      menuButtonInfo = {
        top: systemInfo.statusBarHeight + 6,
        height: 32,
        bottom: systemInfo.statusBarHeight + 38,
        left: systemInfo.screenWidth - 87,
        width: 87
      };
    }

    // 计算导航栏高度 (不含状态栏)
    const navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height;

    this.globalData = {
      ...this.globalData,
      navHeight: navBarHeight,
      statusBarHeight: systemInfo.statusBarHeight,
      menuButtonInfo: menuButtonInfo,
      screenHeight: systemInfo.screenHeight,
      windowHeight: systemInfo.windowHeight,
      windowWidth: systemInfo.windowWidth,
      pixelRatio: systemInfo.pixelRatio,
      safeArea: systemInfo.safeArea || {},
      // iPhone X 及以上设备底部安全区域高度
      safeAreaBottom: systemInfo.screenHeight - (systemInfo.safeArea ? systemInfo.safeArea.bottom : systemInfo.screenHeight)
    };
  },

  // 获取系统配置
  fetchSystemConfig: function() {
    const { API } = require('./utils/api');
    API.getConfig().then(config => {
      this.globalData.systemConfig = config || {};

      // 如果配置了主题色，应用主题色
      if (config && config.theme_color) {
        this.applyThemeColor(config.theme_color);
      }
    }).catch(err => {
      console.error('获取系统配置失败', err);
    });
  },

  // 应用主题色
  applyThemeColor: function(color) {
    if (!color) return;

    // 设置全局主题色变量
    const brandColor = color.startsWith('#') ? color : '#' + color;

    // 将主题色保存到全局数据，供页面使用
    this.globalData.themeColor = brandColor;

    // 注意：微信小程序不能直接通过 JS 修改 CSS 变量
    // 这里只存储，页面可以通过内联样式或 wx.setPageStyle 使用
    console.log('应用主题色:', brandColor);
  },

  // 清理过期的本地存储数据
  cleanExpiredStorage: function() {
    try {
      const now = Date.now();
      const EXPIRY_DAYS = 30; // 30天过期
      const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

      // 清理过期的足迹数据
      const footprints = wx.getStorageSync('footprints') || [];
      const validFootprints = footprints.filter(item => {
        if (!item.timestamp) return false;
        return (now - item.timestamp) < EXPIRY_MS;
      });
      if (validFootprints.length !== footprints.length) {
        wx.setStorageSync('footprints', validFootprints);
        console.log(`[Storage Clean] 清理了 ${footprints.length - validFootprints.length} 条过期足迹`);
      }

      // 清理过期的浏览历史
      const browseHistory = wx.getStorageSync('browse_history') || [];
      const validHistory = browseHistory.filter(item => {
        if (!item.viewTime && !item.timestamp) return false;
        const itemTime = item.viewTime || item.timestamp;
        return (now - itemTime) < EXPIRY_MS;
      });
      if (validHistory.length !== browseHistory.length) {
        wx.setStorageSync('browse_history', validHistory);
        console.log(`[Storage Clean] 清理了 ${browseHistory.length - validHistory.length} 条过期浏览历史`);
      }

      // 清理缓存配置（保留1天）
      const cacheConfig = wx.getStorageSync('cache_config');
      if (cacheConfig && cacheConfig.timestamp) {
        if ((now - cacheConfig.timestamp) > 24 * 60 * 60 * 1000) {
          wx.removeStorageSync('cache_config');
          console.log('[Storage Clean] 清理了过期的缓存配置');
        }
      }

    } catch (e) {
      console.error('[Storage Clean Error]', e);
    }
  }
});
