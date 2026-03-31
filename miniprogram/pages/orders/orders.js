Page({
  data: {
    tabs: [
      { id: 'all', title: '全部' },
      { id: 'pending', title: '待结算' },
      { id: 'settled', title: '已入账' },
      { id: 'invalid', title: '已失效' }
    ],
    activeTab: 'all',
    showDetail: false,
    currentOrder: {},
    orderList: [],
    page: 1,
    pageSize: 20,
    hasMore: true,
    isLoading: false,
    showAuthModal: false,
    showClaimModal: false,
    claimOrderNo: ''
  },

  onLoad: function() {
    const app = getApp();
    this.setData({
      navHeight: app.globalData.navHeight,
      statusBarHeight: app.globalData.statusBarHeight
    });
    this.fetchOrders(true);
  },

  onTabClick(e) {
    const id = e.currentTarget.dataset.id;
    if (this.data.activeTab === id) return;
    this.setData({ 
      activeTab: id,
      orderList: [],
      page: 1,
      hasMore: true
    });
    this.fetchOrders(true);
  },

  async fetchOrders(isRefresh = false) {
    if (this.data.isLoading || (!this.data.hasMore && !isRefresh)) return;
    
    this.setData({ isLoading: true });
    if (isRefresh) wx.showLoading({ title: '同步订单...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'get_orders',
        data: {
          page: this.data.page,
          page_size: this.data.pageSize,
          status: this.data.activeTab
        }
      });

      if (res.result && res.result.success) {
        const newOrders = res.result.data || [];
        const hasMore = newOrders.length >= this.data.pageSize;
        
        let currentList = isRefresh ? [] : this.data.orderList;
        
        this.setData({
          orderList: currentList.concat(newOrders),
          page: isRefresh ? 2 : this.data.page + 1,
          hasMore: hasMore
        });
      } else if (res.result && res.result.code === 'NOT_REGISTERED') {
        // 发现未注册，弹出全局授权组件进行拦截
        this.setData({ showAuthModal: true, isLoading: false });
        if (isRefresh) wx.hideLoading();
        return; // 终止后续操作
      } else {
        wx.showToast({ title: res.result?.msg || '拉取数据为空', icon: 'none' });
      }
    } catch (err) {
      console.error('Fetch Orders Error:', err);
      wx.showToast({ title: '网络异常，请稍后重发', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
      if (isRefresh) wx.hideLoading();
    }
  },

  onAuthCancel() {
    this.setData({ showAuthModal: false });
    wx.switchTab({ url: '/pages/index/index' });
  },

  onAuthSuccess(e) {
    this.setData({ showAuthModal: false });
    // 授权并注册成功后，重新获取订单数据
    this.fetchOrders(true);
  },

  onReachBottom() {
    this.fetchOrders(false);
  },

  onOrderTap(e) {
    const index = e.currentTarget.dataset.index;
    const order = this.data.orderList[index];
    this.setData({ showDetail: true, currentOrder: order });
  },

  onCloseDetail() {
    this.setData({ showDetail: false });
  },

  onCopyOrderNo(e) {
    const no = e.currentTarget.dataset.no;
    if (!no) return;
    wx.setClipboardData({
      data: String(no),
      success() {
        wx.showToast({ title: '已复制单号', icon: 'success' });
      }
    });
  },

  noop() {},

  onShowClaimModal() {
    this.setData({ showClaimModal: true, claimOrderNo: '' });
  },

  onCloseClaimModal() {
    this.setData({ showClaimModal: false, claimOrderNo: '' });
  },

  onClaimInput(e) {
    this.setData({ claimOrderNo: e.detail.value });
  },

  async submitClaim() {
    const orderNo = this.data.claimOrderNo.trim();
    if (!orderNo || orderNo.length < 6) {
      wx.showToast({ title: '请输入至少6位订单号', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '正在核对...', mask: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'claim_order',
        data: { orderNo }
      });
      wx.hideLoading();

      if (res.result && res.result.success) {
        wx.showToast({ title: '找回成功！', icon: 'success', duration: 2000 });
        this.setData({ showClaimModal: false });
        // 自动切回“全部”并刷新
        this.setData({ activeTab: 'all', orderList: [], page: 1, hasMore: true });
        this.fetchOrders(true);
      } else {
        wx.showModal({
          title: '找回失败',
          content: res.result?.msg || '未找到未绑定的对应订单',
          showCancel: false,
          confirmColor: '#FF5722'
        });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('Claim Error:', err);
      wx.showToast({ title: '系统连接超时', icon: 'none' });
    }
  }
});
