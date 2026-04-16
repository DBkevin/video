const auth = require('../../utils/auth')
const consult = require('../../utils/consult')

Page({
  data: {
    loading: true,
    errorMessage: '',
    session: null,
    customer: null,
    canStart: false,
    sharePath: '',
    busyAction: false
  },

  onLoad(options) {
    this.sessionId = Number(options.id || options.sessionId || 0)
  },

  onShow() {
    this.loadSession()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  getDoctorToken() {
    return auth.getDoctorToken()
  },

  async loadSession() {
    if (!this.sessionId) {
      this.setData({
        loading: false,
        errorMessage: '缺少会话 ID，无法查看会话详情。'
      })
      return
    }

    const doctorToken = this.getDoctorToken()
    if (!doctorToken) {
      this.setData({
        loading: false,
        errorMessage: '缺少医生登录态。请先调用现有医生登录接口，并把 token 写入 storage: doctor_access_token。'
      })
      return
    }

    try {
      const result = await consult.getConsultSession(this.sessionId, doctorToken)
      this.setData({
        loading: false,
        errorMessage: '',
        session: result.session,
        customer: result.customer,
        canStart: !!result.can_start,
        sharePath: result.session.share_url_path || ''
      })
    } catch (err) {
      this.setData({
        loading: false,
        errorMessage: err.message || '会话信息获取失败'
      })
    }
  },

  startPolling() {
    this.stopPolling()
    this.timer = setInterval(() => {
      this.loadSession()
    }, 3000)
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  async handleGenerateShare() {
    const doctorToken = this.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      return
    }

    this.setData({ busyAction: true, errorMessage: '' })

    try {
      const result = await consult.shareConsultSession(this.sessionId, doctorToken)
      this.setData({
        sharePath: result.share_url_path,
        session: result.session
      })
      wx.showToast({
        title: '分享入口已生成',
        icon: 'success'
      })
    } catch (err) {
      this.setData({
        errorMessage: err.message || '生成分享入口失败'
      })
    } finally {
      this.setData({ busyAction: false })
    }
  },

  handleCopySharePath() {
    if (!this.data.sharePath) {
      wx.showToast({
        title: '请先生成分享入口',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: this.data.sharePath
    })
  },

  async handleStartConsult() {
    const doctorToken = this.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      return
    }

    this.setData({ busyAction: true, errorMessage: '' })

    try {
      const result = await consult.startConsultSession(this.sessionId, doctorToken)

      consult.saveConsultRuntime({
        session: result.session,
        rtc: result.rtc,
        role: 'doctor',
        customer: result.customer,
        currentRole: result.current_role,
        accessToken: doctorToken
      })

      wx.redirectTo({
        url: `/pages/consult-room/index?sessionId=${result.session.id}&role=doctor`
      })
    } catch (err) {
      this.setData({
        errorMessage: err.message || '开始面诊失败'
      })
    } finally {
      this.setData({ busyAction: false })
    }
  }
})
