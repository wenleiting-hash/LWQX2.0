const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navHeight: 44,
    navBarPad: 0,
    userInfo: {
      avatarUrl: '',
      nickName: '',
      level: 'Lv.1 轻省达人',
      totalSaved: '0.00',
      availablePoints: '0'
    },
    shopInfo: {
      title: '佳友栈老温 视频号店',
      desc: '积分全额兑换 或 积分抵扣换购健康好物'
    },
    inviteCard: {
      id: 'invite',
      title: '邀请好友 一起省钱',
      desc: '好友首次查券，各得 500 积分',
      iconPath: '/images/icons/user_plus.png',
      bg: '#FFF0E8'
    },
    menuList: [
      { id: 'details', title: '积分明细', desc: '每一笔获取与消耗记录', iconPath: '/images/icons/list_ordered.png', bg: '#FFF0E8' },
      { id: 'community', title: '加入老温私域社群', desc: '专属隐藏福利与健康交流', iconPath: '/images/icons/message_circle.png', bg: '#E6F7ED' },
      { id: 'guide', title: '使用说明', desc: '查券、提分、兑换全攻略', iconPath: '/images/icons/circle_help.png', bg: '#EBF3FF' }
    ],
    shareConfig: {
      title: '还在原价网购？快来这里查隐藏优惠券，边省边赚！',
      path: '/pages/index/index'
    },
    showAuthModal: false
  },

  onLoad() {
    const { navHeight, statusBarHeight, menuButtonInfo } = app.globalData;
    const navBarPad = menuButtonInfo ? menuButtonInfo.top - statusBarHeight : 6;
    this.setData({ navHeight, statusBarHeight, navBarPad });
  },

  onShow() {
    this.fetchUserStats();
  },

  async fetchUserStats() {
    wx.showNavigationBarLoading();
    try {
      // 1. 获取用户统计
      const statsRes = await wx.cloud.callFunction({
        name: 'get_user_stats'
      });
      if (statsRes.result && statsRes.result.success) {
        const cloudData = statsRes.result.data;
        const updateObj = {
          'userInfo.totalSaved': cloudData.totalSaved,
          'userInfo.availablePoints': cloudData.availablePoints
        };

        if (cloudData.userInfo) {
          updateObj['userInfo.avatarUrl'] = cloudData.userInfo.avatarUrl || '';
          updateObj['userInfo.nickName'] = cloudData.userInfo.nickName || '未登录';
          updateObj['userInfo.level'] = cloudData.userInfo.level || '普通会员';
        }

        this.setData(updateObj);
        
        // 强制阻断未完善资料的用户
        const cloudAvatar = cloudData.userInfo?.avatarUrl;
        const cloudNick = cloudData.userInfo?.nickName;
        
        if (!cloudAvatar || cloudNick === '新用户' || !cloudNick) {
          this.setData({ showAuthModal: true });
        }
      } else if (statsRes.result && statsRes.result.code === 'NOT_REGISTERED') {
        // 用户未注册，直接拦截
        this.setData({ showAuthModal: true });
      }

      // 2. 获取公共系统配置（运营配置）
      const configRes = await wx.cloud.callFunction({
        name: 'get_system_config'
      });
      if (configRes.result && configRes.result.success && configRes.result.data.operations_config) {
        const ops = configRes.result.data.operations_config;
        this.setData({
          'shareConfig.title': ops.shareText || this.data.shareConfig.title,
          'shopInfo.url': ops.videoShopUrl || '',
        });
      }

    } catch (e) {
      console.error('获取同步数据失败:', e);
    } finally {
      wx.hideNavigationBarLoading();
    }
  },

  onMenuClick(e) {
    const id = e.currentTarget.dataset.id;
    if (id === 'details') {
      wx.navigateTo({ url: '/pages/points_detail/points_detail' });
    } else if (id === 'community') {
      wx.navigateTo({ url: '/pages/community/community' });
    } else if (id === 'guide') {
      wx.navigateTo({ url: '/pages/guide/guide' });
    } else if (id === 'shop') {
      wx.showToast({ title: '视频号特权筹备中', icon: 'none' });
    }
  },

  onAuthCancel() {
    this.setData({ showAuthModal: false });
    wx.switchTab({ url: '/pages/index/index' });
  },

  onAuthSuccess(e) {
    const { avatarUrl, nickName } = e.detail;
    this.setData({
      'userInfo.avatarUrl': avatarUrl,
      'userInfo.nickName': nickName,
      showAuthModal: false
    });
    // 用户资料更新完成，再次请求统计与主界面绘制
    this.fetchUserStats();
  },

  onShareAppMessage() {
    return this.data.shareConfig;
  }
});
