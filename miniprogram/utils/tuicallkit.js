const PACKAGE_CANDIDATES = [
  {
    name: '@trtc/calls-uikit-wx',
    path: '../miniprogram_npm/@trtc/calls-uikit-wx/index'
  },
  {
    name: '@tencentcloud/call-uikit-wx',
    path: '../miniprogram_npm/@tencentcloud/call-uikit-wx/index'
  },
  {
    name: '@tencentcloud/call-uikit-wechat',
    path: '../miniprogram_npm/@tencentcloud/call-uikit-wechat/index'
  }
]

let cachedPackage = null

function resolvePackage() {
  if (cachedPackage) {
    return cachedPackage
  }

  for (let i = 0; i < PACKAGE_CANDIDATES.length; i += 1) {
    const candidate = PACKAGE_CANDIDATES[i]

    try {
      const mod = require(candidate.path)
      const defaultExport = mod.default || null
      cachedPackage = {
        name: candidate.name,
        server: mod.TUICallKitServer || (defaultExport && defaultExport.TUICallKitServer) || defaultExport || mod,
        callManager: mod.CallManager || (defaultExport && defaultExport.CallManager) || null
      }
      return cachedPackage
    } catch (err) {
      // 继续尝试其他官方包名，便于兼容不同版本的 TUICallKit。
    }
  }

  cachedPackage = {
    name: 'mock-tuicallkit',
    server: null,
    callManager: null
  }
  return cachedPackage
}

function invokeMaybePromise(target, methodName, args) {
  if (!target || typeof target[methodName] !== 'function') {
    return Promise.reject(new Error(`missing:${methodName}`))
  }

  try {
    const result = target[methodName](...args)
    if (result && typeof result.then === 'function') {
      return result
    }
    return Promise.resolve(result)
  } catch (err) {
    return Promise.reject(err)
  }
}

async function initSDK(server, runtime) {
  const argList = [
    [{
      SDKAppID: runtime.sdkAppId,
      sdkAppID: runtime.sdkAppId,
      userID: runtime.rtcUserId,
      userSig: runtime.userSig
    }],
    [runtime.sdkAppId, runtime.rtcUserId, runtime.userSig]
  ]

  for (let i = 0; i < argList.length; i += 1) {
    try {
      await invokeMaybePromise(server, 'init', argList[i])
      return
    } catch (err) {
      // 适配不同版本的 init 签名。
    }
  }

  throw new Error('TUICallKit 初始化失败')
}

async function setSelfProfile(server, runtime) {
  const profile = {
    nickName: runtime.displayName || '',
    avatar: runtime.avatarUrl || ''
  }

  try {
    await invokeMaybePromise(server, 'setSelfInfo', [profile])
  } catch (err) {
    // 某些版本没有 setSelfInfo，这里允许忽略。
  }
}

async function callPeer(pkg, runtime) {
  const payloads = [
    [{
      userIDList: runtime.peerUserId ? [runtime.peerUserId] : [],
      type: 2,
      roomID: runtime.roomId
    }],
    [{
      userIDList: runtime.peerUserId ? [runtime.peerUserId] : [],
      callMediaType: 2,
      roomID: runtime.roomId
    }],
    [runtime.peerUserId ? [runtime.peerUserId] : [], 2, runtime.roomId]
  ]

  const targets = [pkg.server, pkg.callManager]
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    if (!target) {
      continue
    }

    for (let j = 0; j < payloads.length; j += 1) {
      try {
        await invokeMaybePromise(target, 'calls', payloads[j])
        return
      } catch (err) {
        // 继续尝试下一个兼容签名。
      }
    }
  }
}

async function enterConsultRoom(runtime) {
  const pkg = resolvePackage()

  if (!pkg.server) {
    // 未安装官方包时先走 mock，保证页面与接口链路可联调。
    return {
      provider: pkg.name,
      isMock: true
    }
  }

  await initSDK(pkg.server, runtime)
  await setSelfProfile(pkg.server, runtime)

  // 顾客先进入候诊页，只初始化监听能力；医生进入后再主动发起视频通话。
  if (runtime.role === 'doctor' && runtime.peerUserId) {
    await callPeer(pkg, runtime)
  }

  return {
    provider: pkg.name,
    isMock: false
  }
}

async function leaveConsultRoom() {
  const pkg = resolvePackage()
  const targets = [pkg.server, pkg.callManager]

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i]
    if (!target) {
      continue
    }

    try {
      await invokeMaybePromise(target, 'hangup', [])
      return
    } catch (err) {
      // 忽略不支持的 hangup，实现最小退出兜底。
    }
  }
}

module.exports = {
  enterConsultRoom,
  leaveConsultRoom
}
