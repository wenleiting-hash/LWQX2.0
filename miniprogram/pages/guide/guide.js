Page({
  data: {
    loading: true,
    categories: []
  },

  onLoad() {
    this.fetchGuideData();
  },

  async fetchGuideData() {
    try {
      const res = await wx.cloud.callFunction({
        name: 'get_system_config'
      });
      
      if (res.result && res.result.success && res.result.data.documentation) {
        this.setData({
          categories: res.result.data.documentation,
          loading: false
        });
      } else {
        // 如果没配置，由于之前是硬编码，我们暂时保持一个空状态或稍后补齐
        this.setData({ loading: false });
      }
    } catch (e) {
      console.error('获取说明文档失败:', e);
      this.setData({ loading: false });
    }
  }
});
