import { API } from '../../utils/api';
import { copyText } from '../../utils/clipboard';

Page({
  data: {
    config: {},
    loading: true
  },

  async onShow() {
    // 每次进入页面时主动拉取最新配置，确保能立刻看到后台修改的内容
    try {
      const config = await API.getConfig();
      getApp().globalData.systemConfig = config;
      this.setData({ config: config || {}, loading: false });
    } catch (e) {
      console.error('获取客服配置失败', e);
      // 降级使用缓存的全局数据
      const cachedConfig = getApp().globalData.systemConfig || {};
      this.setData({ config: cachedConfig, loading: false });
    }
  },

  copyWechat() {
    const wechat = this.data.config.wechatId;
    if (wechat) {
      copyText(wechat, '客服微信已复制，请前往微信添加好友');
    }
  },

  makePhoneCall() {
    const phone = this.data.config.phone;
    if (phone) {
      wx.makePhoneCall({
        phoneNumber: phone,
        fail(e) {
          if (e.errMsg.indexOf('cancel') === -1) {
            wx.showToast({ title: '拨打失败', icon: 'none' });
          }
        }
      });
    }
  }
});
