/**
 * Cloud API client — cookie sessions on web; Preferences on native.
 * Location: src/infrastructure/cloud.ts
 */
import {
  clearStoredSession,
  isNativePlatform,
  loadStoredSession,
  persistNativeTokens,
  persistWebSessionEmail,
  setMemoryAccessToken,
} from './session-store'

function apiBase(): string {
  const configured = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (configured) return configured.replace(/\/$/, '')
  return '/api'
}

/** Cloud is available when an API base URL is configured at build time. */
export const cloudConfigured = Boolean((import.meta.env.VITE_API_URL as string | undefined)?.trim())

type AuthUser = { id: string; email: string; emailVerified?: boolean }

type SessionResponse = {
  user: AuthUser
  accessToken?: string
  refreshToken?: string
  error?: string
  message?: string
  ok?: boolean
}

async function applySessionResponse(data: SessionResponse): Promise<void> {
  if (isNativePlatform()) {
    if (!data.accessToken || !data.refreshToken) {
      throw new Error('NATIVE_TOKENS_MISSING')
    }
    await persistNativeTokens(data.accessToken, data.refreshToken, data.user.email)
    setMemoryAccessToken(data.accessToken)
  } else {
    // Web relies on Set-Cookie; optionally cache access for Authorization header.
    if (data.accessToken) setMemoryAccessToken(data.accessToken)
    await persistWebSessionEmail(data.user.email)
  }
}

function authClientHeaders(): HeadersInit {
  if (isNativePlatform()) return { 'X-Auth-Client': 'native' }
  return {}
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit & { auth?: boolean; _retried?: boolean } = {},
): Promise<T> {
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) headers.set('Content-Type', 'application/json')
  for (const [key, value] of Object.entries(authClientHeaders())) {
    if (!headers.has(key)) headers.set(key, value)
  }
  if (init.auth !== false) {
    const stored = await loadStoredSession()
    if (stored.accessToken) headers.set('Authorization', `Bearer ${stored.accessToken}`)
  }
  const response = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers,
    credentials: 'include',
  })
  if (
    response.status === 401
    && init.auth !== false
    && !init._retried
    && path !== '/auth/refresh'
    && path !== '/auth/login'
  ) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      return apiFetch<T>(path, { ...init, auth: true, _retried: true })
    }
  }
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) {
    throw new Error(payload.error ?? `HTTP_${response.status}`)
  }
  return payload
}

async function tryRefresh(): Promise<boolean> {
  try {
    const headers = new Headers(authClientHeaders())
    if (isNativePlatform()) {
      const stored = await loadStoredSession()
      if (stored.refreshToken) headers.set('X-Refresh-Token', stored.refreshToken)
    }
    const response = await fetch(`${apiBase()}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers,
    })
    if (!response.ok) {
      await clearStoredSession()
      return false
    }
    const data = await response.json() as SessionResponse
    await applySessionResponse(data)
    return true
  } catch {
    await clearStoredSession()
    return false
  }
}

export async function getSession(): Promise<{ email: string } | null> {
  try {
    const data = await apiFetch<{ user: { email: string } }>('/auth/me')
    return { email: data.user.email }
  } catch {
    await clearStoredSession()
    return null
  }
}

export async function register(email: string, password: string): Promise<{ error?: string; message?: string }> {
  try {
    const data = await apiFetch<SessionResponse>('/auth/register', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    })
    return { message: data.message ?? 'VERIFY_EMAIL_SENT' }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'REGISTER_FAILED' }
  }
}

export async function verifyEmail(token: string): Promise<{ error?: string; email?: string }> {
  try {
    const data = await apiFetch<SessionResponse>('/auth/verify-email', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ token }),
    })
    await applySessionResponse(data)
    return { email: data.user.email }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'VERIFY_FAILED' }
  }
}

export async function login(email: string, password: string): Promise<{ error?: string }> {
  try {
    const data = await apiFetch<SessionResponse>('/auth/login', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email, password }),
    })
    await applySessionResponse(data)
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'LOGIN_FAILED' }
  }
}

export async function requestPasswordReset(email: string): Promise<{ error?: string }> {
  try {
    await apiFetch('/auth/password-reset/request', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ email }),
    })
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'RESET_REQUEST_FAILED' }
  }
}

export async function confirmPasswordReset(token: string, password: string): Promise<{ error?: string }> {
  try {
    await apiFetch('/auth/password-reset/confirm', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({ token, password }),
    })
    await clearStoredSession()
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'RESET_CONFIRM_FAILED' }
  }
}

export async function listSessions(): Promise<{
  sessions: Array<{
    id: string
    createdAt: string
    expiresAt: string
    revokedAt: string | null
    userAgent: string | null
  }>
  error?: string
}> {
  try {
    return await apiFetch('/auth/sessions')
  } catch (error) {
    return { sessions: [], error: error instanceof Error ? error.message : 'SESSIONS_FAILED' }
  }
}

export async function revokeSession(sessionId: string): Promise<{ error?: string }> {
  try {
    await apiFetch(`/auth/sessions/${sessionId}/revoke`, { method: 'POST' })
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'REVOKE_FAILED' }
  }
}

export async function logoutAll(): Promise<void> {
  try {
    await apiFetch('/auth/logout-all', { method: 'POST' })
  } catch {
    // still clear local
  }
  await clearStoredSession()
}

export async function deleteAccount(password: string): Promise<{ error?: string }> {
  try {
    await apiFetch('/auth/delete-account', {
      method: 'POST',
      body: JSON.stringify({ password }),
    })
    await clearStoredSession()
    return {}
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'DELETE_FAILED' }
  }
}

export async function signOut(): Promise<void> {
  try {
    await apiFetch('/auth/logout', { method: 'POST', auth: false })
  } catch {
    // ignore network
  }
  await clearStoredSession()
}

export function clearSession(): void {
  void clearStoredSession()
}
