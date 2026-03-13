const app = getApp();

Page({
  data: {
    tabs: [
      { id: '9.9', title: '9.9包邮' },
      { id: 'hongbao', title: '外卖红包' },
      { id: 'lowPrice', title: '历史低价' }
    ],
    activeTab: '9.9',
    goodsList: [
      {
        id: '1',
        title: '纯棉短袖T恤男夏季透气圆领宽松百搭',
        image: 'https://img.yzcdn.cn/vant/apple-1.jpg',
        price: '19.9',
        points: 5
      },
      {
        id: '2',
        title: '网红爆款抽纸整箱家用实惠装',
        image: 'https://img.yzcdn.cn/vant/apple-2.jpg',
        price: '9.9',
        points: 2
      },
      {
        id: '3',
        title: '便携式无线蓝牙耳机降噪超长续航',
        image: 'https://img.yzcdn.cn/vant/apple-3.jpg',
        price: '39.9',
        points: 8
      },
      {
        id: '4',
        title: '多功能家用插排USB充电器排插',
        image: 'https://img.yzcdn.cn/vant/apple-4.jpg',
        price: '15.8',
        points: 3
      }
    ],
    leftList: [],
    rightList: []
  },

  onLoad: function() {
    const app = getApp();
    this.setData({
      navHeight: app.globalData.navHeight,
      statusBarHeight: app.globalData.statusBarHeight
    });
    this.splitList();
  },

  // 模拟瀑布流左右分列
  splitList: function() {
    const list = this.data.goodsList;
    const leftList = [];
    const rightList = [];
    list.forEach((item, index) => {
      if (index % 2 === 0) {
        leftList.push(item);
      } else {
        rightList.push(item);
      }
    });
    this.setData({ leftList, rightList });
  },

  onTabClick: function(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({ activeTab: id });
    // 实际项目中这里应重新加载对应分类数据
    wx.showToast({
      title: '切换分类中',
      icon: 'loading',
      duration: 500
    });
  },

  onGoodsClick: function(e) {
    const id = e.currentTarget.dataset.id;
    // 详情逻辑待实现
    console.log('点击商品:', id);
  }
});
