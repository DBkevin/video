# API 清单

## 基础信息

- Base URL: `/api/v1`
- 认证方式：`Authorization: Bearer {token}`
- 返回结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 登录

### 用户登录

- `POST /auth/user/login`

```json
{
  "mobile": "13800000001",
  "password": "123456"
}
```

### 医生登录

- `POST /auth/doctor/login`

```json
{
  "employee_no": "DOC1001",
  "password": "123456"
}
```

### 微信小程序顾客登录

- `POST /auth/wx-login`

请求示例：

```json
{
  "code": "wx.login 返回的 code",
  "nickname": "张三",
  "avatar_url": "https://example.com/avatar.png"
}
```

返回字段包含：

- `access_token`
- `expires_at`
- `role=user`
- `user`

说明：

- 顾客打开医生分享的小程序入口后，可直接走 `wx.login + /auth/wx-login`
- 如果 `openid` 对应顾客不存在，后端会自动创建基础用户
- 如果顾客已存在，后端会自动登录并返回业务 token
- 当前已预留微信 `code2session` 调用封装；未配置微信密钥时，会走本地 mock 占位流程，仅用于联调

## RTC

### 获取通用 UserSig

- `POST /rtc/usersig`

说明：

- 该接口仍可用于登录态用户单独获取签名。
- 在会话化流程里，顾客 `join` 和医生 `start` 已直接返回当前会话的 RTC 入房信息。

## 面诊会话

### 1. 医生创建会话

- `POST /consult-sessions`

请求示例：

```json
{
  "expire_minutes": 120
}
```

### 2. 医生查看会话

- `GET /consult-sessions/:id`

用途：

- 医生创建成功页轮询会话状态
- 判断顾客是否已加入
- 判断是否可以开始面诊

返回字段新增：

- `record_status`
- `record_video_url`
- `record_file_id`

### 3. 医生生成分享入口

- `POST /consult-sessions/:id/share`

请求示例：

```json
{
  "expire_minutes": 120
}
```

返回字段包含：

- `share_token`
- `share_url_path`
- `session`

说明：

- 分享参数中不会直接包含 `userSig`
- 重复分享会生成新的 `share_token`，旧 token 自动失效
- 如果分享链接过期，顾客打开入口会收到明确提示“分享入口已过期，请联系医生重新分享”

### 4. 顾客通过 token 获取入口信息

- `GET /consult-entry?token=xxx`

返回字段包含：

- `session_id`
- `session_no`
- `status`
- `expired_at`
- `can_join`
- `doctor`

说明：

- 该接口不返回 `userSig`
- token 无效、过期、会话结束时会返回明确业务提示

### 5. 顾客加入会话

- `POST /consult-sessions/:id/join`

请求示例：

```json
{
  "share_token": "医生分享出来的 token"
}
```

返回字段包含：

- `session`
- `rtc.room_id`
- `rtc.rtc_user_id`
- `rtc.user_sig`
- `rtc.sdk_app_id`
- `rtc.user_sig_expire_at`
- `current_role=customer`
- `doctor`

说明：

- 顾客首次加入时会绑定 `customer_id`
- 如果同一顾客重复进入，后端会直接返回当前会话和新的临时 RTC 凭证
- 小程序可在 join 成功后初始化 TUICallKit，并进入候诊/通话页

### 6. 医生开始面诊

- `POST /consult-sessions/:id/start`

返回字段包含：

- `session`
- `rtc.room_id`
- `rtc.rtc_user_id`
- `rtc.user_sig`
- `rtc.sdk_app_id`
- `current_role=doctor`
- `customer`

说明：

- 只有顾客已加入的 `joined` 状态，才能进入 `start`
- `start` 后状态切为 `in_consult`
- 小程序医生端可在 start 成功后初始化 TUICallKit，并向顾客发起视频通话
- 接口成功后会自动调用 TRTC 云端手动录制，默认采用合流录制并写入 VOD

### 7. 医生取消会话

- `POST /consult-sessions/:id/cancel`

说明：

- 仅医生可调用
- 会把当前会话状态置为 `cancelled`
- 已取消会话再次调用会幂等返回当前结果

### 8. 顾客离开会话

- `POST /consult-sessions/:id/leave`

说明：

- 仅顾客可调用
- 顾客离开候诊页时，会把状态从 `joined` 回退到 `shared`
- 顾客在通话中离开页面时，会把状态从 `in_consult` 回退到 `joined`
- 该接口用于处理小程序页面关闭、异常返回、用户主动离开等情况

### 9. 医生结束面诊

- `POST /consult-sessions/:id/finish`

请求示例：

```json
{
  "summary": "问诊摘要",
  "diagnosis": "初步判断",
  "advice": "医生建议",
  "duration_seconds": 600
}
```

说明：

- 会写入 `consult_records`
- 已结束会话再次调用会幂等返回当前结果，不会重复创建记录
- 接口成功后会自动发送 TRTC 录制停止请求，录制文件通过回调异步回写

## TRTC 录制回调

### 10. 接收云端录制回调

- `POST /trtc/recording/callback`

说明：

- 该接口供腾讯云 TRTC 录制回调调用，不需要业务登录态
- 收到上传完成事件后，后端会把 `file_id / video_url / file_name` 写入 `recording_tasks`
- `raw_callback` 会原样保存在数据库，便于后续排查回调与录制问题

## 小程序最小接入链路

### 顾客链路

1. 顾客打开分享路径 `/pages/customer-entry/index?token=xxx`
2. 页面执行 `wx.login`
3. 调用 `POST /auth/wx-login`
4. 调用 `GET /consult-entry?token=xxx`
5. 调用 `POST /consult-sessions/:id/join`
6. 跳转到 `/pages/consult-room/index`

### 医生链路

1. 医生打开 `/pages/doctor-login/index`
2. 调用 `POST /auth/doctor/login`
3. 登录成功后把 `doctor_access_token` 写入 storage，并跳转 `/pages/doctor-create-session/index`
4. 创建会话时调用 `POST /consult-sessions`
5. 创建成功后跳转 `/pages/doctor-session-detail/index?id={sessionId}`
6. 页面轮询 `GET /consult-sessions/:id` 查看顾客是否已加入
7. 点击“生成分享入口”调用 `POST /consult-sessions/:id/share`
8. 顾客加入后点击“进入视频面诊”调用 `POST /consult-sessions/:id/start`
9. 跳转到 `/pages/consult-room/index`

更完整的小程序页面说明见 [docs/miniprogram.md](miniprogram.md)。
