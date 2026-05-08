// 剪贴板探针与工具函数

let lastCheckedContent = '';

/**
 * 剪贴板探针：读取剪贴板，如果有口令/链接则返回，且防抖（同一个内容不触发第二次）
 * @returns {Promise<string|null>} 匹配到的口令/链接，若没有或已检测过则返回 null
 */
export const probeClipboard = () => {
  return new Promise((resolve) => {
    wx.getClipboardData({
      success: (res) => {
        const content = res.data || '';
        // 为空或已处理过，则跳过
        if (!content || content === lastCheckedContent) {
          resolve(null);
          return;
        }

        // 匹配淘口令符号特征 (目前淘宝口令前后有类似 ￥ $ 等符号，长度不等)
        const tklRegex = /([$¥€₤₳¢¤฿฿₵₡₫ƒ₲₭£₥₦₱〒₮₩￥][a-zA-Z0-9]{8,12}[$¥€₤₳¢¤฿฿₵₡₫ƒ₲₭£₥₦₱〒₮₩￥])/;
        // 匹配 URL
        const urlRegex = /(https?:\/\/[^\s]+)/;

        let match = '';
        if (tklRegex.test(content)) {
          match = content; // 把带有口令的整段文本丢给转链API，它自己能解析
        } else if (urlRegex.test(content)) {
          match = content; 
        }

        if (match) {
          lastCheckedContent = content; // 更新缓存
          resolve(match);
        } else {
          resolve(null);
        }
      },
      fail: () => {
        resolve(null);
      }
    });
  });
};

/**
 * 清理探针的防抖缓存
 */
export const clearClipboardCache = () => {
  lastCheckedContent = '';
};

/**
 * 写入剪贴板（屏蔽探针再次检测）
 * @param {string} text - 要复制的内容
 * @param {string} toastMsg - 成功提示，传空则不提示
 */
export const copyText = (text, toastMsg = '复制成功') => {
  wx.setClipboardData({
    data: text,
    success: () => {
      // 防止自己刚复制出来的口令，又触发探针
      lastCheckedContent = text;
      
      if (toastMsg) {
        wx.showToast({ title: toastMsg, icon: 'success' });
      }
    }
  });
};
