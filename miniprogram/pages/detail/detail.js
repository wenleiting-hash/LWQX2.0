import { API } from '../../utils/api';
import { copyText } from '../../utils/clipboard';

Page({
  data: {
    itemData: null,
    loading: true,
    navAlpha: 0,
    statusBarHeight: 20,
    navContentHeight: 44,
    isFavorite: false
  },

  onLoad(options)
  {
    this.initNavbar();

    // 优先从全局中转获取商品数据（避免 URL 传 JSON 截断风险）
    const app = getApp();
    let item = null;
    if (app.globalData._navItem) {
      item = app.globalData._navItem;
      app.globalData._navItem = null;
    } else if (options.item) {
      // 兼容旧的 URL JSON 传参方式
      try {
        item = JSON.parse(decodeURIComponent(options.item));
      } catch (e) {
        console.error('解析 item 参数失败', e);
      }
    }

    if (item) {
      this.setData({ itemData: item, loading: false });
      this.saveToHistory(item);
      this.checkFavoriteStatus(item);
      // 如果是从缓存列表进来的，可能没有高清小图，静默请求 detail 接口获取
      if (!item.small_images || item.small_images.length === 0) {
        this.fetchDetail(item.tao_id, item.platform || 'taobao');
      }
    } else if (options.tao_id) {
      this.fetchDetail(options.tao_id, options.platform || 'taobao');
    } else {
      this.setData({ loading: false });
      wx.showToast({ title: '参数错误', icon: 'none' });
    }
  },

  initNavbar()
  {
    try {
      const sysInfo = wx.getSystemInfoSync();
      const menuButton = wx.getMenuButtonBoundingClientRect();
      const navContentHeight = menuButton.height + (menuButton.top - sysInfo.statusBarHeight) * 2;
      this.setData({
        statusBarHeight: sysInfo.statusBarHeight,
        navContentHeight: navContentHeight
      });
    } catch (e) {
      console.error("Navbar init error", e);
    }
  },

  onPageScroll(e)
  {
    let alpha = Math.min(1, e.scrollTop / 150);
    if (this.data.navAlpha !== alpha) {
      if (Math.abs(this.data.navAlpha - alpha) > 0.05 || alpha === 0 || alpha === 1) {
        this.setData({ navAlpha: alpha });
      }
    }
  },

  goBack()
  {
    const pages = getCurrentPages();
    if (pages.length > 1) {
      wx.navigateBack();
    } else {
      wx.switchTab({ url: '/pages/index/index' });
    }
  },

  async fetchDetail(tao_id, platform = 'taobao')
  {
    try {
      const detail = await API.getProductDetail({ tao_id, platform });
      if (detail) {
        const merged = { ...this.data.itemData, ...detail };
        this.setData({ itemData: merged, loading: false });
        this.saveToHistory(merged);
        this.checkFavoriteStatus(merged);
      }
    } catch (e) {
      console.error('获取详情失败', e);
      if (!this.data.itemData) {
        this.setData({ loading: false });
      }
    }
  },

  saveToHistory(item)
  {
    if (!item || !item.tao_id) return;
    try {
      let history = wx.getStorageSync('footprints') || [];
      // 过滤掉当前商品，避免重复（统一转为字符串比较防止类型不同导致去重失败）
      history = history.filter(h => String(h.tao_id) !== String(item.tao_id));

      // 插入最新记录到头部
      history.unshift({
        tao_id: item.tao_id,
        title: item.title,
        image_url: item.image_url || (item.small_images && item.small_images[0]),
        coupon_price: item.coupon_price,
        original_price: item.original_price,
        coupon_amount: item.coupon_amount,
        platform: item.platform || 'taobao',
        timestamp: Date.now()
      });

      // 限制 100 条
      if (history.length > 100) {
        history = history.slice(0, 100);
      }

      wx.setStorageSync('footprints', history);
    } catch (e) {
      console.error('保存足迹失败', e);
    }
  },

  checkFavoriteStatus(item)
  {
    if (!item || !item.tao_id) return;
    try {
      const favorites = wx.getStorageSync('favorites') || [];
      const isFav = favorites.some(f => String(f.tao_id) === String(item.tao_id));
      this.setData({ isFavorite: isFav });
    } catch (e) {
      console.error('检查收藏状态失败', e);
    }
  },

  toggleFavorite()
  {
    const item = this.data.itemData;
    if (!item || !item.tao_id) return;
    try {
      let favorites = wx.getStorageSync('favorites') || [];
      const currentStatus = this.data.isFavorite;

      if (currentStatus) {
        // 取消收藏
        favorites = favorites.filter(f => String(f.tao_id) !== String(item.tao_id));
        wx.showToast({ title: '已取消收藏', icon: 'none' });
        API.userAssets('remove_favorite', { itemId: item.tao_id }).catch(e => console.error('Cloud fav remove error', e));
      } else {
        // 添加收藏，放到最前面
        favorites.unshift({
          tao_id: item.tao_id,
          title: item.title,
          image_url: item.image_url || (item.small_images && item.small_images[0]),
          coupon_price: item.coupon_price,
          original_price: item.original_price,
          coupon_amount: item.coupon_amount,
          platform: item.platform || 'taobao',
          timestamp: Date.now()
        });
        wx.showToast({ title: '收藏成功', icon: 'success' });
        API.userAssets('add_favorite', { item }).catch(e => console.error('Cloud fav add error', e));
      }

      wx.setStorageSync('favorites', favorites);
      this.setData({ isFavorite: !currentStatus });
    } catch (e) {
      console.error('切换收藏状态失败', e);
    }
  },

  retry()
  {
    this.setData({ loading: true });
    const pages = getCurrentPages();
    const currPage = pages[pages.length - 1];
    this.onLoad(currPage.options);
  },

  goHome()
  {
    wx.switchTab({ url: '/pages/index/index' });
  },

  async handleConvertAndBuy()
  {
    wx.showLoading({ title: '获取专属优惠中...' });
    try {
      const res = await API.convertLink({
        tao_id: this.data.itemData.tao_id,
        platform: this.data.itemData.platform || 'taobao',
        title: this.data.itemData.title || ''
      });
      wx.hideLoading();

      if (res && (res.tkl || res.short_url || res.click_url)) {
        this.setData({
          convertRes: res,
          showResultModal: true,
          showCopyGuide: false
        });
      } else {
        wx.showToast({ title: '没有找到可用专属链接', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: e.message || '获取失败', icon: 'none' });
    }
  },

  closeResultModal() {
    this.setData({ showResultModal: false, showCopyGuide: false });
  },

  copyAndOpenTaobao() {
    const res = this.data.convertRes;
    const copyTextStr = res ? (res.tkl || res.short_url || res.click_url) : '';
    if (copyTextStr) {
      wx.setClipboardData({
        data: copyTextStr,
        success: () => {
          this.setData({ showCopyGuide: true });
        }
      });
    } else {
      wx.showToast({ title: '内容获取失败', icon: 'none' });
    }
  },

  copyAndOpenJd() {
    const res = this.data.convertRes;
    const copyTextStr = res ? (res.short_url || res.click_url) : '';
    if (copyTextStr) {
      wx.setClipboardData({
        data: copyTextStr,
        success: () => {
          this.setData({ showCopyGuide: true });
        }
      });
    } else {
      wx.showToast({ title: '内容获取失败', icon: 'none' });
    }
  },

  onShareAppMessage()
  {
    let shareTitle = this.data.itemData ? this.data.itemData.title : '好物推荐';
    if (this.data.itemData && this.data.itemData.tag) {
      try {
        shareTitle = decodeURIComponent(this.data.itemData.tag).replace(/<[^>]+>/g, '').split('|')[0] || shareTitle;
      } catch (e) { }
    }

    return {
      title: shareTitle,
      path: `/pages/detail/detail?item=${encodeURIComponent(JSON.stringify(this.data.itemData))}`,
      imageUrl: this.data.itemData ? (this.data.itemData.image_url || this.data.itemData.image || this.data.itemData.pict_url) : ''
    };
  },

  onShareTimeline()
  {
    let shareTitle = this.data.itemData ? this.data.itemData.title : '好物推荐';
    if (this.data.itemData && this.data.itemData.tag) {
      try {
        shareTitle = decodeURIComponent(this.data.itemData.tag).replace(/<[^>]+>/g, '').split('|')[0] || shareTitle;
      } catch (e) { }
    }

    return {
      title: shareTitle,
      query: `item=${encodeURIComponent(JSON.stringify(this.data.itemData))}`,
      imageUrl: this.data.itemData ? (this.data.itemData.image_url || this.data.itemData.image || this.data.itemData.pict_url) : ''
    };
  }
});
