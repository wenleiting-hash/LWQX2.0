Page({
  data: {
    pageTitle: '精选活动',
    typeId: '',
    isLoading: true,
    items: []
  },

  onLoad: function (options) {
    const { id, title } = options;
    
    if (title) {
      wx.setNavigationBarTitle({ title: decodeURIComponent(title) });
      this.setData({ pageTitle: decodeURIComponent(title) });
    }
    
    if (id) {
      this.setData({ typeId: id });
    }

    this.fetchPromoData();
  },

  onPullDownRefresh: function() {
    this.fetchPromoData().then(() => {
      wx.stopPullDownRefresh();
    });
  },

  fetchPromoData: function() {
    this.setData({ isLoading: true });
    
    // Simulate API call based on typeId
    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock data
        const mockItems = [
          { id: 101, title: '【限时抢购】高品质保暖羽绒服男士长款加厚', price: 199.9, originalPrice: 599.9, coupon: 400, sales: '2.5w+', platform: 'tb', image: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&q=80&w=200&h=200' },
          { id: 102, title: '高端智能扫地机器人全自动吸尘拖地一体机', price: 899, originalPrice: 1999, coupon: 1100, sales: '8k+', platform: 'jd', image: 'https://images.unsplash.com/photo-1589051478142-d1154546a9a7?auto=format&fit=crop&q=80&w=200&h=200' },
          { id: 103, title: '纯棉加厚洗脸毛巾家用成人男女洗澡全棉柔软', price: 19.9, originalPrice: 59.9, coupon: 40, sales: '10w+', platform: 'tb', image: 'https://images.unsplash.com/photo-1584949514123-474cb0c6114a?auto=format&fit=crop&q=80&w=200&h=200' },
          { id: 104, title: '大容量电热水壶家用不锈钢保温开水壶', price: 39.9, originalPrice: 129, coupon: 89, sales: '5.6w+', platform: 'jd', image: 'https://images.unsplash.com/photo-1584269600519-112d071b4d1c?auto=format&fit=crop&q=80&w=200&h=200' }
        ];
        
        this.setData({
          items: mockItems,
          isLoading: false
        });
        resolve();
      }, 800);
    });
  },

  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    // TODO: wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});
