const { request } = require('./request')
const debugLog = require('./debug-log')

const USER_TOKEN_KEY = 'user_access_token'
const USER_PROFILE_KEY = 'current_user_profile'
const DOCTOR_TOKEN_KEY = 'doctor_access_token'
const DOCTOR_PROFILE_KEY = 'doctor_profile'

function doWXLogin() {
  return new Promise((resolve, reject) => {
    debugLog.info('auth', '开始调用 wx.login')
    wx.login({
      success(res) {
        if (!res.code) {
          debugLog.error('auth', 'wx.login 成功但未获取到 code', res)
          reject(new Error('微信登录失败，未获取到 code'))
          return
        }
        debugLog.info('auth', 'wx.login 成功，已获取 code')
        resolve(res.code)
      },
      fail(err) {
        debugLog.error('auth', 'wx.login 调用失败', err)
        reject(new Error(err.errMsg || '微信登录失败'))
      }
    })
  })
}

async function loginByWeChat(profile = {}) {
  debugLog.info('auth', '开始执行顾客微信登录')
  const code = await doWXLogin()
  const result = await request({
    url: '/auth/wx-login',
    method: 'POST',
    data: {
      code,
      nickname: profile.nickname || '',
      avatar_url: profile.avatar_url || ''
    }
  })

  wx.setStorageSync(USER_TOKEN_KEY, result.access_token || '')
  wx.setStorageSync(USER_PROFILE_KEY, result.user || null)
  debugLog.info('auth', '顾客微信登录成功', {
    hasAccessToken: !!result.access_token,
    userId: result.user && result.user.id ? result.user.id : 0
  })
  return result
}

function getUserToken() {
  return wx.getStorageSync(USER_TOKEN_KEY) || ''
}

function getDoctorToken() {
  return wx.getStorageSync(DOCTOR_TOKEN_KEY) || ''
}

function getDoctorProfile() {
  return wx.getStorageSync(DOCTOR_PROFILE_KEY) || null
}

async function loginDoctor(payload) {
  debugLog.info('auth', '开始执行医生登录', {
    employeeNo: payload.employeeNo || ''
  })
  const result = await request({
    url: '/auth/doctor/login',
    method: 'POST',
    data: {
      employee_no: payload.employeeNo || '',
      password: payload.password || ''
    }
  })

  wx.setStorageSync(DOCTOR_TOKEN_KEY, result.access_token || '')
  wx.setStorageSync(DOCTOR_PROFILE_KEY, result.doctor || null)
  debugLog.info('auth', '医生登录成功', {
    doctorId: result.doctor && result.doctor.id ? result.doctor.id : 0,
    employeeNo: payload.employeeNo || ''
  })
  return result
}

function setDoctorToken(token) {
  wx.setStorageSync(DOCTOR_TOKEN_KEY, token || '')
}

function clearDoctorLogin() {
  wx.removeStorageSync(DOCTOR_TOKEN_KEY)
  wx.removeStorageSync(DOCTOR_PROFILE_KEY)
  debugLog.info('auth', '医生登录态已清除')
}

module.exports = {
  loginByWeChat,
  loginDoctor,
  getUserToken,
  getDoctorToken,
  getDoctorProfile,
  setDoctorToken,
  clearDoctorLogin
}
