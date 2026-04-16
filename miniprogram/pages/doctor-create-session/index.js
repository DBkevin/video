const auth = require('../../utils/auth')
const consult = require('../../utils/consult')

Page({
  data: {
    expireMinutes: 120,
    loading: false,
    errorMessage: '',
    doctor: null
  },

  onShow() {
    const doctorToken = auth.getDoctorToken()
    if (!doctorToken) {
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
      const result = await consult.createConsultSession(doctorToken, this.data.expireMinutes)
      wx.redirectTo({
        url: `/pages/doctor-session-detail/index?id=${result.session.id}`
      })
    } catch (err) {
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
    auth.clearDoctorLogin()
    wx.reLaunch({
      url: '/pages/doctor-login/index'
    })
  }
})
