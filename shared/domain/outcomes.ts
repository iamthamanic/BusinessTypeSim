/**
 * Long-term outcome projection and seeded luck comparison batch.
 * Location: shared/domain/outcomes.ts
 * Does not mutate Decision Quality; comparisons never write the live run.
 * Alternate-action commits live in engine.ts to avoid an import cycle.
 */
import { advanceTime } from './engine.ts'
import type { CompanyMetrics, DecisionRecord, RunState } from './types.ts'

export const OUTCOME_HORIZON_DAYS = 365
export const DEFAULT_COMPARISON_BATCH_SIZE = 21

export interface OutcomeBaseSnapshot {
  schemaVersion: RunState['schemaVersion']
  runId: string
  scenarioId: RunState['scenarioId']
  scenarioVersion: number
  seed: string
  revision: number
  day: number
  deadlineDay: number
  metrics: CompanyMetrics
  world: RunState['world']
  playerKnowledge: RunState['playerKnowledge']
  advisorKnowledge: RunState['advisorKnowledge']
  pendingAnalyses: RunState['pendingAnalyses']
  completedAnalyses: RunState['completedAnalyses']
  decisions: DecisionRecord[]
  scheduledEvents: RunState['scheduledEvents']
  ledger: RunState['ledger']
  processedIdempotencyKeys: string[]
  status: RunState['status']
  campaign: RunState['campaign']
}

export interface HorizonProjection {
  metrics: CompanyMetrics
  day: number
  status: RunState['status']
  daysSimulated: number
  endedEarly: boolean
  endReason: 'horizon' | 'failed' | 'already_past'
}

export interface OutcomeSample {
  seed: string
  metrics: CompanyMetrics
  day: number
  status: RunState['status']
  endedEarly: boolean
}

export interface CounterfactualProjection {
  label: string
  actionKinds: string[]
  projection: HorizonProjection
  seed: string
  failed: boolean
}

export interface OutcomeComparison {
  horizonDays: number
  scenarioId: RunState['scenarioId']
  scenarioVersion: number
  actual: HorizonProjection
  samples: OutcomeSample[]
  expected: CompanyMetrics
  median: CompanyMetrics
  /** 0–100: share of samples with cash <= actual cash (higher = luckier on cash). */
  actualCashPercentile: number
  counterfactual: CounterfactualProjection | null
  liveRunMutated: false
}

function cloneJson<T>(value: T): T {
  return structuredClone(value)
}

export function captureOutcomeBaseSnapshot(run: RunState): OutcomeBaseSnapshot {
  return {
    schemaVersion: run.schemaVersion,
    runId: run.runId,
    scenarioId: run.scenarioId,
    scenarioVersion: run.scenarioVersion,
    seed: run.seed,
    revision: run.revision,
    day: run.day,
    deadlineDay: run.deadlineDay,
    metrics: cloneJson(run.metrics),
    world: cloneJson(run.world),
    playerKnowledge: cloneJson(run.playerKnowledge),
    advisorKnowledge: cloneJson(run.advisorKnowledge),
    pendingAnalyses: cloneJson(run.pendingAnalyses),
    completedAnalyses: cloneJson(run.completedAnalyses),
    decisions: cloneJson(run.decisions),
    scheduledEvents: cloneJson(run.scheduledEvents),
    ledger: cloneJson(run.ledger),
    processedIdempotencyKeys: [...run.processedIdempotencyKeys],
    status: run.status,
    campaign: cloneJson(run.campaign),
  }
}

export function runFromOutcomeSnapshot(snapshot: OutcomeBaseSnapshot, seedOverride?: string): RunState {
  return {
    ...cloneJson(snapshot),
    seed: seedOverride ?? snapshot.seed,
  }
}

