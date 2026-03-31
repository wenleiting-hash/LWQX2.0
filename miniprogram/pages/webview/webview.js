Page({
  data: {
    url: ''
  },

  onLoad(options) {
    const url = decodeURIComponent(options.url || '');
    this.setData({ url });
    wx.setNavigationBarTitle({ title: '领券购买' });
  }
});
