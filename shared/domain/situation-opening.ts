/**
 * Situation opening — playable conversation start (not a case-study brief).
 * Location: shared/domain/situation-opening.ts
 * Pure: no React, no LLM SDK. Generic for all scenarios (no scenarioId branches).
 */
import { getPlayerCampaignView } from './campaign.ts'
import { getPublishedCampaignForScenario } from './campaign-fixtures.ts'
import { HOUSE_ASSISTANT_ID } from './house-assistant.ts'
import { getScenarioAtVersion } from './scenarios.ts'
import { getPlayerWorldView, playerWorldContextSummary } from './world-state.ts'
import type { AdvisorDefinition, RunState } from './types.ts'

export const SITUATION_OPENING_SYSTEM_PROMPT = [
  'Du bist Adalbert, persönlicher Executive Assistant des CEOs.',
  '',
  'Du eröffnest gerade eine reale Managementsituation innerhalb des Unternehmens.',
  'Deine Aufgabe ist NICHT, eine Fallstudie zusammenzufassen oder dem CEO Businesswissen beizubringen.',
  'Deine Aufgabe ist, das Thema so auf den Tisch zu bringen, wie es ein kompetenter persönlicher Assistent tun würde.',
  '',
  'Zieh den CEO in die Situation hinein.',
  'Beginne mit dem konkreten Problem oder der Entwicklung.',
  'Gib nur so viele Informationen, dass der CEO versteht, warum das Thema wichtig ist.',
  'Dosiere Informationen über mehrere kurze Chatnachrichten.',
  'Formuliere kurze natürliche Chatnachrichten — wie gesprochenes Deutsch.',
  'Wenn zwei Ziele miteinander kollidieren, lass diesen Konflikt aus der Situation heraus deutlich werden,',
  'statt ihn akademisch als „Zielkonflikt“ zu bezeichnen.',
  'Nutze einfache Sprache, ohne den CEO wie einen Anfänger zu behandeln.',
  'Ersetze unnötige Fachbegriffe durch verständliche Sprache (lieber „wiederkehrender Jahresumsatz“ als nacktes ARR).',
  '',
  'Du darfst bekannte Fakten verständlich interpretieren und ihre offensichtliche Bedeutung benennen',
  '(z. B. aus 18 % Umsatzanteil: „kein Kunde, den wir einfach verlieren können“).',
  'Erfinde keine neuen entscheidungsrelevanten Spielwelt-Fakten: keine neuen Zahlen, Kundenforderungen,',
  'Aussagen von Personen, Meetings, Vertragsbedingungen, Wettbewerber, Ereignisse oder Wahrscheinlichkeiten.',
  'Keine versteckten oder zukünftigen Informationen.',
  '',
  'Wenn vorhandene Advisors fachlich relevant sind, kannst du sie als mögliche Ansprechpartner nennen',
  '(nur Personen aus dem bereitgestellten Advisor-Kontext; keine erfundenen Namen).',
  'Beende die Opening-Sequenz möglichst an einem Punkt, an dem der CEO etwas tun, fragen oder entscheiden möchte.',
  '',
  'Vermeide Fallstudien-/Consultant-Sprache wie:',
  '„Die eigentliche Entscheidung besteht darin …“, „Der zentrale Zielkonflikt lautet …“,',
  '„Folgende Faktoren sind zu berücksichtigen …“, „Zusammenfassend …“, „Für die Entscheidungsfindung …“.',
  '',
  'Keine Quest-, UI-, Spieler-, Szenario- oder Tutorial-Sprache.',
  'Keine Überschriften. Keine Aufzählungen. Keine Zusammenfassung.',
  'Kein Consultant-Sprech. Keine unnötigen Anglizismen.',
  'Deutsch, Du-Form.',
  '',
  'Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Markdown, kein Fließtext außerhalb):',
  '{',
  '  "messages": ["...", "..."],',
  '  "decisionPrompt": "..." | null,',
  '  "relevantAdvisorIds": ["id1", "id2"]',
  '}',
  'messages: 2–4 kurze Chatnachrichten (progressive Disclosure, nicht alles in eine Nachricht).',
  'decisionPrompt: optional eine kurze offene Managementfrage (keine Multiple-Choice-Optionen).',
  'relevantAdvisorIds: 0–3 IDs ausschließlich aus dem bereitgestellten Advisor-Kontext (ohne Adalbert selbst).',
].join('\n')

