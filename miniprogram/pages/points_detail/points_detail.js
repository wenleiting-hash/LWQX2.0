Page({
  data: {
    activeTab: 'all', // all, gain, cost
    currentPoints: 0,
    allRecords: [],
    filteredList: []
  },

  onLoad() {
    this.fetchData();
  },

  fetchData() {
    wx.showLoading({ title: '加载中' });
    
    // 获取可用总积分
    wx.cloud.callFunction({
      name: 'get_user_stats'
    }).then(res => {
      if (res.result && res.result.success) {
        this.setData({ currentPoints: res.result.data.availablePoints || 0 });
      }
    }).catch(err => console.error(err));

    // 获取包含积分的订单明细
    wx.cloud.callFunction({
      name: 'get_orders',
      data: { page: 1, page_size: 100 }
    }).then(res => {
      wx.hideLoading();
      if (res.result && res.result.success) {
        const orders = res.result.data || [];
        const records = [];
        
        orders.forEach(order => {
          // 只展示产生有效积分的订单（非失效）
          if (order.status !== 'invalid' && order.tk_status !== '13' && order.tk_status !== '订单失效') {
            const pts = order.points || 0;
            if (pts > 0) {
              records.push({
                id: order._id,
                title: '购物返还积分',
                time: order.createTime || '',
                amount: pts
              });
            }
          }
        });
        
        this.setData({ allRecords: records }, () => {
          this.filterRecords();
        });
      }
    }).catch(err => {
      wx.hideLoading();
      wx.showToast({ title: '拉取明细失败', icon: 'none' });
      console.error(err);
    });
  },

  onTabClick(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ activeTab: type }, () => {
      this.filterRecords();
    });
  },

  filterRecords() {
    const { activeTab, allRecords } = this.data;
    let filtered = [];
    if (activeTab === 'all') {
      filtered = allRecords;
    } else if (activeTab === 'gain') {
      filtered = allRecords.filter(item => item.amount > 0);
    } else if (activeTab === 'cost') {
      filtered = allRecords.filter(item => item.amount < 0);
    }
    this.setData({ filteredList: filtered });
  }
});
