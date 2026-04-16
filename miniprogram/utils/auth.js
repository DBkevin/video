const { request } = require('./request')

const USER_TOKEN_KEY = 'user_access_token'
const USER_PROFILE_KEY = 'current_user_profile'
const DOCTOR_TOKEN_KEY = 'doctor_access_token'
const DOCTOR_PROFILE_KEY = 'doctor_profile'

function doWXLogin() {
  return new Promise((resolve, reject) => {
    wx.login({
      success(res) {
        if (!res.code) {
          reject(new Error('微信登录失败，未获取到 code'))
          return
        }
        resolve(res.code)
      },
      fail(err) {
        reject(new Error(err.errMsg || '微信登录失败'))
      }
    })
  })
}

async function loginByWeChat(profile = {}) {
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
  return result
}

function setDoctorToken(token) {
  wx.setStorageSync(DOCTOR_TOKEN_KEY, token || '')
}

function clearDoctorLogin() {
  wx.removeStorageSync(DOCTOR_TOKEN_KEY)
  wx.removeStorageSync(DOCTOR_PROFILE_KEY)
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
