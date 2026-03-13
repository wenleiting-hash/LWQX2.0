App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        traceUser: true,
        // 此处填入你的环境 ID
        env: 'cloud1-9ggm1mvv7a25a4cb',
        traceUser: true,
      });
    }

    // 获取系统信息及胶囊位置
    let systemInfo = wx.getSystemInfoSync();
    let menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    
    // 稳定性检查：如果获取胶囊位置失败（部分环境冷启动可能返回全0），进行轮询或设置默认值
    if (!menuButtonInfo || !menuButtonInfo.width || !menuButtonInfo.top) {
      menuButtonInfo = {
        top: systemInfo.statusBarHeight + 6,
        height: 32,
        bottom: systemInfo.statusBarHeight + 38,
        left: systemInfo.screenWidth - 87,
        width: 87
      };
    }
    
    // 计算导航栏高度 (不含状态栏)
    const navBarHeight = (menuButtonInfo.top - systemInfo.statusBarHeight) * 2 + menuButtonInfo.height;
    
    this.globalData = {
      navHeight: navBarHeight,
      statusBarHeight: systemInfo.statusBarHeight,
      menuButtonInfo: menuButtonInfo,
      screenHeight: systemInfo.screenHeight,
      windowHeight: systemInfo.windowHeight,
      windowWidth: systemInfo.windowWidth,
      pixelRatio: systemInfo.pixelRatio,
      safeArea: systemInfo.safeArea || {},
      // iPhone X 及以上设备底部安全区域高度
      safeAreaBottom: systemInfo.screenHeight - (systemInfo.safeArea ? systemInfo.safeArea.bottom : systemInfo.screenHeight)
    };
  }
});
