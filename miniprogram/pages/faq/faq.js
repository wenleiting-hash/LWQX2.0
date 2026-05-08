Page({
  data: {
    expandedId: '',
    faqGroups: []
  },

  onLoad() {
    this.loadFaqData();
  },

  loadFaqData() {
    const config = getApp().globalData.systemConfig;
    let groups = [];
    if (config && config.documentation) {
      try {
        const docs = typeof config.documentation === 'string' 
          ? JSON.parse(config.documentation) 
          : config.documentation;
        
        groups = docs.map((d, i) => ({
          id: 'cat_' + i,
          name: d.title,
          items: d.items.map((item, j) => ({ id: `f_${i}_${j}`, q: item.q, a: item.a }))
        }));
      } catch (e) {
        console.error('解析文档数据失败', e);
      }
    } 
    
    if (groups.length === 0) {
      // 兼容数据未加载或未配置的情况，使用默认占位数据
      groups = [
        {
          id: 'coupon',
          name: '查券类',
          items: [
            { id: 'c1', q: '小栗鼠查券需要收费吗？', a: '完全免费！小栗鼠是一款纯导购省钱工具，不收取任何费用，无需充值，无需会员。' },
            { id: 'c2', q: '为什么有些商品查不到优惠券？', a: '并非所有商品都有隐藏优惠券。优惠券由商家在淘宝联盟/京东联盟设置，数量有限且有有效期。如果查不到，说明该商品目前没有可用的优惠券。' },
            { id: 'c3', q: '淘宝和京东的商品都能查吗？', a: '是的！小栗鼠同时支持淘宝（含天猫）和京东两大平台的商品查券。只需复制商品链接，我们会自动识别平台。' },
            { id: 'c4', q: '复制链接后打开小栗鼠没有反应？', a: '请确保您复制的是完整的商品链接或淘口令。如果仍然无法识别，可以尝试手动粘贴到搜索框中查询。' }
          ]
        },
        {
          id: 'buy',
          name: '购买类',
          items: [
            { id: 'b1', q: '领券后在哪里购买？', a: '领券后会自动复制淘口令或购买链接。打开淘宝/京东APP，系统会自动弹出商品页面，下单时优惠券会自动抵扣。' },
            { id: 'b2', q: '优惠券有使用期限吗？', a: '有的。每张优惠券都有有效期，建议领取后尽快使用。过期后需要重新领取（如果还有库存的话）。' },
            { id: 'b3', q: '为什么领券后价格没变？', a: '请确认：1) 是否在有效期内；2) 是否满足满减条件；3) 下单时检查"店铺优惠"是否已勾选。' }
          ]
        },
        {
          id: 'service',
          name: '售后类',
          items: [
            { id: 's1', q: '商品有问题怎么办？', a: '小栗鼠仅提供优惠券查询服务，商品由淘宝/京东商家发货。如有商品质量问题，请直接联系对应平台的商家客服处理退换货。' },
            { id: 's2', q: '如何联系小栗鼠客服？', a: '进入"我的"页面，点击"联系我们"，可通过加入官方社群或添加专属客服微信获得帮助。' }
          ]
        }
      ];
    }
    
    this.setData({
      faqGroups: groups
    });
  },

  toggleFaq(e) {
    const id = e.currentTarget.dataset.id;
    this.setData({
      expandedId: this.data.expandedId === id ? '' : id
    });
  },

  contactService() {
    const config = getApp().globalData.systemConfig || {};
    if (config.service_qrcode_url) {
      wx.previewImage({
        urls: [config.service_qrcode_url]
      });
    } else if (config.wechatId) {
      wx.setClipboardData({
        data: config.wechatId,
        success: () => {
          wx.showToast({ title: '客服微信已复制', icon: 'none' });
        }
      });
    } else {
      wx.showToast({ title: '暂未配置客服信息', icon: 'none' });
    }
  }
});
