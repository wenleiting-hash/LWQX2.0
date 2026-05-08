Component({
  properties: {
    product: {
      type: Object,
      value: null
    }
  },
  data: {
    savedAmount: "0.00"
  },
  observers: {
    'product': function(prod) {
      if (prod && prod.originalPrice && prod.couponPrice) {
        let diff = (prod.originalPrice - prod.couponPrice).toFixed(2);
        this.setData({ savedAmount: diff });
      }
    }
  },
  methods: {
    close() {
      this.triggerEvent('close');
    },
    handleCopyLink() {
      wx.setClipboardData({
        data: this.data.product.platform === '淘宝' ? '￥口令示例￥' : 'https://jd.com/...',
        success: () => {
          wx.showToast({ title: '口令/链接已复制，请打开对应APP' });
        }
      });
    }
  }
})
