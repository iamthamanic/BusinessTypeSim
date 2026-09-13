import { getScenario } from './scenarios.ts'
import type {
  ActionKind,
  ActionProposal,
  CompanyMetrics,
  DecisionQuality,
  LedgerEvent,
  ManagementAction,
  RunState,
  ScenarioDefinition,
  ScheduledEvent,
} from './types.ts'

const metricKeys: Array<keyof CompanyMetrics> = [
  'revenueAnnualCents',
  'ebitdaAnnualCents',
  'cashCents',
  'headcount',
  'capacityUtilizationBps',
  'customerConcentrationBps',
  'moraleBps',
  'resilienceBps',
  'marketPositionBps',
]

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeMetrics(metrics: CompanyMetrics): CompanyMetrics {
  return {
    ...metrics,
    headcount: Math.max(0, Math.round(metrics.headcount)),
    capacityUtilizationBps: clamp(Math.round(metrics.capacityUtilizationBps), 0, 12_000),
    customerConcentrationBps: clamp(Math.round(metrics.customerConcentrationBps), 0, 10_000),
    moraleBps: clamp(Math.round(metrics.moraleBps), 0, 10_000),
    resilienceBps: clamp(Math.round(metrics.resilienceBps), 0, 10_000),
    marketPositionBps: clamp(Math.round(metrics.marketPositionBps), 0, 10_000),
  }
}

function addMetricDelta(base: CompanyMetrics, delta: Partial<CompanyMetrics>): CompanyMetrics {
  const next = { ...base }
  for (const key of metricKeys) {
    const change = delta[key]
    if (typeof change === 'number') {
      next[key] = base[key] + change
    }
  }
  return normalizeMetrics(next)
}

