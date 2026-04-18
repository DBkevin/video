# 视频面诊系统

当前仓库已在原有“会话驱动 + 顾客分享进入 + TRTC 通话 + 云端录制”基础上，增量补齐以下能力：

- Go 后端
- 小程序顾客端
- 小程序医生端
- 小程序员工端
- Web 管理后台 `admin-web`
- 员工固定二维码绑定与后台审核
- 医生-员工多对多关系配置
- 员工代医生发起视频面诊
- TRTC 云端录制与回放

## 当前主链路

### 医生直接发起

1. 医生登录
2. 创建 `consult_session`
3. 生成分享入口
4. 顾客进入并 `join`
5. 医生 `start`
6. 双方通话
7. 医生 `finish`
8. 自动停止录制并回写回放

### 员工代医生发起

1. 员工扫描固定二维码进入绑定页
2. 员工微信登录并提交绑定申请
3. 管理后台审核通过
4. 员工登录小程序并选择自己可服务的医生
5. 员工创建会话，系统自动生成顾客入口
6. 员工转发顾客入口给顾客
7. 顾客进入小程序并 `join`
8. 医生 `start`
9. 双方通话并自动录制
10. `finish` 后后台与员工端均可查看录制状态/回放链接

## 仓库结构

```text
.
├─ cmd/server                  # Go 服务入口
├─ config                      # 配置加载
├─ controller                  # Gin 控制器
├─ middleware                  # 鉴权/恢复中间件
├─ model                       # GORM 模型
├─ repository                  # 数据访问层
├─ service                     # 业务服务层
├─ router                      # 路由注册
├─ pkg                         # mysql/redis/jwt/wechat/usersig 等基础能力
├─ miniprogram                 # 微信小程序
├─ admin-web                   # Web 管理后台
└─ docs                        # API、表结构、后台与员工端说明
```

## 数据表

核心表：

- `users`
- `doctors`
- `admin_users`
- `employees`
- `employee_wechat_accounts`
- `employee_bind_requests`
- `doctor_employee_relations`
- `consult_sessions`
- `consult_records`
- `recording_tasks`
- `session_logs`

完整表结构见 [docs/schema.sql](docs/schema.sql)。

## 环境变量

复制配置：

```bash
cp .env.example .env
```

关键变量：

- `MYSQL_DSN`
- `MYSQL_AUTO_MIGRATE`
- `REDIS_ADDR`
- `JWT_SECRET`
- `ADMIN_AUTO_SEED`
- `ADMIN_DEFAULT_USERNAME`
- `ADMIN_DEFAULT_PASSWORD`
- `TRTC_SDK_APP_ID`
- `TRTC_SECRET_KEY`
- `TRTC_RECORDING_SECRET_ID`
- `TRTC_RECORDING_SECRET_KEY`
- `TRTC_RECORDING_CALLBACK_KEY`
- `WECHAT_MINIAPP_APP_ID`
- `WECHAT_MINIAPP_APP_SECRET`

说明：

- `TRTC_SECRET_KEY` 只允许保存在服务端
- `TRTC_RECORDING_SECRET_ID / TRTC_RECORDING_SECRET_KEY` 是腾讯云 API 密钥，不是 UserSig 密钥
- `TRTC_RECORDING_CALLBACK_KEY` 需要与腾讯云 TRTC 录制回调里的自定义 key 保持一致
- `ADMIN_AUTO_SEED=true` 时，服务启动会自动创建默认管理员账号

## 本地启动

### 1. 启动后端

```bash
go mod tidy
go run ./cmd/server
```

### 2. 启动管理后台

```bash
cd admin-web
npm install
npm run dev
```

默认开发地址：

- `http://127.0.0.1:5173`

Vite 已默认代理 `/api` 到：

- `http://127.0.0.1:8080`

如需改后端地址，可在启动前设置：

```bash
VITE_PROXY_TARGET=http://你的后端地址 npm run dev
```

### 3. 启动小程序

1. 微信开发者工具打开 `miniprogram/`
2. 执行“工具 -> 构建 npm”
3. 真机/体验版测试

