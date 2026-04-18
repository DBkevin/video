# API 清单

## 基础说明

- Base URL：`/api/v1`
- 认证方式：`Authorization: Bearer {token}`
- 通用返回结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 角色说明

- `admin`：Web 管理后台管理员
- `employee`：已绑定员工的小程序身份
- `employee_pending`：已扫码登录但绑定申请待审核
- `employee_guest`：已扫码登录但尚未绑定员工
- `doctor`：医生
- `user`：顾客

## 一、管理员后台接口

### 1. 管理员登录

- `POST /admin/auth/login`

请求：

```json
{
  "username": "admin",
  "password": "admin123456"
}
```

返回：

- `access_token`
- `expires_at`
- `role=admin`
- `admin`

### 2. 员工管理

- `GET /admin/employees?page=1&page_size=20&keyword=&status=`
- `POST /admin/employees`
- `PUT /admin/employees/:id`

新增/编辑请求：

```json
{
  "real_name": "张三",
  "mobile": "13800000001",
  "employee_code": "EMP001",
  "status": "active",
  "remark": "负责皮肤科顾客联络"
}
```

员工列表返回中包含：

- `wechat_account_count`

### 3. 员工绑定申请审核

- `GET /admin/employee-bind-requests?page=1&page_size=20&status=pending`
- `POST /admin/employee-bind-requests/:id/approve`
- `POST /admin/employee-bind-requests/:id/reject`

审核通过请求：

方式 A：绑定到已有员工

```json
{
  "employee_id": 12
}
```

方式 B：审核时创建新员工并绑定

```json
{
  "real_name": "李四",
  "mobile": "13900000001",
  "employee_code": "EMP002",
  "remark": "审核时创建的新员工"
}
```

驳回请求：

```json
{
  "reason": "信息填写不完整，请补充真实姓名"
}
```

### 4. 医生管理

- `GET /admin/doctors?page=1&page_size=20&keyword=&status=`
- `POST /admin/doctors`
- `PUT /admin/doctors/:id`

新增医生请求：

```json
{
  "name": "王医生",
  "mobile": "13700000001",
  "title": "主治医师",
  "department": "皮肤科",
  "introduction": "擅长皮肤常见病视频面诊",
  "employee_no": "DOC1001",
  "password": "123456",
  "status": "enabled"
}
```

### 5. 医生-员工关系配置

- `GET /admin/doctor-employee-relations?doctor_id=&employee_id=&status=`
- `POST /admin/doctor-employee-relations`
- `DELETE /admin/doctor-employee-relations/:id`

创建关系请求：

```json
{
  "doctor_id": 1,
  "employee_id": 2,
  "status": "active"
}
```

### 6. 会话管理

- `GET /admin/consult-sessions?page=1&page_size=20&status=&source_type=&doctor_id=&employee_id=`
- `GET /admin/consult-sessions/:id`

会话详情返回重点字段：

- `session`
- `doctor`
- `customer`
- `operator_employee`
- `recording_task`
- `logs`

## 二、员工端接口

### 1. 员工微信登录

- `POST /employee/auth/wx-login`

请求：

```json
{
  "code": "wx.login 返回的 code",
  "nickname": "员工昵称",
  "avatar_url": "https://example.com/avatar.png"
}
```

返回字段：

- `access_token`
- `expires_at`
- `role`
- `binding_status`
- `employee`
- `bind_request`

`binding_status` 说明：

- `bound`：已绑定员工，可继续发起会话
- `pending`：已提交申请，待后台审核
- `unbound`：尚未提交绑定申请
- `rejected`：最近一次申请被驳回

### 2. 获取员工绑定状态

- `GET /employee/bind-status`

说明：

- 需要先调用 `/employee/auth/wx-login`
- 允许 `employee / employee_pending / employee_guest` 三种登录态访问

### 3. 提交绑定申请

- `POST /employee/bind-request`

请求：

```json
{
  "real_name": "张三",
  "mobile": "13800000001",
  "employee_code": "EMP001"
}
```

说明：

- 所有员工扫描的是同一个固定二维码入口
- 二维码不携带员工 ID
- 后端按当前微信身份 `openid / unionid` 记录申请

### 4. 获取员工可选医生列表

- `GET /employee/doctors`

返回：

- `items[].relation_id`
- `items[].id`
- `items[].name`
- `items[].title`
- `items[].department`

### 5. 员工发起会话

- `POST /employee/consult-sessions`

请求：

```json
{
  "doctor_id": 1,
  "expire_minutes": 120,
  "customer_name": "顾客张三",
  "customer_mobile": "13800000002",
  "customer_remark": "由员工提前沟通，想咨询皮肤过敏"
}
```

说明：

- 会自动创建 `consult_sessions`
- 会自动生成 `share_token` 与 `share_url_path`
- 会把 `operator_employee_id` 写入会话
- 会把 `source_type` 写成 `employee_initiated`

返回字段：

- `session`
- `share_token`
- `share_url_path`

### 6. 员工历史会话列表

- `GET /employee/consult-sessions?page=1&page_size=20&status=&source_type=&doctor_id=`

### 7. 员工会话详情

- `GET /employee/consult-sessions/:id`

