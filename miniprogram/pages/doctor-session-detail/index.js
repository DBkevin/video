const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    errorMessage: '',
    session: null,
    customer: null,
    recordingTask: null,
    canStart: false,
    sharePath: '',
    busyAction: false,
    doctor: null
  },

  onLoad(options) {
    this.sessionId = Number(options.id || options.sessionId || 0)
    debugLog.info('doctor-session-detail', '医生会话详情页加载', {
      sessionId: this.sessionId
    })
    this.syncShareMenu('')
  },

  onShow() {
    debugLog.info('doctor-session-detail', '医生会话详情页显示', {
      sessionId: this.sessionId
    })
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
      debugLog.error('doctor-session-detail', '缺少会话 ID，无法加载详情')
      this.setData({
        loading: false,
        errorMessage: '缺少会话 ID，无法查看会话详情。'
      })
      return
    }

    const doctorToken = this.getDoctorToken()
    if (!doctorToken) {
      debugLog.warn('doctor-session-detail', '缺少医生登录态，跳回登录页')
      wx.reLaunch({
        url: '/pages/doctor-login/index'
      })
      return
    }

    try {
      const result = await consult.getConsultSession(this.sessionId, doctorToken)
      const recordingTask = this.decorateRecordingTask(result.recording_task)
      const previousSession = this.data.session
      if (!previousSession || previousSession.status !== result.session.status || (!!this.data.customer) !== (!!result.customer)) {
        debugLog.info('doctor-session-detail', '会话状态已刷新', {
          sessionId: result.session.id,
          status: result.session.status,
          hasCustomer: !!result.customer,
          canStart: !!result.can_start
        })
      }

      this.setData({
        loading: false,
        errorMessage: '',
        session: result.session,
        customer: result.customer,
        recordingTask,
        canStart: !!result.can_start,
        sharePath: result.session.share_url_path || '',
        doctor: auth.getDoctorProfile()
      })

      this.syncShareMenu(result.session ? result.session.share_url_path : '')

      if (!this.shouldKeepPolling(result.session, recordingTask)) {
        this.stopPolling()
      }
    } catch (err) {
      debugLog.error('doctor-session-detail', '获取会话详情失败', err)
      this.setData({
        loading: false,
        errorMessage: err.message || '会话信息获取失败'
      })
    }
  },

  startPolling() {
    this.stopPolling()
    debugLog.info('doctor-session-detail', '开始轮询会话状态', {
      sessionId: this.sessionId
    })

    this.timer = setInterval(() => {
      this.loadSession()
    }, 3000)
  },

  stopPolling() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
      debugLog.info('doctor-session-detail', '停止轮询会话状态', {
        sessionId: this.sessionId
      })
    }
  },

  async handleGenerateShare() {
    const doctorToken = this.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      return
    }

    this.setData({ busyAction: true, errorMessage: '' })

    try {
      debugLog.info('doctor-session-detail', '开始生成分享入口', {
        sessionId: this.sessionId
      })
      const result = await consult.shareConsultSession(this.sessionId, doctorToken)
      this.setData({
        sharePath: result.share_url_path,
        session: result.session
      })
      this.syncShareMenu(result.share_url_path)
      wx.showToast({
        title: '分享入口已生成',
        icon: 'success'
      })
      debugLog.info('doctor-session-detail', '分享入口生成成功', {
        sessionId: this.sessionId,
        sharePath: result.share_url_path || ''
      })
      this.loadSession()
    } catch (err) {
      debugLog.error('doctor-session-detail', '生成分享入口失败', err)
      this.setData({
        errorMessage: err.message || '生成分享入口失败'
      })
    } finally {
      this.setData({ busyAction: false })
    }
  },

  onShareAppMessage() {
    const sharePath = this.data.sharePath || ''
    const doctor = this.data.doctor || {}
    const session = this.data.session || {}

    debugLog.info('doctor-session-detail', '医生触发微信分享', {
      sessionId: session.id || 0,
      hasSharePath: !!sharePath
    })
    return {
      // 真正发送给顾客的是微信小程序卡片，而不是把内部 path 当普通字符串复制出去。
      title: `${doctor.name || '医生'}邀请您进入视频面诊`,
      path: sharePath || '/pages/customer-entry/index',
      desc: session.session_no ? `会话编号：${session.session_no}` : '点击后进入顾客候诊页'
    }
  },

  async handleStartConsult() {
    const doctorToken = this.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      return
    }

    this.setData({ busyAction: true, errorMessage: '' })

    try {
      debugLog.info('doctor-session-detail', '医生开始面诊，准备请求后端 start', {
        sessionId: this.sessionId
      })
      const result = await consult.startConsultSession(this.sessionId, doctorToken)
      debugLog.info('doctor-session-detail', '医生开始面诊成功，准备进入通话页', {
        sessionId: result.session && result.session.id ? result.session.id : 0,
        roomId: result.rtc && result.rtc.room_id ? result.rtc.room_id : 0
      })

      consult.saveConsultRuntime({
        session: result.session,
        rtc: result.rtc,
        role: 'doctor',
        customer: result.customer,
        currentRole: result.current_role,
        accessToken: doctorToken
      })

      await this.maybeShowRecordingWarning(result.__message)

      wx.redirectTo({
        url: `/pages/consult-room/index?sessionId=${result.session.id}&role=doctor`
      })
    } catch (err) {
      debugLog.error('doctor-session-detail', '医生开始面诊失败', err)
      this.setData({
        errorMessage: err.message || '开始面诊失败'
      })
    } finally {
      this.setData({ busyAction: false })
    }
  },

  async handleCancelSession() {
    const doctorToken = this.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      return
    }

    this.setData({ busyAction: true, errorMessage: '' })

    try {
      debugLog.info('doctor-session-detail', '医生取消会话', {
        sessionId: this.sessionId
      })
      const result = await consult.cancelConsultSession(this.sessionId, doctorToken)
      consult.saveFinishResult({
        session: result.session,
        record: null
      })
      this.stopPolling()
      wx.redirectTo({
        url: `/pages/consult-finish/index?sessionId=${result.session.id}&role=doctor&status=cancelled`
      })
    } catch (err) {
      debugLog.error('doctor-session-detail', '医生取消会话失败', err)
      this.setData({
        errorMessage: err.message || '取消会话失败'
      })
    } finally {
      this.setData({ busyAction: false })
    }
  },

  handleCopyPlaybackURL() {
    const recordingTask = this.data.recordingTask
    if (!recordingTask || !recordingTask.video_url) {
      wx.showToast({
        title: '暂无可复制的回放链接',
        icon: 'none'
      })
      return
    }

    wx.setClipboardData({
      data: recordingTask.video_url
    })
    debugLog.info('doctor-session-detail', '已复制回放链接', {
      sessionId: this.sessionId
    })
  },

  decorateRecordingTask(task) {
    if (!task) {
      return null
    }

    const status = task.status || ''
    const statusMetaMap = {
      recording: {
        label: '录制中',
        hint: '云端录制正在进行中，结束后会继续上传并生成回放地址。'
      },
      stopping: {
        label: '处理中',
        hint: '录制停止请求已发出，腾讯云正在合成并上传视频，请稍后刷新。'
      },
      finished: {
        label: '已完成',
        hint: task.video_url ? '录制文件已生成，可复制回放链接到浏览器中查看。' : '录制任务已完成，正在等待回放地址回传。'
      },
      failed: {
        label: '录制失败',
        hint: '云端录制未成功完成，请结合服务端日志和 TRTC 回调信息排查。'
      }
    }

    const meta = statusMetaMap[status] || {
      label: status || '未知状态',
      hint: '录制状态暂未识别，请稍后刷新页面查看。'
    }

    return Object.assign({}, task, {
      status_label: meta.label,
      status_hint: meta.hint,
      status_class: `status-tag ${status}`
    })
  },

  shouldKeepPolling(session, recordingTask) {
    if (!session) {
      return false
    }

    if (session.status === 'cancelled' || session.status === 'expired') {
      return false
    }

    if (session.status === 'finished') {
      return !!(recordingTask && ['recording', 'stopping'].indexOf(recordingTask.status) >= 0)
    }

    return true
  },

  async maybeShowRecordingWarning(message) {
    if (!this.isRecordingFailureMessage(message)) {
      return
    }

    await new Promise((resolve) => {
      wx.showModal({
        title: '录制提醒',
        content: message,
        showCancel: false,
        complete: resolve
      })
    })
  },

  isRecordingFailureMessage(message) {
    return !!message && message.indexOf('录制') >= 0 && message.indexOf('失败') >= 0
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
