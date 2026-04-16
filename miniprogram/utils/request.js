const { API_BASE_URL } = require('./config')

function buildURL(path) {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

function request(options) {
  const {
    url,
    method = 'GET',
    data,
    token = '',
    header = {}
  } = options

  return new Promise((resolve, reject) => {
    wx.request({
      url: buildURL(url),
      method,
      data,
      timeout: 15000,
      header: {
        'Content-Type': 'application/json',
        ...header,
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success(res) {
        const body = res.data || {}
        const message = body.message || `请求失败(${res.statusCode})`

        if (res.statusCode >= 200 && res.statusCode < 300 && body.code >= 200 && body.code < 300) {
          resolve(body.data)
          return
        }

        reject(new Error(message))
      },
      fail(err) {
        reject(new Error(err.errMsg || '网络请求失败'))
      }
    })
  })
}

module.exports = {
  request
}
