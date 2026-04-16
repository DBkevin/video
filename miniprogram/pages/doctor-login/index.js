const auth = require('../../utils/auth')

Page({
  data: {
    employeeNo: '',
    password: '',
    loading: false,
    errorMessage: ''
  },

  onShow() {
    if (auth.getDoctorToken()) {
      wx.reLaunch({
        url: '/pages/doctor-create-session/index'
      })
    }
  },

  handleEmployeeNoInput(event) {
    this.setData({
      employeeNo: event.detail.value || ''
    })
  },

  handlePasswordInput(event) {
    this.setData({
      password: event.detail.value || ''
    })
  },

  async handleLogin() {
    if (!this.data.employeeNo || !this.data.password) {
      this.setData({
        errorMessage: '请输入医生工号和密码。'
      })
      return
    }

    this.setData({
      loading: true,
      errorMessage: ''
    })

    try {
      await auth.loginDoctor({
        employeeNo: this.data.employeeNo,
        password: this.data.password
      })

      wx.reLaunch({
        url: '/pages/doctor-create-session/index'
      })
    } catch (err) {
      this.setData({
        errorMessage: err.message || '医生登录失败，请稍后重试'
      })
    } finally {
      this.setData({
        loading: false
      })
    }
  }
})
