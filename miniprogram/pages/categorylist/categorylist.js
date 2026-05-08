/**
 * 类目列表页 - 根据折淘客接口开发表配置
 * 
 * 接口规则：
 * - 单平台入口（淘宝特卖/天猫优选/聚划算/京东自营/京东配送）：无需平台切换
 * - 双平台入口（品牌精选/神券大厅）：显示淘宝/京东切换Tab
 * - 特价专区：显示9.9/19.9子Tab + 淘宝/京东平台切换
 */

// 金刚区 → 接口配置映射
const ENTRY_CONFIG = {
  '淘宝特卖': {
    hasPlatformTab: false,
    fixedPlatform: 'tb',
    apiType: 'taoqianggou',
    // api_all + jt=taoqianggou (淘宝端口10001)
  },
  '品牌精选': {
    hasPlatformTab: true,
    apiType: 'pinpai',
    // api_all + pinpai=1 (淘宝10001 / 京东20000)
  },
  '天猫优选': {
    hasPlatformTab: false,
    fixedPlatform: 'tb',
    apiType: 'tmall',
    // api_all + tj=tmall (淘宝端口10001)
  },
  '京东自营': {
    hasPlatformTab: false,
    fixedPlatform: 'jd',
    apiType: 'jd_zy',
    // api_all + tj=tmall (京东端口20000)
  },
  '聚划算': {
    hasPlatformTab: false,
    fixedPlatform: 'tb',
    apiType: 'juhuasuan',
    // api_all + jt=juhuasuan (淘宝端口10001)
  },
  '京东配送': {
    hasPlatformTab: false,
    fixedPlatform: 'jd',
    apiType: 'jd_ps',
    // api_all + jt=juhuasuan (京东端口20000)
  },
  '淘喜商品': {
    hasPlatformTab: false,
    fixedPlatform: 'tb',
    apiType: 'taoxi',
  },
  '京喜商品': {
    hasPlatformTab: false,
    fixedPlatform: 'jd',
    apiType: 'jingxi',
  },
  '神券大厅': {
    hasPlatformTab: true,
    apiType: 'quanzhan',
    // api_all 全站领券 (淘宝10001 / 京东20000)
  },
  '特价专区': {
    hasPlatformTab: true,
    hasPriceTab: true,
    apiType: 'tejia',
    priceTabs: [
      { label: '9.9元', value: '0.0-9.9' },
      { label: '19.9元', value: '0.0-19.9' }
    ],
    // api_all + price=X (淘宝10001 / 京东20000)
  }
};

