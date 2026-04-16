# 小程序页面与调用流程说明

## 页面结构

最小可运行目录位于 `miniprogram/`：

- `pages/customer-entry/index`：顾客进入页
- `pages/doctor-session-detail/index`：医生创建成功页/会话详情页
- `pages/consult-room/index`：通话页
- `pages/consult-finish/index`：结束页
- `utils/auth.js`：微信登录与 token 存储
- `utils/consult.js`：面诊会话接口封装
- `utils/tuicallkit.js`：TUICallKit 适配层

## 顾客链路

1. 小程序通过分享路径打开 `customer-entry`
2. `onLoad` 读取 URL 中的 `token`
3. 页面调用 `wx.login`
4. 页面调用 `POST /api/v1/auth/wx-login`
5. 页面调用 `GET /api/v1/consult-entry?token=xxx`
6. 页面调用 `POST /api/v1/consult-sessions/:id/join`
7. join 成功后把会话与 RTC 参数写入本地 storage
8. 跳转到 `consult-room`

## 医生链路

1. 医生打开 `doctor-session-detail`
2. 页面调用 `GET /api/v1/consult-sessions/:id`
3. 医生点击“生成分享入口”时调用 `POST /api/v1/consult-sessions/:id/share`
4. 页面轮询会话状态，等待顾客加入
5. 顾客加入后，医生点击“进入视频面诊”
6. 页面调用 `POST /api/v1/consult-sessions/:id/start`
7. start 成功后把会话与 RTC 参数写入本地 storage
8. 跳转到 `consult-room`

## 通话页约定

- 顾客进入通话页后，优先初始化 TUICallKit，并保持候诊状态
- 医生进入通话页后，优先初始化 TUICallKit，并基于当前会话向顾客发起视频通话
- 如果本地尚未安装官方 TUICallKit 包，`utils/tuicallkit.js` 会进入 mock 模式，方便先走通页面和接口链路

## TUICallKit 包说明

当前适配层优先尝试以下官方包路径：

- `@trtc/calls-uikit-wx`
- `@tencentcloud/call-uikit-wx`
- `@tencentcloud/call-uikit-wechat`

如果你已经在微信开发者工具中构建过 npm，通常会出现在 `miniprogram_npm/` 目录下。

## 运行前准备

1. 修改 `miniprogram/utils/config.js` 中的后端地址
2. 在后端配置真实 `TRTC_*` 参数
3. 正式环境配置 `WECHAT_MINIAPP_APP_ID / WECHAT_MINIAPP_APP_SECRET`
4. 医生端先通过现有登录接口拿到 token，并写入 `doctor_access_token`