function stableHash(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function drawBps(seed: string, key: string): number {
  return stableHash(`${seed}:${key}`) % 10_000
}

function makeId(prefix: string, seed: string): string {
  return `${prefix}_${stableHash(`${seed}:${prefix}:${Date.now().toString(36)}`).toString(36)}`
}

function containsAny(text: string, keywords: string[]): string[] {
  const normalized = text.toLowerCase()
  return keywords.filter((keyword) => normalized.includes(keyword.toLowerCase()))
}

/** Thrown when a client requests an analysis id not present in the scenario. */
export class UnknownAnalysisError extends Error {
  readonly code = 'UNKNOWN_ANALYSIS' as const

  constructor(analysisId: string) {
    super(`Unknown analysis: ${analysisId}`)
    this.name = 'UnknownAnalysisError'
  }
}

function geometricMean(values: number[]): number {
  const sanitized = values.map((value) => clamp(value, 1, 100))
  const logAverage = sanitized.reduce((sum, value) => sum + Math.log(value), 0) / sanitized.length
  return Math.round(Math.exp(logAverage))
}

export function createRun(scenarioId: ScenarioDefinition['id'], seed: string): RunState {
  const scenario = getScenario(scenarioId)
  const ledger: LedgerEvent[] = [
    {
      id: `situation_${scenario.id}_1`,
      type: 'situation',
      day: 0,
      title: scenario.decisionTitle,
      body: scenario.decisionContext,
      tone: 'warning',
    },
  ]

  return {
    schemaVersion: 1,
    runId: `run_${stableHash(`${scenarioId}:${seed}`).toString(36)}`,
    scenarioId,
    scenarioVersion: scenario.version,
    seed,
    revision: 1,
    day: 0,
    deadlineDay: scenario.deadlineDays,
    metrics: { ...scenario.startingMetrics },
    pendingAnalyses: [],
    completedAnalyses: [],
    decisions: [],
    scheduledEvents: [],
    ledger,
    processedIdempotencyKeys: [],
    status: 'active',
  }
}

export function requestAnalysis(run: RunState, analysisId: string): RunState {
  if (run.status !== 'active') return run
  if (run.completedAnalyses.some((item) => item.analysisId === analysisId)) return run
  if (run.pendingAnalyses.some((item) => item.analysisId === analysisId)) return run

  const scenario = getScenario(run.scenarioId)
  const analysis = scenario.analyses.find((candidate) => candidate.id === analysisId)
  if (!analysis) throw new UnknownAnalysisError(analysisId)

  const availableAtDay = run.day + analysis.durationDays
  return {
    ...run,
    revision: run.revision + 1,
    pendingAnalyses: [
      ...run.pendingAnalyses,
      {
        analysisId,
        requestedAtDay: run.day,
        availableAtDay,
      },
    ],
    ledger: [
      ...run.ledger,
      {
        id: `analysis_request_${analysisId}_${run.day}`,
        type: 'information',
        day: run.day,
        title: `Analyse gestartet: ${analysis.title}`,
        body: `Ergebnis erwartet an Simulations-Tag ${availableAtDay} (${analysis.durationDays} Tage).`,
        tone: 'neutral',
      },
    ],
  }
}

function resolveDueAnalyses(run: RunState, targetDay: number): Pick<RunState, 'pendingAnalyses' | 'completedAnalyses' | 'ledger'> {
  const scenario = getScenario(run.scenarioId)
  const stillPending = []
  const newlyCompleted = [...run.completedAnalyses]
  const ledger = [...run.ledger]

  for (const pending of run.pendingAnalyses) {
    if (pending.availableAtDay > targetDay) {
      stillPending.push(pending)
      continue
    }
    if (newlyCompleted.some((item) => item.analysisId === pending.analysisId)) continue
    const analysis = scenario.analyses.find((candidate) => candidate.id === pending.analysisId)
    if (!analysis) continue
    newlyCompleted.push({
      analysisId: pending.analysisId,
      completedAtDay: pending.availableAtDay,
      resultTitle: analysis.resultTitle,
      resultBody: analysis.resultBody,
      confidence: analysis.confidence,
    })
    ledger.push({
      id: `analysis_${pending.analysisId}_${pending.availableAtDay}`,
      type: 'information',
      day: pending.availableAtDay,
      title: analysis.resultTitle,
      body: analysis.resultBody,
      tone: analysis.confidence === 'high' ? 'positive' : 'neutral',
    })
  }

  return { pendingAnalyses: stillPending, completedAnalyses: newlyCompleted, ledger }
}

function inferActionKind(text: string, scenario: ScenarioDefinition): Array<{ kind: ActionKind; label: string }> {
  const matches = scenario.actionRules
    .map((rule) => ({ rule, score: containsAny(text, rule.keywords).length }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  const unique = new Map<ActionKind, string>()
  for (const match of matches) {
    if (!unique.has(match.rule.kind)) unique.set(match.rule.kind, match.rule.label)
  }
  return Array.from(unique.entries()).slice(0, 4).map(([kind, label]) => ({ kind, label }))
}

export function interpretDecisionLocally(
  run: RunState,
  playerText: string,
  rationale: string,
): ActionProposal {
  const scenario = getScenario(run.scenarioId)
  const combined = `${playerText}\n${rationale}`.trim()
  const inferred = inferActionKind(combined, scenario)
  const actions: ManagementAction[] = inferred.map((entry, index) => ({
    id: `action_${run.revision}_${index + 1}`,
    kind: entry.kind,
    label: entry.label,
    sourceText: playerText,
  }))

  if (actions.length === 0) {
    actions.push({
      id: `action_${run.revision}_1`,
      kind: 'prioritize_product',
      label: 'Strategische Prioritäten neu setzen',
      sourceText: playerText,
    })
  }

  const extractedObjectives = containsAny(combined, scenario.scoreRubric.objectiveKeywords)
  const extractedRisks = containsAny(combined, scenario.scoreRubric.riskKeywords)
  const alternativeSignals = containsAny(combined, ['alternativ', 'statt', 'parallel', 'schritt', 'wenn', 'oder', 'pilot'])
  const evidenceRefs = run.completedAnalyses.map((analysis) => analysis.analysisId)

  return {
    actions,
    assumptions: combined.toLowerCase().includes('annahme') ? ['Spieler benennt explizit Annahmen.'] : [],
    ambiguities: actions.length === 1 && playerText.length < 40 ? ['Die Entscheidung ist knapp formuliert; Umsetzungstiefe bleibt teilweise offen.'] : [],
    extractedObjectives,
    extractedRisks,
    extractedAlternatives: alternativeSignals,
    evidenceRefs,
  }
}

export function scoreDecision(
  run: RunState,
  proposal: ActionProposal,
  playerText: string,
  rationale: string,
): DecisionQuality {
  const scenario = getScenario(run.scenarioId)
  const combined = `${playerText}\n${rationale}`.toLowerCase()
  const framingHits = containsAny(combined, scenario.scoreRubric.framingKeywords).length
  const relevantAnalyses = scenario.scoreRubric.relevantAnalysisIds.filter((id) =>
    run.completedAnalyses.some((item) => item.analysisId === id),
  ).length
  const objectiveHits = proposal.extractedObjectives.length
  const riskHits = proposal.extractedRisks.length
  const alternativeHits = proposal.extractedAlternatives.length
  const hasReasoning = /weil|deshalb|damit|dadurch|um .* zu|risiko|trade.?off/.test(combined)
  const executionSignals = containsAny(combined, ['zuerst', 'danach', 'pilot', 'monat', 'phase', 'kpi', 'wenn', 'ziel', 'mindest']).length

  const framing = clamp(45 + framingHits * 11 + Math.min(riskHits, 2) * 6, 20, 100)
  const information = clamp(35 + relevantAnalyses * 18 + Math.min(proposal.evidenceRefs.length, 2) * 5, 20, 100)
  const alternatives = clamp(38 + alternativeHits * 13 + (proposal.actions.length > 1 ? 14 : 0), 20, 100)
  const objectives = clamp(42 + objectiveHits * 12, 20, 100)
  const reasoning = clamp(42 + (hasReasoning ? 24 : 0) + Math.min(riskHits, 3) * 7 + Math.min(objectiveHits, 2) * 5, 20, 100)
  const execution = clamp(45 + Math.min(executionSignals, 4) * 10 + (proposal.actions.length <= 4 ? 8 : 0), 20, 100)
  const total = geometricMean([framing, information, alternatives, objectives, reasoning, execution])

  return { framing, information, alternatives, objectives, reasoning, execution, total }
}

function resolveRule(scenario: ScenarioDefinition, action: ManagementAction) {
  return scenario.actionRules.find((rule) => rule.kind === action.kind)
}

export function commitDecision(
  run: RunState,
  playerText: string,
  rationale: string,
  proposal: ActionProposal,
  idempotencyKey?: string,
): RunState {
  if (run.status !== 'active') throw new Error('Run is not active')
  if (idempotencyKey && run.processedIdempotencyKeys.includes(idempotencyKey)) {
    return run
  }
  if (run.decisions.some((decision) => decision.playerText === playerText && decision.day === run.day)) {
    return run
  }

  const scenario = getScenario(run.scenarioId)
  const before = { ...run.metrics }
  let metrics = { ...run.metrics }
  const decisionId = `decision_${run.revision}_${stableHash(playerText).toString(36)}`
  const newScheduled: ScheduledEvent[] = []

  for (const action of proposal.actions) {
    const rule = resolveRule(scenario, action)
    if (!rule) continue
    metrics = addMetricDelta(metrics, rule.effect.metrics)
    if (rule.effect.delayed) {
      newScheduled.push({
        id: `${decisionId}_${action.id}_delayed`,
        dueDay: run.day + rule.effect.delayed.days,
        decisionId,
        title: rule.effect.delayed.title,
        body: rule.effect.delayed.body,
        probabilityBps: rule.effect.delayed.probabilityBps,
        successMetrics: rule.effect.delayed.successMetrics,
        failureMetrics: rule.effect.delayed.failureMetrics,
        resolved: false,
      })
    }
  }

  const quality = scoreDecision(run, proposal, playerText, rationale)
  const day = run.day + 1
  const decision = {
    id: decisionId,
    day,
    playerText,
    rationale,
    proposal,
    quality,
    before,
    afterImmediate: metrics,
  }

  const ledger: LedgerEvent[] = [
    ...run.ledger,
    {
      id: decisionId,
      type: 'decision',
      day,
      title: 'Entscheidung committed',
      body: proposal.actions.map((action) => action.label).join(' · '),
      tone: 'neutral',
    },
    {
      id: `${decisionId}_effect`,
      type: 'immediate_effect',
      day,
      title: 'Unmittelbare Wirkung',
      body: summarizeMetricDelta(before, metrics),
      causeId: decisionId,
      tone: 'neutral',
    },
    {
      id: `${decisionId}_review`,
      type: 'review',
      day,
      title: `Decision Quality ${quality.total}/100`,
      body: 'Bewertet wird der Entscheidungsprozess mit dem zu diesem Zeitpunkt verfügbaren Wissensstand – nicht das spätere Ergebnis.',
      causeId: decisionId,
      tone: quality.total >= 75 ? 'positive' : quality.total >= 55 ? 'warning' : 'negative',
    },
  ]

  const processedIdempotencyKeys = idempotencyKey
    ? [...run.processedIdempotencyKeys, idempotencyKey]
    : run.processedIdempotencyKeys

  return withFailureStatus({
    ...run,
    revision: run.revision + 1,
    day,
    metrics,
    decisions: [...run.decisions, decision],
    scheduledEvents: [...run.scheduledEvents, ...newScheduled],
    ledger,
    processedIdempotencyKeys,
  })
}

export function advanceTime(run: RunState, days: number): RunState {
  if (days <= 0) return run
  const targetDay = run.day + days
  let metrics = { ...run.metrics }
  const revealed = resolveDueAnalyses(run, targetDay)
  const ledger = [...revealed.ledger]
  const scheduledEvents = run.scheduledEvents.map((event) => {
    if (event.resolved || event.dueDay > targetDay) return event
    const draw = drawBps(run.seed, `${event.id}:${event.dueDay}`)
    const success = draw < event.probabilityBps
    metrics = addMetricDelta(metrics, success ? event.successMetrics : event.failureMetrics)
    ledger.push({
      id: `${event.id}_resolved`,
      type: 'delayed_effect',
      day: event.dueDay,
      title: event.title,
      body: `${event.body} Ergebnis: ${success ? 'günstiger Verlauf' : 'ungünstiger Verlauf'}.`,
      causeId: event.decisionId,
      tone: success ? 'positive' : 'negative',
    })
    return { ...event, resolved: true, outcome: success ? 'success' as const : 'failure' as const }
  })

  return withFailureStatus({
    ...run,
    revision: run.revision + 1,
    day: targetDay,
    metrics,
    pendingAnalyses: revealed.pendingAnalyses,
    completedAnalyses: revealed.completedAnalyses,
    scheduledEvents,
    ledger: ledger.sort((a, b) => a.day - b.day),
  })
}

function withFailureStatus(run: RunState): RunState {
  if (run.metrics.cashCents < 0) return { ...run, status: 'failed' }
  return run
}

export function summarizeMetricDelta(before: CompanyMetrics, after: CompanyMetrics): string {
  const items: string[] = []
  const revenueDelta = after.revenueAnnualCents - before.revenueAnnualCents
  const ebitdaDelta = after.ebitdaAnnualCents - before.ebitdaAnnualCents
  const cashDelta = after.cashCents - before.cashCents
  if (revenueDelta !== 0) items.push(`Umsatz ${formatSignedMoney(revenueDelta)}`)
  if (ebitdaDelta !== 0) items.push(`EBITDA ${formatSignedMoney(ebitdaDelta)}`)
  if (cashDelta !== 0) items.push(`Cash ${formatSignedMoney(cashDelta)}`)
  if (items.length === 0) items.push('Keine unmittelbare Finanzänderung; Wirkung liegt vor allem in Organisation oder Risiko.')
  return items.join(' · ')
}

function formatSignedMoney(cents: number): string {
  const euros = cents / 100
  const formatter = new Intl.NumberFormat('de-DE', { notation: 'compact', maximumFractionDigits: 1 })
  return `${cents >= 0 ? '+' : '−'}${formatter.format(Math.abs(euros))} €`
}

export function getNextPendingEventDay(run: RunState): number | null {
  const eventDays = run.scheduledEvents.filter((event) => !event.resolved).map((event) => event.dueDay)
  const analysisDays = run.pendingAnalyses.map((item) => item.availableAtDay)
  const pending = [...eventDays, ...analysisDays]
  return pending.length === 0 ? null : Math.min(...pending)
}
