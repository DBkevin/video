# 微信企业小程序 1v1 视频面诊 MVP 后端

当前版本已将视频面诊业务从“预约单驱动”重构为“会话驱动”：

- 医生创建一次面诊会话
- 医生生成分享入口给顾客
- 顾客通过 `share_token` 打开入口并加入会话
- 医生开始面诊，双方进入同一个 TRTC 房间
- 医生结束面诊，并保存面诊记录
- 面诊开始后自动启动 TRTC 云端录制，录制文件上传到 VOD

## 快速开始

1. 复制配置文件：

```bash
cp .env.example .env
```

2. 创建数据库：

```sql
CREATE DATABASE video_consult_mvp DEFAULT CHARACTER SET utf8mb4;
```

3. 启动 MySQL、Redis，并配置 `.env`。

4. 安装依赖并启动：

```bash
go mod tidy
go run ./cmd/server
```

## 登录说明

当前登录接口默认读取数据库中的账号数据：

- 用户：`mobile + password`
- 医生：`employee_no + password`
- 顾客小程序入口：`wx.login + /api/v1/auth/wx-login`

数据库中的密码请保存为 `bcrypt` 哈希值。

## 微信小程序顾客登录

顾客通过医生分享的小程序入口进入时，不需要手动输入手机号和密码：

1. 小程序执行 `wx.login` 获取 `code`
2. 前端把 `code / nickname / avatar_url` 提交到 `POST /api/v1/auth/wx-login`
3. 后端通过 `code2session` 获取 `openid`
4. 如果顾客不存在，则自动创建基础用户
5. 如果顾客已存在，则直接签发业务 token

当前实现说明：

- 已预留微信 `code2session` 官方调用封装
- 未配置 `WECHAT_MINIAPP_APP_ID / WECHAT_MINIAPP_APP_SECRET` 时，后端会退回到 mock 登录占位逻辑，方便本地联调
- mock 逻辑仅用于开发联调，正式环境必须配置真实微信小程序密钥

## TRTC 说明

- `TRTC_SECRET_KEY` 只能保存在服务端。
- 小程序只调用 `/api/v1/rtc/usersig` 获取签名。
- 在会话化流程中：
  - 顾客 `join` 时，后端会临时生成当前会话专属的 `rtc_user_id / userSig / room_id`
  - 医生 `start` 时，后端会临时生成当前会话专属的 `rtc_user_id / userSig / room_id`
- 小程序侧已新增 `miniprogram/utils/tuicallkit.js` 适配层，优先兼容最新版 `@trtc/calls-uikit-wx`，同时兼容旧版包名

## TRTC 云端录制

第五阶段已新增“视频默认保存”能力，当前实现采用：

- TRTC RESTful API 手动录制
- 默认优先合流录制
- 存储到 VOD
- 通过回调落库 `file_id / video_url / file_name`
- 录制任务与 `consult_sessions` 一对多关联，保存在 `recording_tasks`

当前录制链路：

1. 医生调用 `POST /api/v1/consult-sessions/:id/start`
2. 后端把会话切到 `in_consult`
3. 后端自动通过 RESTful API 调用 TRTC `CreateCloudRecording`
4. 医生调用 `POST /api/v1/consult-sessions/:id/finish`
5. 后端自动通过 RESTful API 调用 TRTC `DeleteCloudRecording`
6. 腾讯云回调 `POST /api/v1/trtc/recording/callback`
7. 后端更新 `recording_tasks.file_id / video_url / raw_callback`

录制说明：

- 如果录制启动失败，不会打断已开始的会话，但返回消息会明确提示“录制启动失败”
- 如果录制停止失败，不会回滚已结束的会话；医生可继续通过会话详情查看 `record_status`
- 医生查看 `GET /api/v1/consult-sessions/:id` 时，可直接拿到 `recording_task`：
  - `status`
  - `task_id`
  - `file_id`
  - `video_url`
  - `started_at`
  - `ended_at`
- 医生小程序 `pages/doctor-session-detail/index` 已补充录制状态卡片：
  - `recording`：显示“录制中”
  - `stopping`：显示“处理中”
  - `finished`：如果 `video_url` 已回传，可直接“查看回放 / 复制回放链接”
  - `failed`：显示录制失败提示，便于医生及时处理
- 录制回调接口会始终返回 HTTP 200，避免腾讯云因为非 200 响应重复回调

## 录制配置项

`.env.example` 已补充以下关键配置：

