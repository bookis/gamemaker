export const API_URL = import.meta.env.VITE_API_URL
export const AUTH_URL = 'https://bookis.apps.popdb.ai/api/auth/apps/19d77f16-f954-4fc1-b6eb-c1fd0d242595'
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || 'production'

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null
  try {
    const res = await fetch(`${AUTH_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json()
    localStorage.setItem('accessToken', data.accessToken)
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken)
    return data.accessToken
  } catch {
    return null
  }
}

export async function apiFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  let token = localStorage.getItem('accessToken')
  const buildHeaders = (t: string | null) => {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-popdb-environment': ENVIRONMENT,
      ...options.headers as Record<string, string>,
    }
    if (t) h['Authorization'] = `Bearer ${t}`
    return h
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers: buildHeaders(token) })

  if (res.status === 401) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      const retry = await fetch(`${API_URL}${path}`, { ...options, headers: buildHeaders(newToken) })
      if (!retry.ok) {
        const text = await retry.text()
        throw new Error(text)
      }
      if (retry.status === 204) return null as T
      return retry.json()
    }
    // Refresh failed - clear auth and redirect to login
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    window.location.reload()
    throw new Error('Session expired')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text)
  }
  if (res.status === 204) return null as T
  return res.json()
}

export type User = {
  id: string
  email: string
  name?: string
}

export async function login(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const res = await fetch(`${AUTH_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function register(email: string, password: string, displayName?: string): Promise<{ user: User; accessToken: string; refreshToken: string }> {
  const res = await fetch(`${AUTH_URL}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  localStorage.setItem('accessToken', data.accessToken)
  localStorage.setItem('refreshToken', data.refreshToken)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export function logout() {
  const refreshToken = localStorage.getItem('refreshToken')
  if (refreshToken) {
    fetch(`${AUTH_URL}/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    }).catch(() => {})
  }
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem('user')
  if (!raw) return null
  return JSON.parse(raw)
}
