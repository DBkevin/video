const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    submitting: false,
    errorMessage: '',
    scene: '',
    bindingStatus: '',
    employee: null,
    bindRequest: null,
    realName: '',
    mobile: '',
    employeeCode: ''
  },

  onLoad(options) {
    const scene = options.scene || ''
    debugLog.info('employee-bind', '员工绑定页加载', { scene })
    this.setData({ scene })
    this.bootstrap()
  },

  async bootstrap() {
    try {
      const result = await auth.loginEmployeeByWeChat()
      this.applyAuthResult(result)
    } catch (err) {
      debugLog.error('employee-bind', '员工微信登录失败', err)
      this.setData({
        loading: false,
        errorMessage: err.message || '员工登录失败'
      })
    }
  },

  applyAuthResult(result) {
    debugLog.info('employee-bind', '员工绑定状态已刷新', {
      bindingStatus: result.binding_status || '',
      role: result.role || ''
    })
    this.setData({
      loading: false,
      errorMessage: '',
      bindingStatus: result.binding_status || '',
      employee: result.employee || null,
      bindRequest: result.bind_request || null,
      realName: result.bind_request && result.bind_request.real_name ? result.bind_request.real_name : '',
      mobile: result.bind_request && result.bind_request.mobile ? result.bind_request.mobile : '',
      employeeCode: result.bind_request && result.bind_request.employee_code ? result.bind_request.employee_code : ''
    })
  },

  handleRealNameInput(event) {
    this.setData({ realName: event.detail.value || '' })
  },

  handleMobileInput(event) {
    this.setData({ mobile: event.detail.value || '' })
  },

  handleEmployeeCodeInput(event) {
    this.setData({ employeeCode: event.detail.value || '' })
  },

  async handleSubmitBindRequest() {
    const token = auth.getEmployeeToken()
    if (!token) {
      this.setData({ errorMessage: '缺少员工登录态，请重新扫码进入。' })
      return
    }
    if (!this.data.realName.trim()) {
      this.setData({ errorMessage: '请先填写真实姓名。' })
      return
    }

    this.setData({
      submitting: true,
      errorMessage: ''
    })

    try {
      debugLog.info('employee-bind', '开始提交员工绑定申请', {
        realName: this.data.realName,
        employeeCode: this.data.employeeCode
      })
      const result = await consult.submitEmployeeBindRequest(token, {
        real_name: this.data.realName,
        mobile: this.data.mobile,
        employee_code: this.data.employeeCode
      })

      auth.setEmployeeAuthState({
        access_token: token,
        binding_status: 'pending',
        bind_request: result.request
      })

      this.setData({
        bindingStatus: 'pending',
        bindRequest: result.request
      })
      wx.showToast({
        title: '申请已提交',
        icon: 'success'
      })
    } catch (err) {
      debugLog.error('employee-bind', '提交绑定申请失败', err)
      this.setData({
        errorMessage: err.message || '提交绑定申请失败'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  async handleRefreshStatus() {
    const token = auth.getEmployeeToken()
    if (!token) {
      this.setData({ errorMessage: '缺少员工登录态，请重新扫码进入。' })
      return
    }

    try {
      debugLog.info('employee-bind', '手动刷新绑定状态')
      const result = await consult.getEmployeeBindStatus(token)
      auth.setEmployeeAuthState({
        access_token: token,
        employee: result.employee,
        binding_status: result.binding_status,
        bind_request: result.bind_request
      })
      this.applyAuthResult(result)
    } catch (err) {
      debugLog.error('employee-bind', '刷新绑定状态失败', err)
      this.setData({
        errorMessage: err.message || '刷新绑定状态失败'
      })
    }
  },

  handleGoCreateSession() {
    debugLog.info('employee-bind', '员工进入发起会话页')
    wx.redirectTo({
      url: '/pages/employee-create-session/index'
    })
  },

  handleGoSessionList() {
    debugLog.info('employee-bind', '员工进入历史会话页')
    wx.redirectTo({
      url: '/pages/employee-session-list/index'
    })
  }
})
