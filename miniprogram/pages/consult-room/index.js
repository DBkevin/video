const auth = require('../../utils/auth')
const consult = require('../../utils/consult')
const tuicallkit = require('../../utils/tuicallkit')

Page({
  data: {
    loading: true,
    errorMessage: '',
    role: '',
    session: null,
    doctor: null,
    customer: null,
    sdkProvider: '',
    finishLoading: false
  },

  onLoad(options) {
    this.role = options.role || ''
    this.sessionId = Number(options.sessionId || 0)
    this.bootstrap()
  },

  async bootstrap() {
    const runtime = consult.getConsultRuntime()
    if (!runtime || !runtime.session) {
      this.setData({
        loading: false,
        errorMessage: '缺少当前会话上下文，请从顾客入口页或医生详情页重新进入。'
      })
      return
    }

    try {
      const peerUserId = this.buildPeerUserID(runtime)
      const result = await tuicallkit.enterConsultRoom({
        sdkAppId: runtime.rtc.sdk_app_id,
        rtcUserId: runtime.rtc.rtc_user_id,
        userSig: runtime.rtc.user_sig,
        roomId: runtime.rtc.room_id,
        role: runtime.role,
        peerUserId,
        displayName: runtime.role === 'doctor'
          ? '医生'
          : '顾客',
        avatarUrl: runtime.role === 'customer'
          ? ''
          : ''
      })

      this.setData({
        loading: false,
        role: runtime.role,
        session: runtime.session,
        doctor: runtime.doctor || null,
        customer: runtime.customer || null,
        sdkProvider: result.provider
      })
    } catch (err) {
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

  async handleFinishConsult() {
    const doctorToken = auth.getDoctorToken()
    if (!doctorToken || !this.sessionId) {
      this.setData({
        errorMessage: '缺少医生登录态，无法结束面诊。'
      })
      return
    }

    this.setData({ finishLoading: true, errorMessage: '' })

    try {
      const result = await consult.finishConsultSession(this.sessionId, doctorToken)
      consult.saveFinishResult(result)
      consult.clearConsultRuntime()
      await tuicallkit.leaveConsultRoom()

      wx.redirectTo({
        url: `/pages/consult-finish/index?sessionId=${result.session.id}&role=doctor`
      })
    } catch (err) {
      this.setData({
        errorMessage: err.message || '结束面诊失败'
      })
    } finally {
      this.setData({ finishLoading: false })
    }
  },

  async handleLeavePage() {
    await tuicallkit.leaveConsultRoom()
    wx.redirectTo({
      url: `/pages/consult-finish/index?sessionId=${this.sessionId || 0}&role=${this.data.role || ''}`
    })
  }
})