/** Player-visible opening payload for the LLM (no hidden/system fields). */
export type SituationOpeningInput = {
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
  advisors: Array<{
    id: string
    name: string
    role: string
    domains: string[]
  }>
}

export type SituationOpeningResult = {
  messages: string[]
  decisionPrompt: string | null
  relevantAdvisorIds: string[]
}

function activeSituation(run: RunState) {
  const campaign = getPublishedCampaignForScenario(run.scenarioId)
  return getPlayerCampaignView(run, campaign).active
}

function scenarioAdvisors(run: RunState): AdvisorDefinition[] {
  return getScenarioAtVersion(run.scenarioId, run.scenarioVersion).advisors
}

function visibleAdvisorsForPrompt(run: RunState): SituationOpeningInput['advisors'] {
  return scenarioAdvisors(run)
    .filter((advisor) => advisor.id !== HOUSE_ASSISTANT_ID)
    .map((advisor) => ({
      id: advisor.id,
      name: advisor.name,
      role: advisor.role,
      domains: advisor.domains,
    }))
}

/**
 * Assemble only player-visible context for a situation opening.
 * Generic — no scenarioId special cases.
 */
export function buildSituationOpeningInput(run: RunState): SituationOpeningInput | null {
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
    knownFacts: scenario.knownFacts.slice(0, 6),
    metrics: {
      revenueAnnualCents: run.metrics.revenueAnnualCents,
      ebitdaAnnualCents: run.metrics.ebitdaAnnualCents,
      cashCents: run.metrics.cashCents,
      headcount: run.metrics.headcount,
      capacityUtilizationBps: run.metrics.capacityUtilizationBps,
      customerConcentrationBps: run.metrics.customerConcentrationBps,
    },
    world,
    advisors: visibleAdvisorsForPrompt(run),
  }
}

const GAME_UI_LINE =
  /\bquest\b|30\s*sekunden|unter quest|kurzes briefing|spielmechanik|\bspieler\b|\btrigger\b|\bui\b|szenario\b|tutorial/i

const CONSULTANT_LINE =
  /eigentliche entscheidung besteht|zentrale zielkonflikt|folgende faktoren|zusammenfassend|für die entscheidungsfindung/i

/** Strip accidental game/UI / consultant lines from a single message. */
export function sanitizeOpeningMessage(text: string): string {
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^```(?:text|markdown|json)?\s*/i, '').replace(/```$/i, '').trim()
  cleaned = cleaned.replace(/^["„«]|["“»]$/g, '').trim()
  cleaned = cleaned
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .filter((line) => !GAME_UI_LINE.test(line) && !CONSULTANT_LINE.test(line))
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
  return cleaned
}

function allowedAdvisorIds(run: RunState): Set<string> {
  return new Set(
    scenarioAdvisors(run)
      .map((advisor) => advisor.id)
      .filter((id) => id !== HOUSE_ASSISTANT_ID),
  )
}

/** Normalize + clamp model/fallback opening payloads. */
export function normalizeSituationOpening(
  raw: {
    messages?: unknown
    decisionPrompt?: unknown
    relevantAdvisorIds?: unknown
  },
  run: RunState,
): SituationOpeningResult | null {
  const allowed = allowedAdvisorIds(run)
  const messages = (Array.isArray(raw.messages) ? raw.messages : [])
    .filter((item): item is string => typeof item === 'string')
    .map(sanitizeOpeningMessage)
    .filter((item) => item.length >= 12)
    .slice(0, 4)

  if (messages.length < 2) return null

  const decisionRaw =
    typeof raw.decisionPrompt === 'string' ? sanitizeOpeningMessage(raw.decisionPrompt) : ''
  const decisionPrompt =
    decisionRaw.length >= 8 && !GAME_UI_LINE.test(decisionRaw) ? decisionRaw : null

  const relevantAdvisorIds = (Array.isArray(raw.relevantAdvisorIds) ? raw.relevantAdvisorIds : [])
    .filter((item): item is string => typeof item === 'string')
    .filter((id) => allowed.has(id))
    .slice(0, 3)

  return { messages, decisionPrompt, relevantAdvisorIds }
}

