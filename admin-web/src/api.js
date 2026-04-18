const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

function buildHeaders(token) {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers: buildHeaders(options.token),
    body: options.body ? JSON.stringify(options.body) : undefined
  })

  let payload = null
  try {
    payload = await response.json()
  } catch (error) {
    throw new Error(`接口响应解析失败：${error.message}`)
  }

  if (!response.ok || payload.code >= 400) {
    throw new Error(payload.message || `请求失败：HTTP ${response.status}`)
  }

  return payload.data
}

export const api = {
  login(body) {
    return request('/admin/auth/login', { method: 'POST', body })
  },
  getEmployees(token, params = {}) {
    return request(`/admin/employees?${new URLSearchParams(params).toString()}`, { token })
  },
  createEmployee(token, body) {
    return request('/admin/employees', { method: 'POST', token, body })
  },
  updateEmployee(token, id, body) {
    return request(`/admin/employees/${id}`, { method: 'PUT', token, body })
  },
  getBindRequests(token, params = {}) {
    return request(`/admin/employee-bind-requests?${new URLSearchParams(params).toString()}`, { token })
  },
  approveBindRequest(token, id, body) {
    return request(`/admin/employee-bind-requests/${id}/approve`, { method: 'POST', token, body })
  },
  rejectBindRequest(token, id, body) {
    return request(`/admin/employee-bind-requests/${id}/reject`, { method: 'POST', token, body })
  },
  getDoctors(token, params = {}) {
    return request(`/admin/doctors?${new URLSearchParams(params).toString()}`, { token })
  },
  createDoctor(token, body) {
    return request('/admin/doctors', { method: 'POST', token, body })
  },
  updateDoctor(token, id, body) {
    return request(`/admin/doctors/${id}`, { method: 'PUT', token, body })
  },
  getRelations(token, params = {}) {
    return request(`/admin/doctor-employee-relations?${new URLSearchParams(params).toString()}`, { token })
  },
  createRelation(token, body) {
    return request('/admin/doctor-employee-relations', { method: 'POST', token, body })
  },
  deleteRelation(token, id) {
    return request(`/admin/doctor-employee-relations/${id}`, { method: 'DELETE', token })
  },
  getSessions(token, params = {}) {
    return request(`/admin/consult-sessions?${new URLSearchParams(params).toString()}`, { token })
  },
  getSessionDetail(token, id) {
    return request(`/admin/consult-sessions/${id}`, { token })
  }
}
