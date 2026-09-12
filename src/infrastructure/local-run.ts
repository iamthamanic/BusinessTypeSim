import type { RunState } from '../domain'

const key = 'business-type:active-run:v1'

export function loadLocalRun(): RunState | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as RunState) : null
  } catch {
    return null
  }
}

export function saveLocalRun(run: RunState): void {
  localStorage.setItem(key, JSON.stringify(run))
}

export function clearLocalRun(): void {
  localStorage.removeItem(key)
}
