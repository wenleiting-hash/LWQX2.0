import { API } from '../../utils/api';

Page({
  data: {
    tutorial_content: ''
  },

  async onLoad() {
    let config = getApp().globalData.systemConfig || {};
    
    // 如果没有获取到配置，主动拉取一次
    if (!config.tutorial_content) {
      try {
        config = await API.getConfig();
        if (config) {
          getApp().globalData.systemConfig = config;
        }
      } catch (e) {
        console.error('获取配置失败', e);
      }
    }

    if (config && config.tutorial_content) {
      this.setData({ tutorial_content: config.tutorial_content });
    }
  },

  goHome() {
    wx.switchTab({ url: '/pages/index/index' });
  }
});