## 默认管理员

当 `.env` 中保持默认值时，首次启动会自动种一个管理员：

- 用户名：`admin`
- 密码：`admin123456`

可通过环境变量修改：

- `ADMIN_DEFAULT_USERNAME`
- `ADMIN_DEFAULT_PASSWORD`
- `ADMIN_DEFAULT_NAME`

## 管理后台能力

管理后台当前已支持：

- 管理员登录
- 员工列表、新增、编辑
- 员工绑定申请审核
- 医生列表、新增、编辑
- 医生-员工关系配置
- 会话列表与详情查看
- 录制状态与回放链接查看

详细说明见 [docs/admin.md](docs/admin.md)。

## 员工端小程序能力

当前新增页面：

- `pages/employee-bind/index`
- `pages/employee-create-session/index`
- `pages/employee-session-list/index`
- `pages/employee-session-detail/index`

固定二维码建议入口：

```text
/pages/employee-bind/index?scene=bind_employee
```

说明：

- 所有员工都扫同一个固定二维码
- 二维码不写死员工 ID
- 后端按微信身份 `openid / unionid` 判断当前是谁
- 员工提交真实姓名后进入后台审核

详细说明见 [docs/employee-miniapp.md](docs/employee-miniapp.md)。

## 顾客端与医生端兼容

本次改造没有推翻现有 `consult_sessions` 主模型，只做了增量兼容：

- 原有顾客 `customer-entry -> join -> consult-room` 继续可用
- 原有医生 `doctor-login -> doctor-session-detail -> start/finish` 继续可用
- 新增字段：
  - `consult_sessions.operator_employee_id`
  - `consult_sessions.source_type`
  - `consult_sessions.customer_name`
  - `consult_sessions.customer_mobile`
  - `consult_sessions.customer_remark`

其中：

- 医生自己创建时 `source_type=doctor_initiated`
- 员工代发起时 `source_type=employee_initiated`

## TRTC 云端录制

当前实现：

- 使用 TRTC RESTful API 手动录制
- 默认 mixed recording
- 默认存储到 VOD
- `start` 时自动创建录制任务
- `finish` 时自动停止录制
- 回调成功后回写：
  - `recording_tasks.file_id`
  - `recording_tasks.video_url`
  - `recording_tasks.file_name`

回调签名校验规则：

```text
Sign = Base64(HMAC-SHA256(rawBody, TRTC_RECORDING_CALLBACK_KEY))
```

校验失败时：

- 仍返回 HTTP 200
- `handled=false`
- 不更新 `recording_tasks`
- 服务端记录日志

## 微信小程序与真机联调注意事项

### 合法域名

需要在微信公众平台配置：

- `request 合法域名 = https://hxtest.xmmylike.com`

如果是体验版/真机测试：

- 改完后台域名后，建议完全退出微信再重进
- 重新上传体验版

### npm 构建

当前项目已兼容 `@trtc/calls-uikit-wx` 和 `@trtc/call-engine-lite-wx` 的特殊打包问题。

建议每次升级小程序依赖后执行：

```bash
cd miniprogram
npm install
npm run fix:tuicallkit-package
npm run fix:call-engine-wasm
npm run sync:tuicallkit
```

然后在微信开发者工具中：

- 工具 -> 构建 npm
- 清缓存 -> 清除编译缓存

## 生产部署简要说明

### 后端

Windows 下可打包 Linux 产物：

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build_linux_amd64.ps1
```

### Nginx / HTTPS

线上默认模板已按以下域名准备：

- `https://hxtest.xmmylike.com`

### 录制回调地址

示例：

```text
https://hxtest.xmmylike.com/api/v1/trtc/recording/callback
```

## 文档

- API： [docs/api.md](docs/api.md)
- 管理后台： [docs/admin.md](docs/admin.md)
- 员工端小程序： [docs/employee-miniapp.md](docs/employee-miniapp.md)
- 顾客/医生端小程序： [docs/miniprogram.md](docs/miniprogram.md)
- 表结构： [docs/schema.sql](docs/schema.sql)
