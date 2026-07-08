import { API } from '../../utils/api';

Page({
  data: {
    inputValue: '',
    showClipboard: false,
    clipboardText: '',
    lastCheckedClipboard: ''
  },

  onLoad: function (options) {
    // 页面初始化
  },

  onShow: function () {
    this.checkClipboard();
  },

  checkClipboard: function () {
    wx.getClipboardData({
      success: (res) => {
        const text = res.data;
        if (text && text !== this.data.lastCheckedClipboard) {
          this.setData({ lastCheckedClipboard: text });
          const parsed = this.parseQuery(text);
          // 只有当识别到是链接或口令时，才弹出截获弹窗
          if (parsed.query_type !== 'keyword') {
            this.setData({
              showClipboard: true,
              clipboardText: text
            });
          }
        }
      },
      fail: () => {}
    });
  },

  parseQuery: function (text) {
    if (!text) return { platform: 'auto', query_type: 'keyword' };
    
    // 1. 京东判定
    const isJd = /jd\.com|jingxi\.com|jd\.hk|3\.cn|jingdong\.com/i.test(text) || /京东/.test(text) || /jkl=/i.test(text);
    if (isJd) {
      // 京东链接
      if (/(https?:\/\/[^\s]+)/i.test(text) || /(jd\.com|3\.cn)/i.test(text)) {
        return { platform: 'jd', query_type: 'url' };
      }
      // 京东口令 (常见格式：jkl=... 或 ( ... ))
      if (/jkl=[a-zA-Z0-9]+/i.test(text) || /\([a-zA-Z0-9]{11}\)/.test(text)) {
        return { platform: 'jd', query_type: 'tkl' };
      }
      return { platform: 'jd', query_type: 'keyword' };
    }
    
    // 2. 淘宝判定
    const isTaobao = /taobao\.com|tmall\.com|tb\.cn/i.test(text) || /tk=/i.test(text) || /[￥$($)《》【】]/i.test(text);
    if (isTaobao) {
      // 淘宝链接
      if (/(https?:\/\/[^\s]+)/i.test(text) || /(taobao\.com|tmall\.com|tb\.cn)/i.test(text)) {
        return { platform: 'taobao', query_type: 'url' };
      }
      // 淘宝口令
      return { platform: 'taobao', query_type: 'tkl' };
    }
    
    return { platform: 'auto', query_type: 'keyword' };
  },

  onInput: function(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  onClearInput: function() {
    this.setData({
      inputValue: ''
    });
  },

  onIgnoreClipboard: function() {
    this.setData({
      inputValue: this.data.clipboardText,
      showClipboard: false,
      clipboardText: ''
    });
  },

  onSearch: async function() {
    // 优先使用弹窗中的截获内容，如果没有则使用输入框内容
    const textToSearch = this.data.showClipboard ? this.data.clipboardText : this.data.inputValue;
    const cleanText = (textToSearch || '').trim();

    if (!cleanText) {
      wx.showToast({ title: '请输入商品链接', icon: 'none' });
      return;
    }

    // 关闭弹窗
    if (this.data.showClipboard) {
      this.setData({ showClipboard: false });
    }

    const parsed = this.parseQuery(cleanText);
    
    // 如果是京东/淘宝的链接或口令，直接调用云函数查券并弹出弹窗
    if (parsed.query_type === 'url' || parsed.query_type === 'tkl') {
      wx.showLoading({ title: '正在查询优惠...', mask: true });
      try {
        // 核心：直接传递原文案，让后端 API 进行智能识别和编码处理
        const res = await API.searchCoupon({
          query: cleanText, 
          query_type: parsed.query_type,
          platform: parsed.platform
        });
        wx.hideLoading();

        if (res && res.items && res.items.length > 0) {
          const item = res.items[0];
          // 为京东的小程序 <navigator> 跳转提前准备好 encode 后的短链
          if (item.platform === 'jd' && item.short_url) {
            item.encodedUrl = encodeURIComponent(item.short_url);
          }
          this.setData({
            showResultModal: true,
            showCopyGuide: false,
            resultModalData: item,
            showClipboard: false
          });
          // 记录历史足迹
          this.saveFootprint(item);
        } else {
          // 无优惠券 → 仍弹窗，展示平台对应的提示和按钮
          this.setData({
            showResultModal: true,
            showCopyGuide: false,
            resultModalData: {
              hasCoupon: false,
              platform: parsed.platform === 'auto' ? 'taobao' : parsed.platform,
              title: '',
              image_url: '',
              original_url: cleanText
            },
            showClipboard: false
          });
        }
        return;
      } catch (err) {
        wx.hideLoading();
        // 区分"没找到商品"(code -3) vs 真正的服务异常
        const errMsg = err.message || '';
        if (errMsg.includes('没有找到') || errMsg.includes('未找到') || errMsg.includes('搜索内容不能为空')) {
          this.setData({
            showResultModal: true,
            showCopyGuide: false,
            resultModalData: {
              hasCoupon: false,
              platform: parsed.platform === 'auto' ? 'taobao' : parsed.platform,
              title: '',
              image_url: '',
              original_url: cleanText // 保存原链接用于兜底跳转/复制
            },
            showClipboard: false
          });
        } else {
          wx.showToast({ title: '查券服务暂时不可用', icon: 'none' });
        }
        return;
      }
    }

    // 纯文本关键词，跳转到搜索结果页列表
    wx.navigateTo({
      url: `/pages/search-result/search-result?keyword=${encodeURIComponent(cleanText)}&query_type=${parsed.query_type}&platform=${parsed.platform}`
    });
  },

  closeResultModal: function() {
    this.setData({ showResultModal: false, showCopyGuide: false });
  },

  copyAndOpenTaobao: function() {
    const data = this.data.resultModalData;
    const copyText = (data && data.tkl) ? data.tkl : (data && data.original_url ? data.original_url : this.data.inputValue);
    if (copyText) {
      wx.setClipboardData({
        data: copyText,
        success: () => {
          this.setData({ showCopyGuide: true });
        }
      });
    } else {
      wx.showToast({ title: '内容获取失败', icon: 'none' });
    }
  },


  copyAndOpenJd: function() {
    const data = this.data.resultModalData;
    const copyText = (data && data.short_url) ? data.short_url : (data && data.original_url ? data.original_url : this.data.inputValue);
    if (copyText) {
      wx.setClipboardData({
        data: copyText,
        success: () => {
          this.setData({ showCopyGuide: true });
        }
      });
    } else {
      wx.showToast({ title: '内容获取失败', icon: 'none' });
    }
  },

  saveFootprint: function(item) {
    wx.cloud.callFunction({
      name: 'cf-user-assets',
      data: {
        action: 'addFootprint',
        item: {
          tao_id: item.tao_id,
          title: item.title,
          image_url: item.image_url,
          platform: item.platform,
          original_price: item.original_price,
          coupon_price: item.coupon_price,
          coupon_amount: item.couponAmount || item.coupon_amount || 0
        }
      }
    }).catch(console.error);
  }
});