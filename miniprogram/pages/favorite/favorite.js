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
      // 优先从云端获取
      const res = await API.userAssets('get_favorites', { page: 1, pageSize: 100 });
      let data = [];
      
      if (res && res.list) {
        data = res.list.map(f => f.item); // 云端返回结构是 { item: {...}, create_time }
        // 同步回本地以备缓存
        wx.setStorageSync('favorites', data);
      } else {
        // 降级使用本地
        data = wx.getStorageSync('favorites') || [];
      }
      
      this.setData({ historyList: data });
    } catch (e) {
      console.error('Failed to load favorites', e);
      // 降级使用本地
      const data = wx.getStorageSync('favorites') || [];
      this.setData({ historyList: data });
    } finally {
      wx.hideLoading();
    }
  },

  clearHistory() {
    wx.showModal({
      title: '提示',
      content: '确定要清空所有收藏记录吗？',
      confirmColor: '#FF6200',
      success: (res) => {
        if (res.confirm) {
          try {
            wx.removeStorageSync('favorites');
            this.setData({ historyList: [] });
            wx.showToast({ title: '已清空', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: '清空失败', icon: 'none' });
          }
        }
      }
    });
  },

  async deleteItem(e) {
    const index = e.currentTarget.dataset.index;
    const list = this.data.historyList;
    const itemToDelete = list[index];
    
    // Optimistic UI update
    list.splice(index, 1);
    this.setData({ historyList: list });
    wx.setStorageSync('favorites', list);
    
    // Sync to cloud
    try {
      const itemId = itemToDelete.tao_id || itemToDelete.id;
      await API.userAssets('remove_favorite', { itemId });
    } catch (err) {
      console.error('Failed to remove favorite from cloud', err);
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
