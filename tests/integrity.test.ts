import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  collectAdvisorToolContext,
  commitDecision,
  createRun,
  getPlayerScenario,
  getScenario,
  interpretDecisionLocally,
  requestAnalysis,
  runAdvisorTool,
  toPlayerAnalysis,
} from '../shared/domain/index.ts'

describe('determinism', () => {
  it('same seed yields identical metrics after identical ops', () => {
    const seed = 'determinism-fixture-v1'
    const a = play(seed)
    const b = play(seed)
    expect(a.metrics).toEqual(b.metrics)
    expect(a.day).toBe(b.day)
    expect(a.completedAnalyses).toEqual(b.completedAnalyses)
    expect(a.decisions[0]?.quality.total).toBe(b.decisions[0]?.quality.total)
  })
})

describe('pending analysis + hidden player catalog', () => {
  it('request schedules pending without revealing result', () => {
    let run = createRun('nordkern-foods', 'pending-test')
    run = requestAnalysis(run, 'food-profitability')
    expect(run.pendingAnalyses).toHaveLength(1)
    expect(run.completedAnalyses).toHaveLength(0)
    const player = getPlayerScenario(run.scenarioId)
    expect(player.analyses[0]).not.toHaveProperty('resultBody')
    const authoring = getScenario(run.scenarioId).analyses[0]
    expect(authoring?.resultBody.length).toBeGreaterThan(10)
    expect(toPlayerAnalysis(authoring!)).not.toHaveProperty('resultBody')
    expect(toPlayerAnalysis(authoring!)).not.toHaveProperty('resultTitle')
  })

  it('advance unlocks result once', () => {
    let run = createRun('nordkern-foods', 'unlock-test')
    run = requestAnalysis(run, 'food-profitability')
    const availableAt = run.pendingAnalyses[0]!.availableAtDay
    run = advanceTime(run, availableAt - run.day)
    expect(run.completedAnalyses).toHaveLength(1)
    expect(run.completedAnalyses[0]?.resultBody.length).toBeGreaterThan(0)
    expect(run.pendingAnalyses).toHaveLength(0)
  })
})

describe('commit idempotency', () => {
  it('same key does not double-apply', () => {
    let run = createRun('nordkern-foods', 'idem-test')
    const text = 'Wir automatisieren Thüringen und verhandeln Lidl-Marge.'
    const rationale = 'Ziele Marge und Kapazität; Risiko Cash und Lidl.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    const key = 'idem-key-abc-12345'
    run = commitDecision(run, text, rationale, proposal, key)
    const rev = run.revision
    const cash = run.metrics.cashCents
    run = commitDecision(run, text, rationale, proposal, key)
    expect(run.revision).toBe(rev)
    expect(run.metrics.cashCents).toBe(cash)
    expect(run.decisions).toHaveLength(1)
  })
})

describe('advisor tools', () => {
  it('denies tools outside role domains and never unlocks locked analyses', () => {
    const run = createRun('nordkern-foods', 'advisor-test')
    const locked = getScenario(run.scenarioId).analyses[0]!.resultBody
    const ctx = collectAdvisorToolContext(run, 'coo')
    expect(ctx).not.toContain(locked)
    const bad = runAdvisorTool(run, 'missing-advisor', 'get_completed_analyses')
    expect(bad.ok).toBe(false)
  })
})

function play(seed: string) {
  let run = createRun('nordkern-foods', seed)
  run = requestAnalysis(run, 'food-profitability')
  const due = run.pendingAnalyses[0]!.availableAtDay
  run = advanceTime(run, due - run.day)
  const text = 'Wir automatisieren zuerst Thüringen als Pilot und verhandeln Lidl auf eine Mindestmarge.'
  const rationale = 'Marge und Kapazität schrittweise; Risiko Cash und Lidl.'
  const proposal = interpretDecisionLocally(run, text, rationale)
  return commitDecision(run, text, rationale, proposal, `key-${seed}`)
}
