const { formatMoneyToPoints } = require('../../utils/format');

Page({
  data: {
    searchQuery: '',
    hasResult: false,
    showResult: false,
    showClipboardPopup: false,
    clipboardText: '',
    clipboardTextShort: '',
    result: {},
    theme: 'light'
  },

  onLoad() {
    const app = getApp();
    this.setData({
      theme: wx.getSystemInfoSync().theme || 'light',
      navHeight: app.globalData.navHeight,
      statusBarHeight: app.globalData.statusBarHeight
    });
  },

  onShow() {
    this.checkClipboard();
  },

  // 检查粘贴板
  checkClipboard() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data;
        if (text && this.isEcommerceLink(text)) {
          // 如果跟上次处理的一样，就不弹了 (简单防抖)
          if (text === this.lastProcessedText) return;

          this.setData({
            showClipboardPopup: true,
            clipboardText: text,
            clipboardTextShort: text.substring(0, 50) + '...'
          });
        }
      }
    });
  },

  isEcommerceLink(text) {
    const patterns = [/jd\.com/, /taobao\.com/, /tmall\.com/, /yangkeduo\.com/, /pinduoduo\.com/, /vip\.com/];
    return patterns.some(p => p.test(text)) || /[\u4e00-\u9fa5]/.test(text); // 简单支持口令
  },

  onInputChange(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  onSearch() {
    const query = this.data.searchQuery || this.data.clipboardText;
    if (!query) {
      wx.showToast({ title: '请输入链接', icon: 'none' });
      return;
    }
    this.parseLink(query);
  },

  cancelClipboard() {
    this.setData({ showClipboardPopup: false });
    this.lastProcessedText = this.data.clipboardText;
  },

  confirmClipboard() {
    this.setData({ showClipboardPopup: false });
    this.parseLink(this.data.clipboardText);
  },

  parseLink(text) {
    wx.showLoading({ title: '解析中...' });
    wx.cloud.callFunction({
      name: 'parse_and_convert',
      data: { text },
      success: (res) => {
        const data = res.result;
        if (data && data.success) {
          // 合规转换：将佣金转换为积分
          const points = formatMoneyToPoints(data.commission);
          this.setData({
            hasResult: true,
            showResult: true,
            result: {
              title: data.title,
              img: data.img,
              originPrice: data.originPrice,
              couponPrice: data.couponPrice,
              points: points
            }
          });
          this.lastProcessedText = text;
        } else {
          wx.showToast({ title: '解析失败', icon: 'none' });
        }
      },
      fail: (err) => {
        console.error('云函数调用失败', err);
        wx.showToast({ title: '网络异常', icon: 'none' });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  closeResult() {
    this.setData({ showResult: false });
  },

  gotoBuy() {
    wx.showModal({
      title: '即将跳转购买',
      content: '请在打开的页面完成下单，积分将于确认收货后入账。',
      confirmText: '好的',
      success: (res) => {
        if (res.confirm) {
          // 实际逻辑应为跳转三方小程序或 H5
          wx.showToast({ title: '演示环境：已记录订单意向', icon: 'success' });
        }
      }
    });
  },

  onShareAppMessage() {
    return {
      title: `我看中了这个商品，券后只要 ${this.data.result.couponPrice} 元！`,
      path: '/pages/index/index'
    };
  }
});
