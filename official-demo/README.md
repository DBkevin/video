# 官方 TUICallKit Demo

这个目录放了一份从腾讯云官方仓库同步下来的小程序 Demo，位置是：

- `official-demo/wechat-callkit-demo`

我已经额外补好了两样官方运行时常用资源：

- `official-demo/wechat-callkit-demo/TUICallKit`
- `official-demo/wechat-callkit-demo/static/RTCCallEngine.wasm.br`
- `official-demo/wechat-callkit-demo/static/RTCCallEngine.wasm`

## 你接下来怎么试

1. 进入目录：

```powershell
cd D:\project\video\official-demo\wechat-callkit-demo
```

2. 安装依赖：

```powershell
npm install
```

3. 用微信开发者工具打开这个目录，并执行：

- `工具 -> 构建 npm`
- `清缓存 -> 清除编译缓存`

4. 按官方 Demo 的说明，修改：

- `official-demo/wechat-callkit-demo/TUICallKit/debug/GenerateTestUserSig-es.js`

填入你自己的：

- `SDKAppID`
- `SecretKey`

5. 用真机测试，不要只在开发者工具里跑。

## 说明

- 这个目录是为了快速对照官方 Demo 行为，和我们现有业务小程序隔离开。
- 你可以先验证官方 Demo 是否能正常起视频，再回来继续收我们业务链路。
