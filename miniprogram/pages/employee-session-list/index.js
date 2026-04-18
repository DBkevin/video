const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    errorMessage: '',
    filterStatus: '',
    statusOptions: ['全部', 'shared', 'joined', 'in_consult', 'finished', 'cancelled', 'expired'],
    items: []
  },

  onShow() {
    debugLog.info('employee-session-list', '员工历史会话页显示')
    this.loadSessions()
  },

  async loadSessions() {
    const token = auth.getEmployeeToken()
    const bindStatus = auth.getEmployeeBindStatus()
    if (!token || bindStatus !== 'bound') {
      wx.reLaunch({
        url: '/pages/employee-bind/index?scene=bind_employee'
      })
      return
    }

    try {
      const result = await consult.listEmployeeConsultSessions(token, {
        status: this.data.filterStatus,
        page: 1,
        page_size: 50
      })
      debugLog.info('employee-session-list', '员工历史会话已加载', {
        count: result.items ? result.items.length : 0,
        status: this.data.filterStatus
      })
      this.setData({
        loading: false,
        errorMessage: '',
        items: result.items || []
      })
    } catch (err) {
      debugLog.error('employee-session-list', '加载员工历史会话失败', err)
      this.setData({
        loading: false,
        errorMessage: err.message || '加载历史会话失败'
      })
    }
  },

  handleFilterChange(event) {
    const options = this.data.statusOptions || []
    const selectedValue = options[Number(event.detail.value || 0)] || '全部'
    this.setData({
      filterStatus: selectedValue === '全部' ? '' : selectedValue
    })
    this.loadSessions()
  },

  handleOpenDetail(event) {
    const sessionId = Number(event.currentTarget.dataset.id || 0)
    wx.navigateTo({
      url: `/pages/employee-session-detail/index?id=${sessionId}`
    })
  },

  handleCreateNew() {
    wx.redirectTo({
      url: '/pages/employee-create-session/index'
    })
  }
})