Page({
  data: {
    categoryName: '类目精选',
    config: null,           // 当前入口的接口配置
    
    // 平台切换（仅双平台入口显示）
    hasPlatformTab: false,
    currentPlatform: 'tb',
    
    // 特价专区的价格子Tab
    hasPriceTab: false,
    priceTabs: [],
    currentPrice: '',
    
    // 排序
    sortType: 'default',
    sortOrder: 'asc',
    
    // 数据
    productList: [],
    page: 1,
    pageSize: 20,
    isLoading: false,
    noMoreData: false,
    searchKeyword: ''
  },

  onLoad(options) {
    const title = decodeURIComponent(options.title || '类目精选');
    const config = ENTRY_CONFIG[title] || { hasPlatformTab: false, fixedPlatform: 'tb', apiType: 'default' };

    const initData = {
      categoryName: title,
      config: config,
      hasPlatformTab: !!config.hasPlatformTab,
      currentPlatform: config.fixedPlatform || 'tb',
      hasPriceTab: !!config.hasPriceTab,
      priceTabs: config.priceTabs || [],
      currentPrice: config.priceTabs ? config.priceTabs[0].value : ''
    };

    this.setData(initData);
    wx.setNavigationBarTitle({ title: title });
    this.fetchData(true);
  },

  // --- 搜索 ---
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value });
  },

  onClearSearch() {
    this.setData({ searchKeyword: '' });
    this.fetchData(true);
  },

  onSearchConfirm() {
    this.fetchData(true);
  },

  // --- 平台切换 ---
  switchPlatform(e) {
    const p = e.currentTarget.dataset.p;
    if (p === this.data.currentPlatform) return;
    this.setData({ currentPlatform: p });
    this.fetchData(true);
  },

  // --- 特价专区价格Tab ---
  switchPriceTab(e) {
    const price = e.currentTarget.dataset.price;
    if (price === this.data.currentPrice) return;
    this.setData({ currentPrice: price });
    this.fetchData(true);
  },

  // --- 排序 ---
  changeSort(e) {
    const type = e.currentTarget.dataset.type;
    if (type === 'price') {
      if (this.data.sortType === 'price') {
        this.setData({ sortOrder: this.data.sortOrder === 'asc' ? 'desc' : 'asc' });
      } else {
        this.setData({ sortType: 'price', sortOrder: 'asc' });
      }
    } else if (type === 'sales') {
      if (this.data.sortType === 'sales') {
        this.setData({ sortOrder: this.data.sortOrder === 'desc' ? 'asc' : 'desc' });
      } else {
        this.setData({ sortType: 'sales', sortOrder: 'desc' });
      }
    } else {
      this.setData({ sortType: type, sortOrder: 'desc' });
    }
    this.fetchData(true);
  },

  // --- 数据拉取 ---
  async fetchData(isRefresh = false) {
    if (this.data.isLoading || (this.data.noMoreData && !isRefresh)) return;

    if (isRefresh) {
      this.setData({ page: 1, noMoreData: false, productList: [] });
    }

    this.setData({ isLoading: true });

    try {
      const config = this.data.config || {};
      const platform = this.data.currentPlatform;

      // 构建云函数参数，将接口类型和平台传给后端
      const params = {
        feed_type: config.apiType || 'default',
        platform: platform === 'tb' ? 'taobao' : 'jd',
        page: this.data.page,
        page_size: this.data.pageSize,
        q: this.data.searchKeyword || '',
        sort: this.data.sortType,
        order: this.data.sortOrder
      };

      // 特价专区需要传价格区间
      if (config.hasPriceTab && this.data.currentPrice) {
        params.price = this.data.currentPrice;
      }

      const { API } = require('../../utils/api');
      const data = await API.getFeedData(params);

      if (data && data.items) {
        const newList = data.items;

        this.setData({
          productList: isRefresh ? newList : [...this.data.productList, ...newList],
          isLoading: false,
          page: this.data.page + 1,
          noMoreData: newList.length < this.data.pageSize
        });
      } else {
        this.setData({ isLoading: false });
        if (isRefresh) {
          wx.showToast({ title: '暂无数据', icon: 'none' });
        }
      }
    } catch (err) {
      console.error('Fetch Category Error:', err);
      this.setData({ isLoading: false });
      wx.showToast({ title: '网络开小差了', icon: 'none' });
    }
  },

  loadMore() {
    this.fetchData(false);
  },

  onPullDownRefresh() {
    this.fetchData(true).then(() => wx.stopPullDownRefresh());
  },

  // --- 跳转详情 ---
  goToDetail(e) {
    const item = e.currentTarget.dataset.item;
    const detailItem = {
      tao_id: (item.tao_id || item.id || '').toString(),
      title: item.title,
      image_url: item.image_url || item.image,
      coupon_price: item.coupon_price || item.price,
      original_price: item.original_price || item.originalPrice,
      coupon_amount: item.coupon_amount || item.coupon,
      sales_num: item.sales_num || item.sales,
      platform: item.platform || this.data.currentPlatform
    };
    const itemStr = encodeURIComponent(JSON.stringify(detailItem));
    wx.navigateTo({
      url: `/pages/detail/detail?item=${itemStr}`
    });
  }
});