/** Ordered chat texts for UX (messages + optional decision beat). */
export function openingSequenceTexts(opening: SituationOpeningResult): string[] {
  const texts = [...opening.messages]
  if (opening.decisionPrompt) texts.push(opening.decisionPrompt)
  return texts
}

/** Pick up to 3 advisors whose domains loosely match situation text (generic). */
export function suggestRelevantAdvisorIds(run: RunState, max = 3): string[] {
  const active = activeSituation(run)
  const hay = `${active?.title ?? ''} ${active?.context ?? ''}`.toLowerCase()
  const scored = visibleAdvisorsForPrompt(run).map((advisor) => {
    let score = 0
    for (const domain of advisor.domains) {
      if (hay.includes(domain.toLowerCase())) score += 2
    }
    if (/finanz|cash|marge|umsatz|invest|liquid/i.test(hay) && /finance|runway/.test(advisor.domains.join(' '))) {
      score += 2
    }
    if (/technik|entwick|produkt|software|ki|automat/i.test(hay) && /technical|product|ops|operations/.test(advisor.domains.join(' '))) {
      score += 2
    }
    if (/kunde|verkauf|vertrieb|handel|pipeline/i.test(hay) && /sales|customer|marketing/.test(advisor.domains.join(' '))) {
      score += 2
    }
    if (/personal|team|mitarbeit|morale/i.test(hay) && /people|hr|ops/.test(advisor.domains.join(' '))) {
      score += 2
    }
    return { id: advisor.id, score }
  })
  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((item) => item.id)
}

function advisorMentionLine(run: RunState, ids: string[]): string | null {
  if (ids.length === 0) return null
  const byId = new Map(visibleAdvisorsForPrompt(run).map((advisor) => [advisor.id, advisor]))
  const names = ids
    .map((id) => byId.get(id))
    .filter((advisor): advisor is NonNullable<typeof advisor> => Boolean(advisor))
    .map((advisor) => advisor.name.split(' ')[0] ?? advisor.name)
  if (names.length === 0) return null
  if (names.length === 1) {
    return `${names[0]} kann dir dazu eine Einschätzung geben, wenn du magst.`
  }
  if (names.length === 2) {
    return `${names[0]} und ${names[1]} kennen die Lage aus ihrer Ecke — frag sie ruhig.`
  }
  return `${names[0]}, ${names[1]} und ${names[2]} können dir die Lage aus ihrer jeweiligen Sicht einschätzen.`
}

/**
 * Deterministic multi-message fallback when LLM is unavailable.
 * Understandable, no invented facts, no UI talk — conversation-shaped, not a case dump.
 */
export function buildSituationOpeningFallback(run: RunState): SituationOpeningResult {
  const active = activeSituation(run)
  if (!active) {
    return {
      messages: [
        'Willkommen an Bord. Ich halte dich auf dem Laufenden, sobald sich etwas Entscheidendes abzeichnet.',
        'Sag Bescheid, wenn du die aktuelle Lage oder jemanden aus dem Führungsteam brauchst.',
      ],
      decisionPrompt: null,
      relevantAdvisorIds: [],
    }
  }

  const context = active.context.trim()
  const daysLeft = Math.max(0, run.deadlineDay - run.day)
  const relevantAdvisorIds = suggestRelevantAdvisorIds(run)
  const mention = advisorMentionLine(run, relevantAdvisorIds)

  const messages: string[] = [
    `Folgende Situation: ${context}`,
  ]

  if (daysLeft > 0) {
    messages.push(
      `Wir sollten das nicht aussitzen — grob ${daysLeft} Tage, bis der Druck spürbar wird.`,
    )
  } else {
    messages.push('Das Thema steht jetzt an. Länger warten wird eher teurer als klüger.')
  }

  if (mention) messages.push(mention)

  const decisionPrompt =
    'Priorisieren wir das jetzt — oder holen wir vorher noch eine Einschätzung aus dem Team?'

  return normalizeSituationOpening(
    { messages: messages.slice(0, 4), decisionPrompt, relevantAdvisorIds },
    run,
  ) ?? {
    messages: messages.slice(0, 4),
    decisionPrompt,
    relevantAdvisorIds,
  }
}

