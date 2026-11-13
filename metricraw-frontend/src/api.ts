import { clearTokens, getAccess, getRefresh, setTokens } from './auth'

// Backend address. Override with VITE_API_URL in a .env file if needed.
export const API_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://127.0.0.1:8000'

export type FieldErrors = Record<string, string[]>
export type Tokens = { access: string; refresh: string }
export type RegisterPayload = {
  username: string
  email: string
  first_name: string
  last_name: string
  password: string
  password2: string
}

export class ApiError extends Error {
  status: number
  fields: FieldErrors
  constructor(message: string, status: number, fields: FieldErrors = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS'

function send(method: Method, path: string, body: unknown, token: string | null) {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  return fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
}

// Django REST Framework errors look like { field: ["message"] } or { detail: "..." }
function toError(status: number, data: unknown, authed: boolean, path: string): ApiError {
  const fields: FieldErrors = {}
  let message = ''
  if (data && typeof data === 'object') {
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const list = Array.isArray(value) ? value.map(String) : [String(value)]
      if (key === 'detail' || key === 'non_field_errors') message = list.join(' ')
      else fields[key] = list
    }
  }
  if (status === 401) {
    message = authed
      ? 'Your session expired. Please log in again.'
      : 'Incorrect username or password.'
  }
  if (status === 404) {
    message = `Not found: ${API_URL}${path} does not exist on the server (HTTP 404). Check this URL against your Django urls.py.`
  } else if (!message) {
    if (Object.keys(fields).length) message = 'Please fix the highlighted fields.'
    else if (status >= 500) message = `The server hit an error (HTTP ${status}). Check the Django terminal for the details.`
    else message = `Request failed (HTTP ${status}).`
  }
  return new ApiError(message, status, fields)
}

// Exchange the refresh token for a new access token (SimpleJWT refresh endpoint).
async function refreshAccess(): Promise<boolean> {
  const refresh = getRefresh()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const d = (await res.json()) as { access?: string; refresh?: string }
    if (!d.access) return false
    setTokens(d.access, d.refresh ?? refresh)
    return true
  } catch {
    return false
  }
}

async function call<T>(method: Method, path: string, body?: unknown, authed = false): Promise<T> {
  const offline = new ApiError('Cannot reach the server. Is the backend running?', 0)
  let res: Response
  try {
    res = await send(method, path, body, authed ? getAccess() : null)
  } catch {
    throw offline
  }
  if (authed && res.status === 401 && (await refreshAccess())) {
    try {
      res = await send(method, path, body, getAccess())
    } catch {
      throw offline
    }
  }
  if (res.status === 204) return undefined as T
  const data: unknown = await res.json().catch(() => ({}))
  if (res.ok) return data as T
  if (authed && res.status === 401) clearTokens()
  throw toError(res.status, data, authed, path)
}

export const login = (username: string, password: string) =>
  call<Tokens>('POST', '/api/auth/login/', { username, password })

export const register = (payload: RegisterPayload) =>
  call<unknown>('POST', '/api/register/', payload)

// Authenticated helpers used by the dashboard.
export const api = {
  get: <T>(path: string) => call<T>('GET', path, undefined, true),
  post: <T>(path: string, body: unknown = {}) => call<T>('POST', path, body, true),
  patch: <T>(path: string, body: unknown) => call<T>('PATCH', path, body, true),
  options: <T>(path: string) => call<T>('OPTIONS', path, undefined, true),
  del: (path: string) => call<void>('DELETE', path, undefined, true),
}