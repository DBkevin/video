const auth = require('../../utils/auth')
const consult = require('../../utils/consult')

Page({
  data: {
    loading: true,
    statusText: '正在读取面诊入口...',
    errorMessage: '',
    entry: null
  },

  onLoad(options) {
    this.shareToken = options.token || ''
    this.bootstrap()
  },

  async bootstrap() {
    if (!this.shareToken) {
      this.setData({
        loading: false,
        errorMessage: '缺少分享 token，请从医生分享的小程序入口重新进入。'
      })
      return
    }

    try {
      this.setData({
        loading: true,
        errorMessage: '',
        statusText: '正在微信登录...'
      })

      const loginResult = await auth.loginByWeChat()
      this.setData({ statusText: '正在获取会话入口...' })

      const entry = await consult.getConsultEntry(this.shareToken)
      this.setData({
        entry,
        statusText: '正在加入候诊会话...'
      })

      const joinResult = await consult.joinConsultSession(entry.session_id, this.shareToken, loginResult.access_token)

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
      this.setData({
        loading: false,
        errorMessage: err.message || '进入面诊失败，请稍后重试'
      })
    }
  },

  handleRetry() {
    this.bootstrap()
  }
})
