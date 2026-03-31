Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    }
  },
  data: {
    avatarUrl: '',
    nickName: ''
  },
  methods: {
    onChooseAvatar(e) {
      const { avatarUrl } = e.detail;
      this.setData({ avatarUrl });
    },
    
    onNicknameChange(e) {
      const nickName = e.detail.value;
      this.setData({ nickName });
    },
    
    onCancelAuth() {
      // 对外抛出 cancel 事件，由调用页面来决定去哪里
      this.triggerEvent('cancel');
    },
    
    async onConfirmAuth() {
      let { avatarUrl, nickName } = this.data;
      if (!avatarUrl || !nickName) {
        wx.showToast({ title: '请先绑定头像和昵称', icon: 'none' });
        return;
      }

      wx.showLoading({ title: '注册中', mask: true });

      try {
        // 头像如果是临时路径，需上传至云存储
        if (avatarUrl.startsWith('http://tmp/') || avatarUrl.startsWith('wxfile://') || avatarUrl.startsWith('https://usr/')) {
          const ext = avatarUrl.match(/\.([^.]+)$/) ? avatarUrl.match(/\.([^.]+)$/)[1] : 'png';
          const cloudPath = `avatars/${Date.now()}_${Math.floor(Math.random() * 1000)}.${ext}`;
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: avatarUrl
          });
          avatarUrl = uploadRes.fileID;
        }

        // 调用最强兜底更新器，如果没有此用户会自动 add()
        const updateRes = await wx.cloud.callFunction({
          name: 'update_user_profile',
          data: { avatarUrl, nickName }
        });

        if (!updateRes.result || !updateRes.result.success) {
          throw new Error((updateRes.result && updateRes.result.msg) || '云数据库注册失败');
        }

        wx.hideLoading();
        // 告诉父组件：搞定了，可以刷新界面了
        this.triggerEvent('success', { avatarUrl, nickName });

      } catch (err) {
        console.error('注册报错:', err);
        wx.hideLoading();
        wx.showToast({ title: err.message || '注册失败请稍后重试', icon: 'none' });
      }
    }
  }
});
