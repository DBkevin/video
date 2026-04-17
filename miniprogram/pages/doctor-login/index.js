const auth = require('../../utils/auth')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    employeeNo: '',
    password: '',
    loading: false,
    errorMessage: ''
  },

  onShow() {
    debugLog.info('doctor-login', '医生登录页显示')
    if (auth.getDoctorToken()) {
      debugLog.info('doctor-login', '检测到已有医生登录态，自动跳转到创建页')
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
      debugLog.warn('doctor-login', '医生登录参数不完整', {
        employeeNo: this.data.employeeNo || ''
      })
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
      debugLog.info('doctor-login', '开始提交医生登录', {
        employeeNo: this.data.employeeNo
      })
      await auth.loginDoctor({
        employeeNo: this.data.employeeNo,
        password: this.data.password
      })

      debugLog.info('doctor-login', '医生登录成功，准备跳转创建页', {
        employeeNo: this.data.employeeNo
      })
      wx.reLaunch({
        url: '/pages/doctor-create-session/index'
      })
    } catch (err) {
      debugLog.error('doctor-login', '医生登录失败', err)
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
