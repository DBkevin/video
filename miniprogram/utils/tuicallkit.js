const GLOBAL_CALL_PAGE_PATH = 'TUICallKit/pages/globalCall/globalCall'
const VIDEO_CALL_TYPE = 2
const CALL_STATUS_WATCH_FLAG = '__videoConsultCallStatusWatchBound'

const LOADERS = [
  {
    provider: '@trtc/calls-uikit-wx-source',
    load() {
      const serviceModule = require('../TUICallKit/TUICallService/index')
      const managerModule = require('../TUICallKit/TUICallService/serve/callManager')
      return normalizeAdapter(serviceModule, managerModule, this.provider)
    }
  },
  {
    provider: '@trtc/calls-uikit-wx-npm',
    load() {
      const moduleExports = require('../miniprogram_npm/@trtc/calls-uikit-wx/index')
      return normalizeAdapter(moduleExports, moduleExports, this.provider)
    }
  }
]

let cachedAdapter = null

function unwrapDefault(mod) {
  return (mod && mod.default) ? mod.default : mod
}

function pickValue(mod, candidates) {
  if (!mod) {
    return null
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const current = mod[candidates[i]]
    if (current) {
      return current
    }
  }

  const defaultExport = unwrapDefault(mod)
  if (defaultExport && defaultExport !== mod) {
    return pickValue(defaultExport, candidates)
  }

  return null
}

function normalizeAdapter(serviceModule, managerModule, provider) {
  const callAPI = pickValue(serviceModule, ['TUICallKitAPI', 'TUICallKitServer'])
  const CallManagerCtor = pickValue(managerModule, ['CallManager']) || unwrapDefault(managerModule)
  const TUIStore = pickValue(serviceModule, ['TUIStore'])
  const StoreName = pickValue(serviceModule, ['StoreName'])
  const NAME = pickValue(serviceModule, ['NAME'])
  const CallStatus = pickValue(serviceModule, ['CallStatus'])

  if (!callAPI) {
    throw new Error(`${provider} 未导出 TUICallKitAPI`)
  }

  if (!CallManagerCtor) {
    throw new Error(`${provider} 未导出 CallManager`)
  }

  return {
    provider,
    callAPI,
    CallManagerCtor,
    TUIStore,
    StoreName,
    NAME,
    CallStatus
  }
}

function buildMissingSDKError(loadErrors) {
  const detail = loadErrors.map(item => `${item.provider}: ${item.message}`).join('；')
  return new Error(`未检测到官方 TUICallKit 组件。请在 miniprogram 目录执行 npm install @trtc/calls-uikit-wx，随后运行 npm run sync:tuicallkit，并在微信开发者工具执行“工具 -> 构建 npm”。如果已经构建过 npm，请重新编译后再试。${detail ? ` 诊断信息：${detail}` : ''}`)
}

function resolveAdapter() {
  if (cachedAdapter) {
    return cachedAdapter
  }

  const loadErrors = []
  for (let i = 0; i < LOADERS.length; i += 1) {
    try {
      cachedAdapter = LOADERS[i].load()
      return cachedAdapter
    } catch (err) {
      loadErrors.push({
        provider: LOADERS[i].provider,
        message: err && err.message ? err.message : '加载失败'
      })
    }
  }

  throw buildMissingSDKError(loadErrors)
}