- `TRTC_RECORDING_ENABLED`
- `TRTC_RECORDING_SECRET_ID`
- `TRTC_RECORDING_SECRET_KEY`
- `TRTC_RECORDING_CALLBACK_KEY`
- `TRTC_RECORDING_REGION`
- `TRTC_RECORDING_RESOURCE_EXPIRED_HOUR`
- `TRTC_RECORDING_MAX_IDLE_TIME`
- `TRTC_RECORDING_MIX_WIDTH`
- `TRTC_RECORDING_MIX_HEIGHT`
- `TRTC_RECORDING_MIX_FPS`
- `TRTC_RECORDING_MIX_BITRATE`
- `TRTC_RECORDING_MIX_LAYOUT_MODE`
- `TRTC_RECORDING_VOD_SUB_APP_ID`
- `TRTC_RECORDING_VOD_EXPIRE_TIME`
- `TRTC_RECORDING_CALLBACK_URL`

注意：

- `TRTC_RECORDING_SECRET_ID / TRTC_RECORDING_SECRET_KEY` 是腾讯云 API 密钥，不是 `TRTC_SECRET_KEY`
- `TRTC_SECRET_KEY` 只用于生成 TRTC `userSig`
- `TRTC_RECORDING_CALLBACK_KEY` 需要与腾讯云 TRTC 录制回调配置中的“自定义 key”保持一致
- 服务端会按腾讯云规则校验回调头 `Sign`：
  - `Sign = Base64(HMAC-SHA256(rawBody, TRTC_RECORDING_CALLBACK_KEY))`
- 如果签名缺失、签名不匹配，或服务端未配置 `TRTC_RECORDING_CALLBACK_KEY`：
  - 回调接口仍返回 HTTP 200
  - 返回体中会标记 `handled=false`
  - 服务端日志会记录一条拒绝原因，方便上线排查
- `TRTC_RECORDING_CALLBACK_URL` 需要在腾讯云 TRTC 录制回调配置中指向你的服务地址，例如 `https://api.example.com/api/v1/trtc/recording/callback`
- 第六阶段的录制请求已切换成 RESTful 直连，因此服务端会自行完成 TC3-HMAC-SHA256 签名

## 面诊会话流程

1. 医生调用 `POST /api/v1/consult-sessions` 创建会话
2. 医生调用 `POST /api/v1/consult-sessions/:id/share` 生成分享入口
3. 顾客打开 `GET /api/v1/consult-entry?token=xxx` 获取入口信息
4. 顾客登录后调用 `POST /api/v1/consult-sessions/:id/join` 进入候诊
5. 医生调用 `POST /api/v1/consult-sessions/:id/start` 开始面诊
6. 医生调用 `POST /api/v1/consult-sessions/:id/finish` 结束面诊

## 小程序页面约定

本轮已补充最小可运行的小程序目录 `miniprogram/`，页面流转为：

- `pages/customer-entry/index`：顾客进入页
- `pages/doctor-session-detail/index`：医生创建成功页/会话详情页
- `pages/recording-playback/index`：医生回放页
- `pages/consult-room/index`：通话页
- `pages/consult-finish/index`：结束页

默认分享路径配置为：

- `CONSULT_ENTRY_PAGE_PATH=/pages/customer-entry/index`

生成分享链接时，后端会拼出类似：

- `/pages/customer-entry/index?token=xxx`

顾客进入页默认自动执行以下流程：

1. 读取 `token`
2. 调用 `wx.login`
3. 调用 `/api/v1/auth/wx-login`
4. 调用 `/api/v1/consult-entry?token=xxx`
5. 调用 `/api/v1/consult-sessions/:id/join`
6. 跳转到通话页

医生页面默认执行以下流程：

1. 查看会话详情
2. 如有需要生成新的分享入口
3. 轮询顾客加入状态
4. 顾客加入后调用 `/api/v1/consult-sessions/:id/start`
5. 进入通话页
6. 面诊结束后，可回到 `doctor-session-detail` 查看 `recording_task` 状态与回放入口

更完整的小程序页面说明见 [docs/miniprogram.md](docs/miniprogram.md)。

## 数据表

当前核心表：

- `users`
- `doctors`
- `consult_sessions`
- `consult_records`
- `recording_tasks`

完整设计见 [docs/schema.sql](docs/schema.sql)。

## 小程序联调说明

1. 先启动后端服务，并配置好 `TRTC_*` 和 `WECHAT_MINIAPP_*` 环境变量
2. 在微信开发者工具中打开 `miniprogram/`
3. 根据实际后端地址修改 `miniprogram/utils/config.js` 中的 `API_BASE_URL`
4. 医生端暂时继续沿用现有 `/api/v1/auth/doctor/login` 登录方式，可把拿到的 token 写入 `doctor_access_token` storage 后打开 `doctor-session-detail`
5. 顾客端直接通过分享路径进入 `customer-entry`
