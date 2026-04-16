const consult = require('../../utils/consult')

Page({
  data: {
    role: '',
    sessionId: 0,
    session: null,
    record: null
  },

  onLoad(options) {
    const result = consult.getFinishResult()
    this.setData({
      role: options.role || '',
      sessionId: Number(options.sessionId || 0),
      session: result && result.session ? result.session : null,
      record: result && result.record ? result.record : null
    })
  },

  handleBackHome() {
    wx.navigateBack({
      delta: 1
    })
  }
})
