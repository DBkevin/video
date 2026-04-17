// 生产环境默认走已绑定的 HTTPS 域名，满足微信小程序合法域名要求。
// 如需本地联调，可临时改回 http://127.0.0.1:8080/api/v1
const API_BASE_URL = 'https://hxtest.xmmylike.com/api/v1'

module.exports = {
  API_BASE_URL
}
