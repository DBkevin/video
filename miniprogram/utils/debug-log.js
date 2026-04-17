const STORAGE_KEY = 'video_consult_debug_logs'
const MAX_LOG_COUNT = 200
const listeners = new Set()

function readRawLogs() {
  try {
    const logs = wx.getStorageSync(STORAGE_KEY)
    return Array.isArray(logs) ? logs : []
  } catch (err) {
    return []
  }
}

function writeRawLogs(logs) {
  try {
    wx.setStorageSync(STORAGE_KEY, logs)
  } catch (err) {
    // 存储失败不阻断业务流程。
  }
}

function notifyListeners() {
  const logs = getLogs()
  listeners.forEach((listener) => {
    try {
      listener(logs)
    } catch (err) {
      // 单个页面监听异常不影响其他页面。
    }
  })
}

function padNumber(value) {
  return `${value}`.padStart(2, '0')
}

function formatTime(date) {
  return `${padNumber(date.getHours())}:${padNumber(date.getMinutes())}:${padNumber(date.getSeconds())}`
}

function normalizeDetail(detail) {
  if (detail === undefined || detail === null || detail === '') {
    return ''
  }

  if (detail instanceof Error) {
    return detail.stack || detail.message || `${detail}`
  }

  if (typeof detail === 'string') {
    return detail
  }

  try {
    return JSON.stringify(detail, null, 2)
  } catch (err) {
    return `${detail}`
  }
}

function appendLog(level, source, message, detail) {
  const now = new Date()
  const entry = {
    id: `${now.getTime()}_${Math.random().toString(16).slice(2, 8)}`,
    ts: now.getTime(),
    time: formatTime(now),
    level: level || 'info',
    source: source || 'app',
    message: message || '',
    detail: normalizeDetail(detail),
    levelClass: `debug-log-${level || 'info'}`
  }

  const logs = readRawLogs()
  logs.push(entry)

  while (logs.length > MAX_LOG_COUNT) {
    logs.shift()
  }

  writeRawLogs(logs)
  notifyListeners()

  try {
    const printMethod = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'log'
    console[printMethod](`[miniapp:${entry.source}] ${entry.message}`, entry.detail || '')
  } catch (err) {
    // 控制台输出失败不影响页面内调试面板。
  }

  return entry
}

function info(source, message, detail) {
  return appendLog('info', source, message, detail)
}

function warn(source, message, detail) {
  return appendLog('warn', source, message, detail)
}

function error(source, message, detail) {
  return appendLog('error', source, message, detail)
}

function getLogs(limit = 80) {
  const logs = readRawLogs()
  return logs.slice(-limit).reverse()
}

function clearLogs() {
  writeRawLogs([])
  notifyListeners()
}

function subscribe(listener) {
  if (typeof listener !== 'function') {
    return () => {}
  }

  listeners.add(listener)
  listener(getLogs())

  return () => {
    listeners.delete(listener)
  }
}

function getLogText(limit = 120) {
  return getLogs(limit).map((item) => {
    const detail = item.detail ? `\n${item.detail}` : ''
    return `[${item.time}] [${item.level.toUpperCase()}] [${item.source}] ${item.message}${detail}`
  }).join('\n\n')
}

module.exports = {
  info,
  warn,
  error,
  getLogs,
  clearLogs,
  subscribe,
  getLogText
}
