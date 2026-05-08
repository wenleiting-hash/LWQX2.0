import { API } from '../../utils/api';

Page({
  data: {
    isLoading: true,
    searchPlatform: 'tb', // tb or jd
    feedPlatform: 'tb',   // tb or jd
    icons: [
      { id: 1, name: '淘宝特卖', iconClass: 'icon-bag',   color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 2, name: '品牌精选', iconClass: 'icon-star',   color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 3, name: '天猫优选', iconClass: 'icon-tag',    color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 4, name: '京东自营', iconClass: 'icon-truck',   color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 5, name: '聚划算',   iconClass: 'icon-clock',  color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 6, name: '京东配送', iconClass: 'icon-zap',    color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 7, name: '神券大厅', iconClass: 'icon-gift',   color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
      { id: 8, name: '特价专区',  iconClass: 'icon-dollar', color: '#FF6200', bgColor: 'rgba(255,98,0,0.1)' },
    ],
    products: [],
    page: 1,
    hasMore: true,
    isLoadingMore: false,
    searchKeyword: '',
    // 分页优化配置
    maxTotalItems: 200, // 最大加载条数，防止内存溢出
    preloadThreshold: 3 // 距离底部还有3屏时预加载
  },
  
  onLoad: function() {
    this.applyThemeColor();
    // 尝试从缓存加载数据
    this.loadFromCache();
    // 加载最新数据
    this.loadFeedData(true);
  },

  applyThemeColor() {
    const themeColor = getApp().globalData.themeColor;
    if (themeColor) {
      // 提取RGB值以便计算透明度
      let r = parseInt(themeColor.slice(1, 3), 16) || 255;
      let g = parseInt(themeColor.slice(3, 5), 16) || 98;
      let b = parseInt(themeColor.slice(5, 7), 16) || 0;
      let bgColor = `rgba(${r},${g},${b},0.1)`;

      const newIcons = this.data.icons.map(icon => ({
        ...icon,
        color: themeColor,
        bgColor: bgColor
      }));
      this.setData({ icons: newIcons, themeColor: themeColor });
    }
  },

  // 从缓存加载数据
  loadFromCache: function() {
    try {
      const cache = wx.getStorageSync('discover_feed_cache');
      const platformParam = this.data.feedPlatform === 'tb' ? 'taobao' : 'jd';

      // 检查缓存是否有效（存在、平台一致、未过期5分钟）
      if (cache && cache.platform === platformParam && cache.timestamp) {
        const now = Date.now();
        const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

        if (now - cache.timestamp < CACHE_TTL && cache.data && cache.data.length > 0) {
          this.setData({
            products: cache.data,
            isLoading: false,
            hasMore: cache.data.length >= 20
          });
          console.log('[Discover] 从缓存加载了数据');
        }
      }
    } catch (e) {
      console.error('加载缓存失败', e);
    }
  },
  
  switchSearchPlatform: function() {
    const nextPlatform = this.data.searchPlatform === 'tb' ? 'jd' : 'tb';
    this.setData({ searchPlatform: nextPlatform });
    wx.vibrateShort();
  },

  switchFeedPlatform: function(e) {
    const feedPlatform = e.currentTarget.dataset.p;
    if (feedPlatform === this.data.feedPlatform) return;
    
    this.setData({ 
      feedPlatform,
      products: [],
      page: 1,
      hasMore: true,
      isLoading: true
    });
    wx.vibrateShort();
    this.loadFeedData(true);
  },

  loadFeedData: function(isRefresh = false) {
    // 检查是否超过最大加载数量
    if (!isRefresh && this.data.products.length >= this.data.maxTotalItems) {
      this.setData({ hasMore: false, isLoadingMore: false });
      wx.showToast({ title: '已显示全部商品', icon: 'none' });
      return;
    }

    if (!isRefresh && (!this.data.hasMore || this.data.isLoadingMore)) return;

    if (!isRefresh) {
      this.setData({ isLoadingMore: true });
    }

    const platformParam = this.data.feedPlatform === 'tb' ? 'taobao' : 'jd';

    API.getFeedData({
      feed_type: 'hot_circle',
      platform: platformParam,
      page: this.data.page,
      page_size: 20
    }).then(data => {
      if (data && data.items) {
        const newItems = data.items;

        // 检查是否会超过最大数量限制
        const currentTotal = isRefresh ? newItems.length : this.data.products.length + newItems.length;
        const hasMore = newItems.length >= 20 && currentTotal < this.data.maxTotalItems;

        this.setData({
          products: isRefresh ? newItems : [...this.data.products, ...newItems],
          hasMore: hasMore,
          isLoading: false,
          isLoadingMore: false
        });

        // 缓存数据到本地（仅缓存第一页）
        if (this.data.page === 1) {
          try {
            wx.setStorageSync('discover_feed_cache', {
              data: this.data.products,
              timestamp: Date.now(),
              platform: platformParam
            });
          } catch (e) {
            console.error('缓存数据失败', e);
          }
        }
      } else {
        if (isRefresh) {
          this.setData({ products: [], hasMore: false, isLoading: false });
        } else {
          this.setData({ hasMore: false, isLoadingMore: false });
        }
      }
      wx.stopPullDownRefresh();
    }).catch(err => {
      console.error('Failed to load feed data:', err);
      this.setData({ isLoading: false, isLoadingMore: false });
      wx.stopPullDownRefresh();
      wx.showToast({ title: '加载失败，请重试', icon: 'none' });
    });
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading && !this.data.isLoadingMore) {
      this.setData({ page: this.data.page + 1 });
      this.loadFeedData();
    }
  },


  onPullDownRefresh: function() {
    this.setData({ page: 1, hasMore: true });
    this.loadFeedData(true);
  },

  onSearchInput: function(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  doSearch: function() {
    const keyword = (this.data.searchKeyword || '').trim();
    if (!keyword) return;
    wx.navigateTo({
      url: `/pages/search-result/search-result?keyword=${encodeURIComponent(keyword)}`
    });
  },

  goToDetail: function(e) {
    const item = e.currentTarget.dataset.item;
    // Format mock data to match detail.js expectation if necessary, 
    // or just pass as is.
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
    getApp().globalData._navItem = detailItem;
    wx.navigateTo({
      url: `/pages/detail/detail?tao_id=${detailItem.tao_id}&platform=${detailItem.platform || 'taobao'}`
    });
  },

  goToCategoryList: function(e) {
    const item = e.currentTarget.dataset.item;
    const title = encodeURIComponent(item.name);
    wx.navigateTo({
      url: `/pages/categorylist/categorylist?title=${title}`
    });
  }
});
