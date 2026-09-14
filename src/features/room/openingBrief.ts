/**
 * Opening brief → Quest reveal timing for a run.
 * Location: src/features/room/openingBrief.ts
 * Chat copy comes from LLM situation_briefing (or domain fallback) — not raw title/context dump.
 */
import {
  HOUSE_ASSISTANT_ID,
  buildSituationBriefingFallback,
  type RunState,
} from '../../domain'
import type { AdvisorThread } from '../team/TeamView'

export const QUEST_REVEAL_DELAY_MS = 30_000

function revealStorageKey(runId: string): string {
  return `bt.quest-reveal:${runId}`
}

function streamDoneKey(runId: string): string {
  return `bt.opening-streamed:${runId}`
}

/** Playwright / local-demo: skip 30s quest delay and typewriter. */
export function e2eSkipOpeningDelay(): boolean {
  try {
    return (
      localStorage.getItem('bt.e2e.allow-local-demo') === '1'
      || localStorage.getItem('bt.e2e.instant-quests') === '1'
    )
  } catch {
    return false
  }
}

export function effectiveQuestRevealDelayMs(delayMs = QUEST_REVEAL_DELAY_MS): number {
  return e2eSkipOpeningDelay() ? 0 : delayMs
}

export function markOpeningStreamDone(runId: string): void {
  try {
    sessionStorage.setItem(streamDoneKey(runId), '1')
  } catch {
    // ignore
  }
}

export function isOpeningStreamDone(runId: string): boolean {
  try {
    return sessionStorage.getItem(streamDoneKey(runId)) === '1'
  } catch {
    return false
  }
}

/** Schedule quest reveal for a freshly started run (overwrites prior schedule). */
export function scheduleQuestReveal(runId: string, delayMs = QUEST_REVEAL_DELAY_MS): number {
  const at = Date.now() + effectiveQuestRevealDelayMs(delayMs)
  try {
    sessionStorage.setItem(revealStorageKey(runId), String(at))
    sessionStorage.removeItem(streamDoneKey(runId))
  } catch {
    // ignore
  }
  return at
}

/** Keep an existing schedule; only create one if missing (for remount during delay). */
export function ensureQuestRevealScheduled(runId: string, delayMs = QUEST_REVEAL_DELAY_MS): number {
  const existing = readQuestRevealAt(runId)
  if (existing !== null) return existing
  return scheduleQuestReveal(runId, delayMs)
}

export function readQuestRevealAt(runId: string): number | null {
  try {
    const raw = sessionStorage.getItem(revealStorageKey(runId))
    if (!raw) return null
    const at = Number(raw)
    return Number.isFinite(at) ? at : null
  } catch {
    return null
  }
}

/** True once the delay has passed (or no schedule = legacy run → already revealed). */
export function areQuestsRevealed(runId: string, now = Date.now()): boolean {
  const at = readQuestRevealAt(runId)
  if (at === null) return true
  return now >= at
}

/** @deprecated Prefer LLM briefing + buildSituationBriefingFallback. Kept for tests. */
export function buildOpeningBriefText(run: RunState): string {
  return buildSituationBriefingFallback(run)
}

/**
 * Seed Adalbert with a pending typing message (empty text) until LLM/fallback fills it.
 * Does not dump raw situation title/context into chat.
 */
export function seedPendingOpeningBrief(
  threads: AdvisorThread[],
  run: RunState,
  atIso = new Date().toISOString(),
): AdvisorThread[] {
  const existing = threads.find((thread) => thread.advisorId === HOUSE_ASSISTANT_ID)
  if (existing && existing.messages.some((message) => message.text.trim().length > 0)) {
    return threads
  }
  if (e2eSkipOpeningDelay() || isOpeningStreamDone(run.runId)) {
    return applyOpeningBriefMessage(threads, buildSituationBriefingFallback(run), atIso, false)
  }
  const pending = {
    role: 'advisor' as const,
    text: '',
    at: atIso,
    animate: true,
  }
  if (!existing) {
    return [...threads, { advisorId: HOUSE_ASSISTANT_ID, messages: [pending] }]
  }
  return threads.map((thread) =>
    thread.advisorId === HOUSE_ASSISTANT_ID
      ? { ...thread, messages: thread.messages.length === 0 ? [pending] : thread.messages }
      : thread,
  )
}

/** Replace / set Adalbert opening message after LLM or fallback. */
export function applyOpeningBriefMessage(
  threads: AdvisorThread[],
  text: string,
  atIso = new Date().toISOString(),
  animate = true,
): AdvisorThread[] {
  const message = {
    role: 'advisor' as const,
    text,
    at: atIso,
    animate: animate && !e2eSkipOpeningDelay(),
  }
  const existing = threads.find((thread) => thread.advisorId === HOUSE_ASSISTANT_ID)
  if (!existing) {
    return [...threads, { advisorId: HOUSE_ASSISTANT_ID, messages: [message] }]
  }
  return threads.map((thread) => {
    if (thread.advisorId !== HOUSE_ASSISTANT_ID) return thread
    if (thread.messages.length === 0) return { ...thread, messages: [message] }
    // Replace first empty/pending advisor message, else first advisor message.
    const index = thread.messages.findIndex(
      (item) => item.role === 'advisor' && item.text.trim().length === 0,
    )
    const target = index >= 0 ? index : 0
    return {
      ...thread,
      messages: thread.messages.map((item, i) => (i === target ? message : item)),
    }
  })
}

/** @deprecated Use seedPendingOpeningBrief + applyOpeningBriefMessage. */
export function ensureOpeningBriefThread(
  threads: AdvisorThread[],
  run: RunState,
  atIso = new Date().toISOString(),
): AdvisorThread[] {
  return seedPendingOpeningBrief(threads, run, atIso)
}
