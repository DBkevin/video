const { request } = require('./request')

const USER_TOKEN_KEY = 'user_access_token'
const USER_PROFILE_KEY = 'current_user_profile'
const DOCTOR_TOKEN_KEY = 'doctor_access_token'

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

function setDoctorToken(token) {
  wx.setStorageSync(DOCTOR_TOKEN_KEY, token || '')
}

module.exports = {
  loginByWeChat,
  getUserToken,
  getDoctorToken,
  setDoctorToken
}
