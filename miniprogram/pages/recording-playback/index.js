Page({
  data: {
    videoUrl: '',
    sessionNo: '',
    errorMessage: ''
  },

  onLoad(options) {
    const videoUrl = decodeURIComponent(options.videoUrl || '')
    const sessionNo = decodeURIComponent(options.sessionNo || '')

    if (!videoUrl) {
      this.setData({
        errorMessage: '缺少可播放的回放地址，请返回会话详情页重试。'
      })
      return
    }

    this.setData({
      videoUrl,
      sessionNo
    })
  },

  handleCopyPlaybackURL() {
    if (!this.data.videoUrl) {
      wx.showToast({
        title: '暂无可复制的回放链接',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: this.data.videoUrl
    })
  }
})
