import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  analysisCompletesAfterDeadline,
  commitDecision,
  createRun,
  dailyCashDeltaFromEbitda,
  getNextPendingEventDay,
  hasDeadlineConsequence,
  interpretDecisionLocally,
  requestAnalysis,
} from '../shared/domain/index.ts'

describe('economic time + soft deadlines', () => {
  it('applies deterministic cash ticks when advancing time', () => {
    const run = createRun('nordkern-foods', 'econ-tick-1')
    const perDay = dailyCashDeltaFromEbitda(run.metrics.ebitdaAnnualCents)
    const advanced = advanceTime(run, 3)
    expect(advanced.metrics.cashCents).toBe(run.metrics.cashCents + perDay * 3)
    expect(advanced.ledger.some((entry) => entry.id === 'econ_tick_1')).toBe(true)
    expect(advanced.ledger.filter((entry) => entry.id === 'econ_tick_1')).toHaveLength(1)
  })

  it('advances project progress and contract renewals', () => {
    const run = createRun('nordkern-foods', 'econ-projects-1')
    const before = run.world.projects.find((p) => p.id === 'nk_proj_thuringia_auto')!.progressBps
    const advanced = advanceTime(run, 5)
    expect(advanced.world.projects.find((p) => p.id === 'nk_proj_thuringia_auto')!.progressBps).toBeGreaterThan(before)
    expect(advanceTime(run, 90).ledger.some((e) => e.id.includes('contract_renewal_nk_contract_energy_hedge'))).toBe(true)
  })

  it('missed deadline without decision injects soft consequence, not hard fail', () => {
    const run = createRun('nexora-saas', 'deadline-miss-1')
    const advanced = advanceTime(run, run.deadlineDay - run.day + 1)
    expect(hasDeadlineConsequence(advanced)).toBe(true)
    expect(advanced.status).not.toBe('failed')
    expect(advanced.ledger.some((e) => e.id === 'deadline_missed')).toBe(true)
    expect(advanceTime(advanced, 1).ledger.filter((e) => e.id === 'deadline_missed')).toHaveLength(1)
  })

  it('decision before deadline prevents miss consequences', () => {
    let run = createRun('nexora-saas', 'deadline-met-1')
    const text = 'Wir halten TransLog mit klarer Roadmap und priorisieren Mid-Market parallel, ohne neues Großprojekt zu starten.'
    const rationale = 'Ziel: ARR und Runway. Risiko: Abhängigkeit. Alternative: nur Renewal.'
    const proposal = interpretDecisionLocally(run, text, rationale)
    proposal.actions = proposal.actions.filter((a) => a.kind !== 'start_project')
    if (proposal.actions.length === 0) {
      proposal.actions = [{ id: 'a1', kind: 'prioritize_product', label: 'Prioritäten', sourceText: text, schemaVersion: 1, params: {} }]
    }
    run = commitDecision(run, text, rationale, proposal, 'deadline-met-key-001')
    expect(hasDeadlineConsequence(advanceTime(run, run.deadlineDay + 5))).toBe(false)
  })

  it('same seed yields identical metrics and stable same-day ordering', () => {
    const a = advanceTime(createRun('nexora-saas', 'deadline-seed'), 20)
    const b = advanceTime(createRun('nexora-saas', 'deadline-seed'), 20)
    expect(a.metrics).toEqual(b.metrics)
    expect(a.ledger.map((e) => e.id)).toEqual(b.ledger.map((e) => e.id))
    const day15 = a.ledger.filter((e) => e.day === 15)
    expect(day15.map((e) => e.type).indexOf('deadline_consequence')).toBeGreaterThan(day15.map((e) => e.type).indexOf('economic'))
  })

  it('flags analyses that complete after deadline', () => {
    expect(analysisCompletesAfterDeadline(20, 14)).toBe(true)
    expect(analysisCompletesAfterDeadline(10, 14)).toBe(false)
  })

  it('getNextPendingEventDay includes soft deadline crossing', () => {
    const run = createRun('nordkern-foods', 'next-deadline')
    expect(getNextPendingEventDay(run)).toBe(run.deadlineDay)
    expect(getNextPendingEventDay({ ...run, day: run.deadlineDay })).toBe(run.deadlineDay + 1)
  })

  it('analysis unlock still works with economic ticks', () => {
    let run = createRun('nordkern-foods', 'unlock-econ')
    run = requestAnalysis(run, 'food-profitability')
    run = advanceTime(run, run.pendingAnalyses[0]!.availableAtDay - run.day)
    expect(run.completedAnalyses).toHaveLength(1)
    expect(run.ledger.some((e) => e.id.startsWith('econ_tick_'))).toBe(true)
  })
})
