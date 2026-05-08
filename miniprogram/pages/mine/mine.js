import { API } from '../../utils/api';

Page({
  data: {
    stats: {
      saveAmount: '0.00',
      couponCount: '0'
    },
    recentHistory: [],
    menuList: [
      { id: 'favorite', name: '我的收藏', subname: '收藏的好物都在这里', iconClass: 'icon-heart-circle', iconBg: 'rgba(255,98,0,0.1)', iconColor: '#FF6200', hasArrow: true },
      { id: 'tutorial', name: '使用教程', subname: '手把手教你查券省钱', iconClass: 'icon-smartphone-circle', iconBg: 'rgba(255,98,0,0.1)', iconColor: '#FF6200', hasArrow: true },
      { id: 'community', name: '加入社群', subname: '扫码加入官方交流群', iconClass: 'icon-users', iconBg: 'rgba(255,98,0,0.1)', iconColor: '#FF6200', hasArrow: true },
      { id: 'contact', name: '联系我们', subname: '专属客服为你解答', iconClass: 'icon-message-circle', iconBg: 'rgba(255,98,0,0.1)', iconColor: '#FF6200', hasArrow: true },
      { id: 'faq', name: '常见问题', subname: '解答日常查券疑问', iconClass: 'icon-help-circle', iconBg: 'rgba(255,98,0,0.1)', iconColor: '#FF6200', hasArrow: true }
    ]
  },
  
  onLoad: function() {
    this.silentLogin();
  },
  
  async onShow() {
    getApp().cleanExpiredStorage();
    // 优先计算本地以保证秒出数据
    this.calculateLocalStats();
    // 节流：5分钟内不重复同步云端
    const now = Date.now();
    if (!this._lastSync || now - this._lastSync > 5 * 60 * 1000) {
      this._lastSync = now;
      await this.syncAndMergeFootprints();
    }
  },

  calculateLocalStats() {
    try {
      const footprints = wx.getStorageSync('footprints') || [];
      const browseHistory = wx.getStorageSync('browse_history') || [];
      
      const allHistory = [...footprints, ...browseHistory];
      const uniqueItems = [];
      const seenIds = new Set();
      
      allHistory.forEach(item => {
        const id = item.tao_id || item.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueItems.push(item);
        }
      });

      // 按照时间戳倒序排列
      uniqueItems.sort((a, b) => {
        const timeA = a.timestamp || a.viewTime || 0;
        const timeB = b.timestamp || b.viewTime || 0;
        return timeB - timeA;
      });

      let totalSave = 0;
      let count = 0;
      const recent = [];

      uniqueItems.forEach((item, index) => {
        // 计算省钱总金额和找券数量
        let amount = parseFloat(item.coupon_amount) || parseFloat(item.couponAmount) || 0;
        if (amount > 0) {
          totalSave += amount;
          count += 1;
        }
        
        // 提取前4个足迹用于展示
        if (recent.length < 4) {
          recent.push({
            id: item.tao_id || item.id,
            image: item.image_url || item.image || item.pict_url,
            price: item.coupon_price || item.price || item.zk_final_price
          });
        }
      });

      this.setData({
        'stats.saveAmount': totalSave.toFixed(2),
        'stats.couponCount': count.toString(),
        recentHistory: recent
      });
    } catch (e) {
      console.error('Failed to calculate stats', e);
    }
  },

  async syncAndMergeFootprints() {
    try {
      const localFootprints = wx.getStorageSync('footprints') || [];
      if (localFootprints.length > 0) {
        // 同步本地到云端
        const recentFootprints = localFootprints.slice(0, 20);
        await API.userAssets('sync_footprints', { footprints: recentFootprints });
      }

      // 从云端拉取全量合并
      const res = await API.userAssets('get_footprints', { page: 1, pageSize: 100 });
      let cloudItems = [];
      if (res && res.list) {
        cloudItems = res.list.map(f => f.item);
      }

      const allHistory = [...cloudItems, ...localFootprints];
      const uniqueItems = [];
      const seenIds = new Set();
      
      allHistory.forEach(item => {
        const id = item.tao_id || item.id;
        if (id && !seenIds.has(id)) {
          seenIds.add(id);
          uniqueItems.push(item);
        }
      });

      uniqueItems.sort((a, b) => {
        const timeA = a.timestamp || a.viewTime || 0;
        const timeB = b.timestamp || b.viewTime || 0;
        return timeB - timeA;
      });

      wx.setStorageSync('footprints', uniqueItems);
      // 重新触发本地计算
      this.calculateLocalStats();
    } catch (e) {
      console.error('Failed to sync and merge footprints', e);
    }
  },
  

  async silentLogin() {
    try {
      const loginRes = await API.login();
      if (loginRes && loginRes.openid) {
        wx.setStorageSync('user_openid', loginRes.openid);
        console.log('静默建档成功, OpenID:', loginRes.openid);
      }
    } catch (err) {
      console.error('静默登录建档失败', err);
    }
  },

  goToHistory() {
    wx.navigateTo({ url: '/pages/history/history' });
  },

  goToDiscover() {
    wx.switchTab({ url: '/pages/discover/discover' });
  },

  onShareAppMessage() {
    return {
      title: '小栗鼠查券神器，购物省钱必备',
      path: '/pages/index/index',
      imageUrl: '/images/invite_bg.png' 
    };
  },

  onMenuTap(e) {
    const id = e.currentTarget.dataset.id;
    const routes = {
      tutorial: '/pages/guide/guide',
      faq: '/pages/faq/faq',
      contact: '/pages/contact/contact',
      community: '/pages/join-group/join-group',
      favorite: '/pages/favorite/favorite'
    };
    
    const url = routes[id];
    if (url) {
      wx.navigateTo({ url });
    }
  }
});