function invokeMaybePromise(target, methodName, args) {
  if (!target || typeof target[methodName] !== 'function') {
    return Promise.reject(new Error(`missing:${methodName}`))
  }

  try {
    const result = target[methodName].apply(target, args)
    if (result && typeof result.then === 'function') {
      return result
    }
    return Promise.resolve(result)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function invokeWithPayloadVariants(target, methodName, payloadVariants) {
  let lastError = null

  for (let i = 0; i < payloadVariants.length; i += 1) {
    try {
      return await invokeMaybePromise(target, methodName, payloadVariants[i])
    } catch (err) {
      lastError = err
    }
  }

  throw lastError || new Error(`${methodName} 调用失败`)
}

async function ensureCallManager(runtime) {
  const adapter = resolveAdapter()
  const identityKey = `${adapter.provider}|${runtime.sdkAppId}|${runtime.rtcUserId}|${runtime.userSig}`

  if (!wx.CallManager || wx.__videoConsultCallProvider !== adapter.provider) {
    wx.CallManager = new adapter.CallManagerCtor()
    wx.__videoConsultCallProvider = adapter.provider
    wx.__videoConsultCallIdentity = ''
  }

  if (wx.__videoConsultCallIdentity === identityKey) {
    bindCallStatusWatcher(adapter)
    return adapter
  }

  // 按腾讯云官方小程序 TUICallKit 接入方式，先通过 CallManager 完成登录初始化。
  await invokeWithPayloadVariants(wx.CallManager, 'init', [
    [{
      sdkAppID: runtime.sdkAppId,
      SDKAppID: runtime.sdkAppId,
      userID: runtime.rtcUserId,
      userSig: runtime.userSig,
      globalCallPagePath: GLOBAL_CALL_PAGE_PATH
    }],
    [runtime.sdkAppId, runtime.rtcUserId, runtime.userSig]
  ])

  wx.__videoConsultCallIdentity = identityKey
  bindCallStatusWatcher(adapter)
  return adapter
}

function getCurrentRoute() {
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    return currentPage ? currentPage.route : ''
  } catch (err) {
    return ''
  }
}

function navigateToGlobalCallPage() {
  const currentRoute = getCurrentRoute()
  if (currentRoute === GLOBAL_CALL_PAGE_PATH || wx.__videoConsultGlobalCallNavigating) {
    return
  }

  wx.__videoConsultGlobalCallNavigating = true
  wx.navigateTo({
    url: `/${GLOBAL_CALL_PAGE_PATH}`,
    success() {
      wx.__videoConsultGlobalCallNavigating = false
    },
    fail(err) {
      wx.__videoConsultGlobalCallNavigating = false
      console.warn('[video-consult] navigate to global call page failed:', err)
    }
  })
}

function navigateBackFromGlobalCallPage() {
  const currentRoute = getCurrentRoute()
  if (currentRoute !== GLOBAL_CALL_PAGE_PATH) {
    return
  }

  wx.navigateBack({
    fail(err) {
      console.warn('[video-consult] navigate back from global call page failed:', err)
    }
  })
}

function getCallStatusKey(adapter) {
  if (!adapter || !adapter.NAME) {
    return ''
  }

  return adapter.NAME.CALL_STATUS || 'callStatus'
}

function getCallStoreName(adapter) {
  if (!adapter || !adapter.StoreName) {
    return ''
  }

  return adapter.StoreName.CALL || 'call'
}

function getCallStatus(adapter) {
  if (!adapter || !adapter.TUIStore || typeof adapter.TUIStore.getData !== 'function') {
    return ''
  }

  try {
    return adapter.TUIStore.getData(getCallStoreName(adapter), getCallStatusKey(adapter))
  } catch (err) {
    return ''
  }
}

function isActiveCallStatus(adapter, status) {
  if (!status) {
    return false
  }

  if (adapter && adapter.CallStatus) {
    return status === adapter.CallStatus.CALLING || status === adapter.CallStatus.CONNECTED
  }

  return status === 'calling' || status === 'connected'
}

function bindCallStatusWatcher(adapter) {
  if (!adapter || !adapter.TUIStore || typeof adapter.TUIStore.watch !== 'function' || !adapter.NAME || !adapter.StoreName) {
    return
  }

  if (wx[CALL_STATUS_WATCH_FLAG]) {
    return
  }

  const callStatusKey = getCallStatusKey(adapter)
  const callStoreName = getCallStoreName(adapter)

  const watcher = {}
  watcher[callStatusKey] = (status) => {
    console.log('[video-consult] TUICallKit status changed:', status)

    if (isActiveCallStatus(adapter, status)) {
      navigateToGlobalCallPage()
      return
    }

    if (adapter.CallStatus && status === adapter.CallStatus.IDLE) {
      navigateBackFromGlobalCallPage()
    }
  }

  adapter.TUIStore.watch(callStoreName, watcher, {
    notifyRangeWhenWatch: adapter.NAME.MYSELF
  })

  wx[CALL_STATUS_WATCH_FLAG] = true
}

async function waitForCallStatus(adapter, timeoutMs) {
  const startedAt = Date.now()
  const intervalMs = 250

  while (Date.now() - startedAt < timeoutMs) {
    const currentStatus = getCallStatus(adapter)
    if (isActiveCallStatus(adapter, currentStatus)) {
      return currentStatus
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs))
  }

  return getCallStatus(adapter)
}

