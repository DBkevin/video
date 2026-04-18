const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    submitting: false,
    errorMessage: '',
    employee: null,
    doctors: [],
    doctorIndex: 0,
    customerName: '',
    customerMobile: '',
    customerRemark: '',
    expireMinutes: 120
  },

  onShow() {
    debugLog.info('employee-create-session', '员工发起会话页显示')
    this.bootstrap()
  },

  async bootstrap() {
    const token = auth.getEmployeeToken()
    const bindStatus = auth.getEmployeeBindStatus()
    if (!token || bindStatus !== 'bound') {
      debugLog.warn('employee-create-session', '员工未绑定，跳回绑定页', {
        bindStatus
      })
      wx.reLaunch({
        url: '/pages/employee-bind/index?scene=bind_employee'
      })
      return
    }

    try {
      const result = await consult.getEmployeeDoctors(token)
      debugLog.info('employee-create-session', '已加载员工可选医生列表', {
        doctorCount: result.items ? result.items.length : 0
      })
      this.setData({
        loading: false,
        employee: auth.getEmployeeProfile(),
        doctors: result.items || [],
        doctorIndex: 0
      })
    } catch (err) {
      debugLog.error('employee-create-session', '加载员工可选医生失败', err)
      this.setData({
        loading: false,
        errorMessage: err.message || '加载医生列表失败'
      })
    }
  },

  handleDoctorChange(event) {
    this.setData({
      doctorIndex: Number(event.detail.value || 0)
    })
  },

  handleCustomerNameInput(event) {
    this.setData({ customerName: event.detail.value || '' })
  },

  handleCustomerMobileInput(event) {
    this.setData({ customerMobile: event.detail.value || '' })
  },

  handleCustomerRemarkInput(event) {
    this.setData({ customerRemark: event.detail.value || '' })
  },

  handleExpireInput(event) {
    const expireMinutes = Number(event.detail.value || 120)
    this.setData({
      expireMinutes: expireMinutes > 0 ? expireMinutes : 120
    })
  },

  async handleCreateSession() {
    const token = auth.getEmployeeToken()
    const doctors = this.data.doctors || []
    const currentDoctor = doctors[this.data.doctorIndex]
    if (!token || !currentDoctor) {
      this.setData({
        errorMessage: '当前没有可选医生，请先在后台配置医生-员工关系。'
      })
      return
    }

    this.setData({
      submitting: true,
      errorMessage: ''
    })

    try {
      debugLog.info('employee-create-session', '员工开始发起会话', {
        doctorId: currentDoctor.id,
        expireMinutes: this.data.expireMinutes
      })
      const result = await consult.createEmployeeConsultSession(token, {
        doctor_id: currentDoctor.id,
        expire_minutes: this.data.expireMinutes,
        customer_name: this.data.customerName,
        customer_mobile: this.data.customerMobile,
        customer_remark: this.data.customerRemark
      })

      wx.redirectTo({
        url: `/pages/employee-session-detail/index?id=${result.session.id}`
      })
    } catch (err) {
      debugLog.error('employee-create-session', '员工发起会话失败', err)
      this.setData({
        errorMessage: err.message || '发起会话失败'
      })
    } finally {
      this.setData({ submitting: false })
    }
  },

  handleGoSessionList() {
    wx.redirectTo({
      url: '/pages/employee-session-list/index'
    })
  },

  handleLogout() {
    auth.clearEmployeeLogin()
    wx.reLaunch({
      url: '/pages/employee-bind/index?scene=bind_employee'
    })
  }
})
