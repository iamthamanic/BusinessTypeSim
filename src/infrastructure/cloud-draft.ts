/**
 * Offline draft for cloud runs — commit only when online.
 * Location: src/infrastructure/cloud-draft.ts
 */
import type { ActionProposal } from '../domain'

export interface CloudDecisionDraft {
  runId: string
  decisionText: string
  rationale: string
  proposal: ActionProposal | null
  updatedAt: string
}

function draftKey(runId: string): string {
  return `business-type:cloud-draft:v1:${runId}`
}

export function saveCloudDraft(draft: CloudDecisionDraft): void {
  try {
    localStorage.setItem(draftKey(draft.runId), JSON.stringify(draft))
  } catch {
    // quota / private mode — draft is best-effort
  }
}

export function loadCloudDraft(runId: string): CloudDecisionDraft | null {
  try {
    const raw = localStorage.getItem(draftKey(runId))
    if (!raw) return null
    return JSON.parse(raw) as CloudDecisionDraft
  } catch {
    return null
  }
}

export function clearCloudDraft(runId: string): void {
  localStorage.removeItem(draftKey(runId))
}

/** Remove all offline decision drafts (prefix scan). */
export function clearAllCloudDrafts(): void {
  try {
    const prefix = 'business-type:cloud-draft:v1:'
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

export function isBrowserOnline(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine
}
