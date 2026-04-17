const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const tuicallkit = require('../../utils/tuicallkit')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    errorMessage: '',
    role: '',
    session: null,
    doctor: null,
    customer: null,
    sdkProvider: '',
    finishLoading: false,
    leaving: false,
    statusText: '正在初始化通话环境...',
    peerTitle: '',
    peerName: ''
  },

  onLoad(options) {
    this.role = options.role || ''
    this.sessionId = Number(options.sessionId || 0)
    this.hasHandledLeave = false
    debugLog.info('consult-room', '通话页加载', {
      role: this.role,
      sessionId: this.sessionId
    })
    this.setData({
      role: this.role,
      statusText: this.role === 'doctor'
        ? '正在初始化 TUICallKit 并发起视频呼叫...'
        : '正在初始化 TUICallKit，请保持当前页面等待医生接入...'
    })
    this.bootstrap()
  },

  onUnload() {
    debugLog.info('consult-room', '通话页卸载', {
      role: this.data.role || this.role || '',
      sessionId: this.sessionId
    })
    if (this.data.role === 'customer' && !this.hasHandledLeave) {
      this.performCustomerLeave(true)
    } else {
      tuicallkit.leaveConsultRoom()
    }
  },

  async bootstrap() {
    const runtime = consult.getConsultRuntime()
    if (!runtime || !runtime.session) {
      debugLog.error('consult-room', '缺少会话上下文，无法初始化通话页')
      this.setData({
        loading: false,
        errorMessage: '缺少当前会话上下文，请从顾客入口页或医生详情页重新进入。'
      })
      return
    }

    try {
      const peerInfo = this.buildPeerInfo(runtime)
      const peerUserId = this.buildPeerUserID(runtime)
      debugLog.info('consult-room', '开始初始化通话页运行时', {
        role: runtime.role,
        sessionId: runtime.session.id,
        roomId: runtime.rtc && runtime.rtc.room_id ? runtime.rtc.room_id : 0,
        rtcUserId: runtime.rtc && runtime.rtc.rtc_user_id ? runtime.rtc.rtc_user_id : '',
        peerUserId
      })
      this.setData({
        statusText: runtime.role === 'doctor' ? '正在初始化 TUICallKit 并发起视频呼叫...' : '正在初始化 TUICallKit，请保持当前页面等待医生接入...'
      })

      const result = await tuicallkit.enterConsultRoom({
        sdkAppId: runtime.rtc.sdk_app_id,
        rtcUserId: runtime.rtc.rtc_user_id,
        userSig: runtime.rtc.user_sig,
        roomId: runtime.rtc.room_id,
        role: runtime.role,
        peerUserId,
        displayName: runtime.role === 'doctor'
          ? ((runtime.doctor && runtime.doctor.name) || '医生')
          : '顾客',
        avatarUrl: runtime.role === 'customer'
          ? ''
          : ''
      })

      debugLog.info('consult-room', 'TUICallKit 初始化完成', {
        role: runtime.role,
        provider: result.provider,
        waitingForAnswer: !!result.waitingForAnswer
      })
      this.setData({
        loading: false,
        role: runtime.role,
        session: runtime.session,
        doctor: runtime.doctor || null,
        customer: runtime.customer || null,
        sdkProvider: result.provider,
        statusText: runtime.role === 'doctor'
          ? '医生端已发起视频呼叫，请关注顾客接听状态。'
          : '顾客端已完成 TUICallKit 初始化，正在等待医生发起呼叫。',
        peerTitle: peerInfo.title,
        peerName: peerInfo.name
      })
    } catch (err) {
      debugLog.error('consult-room', '初始化通话页失败', err)
      this.setData({
        loading: false,
        errorMessage: err.message || '初始化通话失败'
      })
    }
  },

  buildPeerUserID(runtime) {
    if (!runtime || !runtime.session) {
      return ''
    }

    if (runtime.role === 'doctor' && runtime.customer && runtime.customer.id) {
      return consult.buildCustomerRTCUserID(runtime.session.id, runtime.customer.id)
    }

    if (runtime.role === 'customer' && runtime.doctor && runtime.doctor.id) {
      return consult.buildDoctorRTCUserID(runtime.session.id, runtime.doctor.id)
    }

    return ''
  },

  buildPeerInfo(runtime) {
    if (runtime.role === 'doctor') {
      return {
        title: '顾客信息',
        name: runtime.customer ? (runtime.customer.nickname || runtime.customer.mobile || '顾客已加入') : '顾客尚未加入'
      }
    }

    return {
      title: '医生信息',
      name: runtime.doctor ? `${runtime.doctor.name || '医生'} · ${runtime.doctor.title || '待补充职称'}` : '医生信息加载中'
    }
  },

  async handleFinishConsult() {
    const doctorToken = auth.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      debugLog.warn('consult-room', '结束面诊时缺少医生登录态', {
        sessionId: this.sessionId
      })
      this.setData({
        errorMessage: '缺少医生登录态，无法结束面诊。'
      })
      return
    }

    this.setData({ finishLoading: true, errorMessage: '' })

    try {
      debugLog.info('consult-room', '医生点击结束面诊', {
        sessionId: this.sessionId
      })
      const result = await consult.finishConsultSession(this.sessionId, doctorToken)
      consult.saveFinishResult(result)
      consult.clearConsultRuntime()
      this.hasHandledLeave = true
      await tuicallkit.leaveConsultRoom()

      await this.maybeShowRecordingWarning(result.__message)

      wx.redirectTo({
        url: `/pages/consult-finish/index?sessionId=${result.session.id}&role=doctor`
      })
    } catch (err) {
      debugLog.error('consult-room', '结束面诊失败', err)
      this.setData({
        errorMessage: err.message || '结束面诊失败'
      })
    } finally {
      this.setData({ finishLoading: false })
    }
  },

  async handleLeavePage() {
    await this.performCustomerLeave(false)
  },

  async performCustomerLeave(silent) {
    if (this.hasHandledLeave) {
      return
    }

    this.hasHandledLeave = true
    const userToken = auth.getUserToken()

    if (!silent) {
      debugLog.info('consult-room', '顾客准备离开当前会话', {
        sessionId: this.sessionId
      })
      this.setData({
        leaving: true,
        errorMessage: '',
        statusText: '正在离开当前会话...'
      })
    }

    try {
      if (userToken && this.sessionId) {
        const result = await consult.leaveConsultSession(this.sessionId, userToken)
        consult.saveFinishResult({
          session: result.session,
          record: null
        })
        debugLog.info('consult-room', '顾客离开会话成功', {
          sessionId: this.sessionId,
          status: result.session && result.session.status ? result.session.status : ''
        })
      }
    } catch (err) {
      debugLog.error('consult-room', '顾客离开会话失败', err)
      if (!silent) {
        this.setData({
          errorMessage: err.message || '离开会话失败'
        })
      }
    }

    try {
      await tuicallkit.leaveConsultRoom()
    } catch (err) {
      debugLog.warn('consult-room', '退出 TUICallKit 失败，但不阻断页面关闭', err)
      // SDK 退出失败不阻断页面关闭流程。
    }

    consult.clearConsultRuntime()

    if (!silent) {
      wx.redirectTo({
        url: `/pages/consult-finish/index?sessionId=${this.sessionId || 0}&role=${this.data.role || ''}&status=left`
      })
    }
  },

  handleBackToDoctorDetail() {
    debugLog.info('consult-room', '医生返回会话详情页', {
      sessionId: this.sessionId
    })
    wx.redirectTo({
      url: `/pages/doctor-session-detail/index?id=${this.sessionId || 0}`
    })
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
