/**
 * Opening brief → Quest reveal timing for a run.
 * Location: src/features/room/openingBrief.ts
 */
import {
  getPlayerCampaignView,
  getPublishedCampaignForScenario,
  HOUSE_ASSISTANT_ID,
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

export function buildOpeningBriefText(run: RunState): string {
  const campaign = getPublishedCampaignForScenario(run.scenarioId)
  const view = getPlayerCampaignView(run, campaign)
  const active = view.active
  if (!active) {
    return (
      'Willkommen an Bord. Ich habe die Lage vorbereitet. '
      + 'Sobald etwas Dringendes ansteht, brief ich dich hier — und lege es dir danach unter Quest ab.'
    )
  }
  return (
    `Kurzes Briefing zur Eröffnungslage:\n\n`
    + `${active.title}\n`
    + `${active.context}\n\n`
    + 'Ich halte das erst hier im Chat. In etwa 30 Sekunden lege ich es dir unter Quest ab, '
    + 'damit du es strukturiert angehen kannst.'
  )
}

/** Seed Adalbert thread with opening brief if the thread is still empty. */
export function ensureOpeningBriefThread(
  threads: AdvisorThread[],
  run: RunState,
  atIso = new Date().toISOString(),
): AdvisorThread[] {
  const existing = threads.find((thread) => thread.advisorId === HOUSE_ASSISTANT_ID)
  if (existing && existing.messages.length > 0) return threads
  const shouldAnimate = !e2eSkipOpeningDelay() && !isOpeningStreamDone(run.runId)
  const message = {
    role: 'advisor' as const,
    text: buildOpeningBriefText(run),
    at: atIso,
    animate: shouldAnimate,
  }
  if (!existing) {
    return [...threads, { advisorId: HOUSE_ASSISTANT_ID, messages: [message] }]
  }
  return threads.map((thread) =>
    thread.advisorId === HOUSE_ASSISTANT_ID
      ? { ...thread, messages: [message] }
      : thread,
  )
}
