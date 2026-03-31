const { formatMoneyToPoints } = require('../../utils/format');

Page({
  data: {
    searchQuery: '',
    hasResult: false,
    showResult: false,
    showClipboardPopup: false,
    showNoCouponPopup: false,
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

  onHide() {
    this.setData({
      showResult: false,
      showClipboardPopup: false,
      showNoCouponPopup: false
    });
  },

  checkClipboard() {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data;
        if (text && this.isEcommerceLink(text)) {
          if (text === this.lastProcessedText) return;

          this.pendingParseText = text;
          this.setData({
            showClipboardPopup: true
          });
        }
      }
    });
  },

  isEcommerceLink(text) {
    const urlPatterns = [/jd\.com/i, /taobao\.com/i, /tmall\.com/i, /tb\.cn/i, /yangkeduo\.com/i, /pinduoduo\.com/i, /vip\.com/i, /https?:\/\//i];
    const tklPattern = /[￥$€₤₳¢¤(《][a-zA-Z0-9\+]{8,15}[￥$€₤₳¢¤)》]/;
    const keywords = ['淘宝', '天猫', '京东', '拼多多', '唯品会', '复制这段', '打开APP'];
    
    return urlPatterns.some(p => p.test(text)) || 
           tklPattern.test(text) || 
           keywords.some(k => text.includes(k));
  },

  onInputChange(e) {
    this.setData({
      searchQuery: e.detail.value
    });
  },

  clearSearch() {
    this.setData({ searchQuery: '' });
  },

  closeClipboardPopup() {
    this.lastProcessedText = this.pendingParseText;
    this.pendingParseText = '';
    this.setData({ showClipboardPopup: false });
  },

  confirmClipboardPopup() {
    const text = this.pendingParseText;
    this.setData({ showClipboardPopup: false });
    this.parseLink(text);
  },

  closeNoCouponPopup() {
    this.setData({ showNoCouponPopup: false });
  },

  onSearch() {
    const query = this.data.searchQuery || this.data.clipboardText;
    if (!query) {
      wx.showToast({ title: '请输入链接', icon: 'none' });
      return;
    }
    this.parseLink(query);
  },


  // 核心查券逻辑：不再清洗，直接发送原始文案！
  parseLink(text) {
    wx.showLoading({ title: '正在呼叫查券引擎...' });
    wx.cloud.callFunction({
      name: 'parse_and_convert',
      data: { query: text }, // 👈 原汁原味地把整段话发给云函数
      success: (res) => {
        const resData = res.result;
        
        if (resData && resData.success) {
          const goods = resData.data; 
          
          // 如果返回的商品信息为空，或者价格为0，说明没有优惠券
          // 修改验证逻辑：只要有 title 和 jump_url，我们就允许展示（即使 price 是 0，以此兼容国补商品兜底）
          if (!goods || !goods.title || !goods.jump_url) {
            this.setData({ showNoCouponPopup: true });
            return;
          }

          const estimatedCommission = parseFloat(goods.price) * 0.1;
          const points = formatMoneyToPoints(estimatedCommission);
          const origin = (parseFloat(goods.price) + parseFloat(goods.coupon || 0)).toFixed(2);

          this.setData({
            hasResult: true,
            showResult: true,
            result: {
              title: goods.title,
              img: goods.image,       
              originPrice: origin, 
              couponPrice: goods.price, 
              points: points,
              tkl: goods.tkl,         
              jump_url: goods.jump_url,
              subsidy: goods.subsidy || false
            }
          });
          this.lastProcessedText = text;
        } else {
          this.setData({ showNoCouponPopup: true });
        }
      },
      fail: (err) => {
        console.error('云函数调用失败', err);
        wx.showToast({ title: '网络信号弱，请重试', icon: 'none' });
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
    const tkl = this.data.result.tkl;
    const jumpUrl = this.data.result.jump_url;
    let uiDisplayTkl = tkl;
    let actualClipboardData = tkl;
    
    // 如果由于商品无佣金等原因拿不到真实短口令，不再直接展示一长串英文破坏UI排版！
    // 而是展示一个符合格式的“专属直通口令”，并在剪贴板里偷偷置入真正能唤起淘宝的jump_url
    if (!tkl && jumpUrl && jumpUrl.startsWith('http')) {
      uiDisplayTkl = "￥免佣直达绝密口令￥";
      actualClipboardData = jumpUrl; 
    } else if (!tkl && !jumpUrl) {
      wx.showToast({ title: '链接生成失败，请重试', icon: 'none' });
      return;
    }

    // Determine if it actually has a coupon (based on existing logic)
    const hasCoupon = parseFloat(this.data.result.couponPrice || 404) < parseFloat(this.data.result.originPrice || 0) && parseFloat(this.data.result.couponPrice) !== 0;

    // Show custom TKL Popup and hide existing result sheet
    this.setData({
      showResult: false,
      showTklPopup: true,
      generatedTkl: uiDisplayTkl,
      actualClipboardData: actualClipboardData, // 缓存真实必须复制的数据
      hasCoupon: hasCoupon
    });
  },

  closeTklPopup() {
    this.setData({ showTklPopup: false });
  },

  onCopyTkl() {
    const copyData = this.data.actualClipboardData || this.data.generatedTkl;
    if (!copyData) return;

    // Synchronous execution avoids wx system intercept bug on some devices
    wx.setClipboardData({
      data: String(copyData),
      success: () => {
        // wx naturally shows green toast
        this.setData({ showTklPopup: false });
      },
      fail: (err) => {
        console.error('真实复制报错', err);
        wx.showToast({ title: '自动复制失败，请长按口令手动复制', icon: 'none', duration: 3000 });
      }
    });
  },

  onShareAppMessage() {
    const price = this.data.result.couponPrice ? `券后只要 ${this.data.result.couponPrice} 元！` : '快来帮我看看这个好东西！';
    return {
      title: `我看中了这个商品，${price}`,
      path: '/pages/index/index'
    };
  }
});