function buildCallStartupError(adapter, runtime, currentStatus) {
  const setting = tryGetSetting()
  const route = getCurrentRoute()
  const cameraAuthorized = readSettingValue(setting, 'scope.camera')
  const recordAuthorized = readSettingValue(setting, 'scope.record')

  return new Error(
    [
      'TUICallKit 已完成初始化，但当前没有进入呼叫状态。',
      `当前 provider：${adapter && adapter.provider ? adapter.provider : 'unknown'}`,
      `当前路由：${route || 'unknown'}`,
      `当前通话状态：${currentStatus || 'idle'}`,
      `房间号：${runtime.roomId || 0}`,
      `本端 RTCUserID：${runtime.rtcUserId || ''}`,
      `对端 RTCUserID：${runtime.peerUserId || ''}`,
      `摄像头授权：${cameraAuthorized}`,
      `麦克风授权：${recordAuthorized}`,
      '请重点检查：1. 当前小程序是否已开通 live-pusher/live-player 权限；2. 手机是否已允许摄像头/麦克风；3. 微信开发者工具是否执行过“构建 npm”；4. 当前 TUICallKit 使用的 SDKAppID、userSig、roomID 是否一致。'
    ].join('\n')
  )
}

function tryGetSetting() {
  try {
    if (typeof wx.getAppAuthorizeSetting === 'function') {
      return wx.getAppAuthorizeSetting() || {}
    }

    if (typeof wx.getSystemSetting === 'function') {
      return wx.getSystemSetting() || {}
    }

    return {}
  } catch (err) {
    return {}
  }
}

function readSettingValue(setting, key) {
  if (!setting) {
    return 'unknown'
  }

  const authSetting = setting.authSetting || {}
  if (Object.prototype.hasOwnProperty.call(authSetting, key)) {
    return authSetting[key] ? 'granted' : 'denied'
  }

  if (Object.prototype.hasOwnProperty.call(setting, key)) {
    return setting[key] ? 'granted' : 'denied'
  }

  return 'unknown'
}

async function setSelfProfile(adapter, runtime) {
  const profile = {
    nickName: runtime.displayName || '',
    avatar: runtime.avatarUrl || ''
  }

  const targets = [adapter.callAPI, wx.CallManager]
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    if (!target) {
      continue
    }

    try {
      await invokeMaybePromise(target, 'setSelfInfo', [profile])
      return
    } catch (err) {
      // 某些版本没有暴露 setSelfInfo，这里继续尝试其他兼容入口。
    }
  }
}

async function startVideoCall(adapter, runtime) {
  if (!runtime.peerUserId) {
    throw new Error('当前会话缺少对方 RTC 标识，医生暂时无法发起视频呼叫')
  }

  await invokeWithPayloadVariants(adapter.callAPI, 'calls', [
    [{
      userIDList: [runtime.peerUserId],
      type: VIDEO_CALL_TYPE,
      roomID: runtime.roomId
    }],
    [{
      userIDList: [runtime.peerUserId],
      callMediaType: VIDEO_CALL_TYPE,
      roomID: runtime.roomId
    }],
    [[runtime.peerUserId], VIDEO_CALL_TYPE, runtime.roomId]
  ])

  const currentStatus = await waitForCallStatus(adapter, 8000)
  if (!isActiveCallStatus(adapter, currentStatus)) {
    throw buildCallStartupError(adapter, runtime, currentStatus)
  }

  navigateToGlobalCallPage()
}

async function enterConsultRoom(runtime) {
  if (!runtime || !runtime.sdkAppId || !runtime.rtcUserId || !runtime.userSig || !runtime.roomId) {
    throw new Error('RTC 参数不完整，请重新进入当前会话')
  }

  const adapter = await ensureCallManager(runtime)
  await setSelfProfile(adapter, runtime)

  if (runtime.role === 'doctor') {
    // 医生进入通话页后立即向顾客发起官方 TUICallKit 视频呼叫。
    await startVideoCall(adapter, runtime)
  }

  return {
    provider: adapter.provider,
    waitingForAnswer: runtime.role !== 'doctor'
  }
}

async function leaveConsultRoom() {
  let adapter = null

  try {
    adapter = resolveAdapter()
  } catch (err) {
    return
  }

  const targets = [adapter.callAPI, wx.CallManager]
  const methodCandidates = ['hangup', 'hangUp', 'endCall', 'destroy']

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    if (!target) {
      continue
    }

    for (let j = 0; j < methodCandidates.length; j += 1) {
      try {
        await invokeMaybePromise(target, methodCandidates[j], [])
        return
      } catch (err) {
        // 继续尝试下一个兼容方法。
      }
    }
  }
}

module.exports = {
  enterConsultRoom,
  leaveConsultRoom,
  GLOBAL_CALL_PAGE_PATH
}
