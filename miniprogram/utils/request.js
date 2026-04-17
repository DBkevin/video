const { API_BASE_URL } = require('./config')

function buildURL(path) {
  if (/^https?:\/\//.test(path)) {
    return path
  }
  return `${API_BASE_URL}${path}`
}

function buildNetworkFailureMessage(err, finalURL, method) {
  const rawMessage = (err && err.errMsg) ? err.errMsg : '网络请求失败'
  const lines = [
    `网络请求失败：${method} ${finalURL}`,
    `原始错误：${rawMessage}`
  ]

  if (/url not in domain list/i.test(rawMessage)) {
    lines.push('可能原因：微信小程序 request 合法域名校验未通过。')
    lines.push('排查建议：')
    lines.push('1. 微信公众平台 -> 开发管理 -> 开发设置 -> 服务器域名 -> request 合法域名 中已添加 https://hxtest.xmmylike.com')
    lines.push('2. 当前真机打开的小程序 AppID 与后台配置域名的小程序 AppID 完全一致')
    lines.push('3. 域名配置保存后，完全退出微信，再重新打开小程序')
    lines.push('4. 如果使用体验版，请确认最新体验版已重新上传并重新进入')
    return lines.join('\n')
  }

  if (/ssl|certificate/i.test(rawMessage)) {
    lines.push('可能原因：HTTPS 证书链不完整、证书已过期，或域名与证书不匹配。')
    return lines.join('\n')
  }

  if (/timeout/i.test(rawMessage)) {
    lines.push('可能原因：服务端响应超时、网络较差，或服务器安全组/防火墙拦截。')
    return lines.join('\n')
  }

  if (/fail|refused|reset|closed|dns/i.test(rawMessage)) {
    lines.push('可能原因：域名解析异常、Nginx/后端服务未正常响应，或网络被拦截。')
  }

  return lines.join('\n')
}

function buildBusinessFailureMessage(message, finalURL, method, statusCode) {
  return [
    `接口请求失败：${method} ${finalURL}`,
    `HTTP 状态：${statusCode}`,
    `错误信息：${message || '未知错误'}`
  ].join('\n')
}

function request(options) {
  const {
    url,
    method = 'GET',
    data,
    token = '',
    header = {}
  } = options
  const finalURL = buildURL(url)

  return new Promise((resolve, reject) => {
    wx.request({
      url: finalURL,
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
          const payload = body.data

          if (payload && typeof payload === 'object') {
            try {
              // 把服务端 message 挂回结果对象，方便页面对“录制失败但主流程成功”这类提示做显式提醒。
              Object.defineProperty(payload, '__message', {
                value: message,
                enumerable: false,
                configurable: true
              })
            } catch (err) {
              payload.__message = message
            }
          }

          resolve(payload)
          return
        }

        reject(new Error(buildBusinessFailureMessage(message, finalURL, method, res.statusCode)))
      },
      fail(err) {
        reject(new Error(buildNetworkFailureMessage(err, finalURL, method)))
      }
    })
  })
}

module.exports = {
  request
}
