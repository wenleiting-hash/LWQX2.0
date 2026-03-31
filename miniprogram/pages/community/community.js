Page({
  data: {
    heroImagePath: '/images/ai_community_banner.png',
    qrImagePath: '/images/icons/avatar_user.png',
    wechatId: 'LaoWenHQ',
    loading: true
  },

  onLoad() {
    this.fetchConfig();
  },

  async fetchConfig() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_system_config'
      });
      if (res.result && res.result.success && res.result.data.operations_config) {
        const ops = res.result.data.operations_config;
        this.setData({
          qrImagePath: ops.qrCode || this.data.qrImagePath,
          wechatId: ops.wechatId || this.data.wechatId, 
          loading: false
        });
      } else {
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('获取社群配置失败:', e);
      this.setData({ loading: false });
    }
  },

  onCopyWechat() {
    wx.setClipboardData({
      data: this.data.wechatId,
      success: () => {
        wx.showToast({ title: '已复制微信号', icon: 'success' });
      }
    });
  }
});
