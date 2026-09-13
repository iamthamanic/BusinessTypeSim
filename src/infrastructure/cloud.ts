/** Cloud API client for the self-hosted Hostinger stack. */
const TOKEN_KEY = 'bt_cloud_token'
const EMAIL_KEY = 'bt_cloud_email'

function apiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return '/api'
}

/** Cloud is available when an API base URL is configured at build time. */
export const cloudConfigured = Boolean((import.meta.env.VITE_API_URL as string | undefined)?.trim())

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

function setSession(token: string, email: string): void {
  localStorage.setItem(TOKEN_KEY, token)
  localStorage.setItem(EMAIL_KEY, email)
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(EMAIL_KEY)
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  if (init.auth !== false) {
    const token = getToken()
    if (token) headers.set('Authorization', `Bearer ${token}`)
  }
  const response = await fetch(`${apiBase()}${path}`, { ...init, headers })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP_${response.status}`)
  }
  return payload
}

export async function getSession(): Promise<{ email: string } | null> {
  const token = getToken()
  const email = localStorage.getItem(EMAIL_KEY)
  if (!token || !email) return null
  try {
    await apiFetch<{ user: { email: string } }>('/auth/me')
    return { email }
  } catch {
    clearSession()
    return null
  }
}

export async function register(email: string, password: string): Promise<{ error?: string }> {
  try {
    const data = await apiFetch<{ token: string; user: { email: string } }>('/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    })
    setSession(data.token, data.user.email)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'REGISTER_FAILED' }
  }
}

export async function login(email: string, password: string): Promise<{ error?: string }> {
  try {
    const data = await apiFetch<{ token: string; user: { email: string } }>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    })
    setSession(data.token, data.user.email)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'LOGIN_FAILED' }
  }
}

export async function signOut(): Promise<void> {
  clearSession()
}
