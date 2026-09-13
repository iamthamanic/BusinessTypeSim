import { describe, expect, it } from 'vitest'
import {
  collectAdvisorToolContext,
  createRun,
  getAdvisorWorldView,
  getPlayerWorldView,
  getScenario,
  getScenarioAtVersion,
  listPublishedScenarioVersions,
  listWorldEntityIds,
  normalizeRunState,
  playerWorldContextSummary,
  WORLD_STATE_SCHEMA_VERSION,
} from '../shared/domain/index.ts'

describe('world state v2 modules', () => {
  it('createRun seeds Nordkern/Nexora with typed modules and schemaVersion 2', () => {
    const nordkern = createRun('nordkern-foods', 'ws-v2-nk')
    const nexora = createRun('nexora-saas', 'ws-v2-nx')

    expect(nordkern.schemaVersion).toBe(WORLD_STATE_SCHEMA_VERSION)
    expect(nexora.schemaVersion).toBe(WORLD_STATE_SCHEMA_VERSION)
    expect(nordkern.scenarioVersion).toBe(2)
    expect(nexora.scenarioVersion).toBe(2)

    for (const moduleName of [
      'customers',
      'products',
      'departments',
      'projects',
      'keyPeople',
      'locations',
      'contracts',
      'competitors',
    ] as const) {
      expect(nordkern.world[moduleName].length).toBeGreaterThan(0)
      expect(nexora.world[moduleName].length).toBeGreaterThan(0)
    }

    const ids = listWorldEntityIds(nordkern.world)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id.startsWith('nk_'))).toBe(true)
  })

  it('disabled industry modules stay empty arrays (no fake entities)', () => {
    const run = createRun('klarwerk-services', 'ws-v2-empty')
    expect(run.schemaVersion).toBe(2)
    expect(run.scenarioVersion).toBe(1)
    expect(listWorldEntityIds(run.world)).toEqual([])
  })
})

describe('player / advisor spoiler leakage', () => {
  it('player view omits hidden, researchable, and advisor-only truth', () => {
    const run = createRun('nordkern-foods', 'spoiler-player')
    const player = getPlayerWorldView(run)
    const playerJson = JSON.stringify(playerWorldContextSummary(player))

    expect(player.customers.some((c) => c.id === 'nk_cust_lidl')).toBe(true)
    expect(player.customers.find((c) => c.id === 'nk_cust_lidl')?.contributionMarginBps).toBeUndefined()
    expect(player.contracts.some((c) => c.id === 'nk_contract_energy_hedge')).toBe(false)
    expect(player.departments.some((d) => d.id === 'nk_dept_hr')).toBe(false)
    expect(player.competitors.some((c) => c.id === 'nk_comp_alpine')).toBe(false)
    expect(player.keyPeople.find((k) => k.id === 'nk_person_plant_th')?.flightRiskBps).toBeUndefined()
    expect(player.competitors.find((c) => c.id === 'nk_comp_milchkraft')?.threatBps).toBeUndefined()

    expect(playerJson).not.toContain('750')
    expect(playerJson).not.toContain('nk_contract_energy_hedge')
    expect(playerJson).not.toContain('"flightRiskBps":3800')
    expect(playerJson).not.toContain('"threatBps":6200')
    expect(playerJson).not.toContain('"contributionMarginBps"')
  })

  it('advisor view includes advisor_visible but still strips hidden/researchable', () => {
    const run = createRun('nordkern-foods', 'spoiler-advisor')
    const advisor = getAdvisorWorldView(run)
    const ctx = collectAdvisorToolContext(run, 'coo')

    expect(advisor.departments.some((d) => d.id === 'nk_dept_hr')).toBe(true)
    expect(advisor.competitors.some((c) => c.id === 'nk_comp_alpine')).toBe(true)
    expect(advisor.competitors.find((c) => c.id === 'nk_comp_alpine')?.threatBps).toBe(4100)
    expect(advisor.contracts.some((c) => c.id === 'nk_contract_energy_hedge')).toBe(false)
    expect(advisor.keyPeople.find((k) => k.id === 'nk_person_plant_th')?.flightRiskBps).toBeUndefined()
    expect(advisor.competitors.find((c) => c.id === 'nk_comp_milchkraft')?.threatBps).toBeUndefined()

    expect(ctx).toContain('nk_dept_hr')
    expect(ctx).not.toContain('nk_contract_energy_hedge')
    expect(ctx).not.toContain('"flightRiskBps":3800')
    expect(ctx).not.toContain('"threatBps":6200')
  })

  it('revealed knowledge unlocks fields without mutating truth', () => {
    const run = createRun('nordkern-foods', 'reveal-test')
    run.playerKnowledge = {
      revealedEntityIds: ['nk_contract_energy_hedge'],
      revealedFieldKeys: ['nk_cust_lidl:contributionMarginBps'],
    }
    const player = getPlayerWorldView(run)
    expect(player.contracts.some((c) => c.id === 'nk_contract_energy_hedge')).toBe(true)
    expect(player.customers.find((c) => c.id === 'nk_cust_lidl')?.contributionMarginBps).toBe(750)
    expect(run.world.customers.find((c) => c.id === 'nk_cust_lidl')?.contributionMarginVisibility).toBe(
      'researchable',
    )
  })
})

