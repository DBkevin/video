const GLOBAL_CALL_PAGE_PATH = 'TUICallKit/pages/globalCall/globalCall'
const VIDEO_CALL_TYPE = 2
const CALL_STATUS_WATCH_FLAG = '__videoConsultCallStatusWatchBound'
const debugLog = require('./debug-log')

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
    debugLog.info('tuicallkit', '复用已加载的 TUICallKit Provider', {
      provider: cachedAdapter.provider
    })
    return cachedAdapter
  }

  const loadErrors = []
  for (let i = 0; i < LOADERS.length; i += 1) {
    try {
      cachedAdapter = LOADERS[i].load()
      debugLog.info('tuicallkit', '成功加载 TUICallKit Provider', {
        provider: cachedAdapter.provider
      })
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
  debugLog.info('tuicallkit', '准备初始化 CallManager', {
    provider: adapter.provider,
    sdkAppId: runtime.sdkAppId,
    rtcUserId: runtime.rtcUserId,
    roomId: runtime.roomId
  })

  if (!wx.CallManager || wx.__videoConsultCallProvider !== adapter.provider) {
    wx.CallManager = new adapter.CallManagerCtor()
    wx.__videoConsultCallProvider = adapter.provider
    wx.__videoConsultCallIdentity = ''
  }

  if (wx.__videoConsultCallIdentity === identityKey) {
    debugLog.info('tuicallkit', '复用当前登录态，无需重复 init', {
      provider: adapter.provider,
      rtcUserId: runtime.rtcUserId
    })
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

  bindSDKCallbacks(adapter)
  wx.__videoConsultCallIdentity = identityKey
  bindCallStatusWatcher(adapter)
  debugLog.info('tuicallkit', 'CallManager 初始化成功', {
    provider: adapter.provider,
    rtcUserId: runtime.rtcUserId
  })
  return adapter
}

function bindSDKCallbacks(adapter) {
  const targets = [adapter.callAPI, wx.CallManager]

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    if (!target || typeof target.setCallback !== 'function') {
      continue
    }

    if (target.__videoConsultCallbackBound) {
      return
    }

    try {
      target.setCallback({
        beforeCalling() {
          debugLog.info('tuicallkit', 'SDK beforeCalling 回调触发')
        },
        afterCalling() {
          debugLog.info('tuicallkit', 'SDK afterCalling 回调触发')
        },
        statusChanged(payload) {
          debugLog.info('tuicallkit', 'SDK statusChanged 回调触发', payload)
        },
        kickedOut(payload) {
          debugLog.warn('tuicallkit', 'SDK kickedOut 回调触发', payload)
        }
      })
      target.__videoConsultCallbackBound = true
      debugLog.info('tuicallkit', '已绑定 TUICallKit SDK 回调', {
        provider: adapter.provider
      })
      return
    } catch (err) {
      debugLog.warn('tuicallkit', '绑定 TUICallKit SDK 回调失败，将继续使用默认行为', err)
    }
  }
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

  debugLog.info('tuicallkit', '准备跳转到官方通话页', {
    currentRoute,
    targetRoute: GLOBAL_CALL_PAGE_PATH
  })
  wx.__videoConsultGlobalCallNavigating = true
  wx.navigateTo({
    url: `/${GLOBAL_CALL_PAGE_PATH}`,
    success() {
      wx.__videoConsultGlobalCallNavigating = false
      debugLog.info('tuicallkit', '已成功跳转到官方通话页', {
        targetRoute: GLOBAL_CALL_PAGE_PATH
      })
    },
    fail(err) {
      wx.__videoConsultGlobalCallNavigating = false
      debugLog.error('tuicallkit', '跳转官方通话页失败', err)
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
    debugLog.info('tuicallkit', '检测到 TUIStore 通话状态变化', {
      status
    })

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
      debugLog.info('tuicallkit', '已设置本端资料', {
        provider: adapter.provider,
        rtcUserId: runtime.rtcUserId,
        displayName: runtime.displayName || ''
      })
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

  debugLog.info('tuicallkit', '医生端准备发起视频呼叫', {
    roomId: runtime.roomId,
    rtcUserId: runtime.rtcUserId,
    peerUserId: runtime.peerUserId
  })

  let callRejectedError = null
  const callPromise = invokeWithPayloadVariants(adapter.callAPI, 'calls', [
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
  ]).catch((err) => {
    callRejectedError = err
    throw err
  })

  // 小程序真机上，官方 SDK 的 calls() 在拨号过程中可能长时间处于 pending，
  // 如果直接 await，会让医生页一直卡在“正在初始化 TUICallKit”。
  // 这里改成并行等待：只要 SDK 的呼叫状态先进入 calling/connected，就立即放行到官方通话页。
  const startupResult = await Promise.race([
    callPromise.then(() => ({ type: 'call-resolved' })),
    waitForCallStatus(adapter, 8000).then((status) => ({ type: 'status', status }))
  ]).catch((err) => {
    debugLog.error('tuicallkit', '发起视频呼叫流程报错', err)
    throw err
  })

  debugLog.info('tuicallkit', '医生端拨号等待结果', startupResult)

  if (startupResult && startupResult.type === 'status' && isActiveCallStatus(adapter, startupResult.status)) {
    navigateToGlobalCallPage()
    return
  }

  if (callRejectedError) {
    debugLog.error('tuicallkit', '发起视频呼叫被 SDK 显式拒绝', callRejectedError)
    throw callRejectedError
  }

  const currentStatus = await waitForCallStatus(adapter, 2000)
  if (!isActiveCallStatus(adapter, currentStatus)) {
    throw buildCallStartupError(adapter, runtime, currentStatus)
  }

  navigateToGlobalCallPage()
}

async function enterConsultRoom(runtime) {
  if (!runtime || !runtime.sdkAppId || !runtime.rtcUserId || !runtime.userSig || !runtime.roomId) {
    throw new Error('RTC 参数不完整，请重新进入当前会话')
  }

  debugLog.info('tuicallkit', '进入通话房间初始化开始', {
    role: runtime.role,
    sdkAppId: runtime.sdkAppId,
    rtcUserId: runtime.rtcUserId,
    roomId: runtime.roomId,
    peerUserId: runtime.peerUserId || ''
  })
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
    debugLog.warn('tuicallkit', '退出通话时未找到可用 Provider，直接忽略', err)
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
        debugLog.info('tuicallkit', '已调用通话退出方法', {
          provider: adapter.provider,
          method: methodCandidates[j]
        })
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
