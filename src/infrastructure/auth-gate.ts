/**
 * Auth / local-demo gate helpers for the client shell.
 * Location: src/infrastructure/auth-gate.ts
 */

/** Playwright may set this to keep offline demo runs without a cloud session. */
export const E2E_LOCAL_DEMO_KEY = 'bt.e2e.allow-local-demo'

function isAutomatedBrowser(): boolean {
  try {
    return Boolean((navigator as Navigator & { webdriver?: boolean }).webdriver)
  } catch {
    return false
  }
}

/**
 * Local anonymous demo is only allowed in Playwright (webdriver + flag).
 * A leftover localStorage flag must not bypass login in a normal browser.
 */
export function allowLocalDemoPlay(): boolean {
  try {
    if (localStorage.getItem(E2E_LOCAL_DEMO_KEY) !== '1') return false
    return isAutomatedBrowser()
  } catch {
    return false
  }
}

/** When cloud API is configured, real play requires a session — unless e2e local demo. */
export function requiresAuthSession(cloudConfigured: boolean): boolean {
  return cloudConfigured && !allowLocalDemoPlay()
}
