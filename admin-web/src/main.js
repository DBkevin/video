import './style.css'
import { api } from './api'

const state = {
  token: localStorage.getItem('admin_token') || '',
  admin: readJSON('admin_profile', null),
  currentView: 'employees',
  message: '',
  error: '',
  sessionDetail: null
}

const app = document.querySelector('#app')

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    return fallback
  }
}

function setMessage(message, error = false) {
  state.message = error ? '' : message
  state.error = error ? message : ''
}

function persistAuth(result) {
  state.token = result.access_token
  state.admin = result.admin
  localStorage.setItem('admin_token', result.access_token)
  localStorage.setItem('admin_profile', JSON.stringify(result.admin))
}

function clearAuth() {
  state.token = ''
  state.admin = null
  localStorage.removeItem('admin_token')
  localStorage.removeItem('admin_profile')
}

async function handleLogin(event) {
  event.preventDefault()
  const form = new FormData(event.target)
  try {
    const result = await api.login({
      username: form.get('username'),
      password: form.get('password')
    })
    persistAuth(result)
    setMessage('管理员登录成功')
    render()
  } catch (error) {
    setMessage(error.message, true)
    render()
  }
}

function logout() {
  clearAuth()
  setMessage('已退出登录')
  render()
}

function buildLoginView() {
  return `
    <div class="login-shell">
      <form class="login-card" id="login-form">
        <h2>视频面诊管理后台</h2>
        <p>用于管理员审核员工绑定、配置医生关系和查看会话录制回放。</p>
        ${renderMessage()}
        <div class="field">
          <label>用户名</label>
          <input name="username" value="admin" placeholder="请输入管理员用户名" />
        </div>
        <div class="field">
          <label>密码</label>
          <input name="password" type="password" value="admin123456" placeholder="请输入管理员密码" />
        </div>
        <button class="btn btn-primary" type="submit">登录后台</button>
      </form>
    </div>
  `
}

function renderMessage() {
  if (state.error) {
    return `<div class="message error">${escapeHTML(state.error)}</div>`
  }
  if (state.message) {
    return `<div class="message">${escapeHTML(state.message)}</div>`
  }
  return ''
}

function navButton(view, label) {
  return `<button data-view="${view}" class="${state.currentView === view ? 'active' : ''}">${label}</button>`
}

function buildShell(content) {
  return `
    <div class="app-shell">
      <aside class="sidebar">
        <h1>面诊后台</h1>
        <p>${escapeHTML(state.admin?.display_name || '管理员')} · ${escapeHTML(state.admin?.username || '')}</p>
        ${navButton('employees', '员工管理')}
        ${navButton('bind-requests', '绑定审核')}
        ${navButton('doctors', '医生管理')}
        ${navButton('relations', '医生-员工关系')}
        ${navButton('sessions', '会话与回放')}
        <button id="logout-btn">退出登录</button>
      </aside>
      <main class="main">
        ${renderMessage()}
        ${content}
      </main>
    </div>
  `
}

async function render() {
  if (!state.token) {
    app.innerHTML = buildLoginView()
    document.querySelector('#login-form')?.addEventListener('submit', handleLogin)
    return
  }

  const content = await renderView()
  app.innerHTML = buildShell(content)

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', async () => {
      state.currentView = button.dataset.view
      state.sessionDetail = null
      setMessage('')
      await render()
    })
  })
  document.querySelector('#logout-btn')?.addEventListener('click', logout)
  bindViewEvents()
}

async function renderView() {
  switch (state.currentView) {
    case 'bind-requests':
      return await renderBindRequests()
    case 'doctors':
      return await renderDoctors()
    case 'relations':
      return await renderRelations()
    case 'sessions':
      return await renderSessions()
    case 'employees':
    default:
      return await renderEmployees()
  }
}

