# TUICallKit 本地集成说明

该目录默认只保留一个占位的 `globalCall` 页面，方便仓库直接打开。

真机联调前请在 `miniprogram/` 目录执行：

1. `npm install`
2. `npm run sync:tuicallkit`
3. 在微信开发者工具执行“工具 -> 构建 npm”
4. 若脚本提示需要，再执行一次 `npm run sync:tuicallkit`

执行完成后，官方 `@trtc/calls-uikit-wx` 包内容会覆盖当前占位目录，`utils/tuicallkit.js` 会直接调用官方 TUICallKit 能力。
