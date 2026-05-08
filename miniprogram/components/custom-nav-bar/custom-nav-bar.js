Component({
  properties: {
    title: {
      type: String,
      value: ''
    },
    theme: {
      type: String,
      value: 'black' // 'black' or 'white'
    },
    backgroundColor: {
      type: String,
      value: 'transparent'
    },
    bgClass: {
      type: String,
      value: ''
    },
    bgImage: {
      type: String,
      value: ''
    },
    showBack: {
      type: Boolean,
      value: false
    },
    alignLeft: {
      type: Boolean,
      value: false
    }
  },

  data: {
    statusBarHeight: 44,
    navBarHeight: 44,
    capsuleRightSpace: 95
  },

  lifetimes: {
    attached() {
      this.initNavBar();
    }
  },

  methods: {
    initNavBar() {
      const systemInfo = wx.getSystemInfoSync();
      const statusBarHeight = systemInfo.statusBarHeight || 44;
      
      let navBarHeight = 44;
      let capsuleRightSpace = 95;

      try {
        const capsule = wx.getMenuButtonBoundingClientRect();
        if (capsule) {
          // capsule.top - statusBarHeight is the top margin of the capsule
          // navBarHeight = (capsule.top - statusBarHeight) * 2 + capsule.height
          navBarHeight = (capsule.top - statusBarHeight) * 2 + capsule.height;
          // capsuleRightSpace should roughly be windowWidth - capsule.left + some padding
          capsuleRightSpace = systemInfo.windowWidth - capsule.left + 10;
        }
      } catch (e) {
        console.warn('Failed to get menu button bounding client rect');
      }

      // Check pages stack length
      const pages = getCurrentPages();
      let shouldShowBack = this.data.showBack;
      if (pages.length > 1 && this.properties.showBack !== false) {
        shouldShowBack = true;
      }

      this.setData({
        statusBarHeight,
        navBarHeight,
        capsuleRightSpace,
        showBack: shouldShowBack
      });
    },

    goBack() {
      wx.navigateBack({
        delta: 1,
        fail: () => {
          wx.switchTab({
            url: '/pages/index/index'
          });
        }
      });
    }
  }
});
