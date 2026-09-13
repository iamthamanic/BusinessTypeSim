import { describe, expect, it } from 'vitest'
import {
  ACTION_PARAMS_SCHEMA_VERSION,
  availableCashCents,
  commitDecision,
  ConstraintViolationError,
  createRun,
  evaluateConstraints,
  reservedCashCents,
  type ActionProposal,
  type ManagementAction,
  type RunState,
} from '../shared/domain/index.ts'

function baseProposal(actions: ManagementAction[]): ActionProposal {
  return {
    actions,
    assumptions: [],
    ambiguities: [],
    extractedObjectives: [],
    extractedRisks: [],
    extractedAlternatives: [],
    evidenceRefs: [],
  }
}

function action(
  partial: Omit<ManagementAction, 'schemaVersion' | 'params' | 'sourceText'> & {
    sourceText?: string
    params?: ManagementAction['params']
  },
): ManagementAction {
  return {
    id: partial.id,
    kind: partial.kind,
    label: partial.label,
    sourceText: partial.sourceText ?? partial.label,
    schemaVersion: ACTION_PARAMS_SCHEMA_VERSION,
    params: partial.params ?? {},
  }
}

describe('feasibility constraint engine', () => {
  it('blocks explicit CAPEX above cash and leaves state unchanged on commit', () => {
    const run = createRun('nordkern-foods', 'cash-block')
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'allocate_capital',
        label: 'Überbudget Capex',
        params: { amountCents: run.metrics.cashCents + 100 },
      }),
    ])

    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'INSUFFICIENT_CASH')).toBe(true)
    expect(evaluation.warnings.length).toBeGreaterThanOrEqual(0)

    const before = structuredClone(run)
    expect(() => commitDecision(run, 'capex zu groß', 'test', proposal, 'key-cash-1')).toThrow(
      ConstraintViolationError,
    )
    expect(run.revision).toBe(before.revision)
    expect(run.decisions).toEqual(before.decisions)
    expect(run.metrics).toEqual(before.metrics)
  })

  it('blocks free-cash shortfall when amount is explicit and projects reserve liquidity', () => {
    const run = createRun('nordkern-foods', 'free-cash-block')
    const reserved = reservedCashCents(run.world)
    const free = availableCashCents(run)
    expect(reserved).toBeGreaterThan(0)
    expect(free).toBeLessThan(run.metrics.cashCents)

    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'allocate_capital',
        label: 'Capex über freiem Cash',
        params: { amountCents: free + 1_000_000 },
      }),
    ])

    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'INSUFFICIENT_FREE_CASH')).toBe(true)
  })

  it('blocks package when two CAPEX amounts jointly exceed cash (atomic)', () => {
    const run = createRun('nordkern-foods', 'package-cash')
    const half = Math.floor(run.metrics.cashCents / 2) + 10_000_000
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'allocate_capital',
        label: 'Capex A',
        params: { amountCents: half },
      }),
      action({
        id: 'a2',
        kind: 'start_project',
        label: 'Capex B',
        params: { amountCents: half, projectId: 'neue-linie' },
      }),
    ])

    expect(half * 2).toBeGreaterThan(run.metrics.cashCents)
    const evaluation = evaluateConstraints(run, proposal)
    expect(
      evaluation.blockers.some(
        (item) => item.code === 'PACKAGE_INSUFFICIENT_CASH' || item.code === 'INSUFFICIENT_CASH',
      ),
    ).toBe(true)

    const beforeRevision = run.revision
    expect(() =>
      commitDecision(run, 'zwei capex', 'zu teuer zusammen', proposal, 'key-pack-1'),
    ).toThrow(ConstraintViolationError)
    expect(run.revision).toBe(beforeRevision)
    expect(run.decisions).toHaveLength(0)
  })

  it('allows warnings (tight capacity) without blocking commit', () => {
    const run = createRun('nordkern-foods', 'capacity-warn')
    expect(run.metrics.capacityUtilizationBps).toBeGreaterThanOrEqual(9_000)

    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'set_pricing_policy',
        label: 'Pricing',
        params: { priceChangeBps: 100 },
      }),
      action({
        id: 'a2',
        kind: 'prioritize_product',
        label: 'Premium priorisieren',
        params: {},
      }),
    ])

    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers).toHaveLength(0)
    expect(evaluation.warnings.some((item) => item.code === 'CAPACITY_TIGHT')).toBe(true)

    const next = commitDecision(run, 'pricing + premium', 'trade-off ok', proposal, 'key-warn-1')
    expect(next.decisions).toHaveLength(1)
    expect(next.revision).toBe(run.revision + 1)
  })

  it('blocks unknown customer target when world entities exist', () => {
    const run = createRun('nordkern-foods', 'unknown-entity')
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'renegotiate_customer',
        label: 'Unbekannter Kunde',
        params: { targetId: 'acme-not-real' },
      }),
    ])
    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'UNKNOWN_ENTITY')).toBe(true)
  })

  it('blocks starting an already-active project', () => {
    const run = createRun('nordkern-foods', 'project-active')
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'start_project',
        label: 'Thüringen nochmal',
        params: { projectId: 'thuringia', amountCents: 1_000_000 },
      }),
    ])
    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'PROJECT_ALREADY_ACTIVE')).toBe(true)
  })

  it('blocks accept+reject conflict on same contract target', () => {
    const run = createRun('nordkern-foods', 'contract-conflict')
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'accept_contract',
        label: 'Annehmen',
        params: { targetId: 'energy-hedge' },
      }),
      action({
        id: 'a2',
        kind: 'reject_contract',
        label: 'Ablehnen',
        params: { targetId: 'energy-hedge' },
      }),
    ])
    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'ACTION_CONFLICT')).toBe(true)
  })

  it('blocks capacity-exhausted load actions', () => {
    const run: RunState = {
      ...createRun('nordkern-foods', 'cap-exhausted'),
      metrics: {
        ...createRun('nordkern-foods', 'cap-exhausted').metrics,
        capacityUtilizationBps: 11_500,
      },
    }
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'start_project',
        label: 'Zusatzprojekt',
        params: { projectId: 'brand-new', amountCents: 100_000 },
      }),
    ])
    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'CAPACITY_EXHAUSTED')).toBe(true)
  })

  it('server-bypass style: crafted oversized payload cannot mutate via commitDecision', () => {
    const run = createRun('nexora-saas', 'bypass-attempt')
    const proposal = baseProposal([
      action({
        id: 'evil',
        kind: 'allocate_capital',
        label: 'Manipuliert',
        params: { amountCents: 99_000_000_000 },
      }),
    ])
    try {
      commitDecision(run, 'bypass', 'bypass', proposal, 'bypass-key')
      expect.unreachable('commit should throw')
    } catch (error) {
      expect(error).toBeInstanceOf(ConstraintViolationError)
      const violation = error as ConstraintViolationError
      expect(violation.code).toBe('CONSTRAINT_VIOLATION')
      expect(violation.evaluation.blockers.length).toBeGreaterThan(0)
    }
    expect(run.decisions).toHaveLength(0)
  })

  it('resolves known Lidl alias without unknown-entity blocker', () => {
    const run = createRun('nordkern-foods', 'lidl-alias')
    const proposal = baseProposal([
      action({
        id: 'a1',
        kind: 'renegotiate_customer',
        label: 'Lidl neu verhandeln',
        params: { targetId: 'lidl' },
      }),
    ])
    const evaluation = evaluateConstraints(run, proposal)
    expect(evaluation.blockers.some((item) => item.code === 'UNKNOWN_ENTITY')).toBe(false)
  })
})
