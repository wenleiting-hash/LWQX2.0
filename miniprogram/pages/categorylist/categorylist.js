const categoryMap = {
  '数码家电': 11,
  '美妆个护': 3,
  '母婴玩具': 2,
  '女装精选': 9,
  '鞋包配饰': 5,
  '居家日用': 4,
  '食品零食': 6,
  '内衣袜子': 10
};

Page({
  data: {
    categoryName: '分类',
    cid: '',
    leftList: [],
    rightList: [],
    page: 1,
    pageSize: 20,
    isLoading: false,
    hasMore: true,
    searchKeyword: ''
  },

  onLoad(options) {
    let title = options.title || '类目精选';
    let cid = categoryMap[title] || '';
    
    this.setData({ 
      categoryName: title,
      cid: cid
    });
    wx.setNavigationBarTitle({ title: title });

    this.fetchFeedData(true);
  },

  // ----- 附加的搜索功能处理 -----
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.onSearchConfirm();
  },

  onSearchConfirm() {
    this.setData({
      leftList: [],
      rightList: [],
      hasMore: true,
      page: 1
    });
    this.fetchFeedData(true);
  },

  async fetchFeedData(isRefresh = false) {
    if (this.data.isLoading || (!this.data.hasMore && !isRefresh)) return;
    
    this.setData({ isLoading: true });
    if (isRefresh) {
      wx.showLoading({ title: '加载中...' });
    }

    try {
      const { result } = await wx.cloud.callFunction({
        name: 'get_discover_feed',
        data: {
          tabId: 'category',
          cid: this.data.cid, // 传入映射好的类目 ID
          page: isRefresh ? 1 : this.data.page,
          pageSize: this.data.pageSize,
          q: this.data.searchKeyword || ''
        }
      });

      if (result && result.success) {
        const newList = result.data || [];
        const hasMore = newList.length >= this.data.pageSize;
        
        let leftTemp = isRefresh ? [] : this.data.leftList;
        let rightTemp = isRefresh ? [] : this.data.rightList;
        
        // 简易的分栏追加逻辑
        let leftCount = leftTemp.length;
        let rightCount = rightTemp.length;

        newList.forEach((item) => {
          if (leftCount <= rightCount) {
            leftTemp.push(item);
            leftCount++;
          } else {
            rightTemp.push(item);
            rightCount++;
          }
        });

        this.setData({
          leftList: leftTemp,
          rightList: rightTemp,
          page: isRefresh ? 2 : this.data.page + 1,
          hasMore: hasMore
        });
      } else {
        wx.showToast({ title: result?.msg || '获取数据失败', icon: 'none' });
      }
    } catch (err) {
      console.error('Fetch Category Feed Error:', err);
      wx.showToast({ title: '网络开小差了', icon: 'none' });
    } finally {
      this.setData({ isLoading: false });
      if (isRefresh) {
        wx.hideLoading();
        wx.stopPullDownRefresh();
      }
    }
  },

  onReachBottom() {
    this.fetchFeedData(false);
  },

  onPullDownRefresh() {
    this.fetchFeedData(true);
  },

  onGoodsClick(e) {
    const id = e.currentTarget.dataset.id;
    // 未来可将此处的点击事件与导购弹窗逻辑结合
    wx.showToast({
      title: '显示商品:' + id,
      icon: 'none'
    });
  }
});
