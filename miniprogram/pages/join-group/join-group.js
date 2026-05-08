import { API } from '../../utils/api';

Page({
  data: {
    activeCommunityQrCode: null,
    isExpired: false
  },

  async onShow() {
    let config = getApp().globalData.systemConfig || {};
    
    // 动态刷新，确保实时性
    try {
      const newConfig = await API.getConfig();
      if (newConfig) {
        config = newConfig;
        getApp().globalData.systemConfig = config;
      }
    } catch (e) {
      console.error('获取社群配置失败', e);
    }
    
    let isExpired = false;
    const qrCode = config.activeCommunityQrCode;
    
    if (qrCode && qrCode.expirationDate) {
      const today = new Date();
      // Set to 00:00:00 for accurate date comparison
      today.setHours(0, 0, 0, 0);
      const expDate = new Date(qrCode.expirationDate);
      if (today > expDate) {
        isExpired = true;
      }
    }

    this.setData({ 
      activeCommunityQrCode: qrCode,
      isExpired: isExpired
    });
  }
});
