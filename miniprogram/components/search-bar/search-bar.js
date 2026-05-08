Component({
  properties: {
    mode: {
      type: String,
      value: 'navigate' // 'navigate' 仅点击跳转，'input' 真实输入模式
    },
    placeholder: {
      type: String,
      value: '粘贴宝贝标题/链接/淘口令，拿隐藏券'
    },
    value: {
      type: String,
      value: ''
    },
    autoFocus: {
      type: Boolean,
      value: false
    }
  },

  data: {
    inputValue: ''
  },

  observers: {
    'value': function(val) {
      this.setData({ inputValue: val });
    }
  },

  methods: {
    handleTap() {
      if (this.properties.mode === 'navigate') {
        wx.navigateTo({
          url: '/pages/search-result/search-result'
        });
      }
    },

    handleInput(e) {
      this.setData({ inputValue: e.detail.value });
      this.triggerEvent('input', { value: e.detail.value });
    },

    handleConfirm(e) {
      const val = e.detail.value || this.data.inputValue;
      if (val.trim()) {
        this.triggerEvent('search', { value: val.trim() });
      } else {
        wx.showToast({ title: '请输入搜索内容', icon: 'none' });
      }
    },
    
    handleClear() {
      this.setData({ inputValue: '' });
      this.triggerEvent('input', { value: '' });
      this.triggerEvent('clear');
    }
  }
})
