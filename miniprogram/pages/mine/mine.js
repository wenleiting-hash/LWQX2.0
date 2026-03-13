const app = getApp();

Page({
  data: {
    statusBarHeight: 20,
    navHeight: 44,
    navBarPad: 0, // 胶囊顶部到状态栏底部的间距（通常 6~12px）
    userInfo: {
      avatarUrl: '',
      nickName: '用户昵称（微信名）',
      level: 'Lv.1 轻省达人',
      totalSaved: '145.50',
      availablePoints: '256'
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
    ]
  },

  onLoad() {
    const { navHeight, statusBarHeight, menuButtonInfo } = app.globalData;
    // navBarPad: 胶囊顶部到状态栏底部的间距，用于 header-row 的高度补偿
    const navBarPad = menuButtonInfo
      ? menuButtonInfo.top - statusBarHeight
      : 6;

    this.setData({ navHeight, statusBarHeight, navBarPad });
  },

  onMenuClick(e) {
    const id = e.currentTarget.dataset.id;
    console.log('点击菜单:', id);
  }
});
