const { API: api } = require('../../utils/api.js');

Page({
  data: {
    platform: 'tb', // 默认淘宝
    feedType: '', // 从 rankings 传来的 id 映射
    title: '', // 页面标题
    sortType: 'default', // default, sales, price
    sortOrder: 'desc', // asc, desc
    items: [],
    page: 1,
    hasMore: true,
    isLoading: true,
    isLoadingMore: false
  },

  onLoad: function(options) {
    const { id, title } = options;
    
    if (title) {
      this.setData({ title });
      wx.setNavigationBarTitle({ title: decodeURIComponent(title) });
    }

    // 映射 id 到 feed_type
    const feedMap = {
      'burst': 'rank_2hour',
      'popular': 'rank_popularity',
      'moments': 'hot_circle',
      'monthly': 'rank_month',
      'discount': 'high_coupon',
      'sales': 'high_sales',
      'score': 'high_rating'
    };

    const feedType = feedMap[id] || 'rank_2hour';
    
    this.setData({ feedType }, () => {
      this.fetchData(true);
    });
  },

  onTabChange(e) {
    const pf = e.currentTarget.dataset.pf;
    if (this.data.platform === pf) return;
    this.setData({ platform: pf, items: [], page: 1, hasMore: true, isLoading: true, sortType: 'default', sortOrder: 'desc' });
    wx.vibrateShort();
    this.fetchData(true);
  },

  onSortChange(e) {
    const type = e.currentTarget.dataset.type;
    let newOrder = 'desc';

    if (this.data.sortType === type) {
      if (type === 'default') return;
      newOrder = this.data.sortOrder === 'desc' ? 'asc' : 'desc';
    } else {
      if (type === 'price') {
        newOrder = 'asc';
      }
    }

    this.setData({
      sortType: type,
      sortOrder: newOrder,
      items: [],
      page: 1,
      hasMore: true,
      isLoading: true
    });
    wx.vibrateShort();
    this.fetchData(true);
  },

  fetchData: async function(isRefresh = false) {
    if (!isRefresh && (!this.data.hasMore || this.data.isLoadingMore)) return;

    if (!isRefresh) {
      this.setData({ isLoadingMore: true });
    } else {
      wx.showNavigationBarLoading();
    }

    const platformParam = this.data.platform === 'tb' ? 'taobao' : 'jd';

    try {
      // 计算排序参数
      let finalSort = 'new';
      if (this.data.sortType === 'sales') {
        finalSort = this.data.sortOrder === 'asc' ? 'total_sale_num_asc' : 'total_sale_num_desc';
      } else if (this.data.sortType === 'price') {
        finalSort = this.data.sortOrder === 'asc' ? 'price_asc' : 'price_desc';
      }

      const data = await api.getFeedData({
        feed_type: this.data.feedType,
        platform: platformParam,
        page: this.data.page,
        page_size: 20,
        sort: finalSort
      });

      if (data && data.items) {
        const newItems = data.items;
        this.setData({
          items: isRefresh ? newItems : [...this.data.items, ...newItems],
          hasMore: newItems.length >= 20,
          isLoading: false,
          isLoadingMore: false
        });
      } else {
        if (isRefresh) {
          this.setData({ items: [], hasMore: false, isLoading: false });
        } else {
          this.setData({ hasMore: false, isLoadingMore: false });
        }
      }
    } catch (err) {
      console.error('Fetch Ranking List Data Error:', err);
      this.setData({ isLoading: false, isLoadingMore: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideNavigationBarLoading();
      wx.stopPullDownRefresh();
    }
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading && !this.data.isLoadingMore) {
      this.setData({ page: this.data.page + 1 });
      this.fetchData();
    }
  },

  onPullDownRefresh: function() {
    this.setData({ page: 1, hasMore: true, isLoading: true });
    this.fetchData(true);
  },

  goToDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    const detailItem = {
      tao_id: item.tao_id,
      title: item.title,
      image_url: item.image_url,
      coupon_price: item.coupon_price,
      original_price: item.original_price,
      coupon_amount: item.coupon_amount,
      sales_num: item.sales_num,
      platform: item.platform
    };
    const itemStr = encodeURIComponent(JSON.stringify(detailItem));
    wx.navigateTo({
      url: `/pages/detail/detail?item=${itemStr}`
    });
  }
});
