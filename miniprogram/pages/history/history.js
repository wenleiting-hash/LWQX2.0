import { API } from '../../utils/api';

Page({
  data: {
    historyList: []
  },

  onShow() {
    this.loadHistory();
  },

  async loadHistory() {
    wx.showLoading({ title: '加载中...' });
    try {
      const res = await API.userAssets('get_footprints', { page: 1, pageSize: 100 });
      let cloudItems = [];
      if (res && res.list && res.list.length > 0) {
        cloudItems = res.list.map(f => f.item);
      }

      const footprints = wx.getStorageSync('footprints') || [];
      const browseHistory = wx.getStorageSync('browse_history') || [];
      
      const allHistory = [...cloudItems, ...footprints, ...browseHistory];
      const uniqueItems = [];
      const seenIds = new Set();
      
      allHistory.forEach(item => {
        const id = item.tao_id || item.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueItems.push(item);
        }
      });

      // Sort descending by timestamp
      uniqueItems.sort((a, b) => {
        const timeA = a.timestamp || a.viewTime || 0;
        const timeB = b.timestamp || b.viewTime || 0;
        return timeB - timeA;
      });

      this.setData({ historyList: uniqueItems });
      
      // Update local storage with merged unique data
      wx.setStorageSync('footprints', uniqueItems);
    } catch (e) {
      console.error('Failed to load history', e);
    } finally {
      wx.hideLoading();
    }
  },

  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有足迹记录吗？',
      confirmColor: '#FF6200',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('footprints');
            wx.removeStorageSync('browse_history');
            this.setData({ historyList: [] });
            wx.showToast({ title: '已清空', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        }
      }
    });
  },

  deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.historyList;
    list.splice(index, 1);
    
    this.setData({ historyList: list });
    
    try {
      wx.setStorageSync('footprints', list);
    } catch (e) {
      console.error('Failed to update history', e);
    }
  },

  goToDetail(e) {
    const item = e.currentTarget.dataset.item;
    const detailItem = {
      tao_id: item.tao_id || item.id,
      title: item.title,
      image_url: item.image_url || item.image || item.pict_url,
      coupon_price: item.coupon_price || item.price,
      original_price: item.original_price,
      coupon_amount: item.coupon_amount,
      platform: item.platform || item.source || 'taobao'
    };
    getApp().globalData._navItem = detailItem;
    wx.navigateTo({ url: `/pages/detail/detail?tao_id=${detailItem.tao_id}&platform=${detailItem.platform}` });
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' });
  }
});
