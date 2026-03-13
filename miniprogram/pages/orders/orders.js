Page({
  data: {
    tabs: [
      { id: 'all', title: '全部' },
      { id: 'pending', title: '待结算' },
      { id: 'settled', title: '已入账' },
      { id: 'invalid', title: '已失效' }
    ],
    activeTab: 'all',
    showDetail: false,
    currentOrder: {},
    orderList: [
      {
        id: '1',
        title: '美的电饭煲家用3L智能电饭锅',
        image: 'https://img.yzcdn.cn/vant/apple-5.jpg',
        date: '2026-03-10',
        orderId: '8832',
        points: '+12.5',
        saved: '15.50',
        orderNo: 'ORD2025001',
        orderTime: '2025-02-28 09:15',
        status: 'pending',
        statusText: '待结算'
      },
      {
        id: '2',
        title: '纯棉短袖T恤男夏季透气圆领',
        image: 'https://img.yzcdn.cn/vant/apple-6.jpg',
        date: '2026-03-08',
        orderId: '5521',
        points: '+5.0',
        saved: '8.00',
        orderNo: 'ORD2025002',
        orderTime: '2025-02-28 09:15',
        status: 'settled',
        statusText: '已入账'
      },
      {
        id: '3',
        title: '网红爆款抽纸整箱家用实惠装',
        image: 'https://img.yzcdn.cn/vant/apple-7.jpg',
        date: '2026-03-05',
        orderId: '3347',
        points: '+2.0',
        saved: '3.20',
        orderNo: 'ORD2025003',
        orderTime: '2025-02-05 14:30',
        status: 'invalid',
        statusText: '已失效'
      }
    ]
  },

  onLoad: function() {
    const app = getApp();
    this.setData({
      navHeight: app.globalData.navHeight,
      statusBarHeight: app.globalData.statusBarHeight
    });
  },

  onTabClick(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id });
  },

  onOrderTap(e) {
    const index = e.currentTarget.dataset.index;
    const order = this.data.orderList[index];
    this.setData({ showDetail: true, currentOrder: order });
  },

  onCloseDetail() {
    this.setData({ showDetail: false });
  },

  onCopyOrderNo(e) {
    const no = e.currentTarget.dataset.no;
    wx.setClipboardData({
      data: no,
      success() {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  noop() {}
});
