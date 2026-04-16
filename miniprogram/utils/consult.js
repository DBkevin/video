const { request } = require('./request')

const CONSULT_RUNTIME_KEY = 'consult_runtime_payload'
const LAST_FINISH_RESULT_KEY = 'consult_last_finish_result'

function createConsultSession(accessToken, expireMinutes = 120) {
  return request({
    url: '/consult-sessions',
    method: 'POST',
    token: accessToken,
    data: {
      expire_minutes: expireMinutes
    }
  })
}

function getConsultEntry(shareToken) {
  return request({
    url: `/consult-entry?token=${encodeURIComponent(shareToken)}`
  })
}

function joinConsultSession(sessionId, shareToken, accessToken) {
  return request({
    url: `/consult-sessions/${sessionId}/join`,
    method: 'POST',
    token: accessToken,
    data: {
      share_token: shareToken
    }
  })
}

function getConsultSession(sessionId, accessToken) {
  return request({
    url: `/consult-sessions/${sessionId}`,
    token: accessToken
  })
}

function shareConsultSession(sessionId, accessToken, expireMinutes = 120) {
  return request({
    url: `/consult-sessions/${sessionId}/share`,
    method: 'POST',
    token: accessToken,
    data: {
      expire_minutes: expireMinutes
    }
  })
}

function startConsultSession(sessionId, accessToken) {
  return request({
    url: `/consult-sessions/${sessionId}/start`,
    method: 'POST',
    token: accessToken
  })
}

function finishConsultSession(sessionId, accessToken, payload = {}) {
  return request({
    url: `/consult-sessions/${sessionId}/finish`,
    method: 'POST',
    token: accessToken,
    data: payload
  })
}

function cancelConsultSession(sessionId, accessToken) {
  return request({
    url: `/consult-sessions/${sessionId}/cancel`,
    method: 'POST',
    token: accessToken
  })
}

function leaveConsultSession(sessionId, accessToken) {
  return request({
    url: `/consult-sessions/${sessionId}/leave`,
    method: 'POST',
    token: accessToken
  })
}

function saveConsultRuntime(payload) {
  wx.setStorageSync(CONSULT_RUNTIME_KEY, payload || null)
}

function getConsultRuntime() {
  return wx.getStorageSync(CONSULT_RUNTIME_KEY) || null
}

function clearConsultRuntime() {
  wx.removeStorageSync(CONSULT_RUNTIME_KEY)
}

function saveFinishResult(payload) {
  wx.setStorageSync(LAST_FINISH_RESULT_KEY, payload || null)
}

function getFinishResult() {
  return wx.getStorageSync(LAST_FINISH_RESULT_KEY) || null
}

function buildDoctorRTCUserID(sessionId, doctorId) {
  return `consult_doctor_${sessionId}_${doctorId}`
}

function buildCustomerRTCUserID(sessionId, customerId) {
  return `consult_customer_${sessionId}_${customerId}`
}

module.exports = {
  createConsultSession,
  getConsultEntry,
  joinConsultSession,
  getConsultSession,
  shareConsultSession,
  startConsultSession,
  finishConsultSession,
  cancelConsultSession,
  leaveConsultSession,
  saveConsultRuntime,
  getConsultRuntime,
  clearConsultRuntime,
  saveFinishResult,
  getFinishResult,
  buildDoctorRTCUserID,
  buildCustomerRTCUserID
}
