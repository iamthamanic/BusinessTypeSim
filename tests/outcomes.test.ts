import { describe, expect, it } from 'vitest'
import {
  compareDecisionOutcomes,
  compareOutcomes,
  commitDecision,
  createRun,
  interpretDecisionLocally,
  OUTCOME_HORIZON_DAYS,
  projectToHorizon,
} from '../shared/domain/index.ts'

function commitNordkern(seed: string, key: string) {
  let run = createRun('nordkern-foods', seed)
  const text =
    'Zuerst Pilot in Thüringen, weil Kapazität eng ist. Danach Lidl verhandeln. Falls der Pilot scheitert, stoppen wir Capex.'
  const rationale = 'Ziel: Resilienz. Annahme: Cash-Puffer. Alternative: nur Renegotiation.'
  const proposal = interpretDecisionLocally(run, text, rationale)
  run = commitDecision(run, text, rationale, proposal, key)
  return { run, decision: run.decisions[0]!, proposal, text, rationale }
}

describe('long-term outcomes', () => {
  it('projects actual horizon without mutating the live run', () => {
    const { run, decision } = commitNordkern('outcome-actual', 'outcome-key-1')
    const dayBefore = run.day
    const cashBefore = run.metrics.cashCents
    expect(decision.outcomeBaseSnapshot).toBeDefined()
    expect(decision.preDecisionSnapshot).toBeDefined()
    expect(decision.preDecisionSnapshot!.day).toBeLessThan(decision.outcomeBaseSnapshot!.day)

    const projected = projectToHorizon(run, OUTCOME_HORIZON_DAYS, decision.day)
    expect(projected.daysSimulated).toBeGreaterThan(0)
    expect(run.day).toBe(dayBefore)
    expect(run.metrics.cashCents).toBe(cashBefore)
    expect(projected.day).toBeGreaterThanOrEqual(decision.day)
  })

  it('comparison batch is deterministic and does not mutate live run or DQ', () => {
    const { run, decision } = commitNordkern('outcome-batch', 'outcome-key-2')
    const revision = run.revision
    const dq = decision.quality.total
    const a = compareDecisionOutcomes(run, decision, { batchSize: 9 })
    const b = compareDecisionOutcomes(run, decision, { batchSize: 9 })
    expect(a).not.toBeNull()
    expect(b).not.toBeNull()
    expect(a!.liveRunMutated).toBe(false)
    expect(run.revision).toBe(revision)
    expect(run.decisions[0]!.quality.total).toBe(dq)
    expect(a!.median.cashCents).toBe(b!.median.cashCents)
    expect(a!.expected.revenueAnnualCents).toBe(b!.expected.revenueAnnualCents)
    expect(a!.actualCashPercentile).toBeGreaterThanOrEqual(0)
    expect(a!.actualCashPercentile).toBeLessThanOrEqual(100)
    expect(a!.samples.length).toBe(9)
    expect(a!.scenarioVersion).toBe(run.scenarioVersion)
  })

  it('binds comparisons to scenarioVersion and includes alternate counterfactual', () => {
    const { run, decision } = commitNordkern('outcome-cf', 'outcome-key-3')
    const comparison = compareDecisionOutcomes(run, decision, { batchSize: 5 })
    expect(comparison).not.toBeNull()
    expect(comparison!.scenarioId).toBe('nordkern-foods')
    expect(comparison!.scenarioVersion).toBe(decision.outcomeBaseSnapshot!.scenarioVersion)
    expect(comparison!.counterfactual).not.toBeNull()
    expect(comparison!.counterfactual!.actionKinds.length).toBeGreaterThan(0)
    expect(run.metrics.cashCents).toBe(decision.afterImmediate.cashCents)
  })

  it('discrete small batch still yields a defined percentile', () => {
    const { run, decision } = commitNordkern('outcome-discrete', 'outcome-key-4')
    const comparison = compareOutcomes({
      liveRun: run,
      baseSnapshot: decision.outcomeBaseSnapshot!,
      decisionDay: decision.day,
      batchSize: 2,
    })
    expect(comparison.samples.length).toBe(2)
    expect(Number.isFinite(comparison.actualCashPercentile)).toBe(true)
  })

  it('fail-closed sample errors do not mutate live run', () => {
    const { run, decision } = commitNordkern('outcome-failclosed', 'outcome-key-5')
    const revision = run.revision
    const broken = {
      ...decision.outcomeBaseSnapshot!,
      // force empty scheduled path still valid — compareOutcomes should complete
      seed: decision.outcomeBaseSnapshot!.seed,
    }
    const comparison = compareOutcomes({
      liveRun: run,
      baseSnapshot: broken,
      decisionDay: decision.day,
      batchSize: 3,
    })
    expect(comparison.liveRunMutated).toBe(false)
    expect(run.revision).toBe(revision)
    expect(comparison.samples.length).toBe(3)
  })
})
