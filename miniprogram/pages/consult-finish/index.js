const consult = require('../../utils/consult')

Page({
  data: {
    role: '',
    sessionId: 0,
    session: null,
    record: null,
    status: ''
  },

  onLoad(options) {
    const result = consult.getFinishResult()
    this.setData({
      role: options.role || '',
      sessionId: Number(options.sessionId || 0),
      status: options.status || '',
      session: result && result.session ? result.session : null,
      record: result && result.record ? result.record : null
    })
  },

  handleBackHome() {
    if (this.data.role === 'doctor') {
      wx.reLaunch({
        url: '/pages/doctor-create-session/index'
      })
      return
    }

    wx.navigateBack({
      delta: 2
    })
  }
})
