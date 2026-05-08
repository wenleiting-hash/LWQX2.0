Page({
  data: {
    hasImage: false,
    posterUrl: ''
  },

  onLoad(options) {
    this.generatePoster();
  },

  generatePoster() {
    // 模拟生成海报
    wx.showLoading({ title: '生成专属海报中' });
    setTimeout(() => {
      wx.hideLoading();
      this.setData({
        // 使用一个在线的渐变占位图代替缺失的本地图片
        posterUrl: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&h=600&fit=crop'
      });
    }, 1000);
  },

  savePoster() {
    if (!this.data.posterUrl) {
      wx.showToast({ title: '海报生成失败', icon: 'none' });
      return;
    }
    
    // Phase 3A: 简化处理，提示用户截图或调用实际下载
    wx.showToast({ title: '请截图保存', icon: 'none' });
  },

  onShareAppMessage() {
    return {
      title: '快来加入我们，超多大牌隐藏券等你领！',
      path: '/pages/index/index?invite_code=USER_ID_PLACEHOLDER', // 替换为实际邀请码
      imageUrl: this.data.posterUrl
    };
  }
});
