/**
 * Opening conversation → Quest reveal timing for a run.
 * Location: src/features/room/openingBrief.ts
 * Chat copy comes from LLM situation_opening (or domain fallback) as progressive messages.
 */
import {
  HOUSE_ASSISTANT_ID,
  buildSituationOpeningFallback,
  openingSequenceTexts,
  type RunState,
  type SituationOpeningResult,
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

/** @deprecated Prefer openingSequenceTexts(buildSituationOpeningFallback(run)). */
export function buildOpeningBriefText(run: RunState): string {
  return openingSequenceTexts(buildSituationOpeningFallback(run)).join('\n\n')
}

function adalbertThread(threads: AdvisorThread[]): AdvisorThread | undefined {
  return threads.find((thread) => thread.advisorId === HOUSE_ASSISTANT_ID)
}

function setAdalbertMessages(
  threads: AdvisorThread[],
  messages: AdvisorThread['messages'],
): AdvisorThread[] {
  const existing = adalbertThread(threads)
  if (!existing) {
    return [...threads, { advisorId: HOUSE_ASSISTANT_ID, messages }]
  }
  return threads.map((thread) =>
    thread.advisorId === HOUSE_ASSISTANT_ID ? { ...thread, messages } : thread,
  )
}

/**
 * Seed Adalbert with a pending typing message (empty text) until opening arrives.
 * Does not dump raw situation title/context into chat.
 */
export function seedPendingOpeningBrief(
  threads: AdvisorThread[],
  run: RunState,
  atIso = new Date().toISOString(),
): AdvisorThread[] {
  const existing = adalbertThread(threads)
  if (existing && existing.messages.some((message) => message.text.trim().length > 0)) {
    return threads
  }
  if (e2eSkipOpeningDelay() || isOpeningStreamDone(run.runId)) {
    return applyOpeningSequence(threads, buildSituationOpeningFallback(run), atIso, false)
  }
  const pending = {
    role: 'advisor' as const,
    text: '',
    at: atIso,
    animate: true,
  }
  return setAdalbertMessages(threads, existing?.messages.length ? existing.messages : [pending])
}

/** Append one Adalbert advisor message (for progressive opening beats). */
export function appendOpeningAdvisorMessage(
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
  const existing = adalbertThread(threads)
  if (!existing) {
    return [{ advisorId: HOUSE_ASSISTANT_ID, messages: [message] }]
  }
  return setAdalbertMessages(threads, [...existing.messages, message])
}

/**
 * Apply opening: first message replaces pending empty bubble; remaining returned for queue.
 * When animate=false, all sequence texts are applied at once.
 */
export function applyOpeningSequence(
  threads: AdvisorThread[],
  opening: SituationOpeningResult,
  atIso = new Date().toISOString(),
  animate = true,
): AdvisorThread[] {
  const texts = openingSequenceTexts(opening)
  if (texts.length === 0) return threads

  if (!animate || e2eSkipOpeningDelay()) {
    const messages = texts.map((text) => ({
      role: 'advisor' as const,
      text,
      at: atIso,
      animate: false,
    }))
    return setAdalbertMessages(threads, messages)
  }

  const first = {
    role: 'advisor' as const,
    text: texts[0] ?? '',
    at: atIso,
    animate: true,
  }
  const existing = adalbertThread(threads)
  if (!existing || existing.messages.length === 0) {
    return setAdalbertMessages(threads, [first])
  }
  const pendingIndex = existing.messages.findIndex(
    (item) => item.role === 'advisor' && item.text.trim().length === 0,
  )
  if (pendingIndex >= 0) {
    return setAdalbertMessages(
      threads,
      existing.messages.map((item, index) => (index === pendingIndex ? first : item)),
    )
  }
  // Already has content — replace first advisor message only if it was a single pending-style seed.
  if (existing.messages.length === 1 && existing.messages[0]?.role === 'advisor') {
    return setAdalbertMessages(threads, [first])
  }
  return appendOpeningAdvisorMessage(threads, first.text, atIso, true)
}

/** Texts after the first beat — feed into progressive queue. */
export function remainingOpeningTexts(opening: SituationOpeningResult): string[] {
  return openingSequenceTexts(opening).slice(1)
}

/** @deprecated Prefer applyOpeningSequence for multi-beat openings. */
export function applyOpeningBriefMessage(
  threads: AdvisorThread[],
  text: string,
  atIso = new Date().toISOString(),
  animate = true,
): AdvisorThread[] {
  return applyOpeningSequence(
    threads,
    {
      messages: [
        text,
        'Wie gehen wir das an — holen wir zuerst eine Einschätzung aus dem Team?',
      ],
      decisionPrompt: null,
      relevantAdvisorIds: [],
    },
    atIso,
    animate,
  )
}

/** @deprecated Use seedPendingOpeningBrief + applyOpeningSequence. */
export function ensureOpeningBriefThread(
  threads: AdvisorThread[],
  run: RunState,
  atIso = new Date().toISOString(),
): AdvisorThread[] {
  return seedPendingOpeningBrief(threads, run, atIso)
}
