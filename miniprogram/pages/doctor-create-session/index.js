const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    expireMinutes: 120,
    loading: false,
    errorMessage: '',
    doctor: null
  },

  onShow() {
    debugLog.info('doctor-create-session', '创建会话页显示')
    const doctorToken = auth.getDoctorToken()
    if (!doctorToken) {
      debugLog.warn('doctor-create-session', '缺少医生登录态，跳回登录页')
      wx.reLaunch({
        url: '/pages/doctor-login/index'
      })
      return
    }

    this.setData({
      doctor: auth.getDoctorProfile()
    })
  },

  handleExpireInput(event) {
    const raw = Number(event.detail.value || 120)
    this.setData({
      expireMinutes: raw > 0 ? raw : 120
    })
  },

  async handleCreateSession() {
    const doctorToken = auth.getDoctorToken()
    if (!doctorToken) {
      debugLog.warn('doctor-create-session', '创建会话时缺少医生登录态')
      wx.reLaunch({
        url: '/pages/doctor-login/index'
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: ''
    })

    try {
      debugLog.info('doctor-create-session', '开始创建会话', {
        expireMinutes: this.data.expireMinutes
      })
      const result = await consult.createConsultSession(doctorToken, this.data.expireMinutes)
      debugLog.info('doctor-create-session', '会话创建成功，准备跳转详情页', {
        sessionId: result.session && result.session.id ? result.session.id : 0
      })
      wx.redirectTo({
        url: `/pages/doctor-session-detail/index?id=${result.session.id}`
      })
    } catch (err) {
      debugLog.error('doctor-create-session', '创建会话失败', err)
      this.setData({
        errorMessage: err.message || '创建会话失败，请稍后重试'
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  },

  handleLogout() {
    debugLog.info('doctor-create-session', '医生手动退出登录')
    auth.clearDoctorLogin()
    wx.reLaunch({
      url: '/pages/doctor-login/index'
    })
  }
})
