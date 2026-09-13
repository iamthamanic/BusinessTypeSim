import {
  ACTION_PARAMS_SCHEMA_VERSION,
  ensureManagementAction,
  inferParamsFromText,
} from './action-params.ts'
import { ConstraintViolationError, evaluateConstraints, hasConstraintBlockers } from './constraints.ts'
import {
  applyCampaignDay,
  bootstrapCampaignState,
  resolveActiveSituation,
} from './campaign.ts'
import { getPublishedCampaignForScenario } from './campaign-fixtures.ts'
import { scoreDecisionSemantic } from './decision-quality.ts'
import { applyEconomicDay, softDeadlineConsequence } from './economic-tick.ts'
import {
  captureOutcomeBaseSnapshot,
  compareOutcomes,
  OUTCOME_HORIZON_DAYS,
  projectToHorizon,
  runFromOutcomeSnapshot,
  type CounterfactualProjection,
  type OutcomeBaseSnapshot,
  type OutcomeComparison,
} from './outcomes.ts'
import { getScenario, getScenarioAtVersion } from './scenarios.ts'
import type {
  ActionKind,
  ActionProposal,
  CompanyMetrics,
  DecisionQuality,
  DecisionRecord,
  LedgerEvent,
  ManagementAction,
  RunState,
  ScenarioDefinition,
  ScheduledEvent,
} from './types.ts'
import { WORLD_STATE_SCHEMA_VERSION, cloneWorldModules, emptyKnowledgeSet, emptyWorldModules } from './world-state.ts'

function scenarioForRun(run: Pick<RunState, 'scenarioId' | 'scenarioVersion'>): ScenarioDefinition {
  return getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
}

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

export function createRun(scenarioId: ScenarioDefinition['id'], seed: string): RunState {
  const scenario = getScenario(scenarioId)
  const world = cloneWorldModules(scenario.initialWorld ?? emptyWorldModules())
  const campaignDefinition = getPublishedCampaignForScenario(scenarioId)
  const boot = bootstrapCampaignState({
    campaign: campaignDefinition,
    seed,
    deadlineDay: scenario.deadlineDays,
  })
  return {
    schemaVersion: WORLD_STATE_SCHEMA_VERSION,
    runId: `run_${stableHash(`${scenarioId}:${seed}`).toString(36)}`,
    scenarioId,
    scenarioVersion: scenario.version,
    seed,
    revision: 1,
    day: 0,
    deadlineDay: boot.deadlineDay,
    metrics: { ...scenario.startingMetrics },
    pendingAnalyses: [],
    completedAnalyses: [],
    decisions: [],
    scheduledEvents: [],
    ledger: boot.ledger,
    processedIdempotencyKeys: [],
    status: 'active',
    world,
    playerKnowledge: emptyKnowledgeSet(),
    advisorKnowledge: emptyKnowledgeSet(),
    campaign: boot.campaign,
  }
}

