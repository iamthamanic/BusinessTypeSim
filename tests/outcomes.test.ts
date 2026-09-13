import { describe, expect, it } from 'vitest'
import {
  compareOutcomes,
  commitDecision,
  createRun,
  interpretDecisionLocally,
  OUTCOME_HORIZON_DAYS,
  projectToHorizon,
} from '../shared/domain/index.ts'

describe('long-term outcomes', () => {
  it('projects actual horizon without mutating the live run', () => {
    let run = createRun('nordkern-foods', 'outcome-actual')
    const text =
      'Zuerst Pilot in Thüringen, weil Kapazität eng ist. Danach Lidl verhandeln. Falls der Pilot scheitert, stoppen wir Capex.'
    const rationale = 'Ziel: Resilienz. Annahme: Cash-Puffer. Alternative: nur Renegotiation.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    run = commitDecision(run, text, rationale, proposal, 'outcome-key-1')
    const dayBefore = run.day
    const cashBefore = run.metrics.cashCents
    const decision = run.decisions[0]!
    expect(decision.outcomeBaseSnapshot).toBeDefined()

    const projected = projectToHorizon(run, OUTCOME_HORIZON_DAYS, decision.day)
    expect(projected.daysSimulated).toBeGreaterThan(0)
    expect(run.day).toBe(dayBefore)
    expect(run.metrics.cashCents).toBe(cashBefore)
    expect(projected.day).toBeGreaterThanOrEqual(decision.day)
  })

  it('comparison batch is deterministic and does not mutate live run', () => {
    let run = createRun('nordkern-foods', 'outcome-batch')
    const text =
      'Wir starten einen Pilot und verhandeln parallel, weil Konzentration und Cash kritisch sind.'
    const rationale = 'Ziel: Marge. Falls Cash eng wird, Fallback ohne Rollout.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    run = commitDecision(run, text, rationale, proposal, 'outcome-key-2')
    const decision = run.decisions[0]!
    const revision = run.revision
    const snapshot = decision.outcomeBaseSnapshot!
    const a = compareOutcomes({
      liveRun: run,
      baseSnapshot: snapshot,
      decisionDay: decision.day,
      batchSize: 9,
    })
    const b = compareOutcomes({
      liveRun: run,
      baseSnapshot: snapshot,
      decisionDay: decision.day,
      batchSize: 9,
    })
    expect(a.liveRunMutated).toBe(false)
    expect(run.revision).toBe(revision)
    expect(a.median.cashCents).toBe(b.median.cashCents)
    expect(a.expected.revenueAnnualCents).toBe(b.expected.revenueAnnualCents)
    expect(a.actualCashPercentile).toBeGreaterThanOrEqual(0)
    expect(a.actualCashPercentile).toBeLessThanOrEqual(100)
    expect(a.samples.length).toBe(9)
    // DQ untouched by outcome math
    expect(run.decisions[0]!.quality.total).toBe(decision.quality.total)
  })
})
