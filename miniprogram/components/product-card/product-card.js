Component({
  properties: {
    item: {
      type: Object,
      value: {}
    },
    layout: {
      type: String,
      value: 'grid' // 'grid' | 'list'
    },
    showPlatform: {
      type: Boolean,
      value: true
    },
    showSales: {
      type: Boolean,
      value: true
    },
    rankNumber: {
      type: Number,
      value: 0
    },
    isCommunity: {
      type: Boolean,
      value: false
    },
    badgePosition: {
      type: String,
      value: 'top-left' // 'top-left' | 'bottom-right'
    }
  },
  methods: {
    openDetail() {
      if (!this.properties.item || !this.properties.item.tao_id) return;
      
      // 携带商品数据到详情页，避免再次请求
      const itemStr = encodeURIComponent(JSON.stringify(this.properties.item));
      wx.navigateTo({
        url: `/pages/detail/detail?item=${itemStr}`
      });
      
      this.triggerEvent('clickcard', this.properties.item);
    }
  }
})