export function projectToHorizon(
  run: RunState,
  horizonDays: number = OUTCOME_HORIZON_DAYS,
  fromDecisionDay?: number,
): HorizonProjection {
  const startDay = fromDecisionDay ?? run.day
  const targetDay = startDay + horizonDays
  if (run.day >= targetDay) {
    return {
      metrics: cloneJson(run.metrics),
      day: run.day,
      status: run.status,
      daysSimulated: 0,
      endedEarly: run.status === 'failed',
      endReason: run.status === 'failed' ? 'failed' : 'already_past',
    }
  }

  const clone = cloneJson(run)
  const days = targetDay - clone.day
  const projected = advanceTime(clone, days)
  return {
    metrics: projected.metrics,
    day: projected.day,
    status: projected.status,
    daysSimulated: projected.day - run.day,
    endedEarly: projected.status === 'failed' || projected.day < targetDay,
    endReason: projected.status === 'failed' ? 'failed' : projected.day >= targetDay ? 'horizon' : 'failed',
  }
}

function metricKeys(): Array<keyof CompanyMetrics> {
  return [
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
}

function emptyMetrics(): CompanyMetrics {
  return {
    revenueAnnualCents: 0,
    ebitdaAnnualCents: 0,
    cashCents: 0,
    headcount: 0,
    capacityUtilizationBps: 0,
    customerConcentrationBps: 0,
    moraleBps: 0,
    resilienceBps: 0,
    marketPositionBps: 0,
  }
}

function averageMetrics(samples: CompanyMetrics[]): CompanyMetrics {
  const first = samples[0]
  if (!first) return emptyMetrics()
  const keys = metricKeys()
  const out = { ...first }
  for (const key of keys) {
    const sum = samples.reduce((acc, item) => acc + item[key], 0)
    out[key] = Math.round(sum / samples.length)
  }
  return out
}

function medianMetrics(samples: CompanyMetrics[]): CompanyMetrics {
  const first = samples[0]
  if (!first) return emptyMetrics()
  const keys = metricKeys()
  const out = { ...first }
  for (const key of keys) {
    const sorted = samples.map((item) => item[key]).sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    out[key] =
      sorted.length % 2 === 0
        ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
        : sorted[mid]!
  }
  return out
}

function percentileRank(values: number[], actual: number): number {
  if (values.length === 0) return 50
  const belowOrEqual = values.filter((value) => value <= actual).length
  return Math.round((belowOrEqual / values.length) * 100)
}

export function comparisonSeed(baseSeed: string, index: number): string {
  return `${baseSeed}:outcome:${index}`
}

/**
 * Build Actual + luck comparison distribution.
 * Optional `counterfactual` is attached by the caller (engine) after an alternate-action fork.
 * Never mutates `liveRun`. DQ is not read or written.
 */
export function compareOutcomes(args: {
  liveRun: RunState
  baseSnapshot: OutcomeBaseSnapshot
  decisionDay: number
  batchSize?: number
  horizonDays?: number
  counterfactual?: CounterfactualProjection | null
}): OutcomeComparison {
  const horizonDays = args.horizonDays ?? OUTCOME_HORIZON_DAYS
  const batchSize = Math.max(1, Math.min(args.batchSize ?? DEFAULT_COMPARISON_BATCH_SIZE, 64))

  const actual = projectToHorizon(args.liveRun, horizonDays, args.decisionDay)

  const samples: OutcomeSample[] = []
  for (let index = 0; index < batchSize; index += 1) {
    const seed = comparisonSeed(args.baseSnapshot.seed, index)
    try {
      const clone = runFromOutcomeSnapshot(args.baseSnapshot, seed)
      const projected = projectToHorizon(clone, horizonDays, args.decisionDay)
      samples.push({
        seed,
        metrics: projected.metrics,
        day: projected.day,
        status: projected.status,
        endedEarly: projected.endedEarly,
      })
    } catch {
      // fail-closed: skip failed sample; do not touch live run
    }
  }

  const metricList = samples.map((sample) => sample.metrics)
  const expected = metricList.length > 0 ? averageMetrics(metricList) : actual.metrics
  const median = metricList.length > 0 ? medianMetrics(metricList) : actual.metrics
  const actualCashPercentile =
    metricList.length > 0
      ? percentileRank(
          metricList.map((item) => item.cashCents),
          actual.metrics.cashCents,
        )
      : 50

  return {
    horizonDays,
    scenarioId: args.baseSnapshot.scenarioId,
    scenarioVersion: args.baseSnapshot.scenarioVersion,
    actual,
    samples,
    expected,
    median,
    actualCashPercentile,
    counterfactual: args.counterfactual ?? null,
    liveRunMutated: false,
  }
}
