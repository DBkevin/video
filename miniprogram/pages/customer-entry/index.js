const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const debugLog = require('../../utils/debug-log')

Page({
  data: {
    loading: true,
    statusText: '正在读取面诊入口...',
    errorMessage: '',
    entry: null
  },

  onLoad(options) {
    this.shareToken = options.token || ''
    debugLog.info('customer-entry', '顾客入口页加载', {
      hasShareToken: !!this.shareToken,
      shareTokenPrefix: this.shareToken ? this.shareToken.slice(0, 8) : ''
    })
    this.bootstrap()
  },

  async bootstrap() {
    if (!this.shareToken) {
      debugLog.error('customer-entry', '顾客入口缺少分享 token')
      this.setData({
        loading: false,
        errorMessage: '缺少分享 token，请从医生分享的小程序入口重新进入。'
      })
      return
    }

    try {
      debugLog.info('customer-entry', '开始进入顾客面诊流程')
      this.setData({
        loading: true,
        errorMessage: '',
        statusText: '正在微信登录...'
      })

      const loginResult = await auth.loginByWeChat()
      debugLog.info('customer-entry', '顾客微信登录成功', {
        hasAccessToken: !!(loginResult && loginResult.access_token)
      })
      this.setData({ statusText: '正在获取会话入口...' })

      const entry = await consult.getConsultEntry(this.shareToken)
      debugLog.info('customer-entry', '已获取会话入口信息', {
        sessionId: entry.session_id,
        status: entry.status
      })
      this.setData({
        entry,
        statusText: '正在加入候诊会话...'
      })

      const joinResult = await consult.joinConsultSession(entry.session_id, this.shareToken, loginResult.access_token)
      debugLog.info('customer-entry', '顾客加入候诊成功，准备跳转通话页', {
        sessionId: joinResult.session && joinResult.session.id ? joinResult.session.id : 0,
        roomId: joinResult.rtc && joinResult.rtc.room_id ? joinResult.rtc.room_id : 0
      })

      // join 成功后把当前会话、RTC 参数和医生信息落地，供通话页继续初始化 SDK。
      consult.saveConsultRuntime({
        session: joinResult.session,
        rtc: joinResult.rtc,
        role: 'customer',
        doctor: joinResult.doctor,
        currentRole: joinResult.current_role,
        shareToken: this.shareToken,
        accessToken: loginResult.access_token
      })

      wx.redirectTo({
        url: `/pages/consult-room/index?sessionId=${joinResult.session.id}&role=customer`
      })
    } catch (err) {
      debugLog.error('customer-entry', '顾客进入面诊失败', err)
      this.setData({
        loading: false,
        statusText: '进入失败',
        errorMessage: err.message || '进入面诊失败，请稍后重试'
      })
    }
  },

  handleRetry() {
    debugLog.info('customer-entry', '顾客点击重新进入')
    this.bootstrap()
  }
})
