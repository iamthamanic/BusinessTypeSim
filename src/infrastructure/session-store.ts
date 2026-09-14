/**
 * Platform session material store — Web uses HttpOnly cookies when same-origin prod;
 * localhost / cross-origin / native keep bearer tokens (localStorage / Preferences).
 * Location: src/infrastructure/session-store.ts
 */
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const ACCESS_KEY = 'bt_access_token'
const REFRESH_KEY = 'bt_refresh_token'
const EMAIL_KEY = 'bt_session_email'
const WEB_ACCESS_KEY = 'bt.web.access'
const WEB_REFRESH_KEY = 'bt.web.refresh'
const WEB_EMAIL_KEY = 'bt.web.email'

/** In-memory access/refresh for the current tab (hydrated from localStorage). */
let memoryAccess: string | null = null
let memoryRefresh: string | null = null
let memoryEmail: string | null = null
let hydrated = false

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
}

function readWebStorage(key: string): string | null {
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeWebStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
    sessionStorage.setItem(key, value)
  } catch {
    // ignore quota / private mode
  }
}

function removeWebStorage(key: string): void {
  try {
    localStorage.removeItem(key)
    sessionStorage.removeItem(key)
  } catch {
    // ignore
  }
}

function hydrateWebMemory(): void {
  if (hydrated) return
  hydrated = true
  memoryAccess = memoryAccess ?? readWebStorage(WEB_ACCESS_KEY)
  memoryRefresh = memoryRefresh ?? readWebStorage(WEB_REFRESH_KEY)
  memoryEmail = memoryEmail ?? readWebStorage(WEB_EMAIL_KEY)
}

export async function loadStoredSession(): Promise<{
  accessToken: string | null
  refreshToken: string | null
  email: string | null
}> {
  if (isNativePlatform()) {
    const [access, refresh, email] = await Promise.all([
      Preferences.get({ key: ACCESS_KEY }),
      Preferences.get({ key: REFRESH_KEY }),
      Preferences.get({ key: EMAIL_KEY }),
    ])
    return {
      accessToken: access.value,
      refreshToken: refresh.value,
      email: email.value,
    }
  }
  hydrateWebMemory()
  return {
    accessToken: memoryAccess,
    refreshToken: memoryRefresh,
    email: memoryEmail,
  }
}

export async function persistNativeTokens(
  accessToken: string,
  refreshToken: string,
  email: string,
): Promise<void> {
  await Preferences.set({ key: ACCESS_KEY, value: accessToken })
  await Preferences.set({ key: REFRESH_KEY, value: refreshToken })
  await Preferences.set({ key: EMAIL_KEY, value: email })
}

export async function persistWebSessionEmail(email: string): Promise<void> {
  memoryEmail = email
  writeWebStorage(WEB_EMAIL_KEY, email)
}

/** Web bearer pair in memory + localStorage (survives reload; needed for localhost → API). */
export async function persistWebBearerTokens(
  accessToken: string,
  refreshToken: string,
  email: string,
): Promise<void> {
  hydrated = true
  memoryAccess = accessToken
  memoryRefresh = refreshToken
  memoryEmail = email
  writeWebStorage(WEB_ACCESS_KEY, accessToken)
  writeWebStorage(WEB_REFRESH_KEY, refreshToken)
  writeWebStorage(WEB_EMAIL_KEY, email)
}

export function setMemoryAccessToken(token: string | null): void {
  memoryAccess = token
  if (token) writeWebStorage(WEB_ACCESS_KEY, token)
}

export async function clearStoredSession(): Promise<void> {
  memoryAccess = null
  memoryRefresh = null
  memoryEmail = null
  hydrated = true
  try {
    localStorage.removeItem('bt_cloud_token')
    localStorage.removeItem('bt_cloud_email')
  } catch {
    // ignore
  }
  removeWebStorage(WEB_ACCESS_KEY)
  removeWebStorage(WEB_REFRESH_KEY)
  removeWebStorage(WEB_EMAIL_KEY)
  if (isNativePlatform()) {
    await Preferences.remove({ key: ACCESS_KEY })
    await Preferences.remove({ key: REFRESH_KEY })
    await Preferences.remove({ key: EMAIL_KEY })
  }
}
