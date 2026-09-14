/**
 * Situation briefing — player-visible context, Adalbert system prompt, fallback.
 * Location: shared/domain/situation-briefing.ts
 * Pure: no React, no LLM SDK. Generic for all scenarios (no scenarioId branches).
 */
import { getPlayerCampaignView } from './campaign.ts'
import { getPublishedCampaignForScenario } from './campaign-fixtures.ts'
import { getScenarioAtVersion } from './scenarios.ts'
import { getPlayerWorldView, playerWorldContextSummary } from './world-state.ts'
import type { RunState } from './types.ts'

export const SITUATION_BRIEFING_SYSTEM_PROMPT = [
  'Du bist Adalbert, der persönliche Executive Assistant des CEOs.',
  '',
  'Deine Aufgabe ist es, neue Unternehmenssituationen so zu erklären, dass der CEO sie sofort versteht – auch wenn er keine Erfahrung in dieser Branche hat.',
  '',
  'Schreibe wie ein echter Mitarbeiter und nicht wie ein Spielsystem.',
  'Beginne direkt mit der Situation.',
  'Erkläre zuerst, was passiert.',
  'Erkläre danach, warum es für das Unternehmen relevant ist.',
  'Erkläre Fachbegriffe nur dann, wenn sie für das Verständnis notwendig sind, und möglichst direkt im Satz.',
  'Setze kein Branchenwissen voraus.',
  'Verdichte Informationen, statt vorhandene Texte einfach zu wiederholen.',
  'Am Ende soll klar sein, worin der eigentliche Entscheidungskonflikt besteht.',
  'Wenn mehrere Interessen miteinander konkurrieren, benenne sie verständlich.',
  '',
  'Keine erfundenen Fakten oder Zahlen.',
  'Keine Informationen verwenden, die für den Spieler noch nicht sichtbar sind.',
  'Keine versteckten Trigger, zukünftigen Events oder Systemdaten verraten.',
  'Keine Begriffe wie Quest, Szenario, Spieler, Spielmechanik, Trigger oder UI verwenden.',
  'Keine künstlichen Überschriften wie „Kurzes Briefing zur Eröffnungslage“.',
  'Keine Listen, wenn normaler Fließtext natürlicher wäre.',
  'Kein Consultant-Sprech.',
  'Keine unnötigen Anglizismen.',
  'Kein unnötiges Business-Buzzwording.',
  'Kurze natürliche Absätze.',
  'Deutsch.',
  'Du-Form.',
  'Ziel sind normalerweise 2–4 kurze Absätze.',
  'Der Text soll sich wie eine Nachricht eines kompetenten persönlichen Assistenten anfühlen.',
  '',
  'Antworte nur mit dem Nachrichtentext. Kein JSON, keine Anführungszeichen um den ganzen Text.',
].join('\n')

/** Player-visible briefing payload for the LLM (no hidden/system fields). */
export type SituationBriefingInput = {
  companyName: string
  industry: string
  stage: string
  scaleLabel: string
  day: number
  deadlineDay: number
  daysUntilDeadline: number
  situationTitle: string
  situationContext: string
  knownFacts: string[]
  metrics: {
    revenueAnnualCents: number
    ebitdaAnnualCents: number
    cashCents: number
    headcount: number
    capacityUtilizationBps: number
    customerConcentrationBps: number
  }
  world: Record<string, unknown>
}

function activeSituation(run: RunState) {
  const campaign = getPublishedCampaignForScenario(run.scenarioId)
  return getPlayerCampaignView(run, campaign).active
}

/**
 * Assemble only player-visible context for a situation briefing.
 * Generic — no scenarioId special cases.
 */
export function buildSituationBriefingInput(run: RunState): SituationBriefingInput | null {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const active = activeSituation(run)
  if (!active) return null

  const world = playerWorldContextSummary(getPlayerWorldView(run))
  const daysUntilDeadline = Math.max(0, run.deadlineDay - run.day)

  return {
    companyName: scenario.companyName,
    industry: scenario.industry,
    stage: scenario.stage,
    scaleLabel: scenario.scaleLabel,
    day: run.day,
    deadlineDay: run.deadlineDay,
    daysUntilDeadline,
    situationTitle: active.title,
    situationContext: active.context,
    knownFacts: scenario.knownFacts.slice(0, 8),
    metrics: {
      revenueAnnualCents: run.metrics.revenueAnnualCents,
      ebitdaAnnualCents: run.metrics.ebitdaAnnualCents,
      cashCents: run.metrics.cashCents,
      headcount: run.metrics.headcount,
      capacityUtilizationBps: run.metrics.capacityUtilizationBps,
      customerConcentrationBps: run.metrics.customerConcentrationBps,
    },
    world,
  }
}

