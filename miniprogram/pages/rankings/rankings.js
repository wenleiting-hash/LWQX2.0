const { API: api } = require('../../utils/api.js');

Page({
  data: {
    platform: 'tb',
    ranksRow1: [
      { id: 'burst', name: '实时爆单榜', iconClass: 'icon-flame' },
      { id: 'popular', name: '实时人气', iconClass: 'icon-eye' },
      { id: 'moments', name: '朋友圈热推', iconClass: 'icon-star' },
      { id: 'monthly', name: '月度销售榜', iconClass: 'icon-calendar' },
    ],
    ranksRow2: [
      { id: 'discount', name: '超高优惠榜', subtitle: '立省50元起', iconClass: 'icon-percent' },
      { id: 'sales', name: '超高销量榜', subtitle: '全网疯抢中', iconClass: 'icon-trending' },
      { id: 'score', name: '超高评分榜', subtitle: '闭眼入好货', iconClass: 'icon-crown' },
    ],
    hotTabs: [
      { id: 'tb', name: '今日淘宝热销' },
      { id: 'jd', name: '今日京东热销' }
    ],
    items: [],
    page: 1,
    hasMore: true,
    isLoading: true,
    isLoadingMore: false
  },

  onLoad: function() {
    this.fetchRankingData(true);
  },
  
  onTabChange(e) {
    const pf = e.currentTarget.dataset.pf;
    if (this.data.platform === pf) return;
    this.setData({ platform: pf, items: [], page: 1, hasMore: true, isLoading: true });
    wx.vibrateShort();
    this.fetchRankingData(true);
  },

  onRankClick: function(e) {
    const id = e.currentTarget.dataset.id;
    const allRanks = [...this.data.ranksRow1, ...this.data.ranksRow2];
    const rank = allRanks.find(r => r.id === id);
    if (rank) {
      wx.navigateTo({
        url: `/pages/ranking-list/ranking-list?id=${id}&title=${encodeURIComponent(rank.name)}`
      });
    }
  },

  fetchRankingData: async function(isRefresh = false) {
    if (!isRefresh && (!this.data.hasMore || this.data.isLoadingMore)) return;

    if (!isRefresh) {
      this.setData({ isLoadingMore: true });
    } else {
      wx.showNavigationBarLoading();
    }

    // 固定为主列表信息流：全天销量榜 (今日热销)
    const feedType = 'rank_day';
    const platformParam = this.data.platform === 'tb' ? 'taobao' : 'jd';

    try {
      const data = await api.getFeedData({
        feed_type: feedType,
        platform: platformParam,
        page: this.data.page,
        page_size: 20
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
      console.error('Fetch Ranking Data Error:', err);
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
      this.fetchRankingData();
    }
  },

  onPullDownRefresh: function() {
    this.setData({ page: 1, hasMore: true, isLoading: true });
    this.fetchRankingData(true);
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
    getApp().globalData._navItem = detailItem;
    wx.navigateTo({
      url: `/pages/detail/detail?tao_id=${detailItem.tao_id}&platform=${detailItem.platform || 'taobao'}`
    });
  }
});
