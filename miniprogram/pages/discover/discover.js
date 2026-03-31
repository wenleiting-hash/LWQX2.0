const app = getApp();

Page({
  data: {
    tabs: [
      { id: 'shenquan', title: '大额神券' },
      { id: 'hot', title: '疯抢榜' },
      { id: 'brand', title: '大牌特卖' },
      { id: 'chaosheng', title: '超省好物' },
      { id: 'high_sale', title: '超高销售' },
      { id: 'high_rate', title: '超高好评' },
      { id: '9.9', title: '9.9包邮' },
      { id: '19.9', title: '19.9购' }
    ],
    activeTab: 'shenquan',
    goodsList: [],
    leftList: [],
    rightList: [],
    showDetailPopup: false,
    selectedGoods: null,
    page: 1,
    pageSize: 20,
    isLoading: false,
    hasMore: true,
    searchKeyword: '' // 搜索词
  },

  onLoad: function() {
    const app = getApp();
    this.setData({
      navHeight: app.globalData.navHeight,
      statusBarHeight: app.globalData.statusBarHeight
    });
    this.fetchFeedData(true);
  },

  // 生命周期函数 -- 监听页面隐藏 (修复离开自动关闭窗口的问题)
  onHide: function() {
    if (this.data.showDetailPopup) {
      this.setData({
        showDetailPopup: false
      });
    }
  },

  // ----- 附加的搜索功能处理 -----
  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onClearSearch: function() {
    this.setData({ searchKeyword: '' });
    this.onSearchConfirm();
  },

  onSearchConfirm: function() {
    this.setData({
      goodsList: [],
      leftList: [],
      rightList: [],
      hasMore: true,
      page: 1
    });
    this.fetchFeedData(true);
  },

  // 获取瀑布流数据
  fetchFeedData: async function(reset = false) {
    if (this.data.isLoading || (!this.data.hasMore && !reset)) return;
    
    this.setData({ isLoading: true });
    if (reset) {
      wx.showLoading({ title: '加载中' });
      this.setData({ page: 1 });
    }

    try {
      const res = await wx.cloud.callFunction({
        name: 'get_discover_feed',
        data: {
          tabId: this.data.activeTab,
          page: this.data.page,
          pageSize: this.data.pageSize,
          q: this.data.searchKeyword || ''
        }
      });

      const newGoods = res.result?.data || [];
      const hasMore = newGoods.length >= this.data.pageSize;
      
      const currentList = reset ? [] : this.data.goodsList;
      const updatedList = currentList.concat(newGoods);

      this.setData({
        goodsList: updatedList,
        hasMore
      });
      this.splitList();

    } catch (err) {
      console.error('获取发现页数据失败', err);
      wx.showToast({ title: '网络异常', icon: 'error' });
    } finally {
      this.setData({ isLoading: false });
      if (reset) wx.hideLoading();
    }
  },

  // 分页拉取
  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.setData({ page: this.data.page + 1 });
      this.fetchFeedData(false);
    }
  },

  // 模拟瀑布流左右分列
  splitList: function() {
    const list = this.data.goodsList;
    const leftList = [];
    const rightList = [];
    list.forEach((item, index) => {
      if (index % 2 === 0) {
        leftList.push(item);
      } else {
        rightList.push(item);
      }
    });
    this.setData({ leftList, rightList });
  },

  onTabClick: function(e) {
    const id = e.currentTarget.dataset.id;
    if (id === this.data.activeTab) return;
    
    this.setData({ 
      activeTab: id,
      goodsList: [],
      leftList: [],
      rightList: [],
      hasMore: true
    });
    
    this.fetchFeedData(true);
  },

  onCategoryClick: function(e) {
    const type = e.currentTarget.dataset.type;
    let title = '分类';
    if(type === 'digital') title = '数码家电';
    if(type === 'beauty') title = '美妆个护';
    if(type === 'toy') title = '母婴玩具';
    if(type === 'dress') title = '女装精选';
    
    wx.navigateTo({
      url: `/pages/categorylist/categorylist?title=${title}`
    });
  },

  onGoodsClick: function(e) {
    const id = e.currentTarget.dataset.id;
    // _id 是云数据库返回的主键
    const goods = this.data.goodsList.find(item => (item._id || item.id) == id);
    if (goods) {
      this.setData({
        selectedGoods: goods,
        showDetailPopup: true
      });
    }
  },

  closePopup: function() {
    this.setData({
      showDetailPopup: false
    });
  },

  onBuyClick: async function() {
    const goods = this.data.selectedGoods;
    if (!goods) return;

    const itemId = goods._id || goods.id;
    wx.showLoading({ title: '为您生成专属口令...' });

    try {
      const res = await wx.cloud.callFunction({
        name: 'generate_promo_link',
        data: { item_id: itemId }
      });

      wx.hideLoading();

      const result = res.result;
      if (result && result.success) {
        const data = result.data;
        const tkl = data.tkl || '';

        if (tkl) {
          // 不再使用不可靠的 wx.showModal (会导致剪贴板因为异步执行而被系统拦截)
          // 呼出自定义的弹窗，让用户通过直接点击原生的按钮触发复制
          this.setData({
            showTklPopup: true,
            generatedTkl: tkl
          });
        } else {
          wx.showToast({ title: '未生出可用口令', icon: 'none' });
        }
      } else {
        wx.showToast({ title: result?.msg || '口令生成失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      console.error('API调用失败:', err);
      wx.showToast({ title: '网络开小差了，请重试', icon: 'none' });
    }
  },

  closeTklPopup: function() {
    this.setData({ showTklPopup: false });
  },

  onCopyTkl: function() {
    const tkl = this.data.generatedTkl;
    if (!tkl) return;

    // 真正的同步点击触发，100% 成功率
    wx.setClipboardData({
      data: String(tkl),
      success: () => {
        // 由于微信会自动显示绿色的“内容已复制”提示，我们不需要再多包一层以防冲突
        this.setData({ showTklPopup: false });
      },
      fail: (err) => {
        console.error('真实复制报错', err);
        wx.showToast({ title: '自动复制失败，请长按口令手动复制', icon: 'none', duration: 3000 });
      }
    });
  }
});
