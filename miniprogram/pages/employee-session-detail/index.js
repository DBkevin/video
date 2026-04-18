const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    errorMessage: '',
    session: null,
    doctor: null,
    customer: null,
    operatorEmployee: null,
    recordingTask: null,
    sharePath: ''
  },

  onLoad(options) {
    this.sessionId = Number(options.id || 0)
    debugLog.info('employee-session-detail', '员工会话详情页加载', {
      sessionId: this.sessionId
    })
    this.syncShareMenu('')
  },

  onShow() {
    this.loadDetail()
    this.startPolling()
  },

  onHide() {
    this.stopPolling()
  },

  onUnload() {
    this.stopPolling()
  },

  async loadDetail() {
    const token = auth.getEmployeeToken()
    const bindStatus = auth.getEmployeeBindStatus()
    if (!token || bindStatus !== 'bound') {
      wx.reLaunch({
        url: '/pages/employee-bind/index?scene=bind_employee'
      })
      return
    }

    try {
      const result = await consult.getEmployeeConsultSession(this.sessionId, token)
      const recordingTask = this.decorateRecordingTask(result.recording_task)
      debugLog.info('employee-session-detail', '员工会话详情已刷新', {
        sessionId: result.session && result.session.id ? result.session.id : 0,
        status: result.session && result.session.status ? result.session.status : ''
      })
      this.setData({
        loading: false,
        errorMessage: '',
        session: result.session,
        doctor: result.doctor,
        customer: result.customer,
        operatorEmployee: result.operator_employee,
        recordingTask,
        sharePath: result.session && result.session.share_url_path ? result.session.share_url_path : ''
      })
      this.syncShareMenu(result.session && result.session.share_url_path ? result.session.share_url_path : '')

      if (!this.shouldKeepPolling(result.session, recordingTask)) {
        this.stopPolling()
      }
    } catch (err) {
      debugLog.error('employee-session-detail', '加载员工会话详情失败', err)
      this.setData({
        loading: false,
        errorMessage: err.message || '加载会话详情失败'
      })
    }
  },

  startPolling() {
    this.stopPolling()
    this.timer = setInterval(() => {
      this.loadDetail()
    }, 3000)
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  onShareAppMessage() {
    const sharePath = this.data.sharePath || ''
    const doctor = this.data.doctor || {}
    const session = this.data.session || {}
    debugLog.info('employee-session-detail', '员工触发微信分享', {
      sessionId: session.id || 0,
      hasSharePath: !!sharePath
    })
    return {
      title: `${doctor.name || '医生'}邀请您进入视频面诊`,
      path: sharePath || '/pages/customer-entry/index',
      desc: session.session_no ? `会话编号：${session.session_no}` : '点击进入顾客候诊页'
    }
  },

  handleCopySharePath() {
    const sharePath = this.data.sharePath || ''
    if (!sharePath) {
      wx.showToast({
        title: '当前暂无可复制入口',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: sharePath
    })
    debugLog.info('employee-session-detail', '员工复制顾客入口路径', {
      sessionId: this.sessionId
    })
  },

  handleCopyPlaybackURL() {
    const recordingTask = this.data.recordingTask
    if (!recordingTask || !recordingTask.video_url) {
      wx.showToast({
        title: '暂无回放链接',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: recordingTask.video_url
    })
  },

  handleGoList() {
    wx.redirectTo({
      url: '/pages/employee-session-list/index'
    })
  },

  handleCreateNew() {
    wx.redirectTo({
      url: '/pages/employee-create-session/index'
    })
  },

  decorateRecordingTask(task) {
    if (!task) {
      return null
    }

    const metaMap = {
      recording: { label: '录制中', hint: '当前面诊正在录制中。' },
      stopping: { label: '处理中', hint: '录制已停止，正在等待腾讯云回调上传结果。' },
      finished: { label: '已完成', hint: task.video_url ? '已生成回放地址，可复制给医生查看。' : '录制完成，等待回放链接。' },
      failed: { label: '录制失败', hint: '录制任务未成功完成，请联系管理员查看后台日志。' }
    }
    const meta = metaMap[task.status] || { label: task.status || '未知状态', hint: '录制状态暂未识别。' }
    return Object.assign({}, task, {
      status_label: meta.label,
      status_hint: meta.hint
    })
  },

  shouldKeepPolling(session, recordingTask) {
    if (!session) {
      return false
    }
    if (session.status === 'finished') {
      return !!(recordingTask && ['recording', 'stopping'].indexOf(recordingTask.status) >= 0)
    }
    return session.status !== 'cancelled' && session.status !== 'expired'
  },

  syncShareMenu(sharePath) {
    if (!wx || typeof wx.showShareMenu !== 'function' || typeof wx.hideShareMenu !== 'function') {
      return
    }
    if (sharePath) {
      wx.showShareMenu({
        menus: ['shareAppMessage']
      })
      return
    }
    wx.hideShareMenu()
  }
})