async function renderEmployees() {
  const data = await safeCall(() => api.getEmployees(state.token, { page: 1, page_size: 100 }))
  const rows = (data?.items || []).map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHTML(item.real_name)}</td>
      <td>${escapeHTML(item.mobile || '-')}</td>
      <td>${escapeHTML(item.employee_code || '-')}</td>
      <td><span class="tag ${item.status === 'active' ? 'success' : 'warn'}">${escapeHTML(item.status)}</span></td>
      <td>${item.wechat_account_count}</td>
      <td>${escapeHTML(item.remark || '-')}</td>
      <td><button class="btn btn-secondary" data-action="edit-employee" data-id="${item.id}">编辑</button></td>
    </tr>
  `).join('')

  return `
    <div class="grid-two">
      <section class="panel">
        <h2>员工列表</h2>
        <table>
          <thead><tr><th>ID</th><th>姓名</th><th>手机号</th><th>员工编号</th><th>状态</th><th>绑定微信数</th><th>备注</th><th>操作</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8">暂无员工数据</td></tr>'}</tbody>
        </table>
      </section>
      <section class="panel">
        <h3>新增员工</h3>
        <form id="employee-form">
          <div class="field"><label>真实姓名</label><input name="real_name" required /></div>
          <div class="field"><label>手机号</label><input name="mobile" /></div>
          <div class="field"><label>员工编号</label><input name="employee_code" /></div>
          <div class="field"><label>状态</label><select name="status"><option value="active">active</option><option value="disabled">disabled</option></select></div>
          <div class="field"><label>备注</label><textarea name="remark"></textarea></div>
          <button class="btn btn-primary" type="submit">创建员工</button>
        </form>
      </section>
    </div>
  `
}

async function renderBindRequests() {
  const data = await safeCall(() => api.getBindRequests(state.token, { status: 'pending', page: 1, page_size: 100 }))
  const rows = (data?.items || []).map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHTML(item.real_name)}</td>
      <td>${escapeHTML(item.mobile || '-')}</td>
      <td>${escapeHTML(item.employee_code || '-')}</td>
      <td>${escapeHTML(item.nickname || '-')}</td>
      <td>${escapeHTML(item.openid || '-')}</td>
      <td>${escapeHTML(item.unionid || '-')}</td>
      <td><span class="tag">${escapeHTML(item.status)}</span></td>
      <td>
        <div class="actions">
          <button class="btn btn-primary" data-action="approve-bind" data-id="${item.id}">通过</button>
          <button class="btn btn-warn" data-action="reject-bind" data-id="${item.id}">驳回</button>
        </div>
      </td>
    </tr>
  `).join('')

  return `
    <section class="panel">
      <h2>员工绑定审核</h2>
      <p>审批时可直接绑定到已有员工，也可临时创建新员工档案。</p>
      <table>
        <thead><tr><th>ID</th><th>真实姓名</th><th>手机号</th><th>员工编号</th><th>微信昵称</th><th>OpenID</th><th>UnionID</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="9">暂无待审核申请</td></tr>'}</tbody>
      </table>
    </section>
  `
}

