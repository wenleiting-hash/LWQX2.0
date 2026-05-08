import { API } from '../../utils/api';
 // Assume we have a utility, but we can write a simple one here if not.

// 简单的相对时间格式化
const timeAgo = (dateStr) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return '刚刚';
  if (diff < 3600) return Math.floor(diff / 60) + '分钟前';
  if (diff < 86400) return Math.floor(diff / 3600) + '小时前';
  return Math.floor(diff / 86400) + '天前';
};

// 生成通用头像背景色
const getAvatarColor = (name) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD', '#D4A5A5', '#9B59B6', '#3498DB', '#F1C40F', '#E67E22'];
  let sum = 0;
  for (let i = 0; i < name.length; i++) {
    sum += name.charCodeAt(i);
  }
  return colors[sum % colors.length];
};

Page({
  data: {
    barrage: [],
    orders: [],
    dailyStats: {
      amount: '0.00',
      count: '0'
    },
    page: 1,
    hasMore: true,
    isLoading: false,
    newCount: 0
  },

  onLoad: function() {
    this.fetchData(true);
  },

  onPullDownRefresh: function() {
    this.fetchData(true).then(() => {
      wx.stopPullDownRefresh();
    });
  },

  onReachBottom: function() {
    if (this.data.hasMore && !this.data.isLoading) {
      this.fetchData(false);
    }
  },

  fetchData: function(isRefresh = false) {
    if (this.data.isLoading) return Promise.resolve();

    const targetPage = isRefresh ? 1 : this.data.page + 1;
    this.setData({ isLoading: true });

    return API.getShowcaseEvents(targetPage, 20)
      .then(res => {
        const { items = [], newCount = 0, dailyStats, hasMore } = res;
        
        // 格式化数据
        const formattedItems = items.map(item => {
          const nickname = item.nickname || '省钱达人';
          return {
            id: item._id,
            time: timeAgo(item.created_at),
            user: nickname,
            avatarInitial: nickname.charAt(0),
            avatarColor: getAvatarColor(nickname),
            platform: item.platform === 'jd' ? '京东' : '淘宝',
            itemTitle: item.title,
            imageUrl: item.image_url,
            couponPrice: parseFloat(item.coupon_price || 0).toFixed(2),
            originalPrice: parseFloat(item.original_price || 0).toFixed(2),
            save: parseFloat(item.coupon_amount || 0).toFixed(2),
            tao_id: item.tao_id
          };
        });

        // 如果是第一页，重新生成弹幕和更新大盘数据
        if (isRefresh) {
          const newBarrages = items.slice(0, 10).map(item => {
            const timeStr = [10, 30, 60][Math.floor(Math.random() * 3)] + '秒前';
            const nickname = item.nickname || '省钱达人';
            return `${nickname} ${timeStr} 领券购买了 ${item.title.substring(0, 8)}...，省了${parseFloat(item.coupon_amount||0).toFixed(0)}元`;
          });

          this.setData({
            orders: formattedItems,
            barrage: newBarrages.length > 0 ? newBarrages : ["张** 刚刚 领券购买了 欧莱雅男士，省了30元"],
            page: 1,
            hasMore: hasMore,
            newCount: newCount,
            'dailyStats.amount': parseFloat(dailyStats?.amount || 0).toFixed(2),
            'dailyStats.count': (dailyStats?.count || 0).toString()
          });
        } else {
          this.setData({
            orders: this.data.orders.concat(formattedItems),
            page: targetPage,
            hasMore: hasMore
          });
        }
      })
      .catch(err => {
        console.error('Fetch showcase error:', err);
        wx.showToast({ title: '加载失败', icon: 'none' });
      })
      .finally(() => {
        this.setData({ isLoading: false });
      });
  },

  // 跳转到商品详情
  goToDetail(e) {
    const { taoid, platform } = e.currentTarget.dataset;
    if (!taoid) return;
    
    wx.navigateTo({
      url: `/pages/detail/detail?tao_id=${taoid}&platform=${platform === '京东' ? 'jd' : 'taobao'}`
    });
  }
});
