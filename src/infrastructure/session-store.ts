/**
 * Platform session material store — Web keeps tokens out of localStorage;
 * Native uses Capacitor Preferences (upgrade path: encrypted Secure Storage).
 * Location: src/infrastructure/session-store.ts
 */
import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

const ACCESS_KEY = 'bt_access_token'
const REFRESH_KEY = 'bt_refresh_token'
const EMAIL_KEY = 'bt_session_email'

/** In-memory access token for web (cookies hold durable refresh/access HttpOnly). */
let memoryAccess: string | null = null
let memoryEmail: string | null = null

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform()
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
  // Web: never read durable tokens from localStorage.
  return {
    accessToken: memoryAccess,
    refreshToken: null,
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
}

export function setMemoryAccessToken(token: string | null): void {
  memoryAccess = token
}

export async function clearStoredSession(): Promise<void> {
  memoryAccess = null
  memoryEmail = null
  // Boy Scout: remove leftover localStorage token keys from earlier builds.
  try {
    localStorage.removeItem('bt_cloud_token')
    localStorage.removeItem('bt_cloud_email')
  } catch {
    // ignore quota / private mode
  }
  if (isNativePlatform()) {
    await Preferences.remove({ key: ACCESS_KEY })
    await Preferences.remove({ key: REFRESH_KEY })
    await Preferences.remove({ key: EMAIL_KEY })
  }
}