export function requestAnalysis(run: RunState, analysisId: string): RunState {
  if (run.status !== 'active') return run
  if (run.completedAnalyses.some((item) => item.analysisId === analysisId)) return run
  if (run.pendingAnalyses.some((item) => item.analysisId === analysisId)) return run

  const scenario = scenarioForRun(run)
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

function resolveDueAnalyses(
  run: RunState,
  day: number,
  pendingAnalyses: RunState['pendingAnalyses'],
  completedAnalyses: RunState['completedAnalyses'],
  ledger: LedgerEvent[],
): Pick<RunState, 'pendingAnalyses' | 'completedAnalyses'> & { ledger: LedgerEvent[] } {
  const scenario = scenarioForRun(run)
  const newlyCompleted = [...completedAnalyses]
  const nextLedger = [...ledger]

  const dueToday = pendingAnalyses
    .filter((pending) => pending.availableAtDay === day)
    .slice()
    .sort((a, b) => a.analysisId.localeCompare(b.analysisId))

  for (const pending of dueToday) {
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
    nextLedger.push({
      id: `analysis_${pending.analysisId}_${pending.availableAtDay}`,
      type: 'information',
      day: pending.availableAtDay,
      title: analysis.resultTitle,
      body: analysis.resultBody,
      tone: analysis.confidence === 'high' ? 'positive' : 'neutral',
    })
  }

  const stillPending = pendingAnalyses.filter((pending) => pending.availableAtDay > day)

  return {
    pendingAnalyses: stillPending,
    completedAnalyses: newlyCompleted,
    ledger: nextLedger,
  }
}

function resolveScheduledEventsForDay(
  run: Pick<RunState, 'seed'>,
  day: number,
  events: ScheduledEvent[],
  metrics: CompanyMetrics,
  ledger: LedgerEvent[],
): { scheduledEvents: ScheduledEvent[]; metrics: CompanyMetrics; ledger: LedgerEvent[] } {
  let nextMetrics = metrics
  const nextLedger = [...ledger]
  const sortedDue = events
    .map((event, index) => ({ event, index }))
    .filter(({ event }) => !event.resolved && event.dueDay === day)
    .sort((a, b) => a.event.id.localeCompare(b.event.id) || a.index - b.index)

  const resolvedIds = new Set(sortedDue.map(({ event }) => event.id))
  const scheduledEvents = events.map((event) => {
    if (!resolvedIds.has(event.id)) return event
    const draw = drawBps(run.seed, `${event.id}:${event.dueDay}`)
    const success = draw < event.probabilityBps
    nextMetrics = addMetricDelta(nextMetrics, success ? event.successMetrics : event.failureMetrics)
    nextLedger.push({
      id: `${event.id}_resolved`,
      type: event.id.startsWith('deadline_') ? 'deadline_consequence' : 'delayed_effect',
      day: event.dueDay,
      title: event.title,
      body: `${event.body} Ergebnis: ${success ? 'günstiger Verlauf' : 'ungünstiger Verlauf'}.`,
      causeId: event.decisionId,
      tone: success ? 'positive' : 'negative',
    })
    return { ...event, resolved: true, outcome: success ? ('success' as const) : ('failure' as const) }
  })

  return { scheduledEvents, metrics: nextMetrics, ledger: nextLedger }
}

function compareLedgerEvents(a: LedgerEvent, b: LedgerEvent): number {
  if (a.day !== b.day) return a.day - b.day
  const order = (type: LedgerEvent['type']): number => {
    switch (type) {
      case 'economic':
        return 0
      case 'information':
        return 1
      case 'delayed_effect':
        return 2
      case 'deadline_consequence':
        return 3
      case 'campaign':
        return 4
      case 'situation':
        return 5
      case 'decision':
        return 6
      case 'immediate_effect':
        return 7
      case 'review':
        return 8
      default:
        return 9
    }
  }
  const typeDelta = order(a.type) - order(b.type)
  if (typeDelta !== 0) return typeDelta
  return a.id.localeCompare(b.id)
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
  const scenario = scenarioForRun(run)
  const combined = `${playerText}\n${rationale}`.trim()
  const inferred = inferActionKind(combined, scenario)
  const paramAmbiguities: string[] = []
  const actions: ManagementAction[] = inferred.map((entry, index) => {
    const inferredParams = inferParamsFromText(entry.kind, combined)
    paramAmbiguities.push(...inferredParams.ambiguities)
    return {
      id: `action_${run.revision}_${index + 1}`,
      kind: entry.kind,
      label: entry.label,
      sourceText: playerText,
      schemaVersion: ACTION_PARAMS_SCHEMA_VERSION,
      params: inferredParams.params,
    }
  })

  if (actions.length === 0) {
    actions.push({
      id: `action_${run.revision}_1`,
      kind: 'prioritize_product',
      label: 'Strategische Prioritäten neu setzen',
      sourceText: playerText,
      schemaVersion: ACTION_PARAMS_SCHEMA_VERSION,
      params: {},
    })
  }

  const extractedObjectives = containsAny(combined, scenario.scoreRubric.objectiveKeywords)
  const extractedRisks = containsAny(combined, scenario.scoreRubric.riskKeywords)
  const alternativeSignals = [
    ...containsAny(combined, ['alternativ', 'statt', 'parallel', 'entweder', 'option']),
    ...(/pilot/i.test(combined) && /statt|oder|falls|ansonsten/i.test(combined) ? ['pilot-fallback'] : []),
  ]
  const evidenceRefs = run.completedAnalyses.map((analysis) => analysis.analysisId)
  const ambiguities = [
    ...(actions.length === 1 && playerText.length < 40
      ? ['Die Entscheidung ist knapp formuliert; Umsetzungstiefe bleibt teilweise offen.']
      : []),
    ...Array.from(new Set(paramAmbiguities)),
  ]

  return {
    actions,
    assumptions: combined.toLowerCase().includes('annahme') ? ['Spieler benennt explizit Annahmen.'] : [],
    ambiguities,
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
  return scoreDecisionSemantic(run, proposal, playerText, rationale).quality
}

function resolveRule(scenario: ScenarioDefinition, action: ManagementAction) {
  return scenario.actionRules.find((rule) => rule.kind === action.kind)
}

/**
 * Pick an alternate ManagementAction path from the bound ScenarioVersion
 * (first rule kind not present in the committed proposal).
 */
export function buildAlternateProposal(
  snapshot: OutcomeBaseSnapshot,
  primary: ActionProposal,
): ActionProposal | null {
  const scenario = scenarioForRun(snapshot)
  const primaryKinds = new Set(primary.actions.map((action) => action.kind))
  const alternateRule = scenario.actionRules.find((rule) => !primaryKinds.has(rule.kind))
  if (!alternateRule) return null

  const template = primary.actions[0]
  const action: ManagementAction = {
    id: `counterfactual_alt_1`,
    kind: alternateRule.kind,
    label: alternateRule.label,
    sourceText: template?.sourceText ?? 'counterfactual',
    schemaVersion: template?.schemaVersion ?? 1,
    params: {},
  }
  return {
    actions: [action],
    assumptions: ['Automatischer Gegenpfad aus Scenario-Rules.'],
    ambiguities: [],
    extractedObjectives: [],
    extractedRisks: [],
    extractedAlternatives: [alternateRule.kind],
    evidenceRefs: [],
  }
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

  const preDecisionSnapshot = captureOutcomeBaseSnapshot(run)
  const scenario = scenarioForRun(run)
  const before = { ...run.metrics }
  let metrics = { ...run.metrics }
  const decisionId = `decision_${run.revision}_${stableHash(playerText).toString(36)}`
  const newScheduled: ScheduledEvent[] = []
  const normalizedProposal: ActionProposal = {
    ...proposal,
    actions: proposal.actions.map(ensureManagementAction),
  }

  const constraints = evaluateConstraints(run, normalizedProposal)
  if (hasConstraintBlockers(constraints)) {
    throw new ConstraintViolationError(constraints)
  }

  for (const action of normalizedProposal.actions) {
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

  const scored = scoreDecisionSemantic(run, normalizedProposal, playerText, rationale)
  const day = run.day + 1
  const decision = {
    id: decisionId,
    day,
    playerText,
    rationale,
    proposal: normalizedProposal,
    quality: scored.quality,
    contextSnapshot: scored.context,
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
      body: normalizedProposal.actions.map((action) => action.label).join(' · '),
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
      title: `Decision Quality ${scored.quality.total}/100`,
      body: 'Bewertet wird der Entscheidungsprozess mit dem zu diesem Zeitpunkt verfügbaren Wissensstand – nicht das spätere Ergebnis.',
      causeId: decisionId,
      tone: scored.quality.total >= 75 ? 'positive' : scored.quality.total >= 55 ? 'warning' : 'negative',
    },
  ]

  const processedIdempotencyKeys = idempotencyKey
    ? [...run.processedIdempotencyKeys, idempotencyKey]
    : run.processedIdempotencyKeys

  const campaignDefinition = getPublishedCampaignForScenario(run.scenarioId)
  const resolvedCampaign = resolveActiveSituation(
    { ...run, day },
    campaignDefinition,
    decisionId,
  )
  let next: RunState = withFailureStatus({
    ...run,
    revision: run.revision + 1,
    day,
    metrics,
    decisions: [...run.decisions, decision],
    scheduledEvents: [...run.scheduledEvents, ...newScheduled],
    ledger: [...ledger, ...resolvedCampaign.ledger],
    processedIdempotencyKeys,
    campaign: resolvedCampaign.campaign,
  })

  // Same-day campaign tick after resolve so newly eligible situations can activate.
  const camp = applyCampaignDay(next, campaignDefinition, day)
  next = withFailureStatus({
    ...next,
    campaign: camp.campaign,
    deadlineDay: camp.deadlineDay,
    status:
      camp.status === 'completed'
        ? 'completed'
        : camp.status === 'failed'
          ? 'failed'
          : next.status,
    ledger: [...next.ledger, ...camp.ledger].slice().sort(compareLedgerEvents),
  })

  const withSnapshot: RunState = {
    ...next,
    decisions: next.decisions.map((item, index) =>
      index === next.decisions.length - 1
        ? {
            ...item,
            preDecisionSnapshot,
            outcomeBaseSnapshot: captureOutcomeBaseSnapshot(next),
          }
        : item,
    ),
  }
  return withSnapshot
}

/**
 * Alternate-action counterfactual from a frozen pre-decision snapshot.
 * Fail-closed — never mutates the live run or Decision Quality.
 */
export function projectCounterfactualAlternate(args: {
  preDecisionSnapshot: OutcomeBaseSnapshot
  playerText: string
  rationale: string
  proposal: ActionProposal
  horizonDays?: number
  seed?: string
}): CounterfactualProjection {
  const horizonDays = args.horizonDays ?? OUTCOME_HORIZON_DAYS
  const seed = args.seed ?? `${args.preDecisionSnapshot.seed}:counterfactual:alt`
  try {
    const fork = runFromOutcomeSnapshot(args.preDecisionSnapshot, seed)
    const committed = commitDecision(fork, args.playerText, args.rationale, args.proposal, `lt-cf-${seed}`)
    const decisionDay = committed.decisions.at(-1)?.day ?? committed.day
    const projection = projectToHorizon(committed, horizonDays, decisionDay)
    return {
      label: args.proposal.actions.map((action) => action.label).join(' · ') || 'Gegenpfad',
      actionKinds: args.proposal.actions.map((action) => action.kind),
      projection,
      seed,
      failed: projection.status === 'failed',
    }
  } catch {
    return {
      label: args.proposal.actions.map((action) => action.label).join(' · ') || 'Gegenpfad',
      actionKinds: args.proposal.actions.map((action) => action.kind),
      projection: {
        metrics: { ...args.preDecisionSnapshot.metrics },
        day: args.preDecisionSnapshot.day,
        status: args.preDecisionSnapshot.status,
        daysSimulated: 0,
        endedEarly: true,
        endReason: 'failed',
      },
      seed,
      failed: true,
    }
  }
}

/**
 * Full long-term outcome comparison for a decision: Actual, luck batch, optional alternate path.
 * Read-only vs `liveRun`; does not rewrite DQ.
 */
export function compareDecisionOutcomes(
  liveRun: RunState,
  decision: DecisionRecord,
  options?: { batchSize?: number; horizonDays?: number },
): OutcomeComparison | null {
  if (!decision.outcomeBaseSnapshot) return null
  const horizonDays = options?.horizonDays ?? OUTCOME_HORIZON_DAYS
  let counterfactual: CounterfactualProjection | null = null
  if (decision.preDecisionSnapshot) {
    const alternate = buildAlternateProposal(decision.preDecisionSnapshot, decision.proposal)
    if (alternate) {
      counterfactual = projectCounterfactualAlternate({
        preDecisionSnapshot: decision.preDecisionSnapshot,
        playerText: decision.playerText,
        rationale: decision.rationale,
        proposal: alternate,
        horizonDays,
      })
    }
  }
  return compareOutcomes({
    liveRun,
    baseSnapshot: decision.outcomeBaseSnapshot,
    decisionDay: decision.day,
    batchSize: options?.batchSize ?? 11,
    horizonDays,
    counterfactual,
  })
}

export function advanceTime(run: RunState, days: number): RunState {
  if (days <= 0) return run
  if (run.status !== 'active') return run

  const targetDay = run.day + days
  let metrics = { ...run.metrics }
  let world = run.world
  let pendingAnalyses = [...run.pendingAnalyses]
  let completedAnalyses = [...run.completedAnalyses]
  let scheduledEvents = [...run.scheduledEvents]
  let ledger = [...run.ledger]

  let campaign = run.campaign
  let decisions = run.decisions
  let deadlineDay = run.deadlineDay
  let status: RunState['status'] = run.status
  const campaignDefinition = getPublishedCampaignForScenario(run.scenarioId)

  // Per-day stable order: economic → analyses → scheduled → soft deadline → campaign.
  for (let day = run.day + 1; day <= targetDay; day += 1) {
    const tick = applyEconomicDay(
      { metrics, world, ledger, scheduledEvents, decisions },
      day,
    )
    metrics = tick.metrics
    world = tick.world
    ledger = [...ledger, ...tick.ledger]

    const analyses = resolveDueAnalyses(run, day, pendingAnalyses, completedAnalyses, ledger)
    pendingAnalyses = analyses.pendingAnalyses
    completedAnalyses = analyses.completedAnalyses
    ledger = analyses.ledger

    const scheduled = resolveScheduledEventsForDay(run, day, scheduledEvents, metrics, ledger)
    scheduledEvents = scheduled.scheduledEvents
    metrics = scheduled.metrics
    ledger = scheduled.ledger

    const deadline = softDeadlineConsequence(
      {
        metrics,
        ledger,
        scheduledEvents,
        decisions,
        deadlineDay,
        seed: run.seed,
      },
      day,
    )
    if (deadline.ledger.length > 0 || deadline.scheduledEvents.length > 0) {
      metrics = addMetricDelta(metrics, deadline.metrics)
      ledger = [...ledger, ...deadline.ledger]
      scheduledEvents = [...scheduledEvents, ...deadline.scheduledEvents]
    }

    if (campaignDefinition) {
      const dayRun: RunState = {
        ...run,
        day,
        metrics,
        world,
        pendingAnalyses,
        completedAnalyses,
        scheduledEvents,
        ledger,
        campaign,
        decisions,
        deadlineDay,
        status: metrics.cashCents < 0 ? 'failed' : status,
      }
      const camp = applyCampaignDay(dayRun, campaignDefinition, day)
      campaign = camp.campaign
      deadlineDay = camp.deadlineDay
      status = camp.status
      ledger = [...ledger, ...camp.ledger]
    }
  }

  return withFailureStatus({
    ...run,
    revision: run.revision + 1,
    day: targetDay,
    metrics,
    world,
    pendingAnalyses,
    completedAnalyses,
    scheduledEvents,
    ledger: ledger.slice().sort(compareLedgerEvents),
    campaign,
    deadlineDay,
    status: status === 'failed' || metrics.cashCents < 0 ? 'failed' : status,
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
  const contractDays = run.world.contracts
    .filter((contract) => contract.lifecycle === 'active' && contract.renewalDay > run.day)
    .map((contract) => contract.renewalDay)
  const deadlineDays: number[] = []
  if (run.status === 'active' && run.decisions.length === 0) {
    if (run.day < run.deadlineDay) deadlineDays.push(run.deadlineDay)
    else if (run.day === run.deadlineDay) deadlineDays.push(run.deadlineDay + 1)
  }
  const situationDeadlines = run.campaign.situations
    .filter((item) => item.status === 'active' && item.deadlineDay !== undefined && item.deadlineDay > run.day)
    .map((item) => item.deadlineDay as number)
  const pending = [...eventDays, ...analysisDays, ...contractDays, ...deadlineDays, ...situationDeadlines]
  return pending.length === 0 ? null : Math.min(...pending)
}