/** Strip accidental game/UI language from model output. */
export function sanitizeSituationBriefing(text: string): string {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:text|markdown)?\s*/i, '').replace(/```$/i, '').trim()
  cleaned = cleaned.replace(/^["„«]|["“»]$/g, '').trim()
  cleaned = cleaned
    .split(/\n+/)
    .filter((line) => {
      const lower = line.toLowerCase()
      if (/\bquest\b/.test(lower)) return false
      if (/30\s*sekunden/.test(lower)) return false
      if (/unter quest/.test(lower)) return false
      if (/kurzes briefing/.test(lower)) return false
      if (/spielmechanik|spieler\b|trigger\b|\bui\b/.test(lower)) return false
      return true
    })
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return cleaned
}

/**
 * Deterministic fallback when LLM is unavailable.
 * Understandable, no invented facts, no UI talk.
 */
export function buildSituationBriefingFallback(run: RunState): string {
  const active = activeSituation(run)
  if (!active) {
    return (
      'Willkommen an Bord. Ich halte dich auf dem Laufenden, '
      + 'sobald sich etwas Entscheidendes im Unternehmen abzeichnet.'
    )
  }
  const daysLeft = Math.max(0, run.deadlineDay - run.day)
  const deadlineHint =
    daysLeft > 0
      ? ` Für eine Entscheidung bleiben grob ${daysLeft} Tage Zeit — mit spürbaren Folgen, wenn wir zu lange warten.`
      : ' Die Entscheidung steht jetzt an.'

  return (
    `Folgende Situation: ${active.context.trim()}`
    + `\n\nKurz gesagt geht es um „${active.title}“.`
    + deadlineHint
  )
}

export function userPromptForSituationBriefing(input: SituationBriefingInput): string {
  return [
    'Formuliere Adalberts Chat-Nachricht aus diesem ausschließlich spieler-sichtbaren Kontext.',
    'Erfinde nichts. Erkläre Fachbegriffe nur wenn nötig, direkt im Satz.',
    '',
    JSON.stringify(input, null, 2),
  ].join('\n')
}

/** Lightweight quality checks for eval fixtures / unit tests. */
export type SituationBriefingEval = {
  ok: boolean
  explainsSituation: boolean
  explainsRelevance: boolean
  explainsConflict: boolean
  noGameUiLanguage: boolean
  noLegacyOpeningHeader: boolean
  noQuestMention: boolean
  noThirtySecondMention: boolean
}

export function evaluateSituationBriefingQuality(text: string): SituationBriefingEval {
  const t = text.trim()
  const lower = t.toLowerCase()
  const noGameUiLanguage =
    !/\bquest\b/.test(lower)
    && !/spielmechanik/.test(lower)
    && !/\bspieler\b/.test(lower)
    && !/\btrigger\b/.test(lower)
  const noLegacyOpeningHeader = !/kurzes briefing zur eröffnungslage/.test(lower)
  const noQuestMention = !/\bquest\b/.test(lower)
  const noThirtySecondMention = !/30\s*sekunden/.test(lower) && !/in etwa dreißig/.test(lower)

  const explainsSituation =
    t.length >= 80
    && (/folgende situation|wir haben|gerade|kunde|werk|vertrag|situation/i.test(t)
      || /entscheid/i.test(t))
  const explainsRelevance =
    /umsatz|wichtig|anteil|verlieren|risiko|kapazität|team|kunde|vertrag|marge|cash/i.test(t)
  const explainsConflict =
    /entscheiden|oder|einerseits|andererseits|gleichzeitig|abwägen|konflikt|dilemma|zwei/i.test(t)
    || (/entwicklungs|kapazität|priorität/i.test(t) && /oder|gegen|statt/i.test(t))

  const ok =
    explainsSituation
    && explainsRelevance
    && noGameUiLanguage
    && noLegacyOpeningHeader
    && noQuestMention
    && noThirtySecondMention

  return {
    ok,
    explainsSituation,
    explainsRelevance,
    explainsConflict,
    noGameUiLanguage,
    noLegacyOpeningHeader,
    noQuestMention,
    noThirtySecondMention,
  }
}

/** Assert module has no scenarioId hardcoding (source-level guard used in tests). */
export function situationBriefingModuleIsGeneric(source: string): boolean {
  return !/scenarioId\s*===\s*['"]nexora|if\s*\(\s*scenarioId|scenarioId\s*===\s*['"]nordkern/i.test(
    source,
  )
}
