const auth = require('../../utils/auth')
const consult = require('../../utils/consult')

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
      wx.reLaunch({
        url: '/pages/doctor-login/index'
      })
      return
    }

    try {
      const result = await consult.getConsultSession(this.sessionId, doctorToken)
      const recordingTask = this.decorateRecordingTask(result.recording_task)

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

      if (!this.shouldKeepPolling(result.session, recordingTask)) {
        this.stopPolling()
      }
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
      this.loadSession()
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

      await this.maybeShowRecordingWarning(result.__message)

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
  },

  async handleCancelSession() {
    const doctorToken = this.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      return
    }

    this.setData({ busyAction: true, errorMessage: '' })

    try {
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
      this.setData({
        errorMessage: err.message || '取消会话失败'
      })
    } finally {
      this.setData({ busyAction: false })
    }
  },

  handleOpenPlayback() {
    const recordingTask = this.data.recordingTask
    if (!recordingTask || !recordingTask.video_url) {
      wx.showToast({
        title: '回放文件仍在处理中',
        icon: 'none'
      })
      return
    }

    wx.navigateTo({
      url: `/pages/recording-playback/index?videoUrl=${encodeURIComponent(recordingTask.video_url)}&sessionNo=${encodeURIComponent((this.data.session && this.data.session.session_no) || '')}`
    })
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
        hint: task.video_url ? '录制文件已生成，可直接查看回放或复制回放链接。' : '录制任务已完成，正在等待回放地址回传。'
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
  }
})
