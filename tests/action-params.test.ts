import { describe, expect, it } from 'vitest'
import {
  ACTION_PARAMS_SCHEMA_VERSION,
  allocateCapitalParamsSchema,
  changeHeadcountPlanParamsSchema,
  createRun,
  inferParamsFromText,
  interpretDecisionLocally,
  normalizeActionParams,
  PARAMETERIZED_ACTION_KINDS,
  parseManagementAction,
  renegotiateCustomerParamsSchema,
  restructureOrganizationParamsSchema,
  setPricingPolicyParamsSchema,
  startProjectParamsSchema,
  type ActionKind,
} from '../shared/domain/index.ts'

const schemas = {
  allocate_capital: allocateCapitalParamsSchema,
  renegotiate_customer: renegotiateCustomerParamsSchema,
  change_headcount_plan: changeHeadcountPlanParamsSchema,
  set_pricing_policy: setPricingPolicyParamsSchema,
  start_project: startProjectParamsSchema,
  restructure_organization: restructureOrganizationParamsSchema,
} as const

describe('parameterized action schemas', () => {
  it('accepts valid params for each of the six kinds', () => {
    const fixtures: Record<(typeof PARAMETERIZED_ACTION_KINDS)[number], unknown> = {
      allocate_capital: {
        amountCents: 800_000_000,
        scope: 'pilot',
        timingDays: 90,
        conditions: 'nur bei Zielerreichung',
        fallback: 'Stopp Ausrollung',
      },
      renegotiate_customer: {
        targetId: 'lidl',
        amountCents: 150_000_000,
        conditions: 'Mindestmarge',
      },
      change_headcount_plan: {
        headcountDelta: -12,
        timingDays: 180,
      },
      set_pricing_policy: {
        priceChangeBps: 150,
        scope: 'premium',
      },
      start_project: {
        projectId: 'automatisierung',
        amountCents: 25_000_000,
        scope: 'Thüringen',
      },
      restructure_organization: {
        orgChange: 'zentralisieren',
        scope: 'werke',
      },
    }

    for (const kind of PARAMETERIZED_ACTION_KINDS) {
      const parsed = schemas[kind].safeParse(fixtures[kind])
      expect(parsed.success, kind).toBe(true)
    }
  })

  it('rejects float money and unknown fields', () => {
    expect(allocateCapitalParamsSchema.safeParse({ amountCents: 12.5 }).success).toBe(false)
    expect(allocateCapitalParamsSchema.safeParse({ amountCents: 100, inventMe: true }).success).toBe(false)
    expect(setPricingPolicyParamsSchema.safeParse({ priceChangeBps: 1.5 }).success).toBe(false)
    expect(changeHeadcountPlanParamsSchema.safeParse({ headcountDelta: 2.2 }).success).toBe(false)
  })

  it('roundtrips parseManagementAction with schemaVersion and params', () => {
    const raw = {
      id: 'a1',
      kind: 'allocate_capital' as const,
      label: 'Capex freigeben',
      sourceText: '8 Mio. € für Thüringen',
      schemaVersion: ACTION_PARAMS_SCHEMA_VERSION,
      params: { amountCents: 800_000_000, scope: 'Thüringen' },
    }
    const parsed = parseManagementAction(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.action.schemaVersion).toBe(1)
    expect(parsed.action.params.amountCents).toBe(800_000_000)
    expect(parsed.action.params.scope).toBe('Thüringen')

    const again = parseManagementAction(parsed.action)
    expect(again.ok).toBe(true)
    if (!again.ok) return
    expect(again.action).toEqual(parsed.action)
  })

  it('defaults missing schemaVersion/params without inventing amounts', () => {
    const parsed = parseManagementAction({
      id: 'legacy',
      kind: 'allocate_capital',
      label: 'Budget',
      sourceText: 'Kapital freigeben',
    })
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.action.schemaVersion).toBe(1)
    expect(parsed.action.params.amountCents).toBeUndefined()
  })
})

describe('ambiguity — never invent unclear amounts', () => {
  it('leaves amountCents unset when money is vague', () => {
    const result = inferParamsFromText('allocate_capital', 'Wir geben etwas Kapital für Automatisierung frei.')
    expect(result.params.amountCents).toBeUndefined()
    expect(result.ambiguities.some((item) => /betrag|unklar/i.test(item))).toBe(true)
  })

  it('parses clear Mio amounts as integer cents', () => {
    const result = inferParamsFromText(
      'allocate_capital',
      'Automatisiere Thüringen als Pilot mit maximal 8 Mio. € und rolle nur bei Zielerreichung aus; ansonsten Stopp.',
    )
    expect(result.params.amountCents).toBe(800_000_000)
    expect(Number.isInteger(result.params.amountCents)).toBe(true)
    expect(result.params.scope?.toLowerCase()).toContain('thüringen')
    expect(result.params.conditions).toBeTruthy()
    expect(result.params.fallback).toBeTruthy()
  })

  it('normalizeActionParams strips unknown keys', () => {
    const result = normalizeActionParams('set_pricing_policy', {
      priceChangeBps: 200,
      unknownField: 'nope',
    })
    expect(result.ok).toBe(false)
    expect(result.params).toEqual({})
  })
})

describe('local interpretation attaches params', () => {
  it('parameterizes inferred actions and surfaces ambiguities', () => {
    const run = createRun('nordkern-foods', 'params-interpret')
    const proposal = interpretDecisionLocally(
      run,
      'Wir automatisieren Thüringen mit Budget und verhandeln Lidl.',
      'Ziele Marge; Risiko Cash.',
    )
    expect(proposal.actions.length).toBeGreaterThan(0)
    for (const action of proposal.actions) {
      expect(action.schemaVersion).toBe(1)
      expect(action.params).toBeTypeOf('object')
    }
    const capital = proposal.actions.find((action) => action.kind === 'allocate_capital')
    if (capital) {
      expect(capital.params.amountCents).toBeUndefined()
      expect(proposal.ambiguities.length).toBeGreaterThan(0)
    }
  })

  it('covers all parameterized kinds via schema map', () => {
    const kinds = Object.keys(schemas) as ActionKind[]
    expect(kinds).toHaveLength(6)
    expect(PARAMETERIZED_ACTION_KINDS).toEqual(kinds)
  })
})
