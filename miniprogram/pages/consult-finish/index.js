const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

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
    debugLog.info('consult-finish', '结束页加载', {
      role: options.role || '',
      sessionId: Number(options.sessionId || 0),
      status: options.status || ''
    })
    this.setData({
      role: options.role || '',
      sessionId: Number(options.sessionId || 0),
      status: options.status || '',
      session: result && result.session ? result.session : null,
      record: result && result.record ? result.record : null
    })
  },

  handleBackHome() {
    debugLog.info('consult-finish', '结束页点击返回', {
      role: this.data.role,
      sessionId: this.data.sessionId,
      status: this.data.status
    })
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
