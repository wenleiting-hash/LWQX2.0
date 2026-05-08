import { API } from '../../utils/api';

Page({
  data: {
    keyword: '',
    query_type: 'keyword',
    platform: 'auto',
    productList: [],
    recommendList: [],
    page: 1,
    pageSize: 20,
    loading: false,
    noMoreData: false,
    
    // Sort logic
    sortType: 'default', // default, sales, price
    sortOrder: 'asc'     // asc, desc
  },

  onLoad(options) {
    if (options.keyword) {
      const keyword = decodeURIComponent(options.keyword);
      this.setData({ 
        keyword,
        query_type: options.query_type || 'keyword',
        platform: options.platform || 'auto'
      });
      this.fetchData(true);
    }
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
  },

  onSearchConfirm(e) {
    const val = e.detail.value;
    if (val.trim()) {
      this.setData({ keyword: val.trim() });
      this.fetchData(true);
    }
  },

  onSearchBtnClick() {
    if (this.data.keyword.trim()) {
      this.fetchData(true);
    }
  },

  onClear() {
    this.setData({ keyword: '', productList: [], page: 1, noMoreData: false });
  },

  changeSort(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'price') {
      // Toggle price sort
      if (this.data.sortType === 'price') {
        this.setData({ sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc' });
      } else {
        this.setData({ sortType: 'price', sortOrder: 'asc' });
      }
    } else {
      if (this.data.sortType !== type) {
        this.setData({ sortType: type, sortOrder: 'asc' });
      }
    }
    
    // Re-fetch with new sort
    if (this.data.keyword) {
      this.fetchData(true);
    }
  },

  async fetchData(isRefresh = false) {
    if (this.data.loading || (this.data.noMoreData && !isRefresh)) return;

    if (isRefresh) {
      this.setData({ page: 1, noMoreData: false, productList: [] });
    }

    this.setData({ loading: true });

    try {
      // In a real scenario, API.searchCoupon might take sortType and sortOrder
      const res = await API.searchCoupon({
        query: this.data.keyword,
        query_type: this.data.query_type,
        platform: this.data.platform,
        page: this.data.page,
        page_size: this.data.pageSize,
        sort: this.data.sortType,
        order: this.data.sortOrder
      });

      let newList = [];
      if (res && Array.isArray(res.items)) {
        newList = res.items;
      } else if (Array.isArray(res)) {
        newList = res;
      } else if (res && typeof res === 'object' && res.tao_id) {
        newList = [res];
      }

      const isNoData = isRefresh && newList.length === 0;

      this.setData({
        productList: isRefresh ? newList : [...this.data.productList, ...newList],
        loading: false,
        page: this.data.page + 1,
        noMoreData: newList.length < this.data.pageSize
      });

      // If search returns no results, fetch recommendations
      if (isNoData) {
        this.fetchRecommendations();
      }

    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: e.message || '加载失败', icon: 'none' });
      
      // On error (e.g. empty mock), still fetch recommendations for demo
      if (isRefresh) {
        this.fetchRecommendations();
      }
    }
  },

  async fetchRecommendations() {
    try {
      const res = await API.getFeedData({
        feed_type: 'hot_circle',
        platform: this.data.platform === 'jd' ? 'jd' : 'taobao',
        page: 1,
        page_size: 10
      });
      if (res && res.items && res.items.length > 0) {
        this.setData({ recommendList: res.items });
      }
    } catch (e) {
      console.error('获取推荐商品失败', e);
    }
  },

  loadMore() {
    if (this.data.productList.length > 0) {
      this.fetchData();
    }
  },

  goToDetail(e) {
    const item = e.currentTarget.dataset.item;
    // Format for detail.js
    const detailItem = {
      tao_id: item.tao_id || item.id,
      title: item.title,
      image_url: item.image_url || item.image,
      coupon_price: item.coupon_price || item.price,
      original_price: item.original_price || item.originalPrice,
      coupon_amount: item.coupon_amount || item.coupon,
      sales_num: item.sales_num || item.sales,
      platform: item.platform
    };
    getApp().globalData._navItem = detailItem;
    wx.navigateTo({
      url: `/pages/detail/detail?tao_id=${detailItem.tao_id}&platform=${detailItem.platform || 'taobao'}`
    });
  }
});
