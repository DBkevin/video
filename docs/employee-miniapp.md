# 员工端小程序说明

## 页面清单

- `pages/employee-bind/index`
- `pages/employee-create-session/index`
- `pages/employee-session-list/index`
- `pages/employee-session-detail/index`

## 固定二维码

建议固定二维码统一指向：

```text
/pages/employee-bind/index?scene=bind_employee
```

说明：

- 所有员工扫描的是同一个二维码
- 不在二维码里携带员工 ID
- 后端通过微信身份识别是谁提交申请

## 页面流程

### 1. 员工绑定页 `employee-bind`

进入后会自动：

1. 调用 `wx.login`
2. 调用 `POST /api/v1/employee/auth/wx-login`
3. 根据返回结果展示：
   - 已绑定
   - 审核中
   - 未绑定 / 已驳回

如果未绑定，可提交：

- 真实姓名
- 手机号
- 员工编号

提交接口：

- `POST /api/v1/employee/bind-request`

### 2. 员工发起会话页 `employee-create-session`

仅已绑定员工可进入。

页面会：

1. 拉取 `GET /api/v1/employee/doctors`
2. 展示当前员工可选医生
3. 填写顾客姓名 / 手机号 / 备注
4. 调用 `POST /api/v1/employee/consult-sessions`

创建成功后跳转：

- `employee-session-detail`

### 3. 员工历史会话页 `employee-session-list`

支持：

- 查看自己发起的会话
- 按状态筛选
- 跳转详情

接口：

- `GET /api/v1/employee/consult-sessions`

### 4. 员工会话详情页 `employee-session-detail`

支持：

- 查看会话状态
- 查看医生与顾客信息
- 转发顾客入口
- 复制顾客入口路径
- 查看录制状态
- 复制回放链接

接口：

- `GET /api/v1/employee/consult-sessions/:id`

## 与现有会话主链路的关系

员工发起会话时：

- 会复用现有 `consult_sessions`
- 不会新建另一套主业务模型
- 会在当前会话上写入：
  - `operator_employee_id`
  - `source_type=employee_initiated`

后续链路仍然保持：

1. 员工转发顾客入口
2. 顾客进入 `customer-entry`
3. 顾客 `join`
4. 医生 `start`
5. 双方进入通话
6. 自动录制
7. 医生 `finish`

## 调试建议

当前员工页已接入页面内调试日志面板，可直接在体验版/真机页面底部查看：

- 员工微信登录日志
- 绑定状态查询日志
- 医生列表加载日志
- 会话创建日志
- 会话详情刷新日志

如真机不方便看开发者工具 console，优先复制页面内日志给后端排查。
