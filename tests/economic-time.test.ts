import { describe, expect, it } from 'vitest'
import {
  advanceTime,
  analysisCompletesAfterDeadline,
  createRun,
  hasDeadlineConsequence,
} from '../shared/domain/index.ts'

describe('economic time + soft deadlines', () => {
  it('applies deterministic cash ticks when advancing time', () => {
    const run = createRun('nordkern-foods', 'econ-tick-1')
    const advanced = advanceTime(run, 3)
    expect(advanced.day).toBe(run.day + 3)
    expect(advanced.ledger.some((entry) => entry.id === 'econ_tick_1')).toBe(true)
    expect(advanced.ledger.some((entry) => entry.id === 'econ_tick_3')).toBe(true)
    const again = advanceTime(advanced, 0)
    expect(again.revision).toBe(advanced.revision)
  })

  it('missed deadline without decision injects soft consequence, not hard fail', () => {
    const run = createRun('nexora-saas', 'deadline-miss-1')
    const days = run.deadlineDay - run.day + 1
    const advanced = advanceTime(run, days)
    expect(hasDeadlineConsequence(advanced)).toBe(true)
    expect(advanced.status).not.toBe('failed')
    expect(advanced.ledger.some((entry) => entry.id === 'deadline_missed')).toBe(true)
  })

  it('same seed yields same deadline branch', () => {
    const a = advanceTime(createRun('nexora-saas', 'deadline-seed'), 20)
    const b = advanceTime(createRun('nexora-saas', 'deadline-seed'), 20)
    expect(a.metrics).toEqual(b.metrics)
    expect(a.ledger.map((e) => e.id)).toEqual(b.ledger.map((e) => e.id))
  })

  it('flags analyses that complete after deadline', () => {
    expect(analysisCompletesAfterDeadline(20, 14)).toBe(true)
    expect(analysisCompletesAfterDeadline(10, 14)).toBe(false)
  })
})