describe('scenario version binding + v1 normalize', () => {
  it('publishes Nordkern/Nexora v1 and v2 immutably in parallel', () => {
    expect(listPublishedScenarioVersions('nordkern-foods')).toEqual([1, 2])
    expect(listPublishedScenarioVersions('nexora-saas')).toEqual([1, 2])
    const v1 = getScenarioAtVersion('nordkern-foods', 1)
    const v2 = getScenarioAtVersion('nordkern-foods', 2)
    const latest = getScenario('nordkern-foods')
    expect(v1.version).toBe(1)
    expect(v1.initialWorld).toBeUndefined()
    expect(v2.version).toBe(2)
    expect(v2.initialWorld?.customers.length).toBeGreaterThan(0)
    expect(latest.version).toBe(2)
  })

  it('normalizes legacy v1 snapshots without inventing campaign entities', () => {
    const legacy = {
      schemaVersion: 1 as const,
      runId: 'run_legacy',
      scenarioId: 'nordkern-foods' as const,
      scenarioVersion: 1,
      seed: 'legacy-seed',
      revision: 1,
      day: 0,
      deadlineDay: 21,
      metrics: getScenarioAtVersion('nordkern-foods', 1).startingMetrics,
      pendingAnalyses: [],
      completedAnalyses: [],
      decisions: [],
      scheduledEvents: [],
      ledger: [],
      processedIdempotencyKeys: [],
      status: 'active' as const,
    }

    const normalized = normalizeRunState(legacy)
    expect(normalized.schemaVersion).toBe(2)
    expect(normalized.scenarioVersion).toBe(1)
    expect(listWorldEntityIds(normalized.world)).toEqual([])
    expect(normalized.playerKnowledge).toEqual({ revealedEntityIds: [], revealedFieldKeys: [] })
  })

  it('ended entities remain referenceable in truth and player view', () => {
    const run = createRun('nordkern-foods', 'ended-entity')
    const ended = run.world.customers.find((c) => c.id === 'nk_cust_legacy_promo')
    expect(ended?.lifecycle).toBe('ended')
    const player = getPlayerWorldView(run)
    expect(player.customers.find((c) => c.id === 'nk_cust_legacy_promo')?.lifecycle).toBe('ended')
  })

  it('same seed yields identical world entity ids (SIM-01)', () => {
    const a = createRun('nexora-saas', 'det-world')
    const b = createRun('nexora-saas', 'det-world')
    expect(a.world).toEqual(b.world)
    expect(a.runId).toBe(b.runId)
  })
})