async function renderDoctors() {
  const data = await safeCall(() => api.getDoctors(state.token, { page: 1, page_size: 100 }))
  const rows = (data?.items || []).map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${escapeHTML(item.name)}</td>
      <td>${escapeHTML(item.employee_no)}</td>
      <td>${escapeHTML(item.mobile)}</td>
      <td>${escapeHTML(item.department || '-')}</td>
      <td>${escapeHTML(item.title || '-')}</td>
      <td><span class="tag ${item.status === 'enabled' ? 'success' : 'warn'}">${escapeHTML(item.status)}</span></td>
      <td><button class="btn btn-secondary" data-action="edit-doctor" data-id="${item.id}">编辑</button></td>
    </tr>
  `).join('')

  return `
    <div class="grid-two">
      <section class="panel">
        <h2>医生列表</h2>
        <table>
          <thead><tr><th>ID</th><th>姓名</th><th>工号</th><th>手机号</th><th>科室</th><th>职称</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8">暂无医生数据</td></tr>'}</tbody>
        </table>
      </section>
      <section class="panel">
        <h3>新增医生</h3>
        <form id="doctor-form">
          <div class="form-grid">
            <div class="field"><label>姓名</label><input name="name" required /></div>
            <div class="field"><label>工号</label><input name="employee_no" required /></div>
            <div class="field"><label>手机号</label><input name="mobile" required /></div>
            <div class="field"><label>登录密码</label><input name="password" type="password" required /></div>
            <div class="field"><label>科室</label><input name="department" /></div>
            <div class="field"><label>职称</label><input name="title" /></div>
            <div class="field"><label>状态</label><select name="status"><option value="enabled">enabled</option><option value="disabled">disabled</option></select></div>
          </div>
          <div class="field"><label>简介</label><textarea name="introduction"></textarea></div>
          <button class="btn btn-primary" type="submit">创建医生</button>
        </form>
      </section>
    </div>
  `
}

async function renderRelations() {
  const data = await safeCall(() => api.getRelations(state.token))
  const rows = (data?.items || []).map((item) => `
    <tr>
      <td>${item.id}</td>
      <td>${item.doctor_id} · ${escapeHTML(item.doctor?.name || '-')}</td>
      <td>${item.employee_id} · ${escapeHTML(item.employee?.real_name || '-')}</td>
      <td><span class="tag ${item.status === 'active' ? 'success' : 'warn'}">${escapeHTML(item.status)}</span></td>
      <td><button class="btn btn-warn" data-action="delete-relation" data-id="${item.id}">删除</button></td>
    </tr>
  `).join('')

  return `
    <div class="grid-two">
      <section class="panel">
        <h2>医生-员工关系</h2>
        <table>
          <thead><tr><th>ID</th><th>医生</th><th>员工</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="5">暂无关系数据</td></tr>'}</tbody>
        </table>
      </section>
      <section class="panel">
        <h3>新增关系</h3>
        <form id="relation-form">
          <div class="field"><label>医生ID</label><input name="doctor_id" required /></div>
          <div class="field"><label>员工ID</label><input name="employee_id" required /></div>
          <div class="field"><label>状态</label><select name="status"><option value="active">active</option><option value="disabled">disabled</option></select></div>
          <button class="btn btn-primary" type="submit">创建关系</button>
        </form>
      </section>
    </div>
  `
}

async function renderSessions() {
  const data = await safeCall(() => api.getSessions(state.token, { page: 1, page_size: 100 }))
  const rows = (data?.items || []).map((item) => `
    <tr>
      <td>${item.session.id}</td>
      <td>${escapeHTML(item.session.session_no)}</td>
      <td>${escapeHTML(item.doctor?.name || '-')}</td>
      <td>${escapeHTML(item.operator_employee?.real_name || '-')}</td>
      <td>${escapeHTML(item.session.customer_name || item.customer?.nickname || '-')}</td>
      <td><span class="tag">${escapeHTML(item.session.status)}</span></td>
      <td>${escapeHTML(item.recording_task?.status || '-')}</td>
      <td><button class="btn btn-secondary" data-action="view-session" data-id="${item.session.id}">详情</button></td>
    </tr>
  `).join('')

  const detail = state.sessionDetail
    ? `
      <section class="panel detail-card">
        <h3>会话详情 #${detail.session.id}</h3>
        <div>医生：${escapeHTML(detail.doctor?.name || '-')}</div>
        <div>发起员工：${escapeHTML(detail.operator_employee?.real_name || '-')}</div>
        <div>顾客：${escapeHTML(detail.session.customer_name || detail.customer?.nickname || '-')}</div>
        <div>状态：<span class="tag">${escapeHTML(detail.session.status)}</span></div>
        <div>录制状态：${escapeHTML(detail.recording_task?.status || '-')}</div>
        <div>回放链接：${detail.recording_task?.video_url ? `<a href="${detail.recording_task.video_url}" target="_blank">打开回放</a>` : '暂无'}</div>
        <div>
          <strong>会话日志</strong>
          <div class="payload">${escapeHTML(JSON.stringify(detail.logs || [], null, 2))}</div>
        </div>
      </section>
    `
    : ''

  return `
    <div class="grid-two">
      <section class="panel">
        <h2>会话管理</h2>
        <table>
          <thead><tr><th>ID</th><th>会话编号</th><th>医生</th><th>发起员工</th><th>顾客</th><th>状态</th><th>录制</th><th>操作</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="8">暂无会话数据</td></tr>'}</tbody>
        </table>
      </section>
      ${detail || '<section class="panel"><h3>会话详情</h3><p>点击左侧会话的“详情”查看录制回放和操作日志。</p></section>'}
    </div>
  `
}

function bindViewEvents() {
  document.querySelector('#employee-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    await doAction(() => api.createEmployee(state.token, Object.fromEntries(form.entries())), '员工创建成功')
  })

  document.querySelector('#doctor-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    await doAction(() => api.createDoctor(state.token, Object.fromEntries(form.entries())), '医生创建成功')
  })

  document.querySelector('#relation-form')?.addEventListener('submit', async (event) => {
    event.preventDefault()
    const form = new FormData(event.target)
    await doAction(() => api.createRelation(state.token, {
      doctor_id: Number(form.get('doctor_id')),
      employee_id: Number(form.get('employee_id')),
      status: form.get('status')
    }), '医生员工关系创建成功')
  })

  document.querySelectorAll('[data-action="edit-employee"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id)
      const realName = prompt('请输入员工真实姓名')
      if (!realName) return
      const mobile = prompt('请输入员工手机号，可留空') || ''
      const employeeCode = prompt('请输入员工编号，可留空') || ''
      const status = prompt('请输入状态：active / disabled', 'active') || 'active'
      const remark = prompt('请输入备注，可留空') || ''
      await doAction(() => api.updateEmployee(state.token, id, { real_name: realName, mobile, employee_code: employeeCode, status, remark }), '员工更新成功')
    })
  })

  document.querySelectorAll('[data-action="edit-doctor"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id)
      const name = prompt('请输入医生姓名')
      if (!name) return
      const employeeNo = prompt('请输入医生工号')
      if (!employeeNo) return
      const mobile = prompt('请输入医生手机号')
      if (!mobile) return
      const department = prompt('请输入医生科室，可留空') || ''
      const title = prompt('请输入医生职称，可留空') || ''
      const introduction = prompt('请输入医生简介，可留空') || ''
      const password = prompt('如需重置密码请输入新密码，可留空') || ''
      const status = prompt('请输入状态：enabled / disabled', 'enabled') || 'enabled'
      await doAction(() => api.updateDoctor(state.token, id, { name, employee_no: employeeNo, mobile, department, title, introduction, password, status }), '医生更新成功')
    })
  })

  document.querySelectorAll('[data-action="approve-bind"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id)
      const employeeIdRaw = prompt('如绑定到已有员工，请输入员工ID；如新建员工请留空', '')
      let body = {}
      if (employeeIdRaw) {
        body.employee_id = Number(employeeIdRaw)
      } else {
        const realName = prompt('请输入新员工真实姓名')
        if (!realName) return
        body.real_name = realName
        body.mobile = prompt('请输入手机号，可留空') || ''
        body.employee_code = prompt('请输入员工编号，可留空') || ''
        body.remark = prompt('请输入备注，可留空') || ''
      }
      await doAction(() => api.approveBindRequest(state.token, id, body), '绑定申请已审核通过')
    })
  })

  document.querySelectorAll('[data-action="reject-bind"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id)
      const reason = prompt('请输入驳回原因')
      if (!reason) return
      await doAction(() => api.rejectBindRequest(state.token, id, { reason }), '绑定申请已驳回')
    })
  })

  document.querySelectorAll('[data-action="delete-relation"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id)
      if (!confirm('确认删除这条医生-员工关系吗？')) return
      await doAction(() => api.deleteRelation(state.token, id), '医生员工关系已删除')
    })
  })

  document.querySelectorAll('[data-action="view-session"]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = Number(button.dataset.id)
      try {
        state.sessionDetail = await api.getSessionDetail(state.token, id)
        setMessage(`已加载会话 #${id} 详情`)
      } catch (error) {
        setMessage(error.message, true)
      }
      await render()
    })
  })
}

async function doAction(action, successMessage) {
  try {
    await action()
    setMessage(successMessage)
  } catch (error) {
    setMessage(error.message, true)
  }
  await render()
}

async function safeCall(action) {
  try {
    return await action()
  } catch (error) {
    setMessage(error.message, true)
    if (/登录/.test(error.message) || /401/.test(error.message)) {
      clearAuth()
    }
    return null
  }
}

function escapeHTML(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

render()
