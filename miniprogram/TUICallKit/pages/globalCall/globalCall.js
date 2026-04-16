Page({
  data: {},

  onLoad() {
    wx.showToast({
      title: '请先同步官方 TUICallKit 包',
      icon: 'none',
      duration: 2500
    })
  }
})