返回字段：

- `session`
- `doctor`
- `customer`
- `operator_employee`
- `recording_task`
- `logs`

## 三、顾客端接口

### 1. 顾客微信登录

- `POST /auth/wx-login`

请求：

```json
{
  "code": "wx.login 返回的 code",
  "nickname": "顾客昵称",
  "avatar_url": "https://example.com/avatar.png"
}
```

说明：

- 若 `openid` 对应顾客不存在，后端会自动创建基础用户
- 若已存在，则自动登录返回业务 token

### 2. 获取顾客入口信息

- `GET /consult-entry?token=xxx`

返回：

- `session_id`
- `session_no`
- `status`
- `expired_at`
- `can_join`
- `doctor`

### 3. 顾客加入会话

- `POST /consult-sessions/:id/join`

请求：

```json
{
  "share_token": "医生或员工分享出来的 token"
}
```

返回：

- `session`
- `rtc`
- `current_role=customer`
- `doctor`

### 4. 顾客离开会话

- `POST /consult-sessions/:id/leave`

说明：

- 候诊时离开会从 `joined` 回退到 `shared`
- 通话中离开会从 `in_consult` 回退到 `joined`

## 四、医生端接口

### 1. 医生账号密码登录

- `POST /auth/doctor/login`

请求：

```json
{
  "employee_no": "DOC1001",
  "password": "123456"
}
```

### 2. 医生自行创建会话

- `POST /consult-sessions`

请求：

```json
{
  "expire_minutes": 120
}
```

说明：

- 当前接口保留兼容老流程
- 创建后 `source_type=doctor_initiated`

### 3. 医生查看会话详情

- `GET /consult-sessions/:id`

返回新增字段：

- `operator_employee`
- `recording_task`

### 4. 医生生成分享入口

- `POST /consult-sessions/:id/share`

请求：

```json
{
  "expire_minutes": 120
}
```

### 5. 医生开始面诊

- `POST /consult-sessions/:id/start`

说明：

- 顾客必须已 join
- 成功后切到 `in_consult`
- 此时只切换面诊状态并返回 RTC 入房参数
- 真正进入有效通话后，再由客户端调用“确认通话建立”接口触发录制

返回：

- `session`
- `rtc`
- `current_role=doctor`
- `customer`

### 6. 医生确认通话建立

- `POST /consult-sessions/:id/connected`

说明：

- 仅医生可调用
- 用于客户端在 TUICallKit 真正进入有效通话状态后通知服务端
- 服务端收到确认后才启动 TRTC 云端录制
- 幂等处理，若录制任务已存在则直接复用

返回：

- `session`
- `recording_task`

### 7. 医生结束面诊

- `POST /consult-sessions/:id/finish`

请求：

```json
{
  "summary": "问诊摘要",
  "diagnosis": "初步判断",
  "advice": "医生建议",
  "duration_seconds": 600
}
```

说明：

- 会保存 `consult_records`
- 会自动停止录制
- 幂等返回，不会重复创建记录

### 8. 医生取消会话

- `POST /consult-sessions/:id/cancel`

## 五、RTC 与录制接口

### 1. 获取通用 UserSig

- `POST /rtc/usersig`

说明：

- 仍可用于登录态用户单独获取签名
- 但当前会话主链路更推荐直接使用 join/start 返回的 `rtc`

### 2. TRTC 录制回调

- `POST /trtc/recording/callback`

说明：

- 不需要业务登录态
- 回调会始终返回 HTTP 200
- 会校验请求头 `Sign`

签名规则：

```text
Sign = Base64(HMAC-SHA256(rawBody, TRTC_RECORDING_CALLBACK_KEY))
```

校验失败时：

- HTTP 仍返回 200
- `data.handled=false`
- 不更新 `recording_tasks`
- 服务端记录拒绝日志

## 六、固定二维码绑定建议入口

固定二维码统一建议指向：

```text
/pages/employee-bind/index?scene=bind_employee
```

说明：

- 所有员工扫描同一个二维码
- 不在二维码里写死员工 ID
- 后端通过当前微信身份识别是谁提交了申请

## 七、前端链路摘要

### 员工链路

1. 员工扫码固定二维码进入 `employee-bind`
2. 小程序执行 `wx.login`
3. 调用 `POST /employee/auth/wx-login`
4. 若未绑定则提交 `POST /employee/bind-request`
5. 后台审核通过后，员工进入 `employee-create-session`
6. 调用 `GET /employee/doctors`
7. 调用 `POST /employee/consult-sessions`
8. 员工在 `employee-session-detail` 转发顾客入口

### 顾客链路

1. 顾客打开分享卡片进入 `customer-entry`
2. 调用 `POST /auth/wx-login`
3. 调用 `GET /consult-entry?token=xxx`
4. 调用 `POST /consult-sessions/:id/join`
5. 进入候诊/通话页

### 医生链路

1. 医生登录
2. 查看 `doctor-session-detail`
3. 顾客加入后调用 `POST /consult-sessions/:id/start`
4. TUICallKit 进入有效通话状态后调用 `POST /consult-sessions/:id/connected`
5. 进入通话页
6. 结束后调用 `POST /consult-sessions/:id/finish`