/** Flatten opening to a single string (local advisor replies / legacy helpers). */
export function situationOpeningAsPlainText(opening: SituationOpeningResult): string {
  return openingSequenceTexts(opening).join('\n\n')
}

export function userPromptForSituationOpening(input: SituationOpeningInput): string {
  return [
    'Eröffne diese Situation als Adalbert-Chat (JSON wie im Systemprompt).',
    'Nicht alles in eine Nachricht. Keine Fallstudie. Keine erfundenen Fakten.',
    'Nur Advisors aus dem Array „advisors“ nennen oder in relevantAdvisorIds setzen.',
    '',
    JSON.stringify(input, null, 2),
  ].join('\n')
}

/** Lightweight quality checks for eval fixtures / unit tests. */
export type SituationOpeningEval = {
  ok: boolean
  feelsConversational: boolean
  progressive: boolean
  invitesAction: boolean
  noGameUiLanguage: boolean
  noConsultantSpeak: boolean
  noLegacyOpeningHeader: boolean
  notOverstuffed: boolean
}

export function evaluateSituationOpeningQuality(
  opening: SituationOpeningResult,
): SituationOpeningEval {
  const texts = openingSequenceTexts(opening)
  const joined = texts.join('\n')
  const lower = joined.toLowerCase()

  const noGameUiLanguage =
    !/\bquest\b/.test(lower)
    && !/spielmechanik/.test(lower)
    && !/\bspieler\b/.test(lower)
    && !/\btrigger\b/.test(lower)
    && !/30\s*sekunden/.test(lower)
  const noLegacyOpeningHeader = !/kurzes briefing zur eröffnungslage/.test(lower)
  const noConsultantSpeak =
    !CONSULTANT_LINE.test(lower)
    && !/der zentrale zielkonflikt/.test(lower)
    && !/folgende faktoren sind zu berücksichtigen/.test(lower)

  const progressive = texts.length >= 2 && texts.length <= 5
  const feelsConversational =
    progressive
    && texts.every((text) => text.length <= 420)
    && !/^#{1,3}\s/m.test(joined)
    && !/^\s*[-*•]\s/m.test(joined)

  const invitesAction =
    Boolean(opening.decisionPrompt)
    || /\?/.test(joined)
    || /prioris|entscheiden|wie gehen|sollen wir|frag|einschätz/i.test(joined)

  // Prefer not dumping a wall of every known fact — heuristic on total length.
  const notOverstuffed = joined.length <= 1400 && texts.every((text) => text.split(/\s+/).length <= 85)

  const ok =
    progressive
    && feelsConversational
    && invitesAction
    && noGameUiLanguage
    && noConsultantSpeak
    && noLegacyOpeningHeader
    && notOverstuffed

  return {
    ok,
    feelsConversational,
    progressive,
    invitesAction,
    noGameUiLanguage,
    noConsultantSpeak,
    noLegacyOpeningHeader,
    notOverstuffed,
  }
}

/** Assert module has no scenarioId hardcoding (source-level guard used in tests). */
export function situationOpeningModuleIsGeneric(source: string): boolean {
  return !/scenarioId\s*===\s*['"]nexora|if\s*\(\s*scenarioId|scenarioId\s*===\s*['"]nordkern/i.test(
    source,
  )
}
