/**
 * World State V2 helpers — empty modules, migration, player/advisor read models.
 * Location: shared/domain/world-state.ts
 * Pure domain: no React, DB, or LLM imports.
 */
import type {
  CompetitorEntity,
  CustomerEntity,
  KnowledgeSet,
  KnowledgeVisibility,
  KeyPersonEntity,
  PlayerCompetitorView,
  PlayerContractView,
  PlayerCustomerView,
  PlayerDepartmentView,
  PlayerKeyPersonView,
  PlayerLocationView,
  PlayerProductView,
  PlayerProjectView,
  PlayerWorldView,
  RunState,
  WorldModules,
} from './types.ts'

export const WORLD_STATE_SCHEMA_VERSION = 2 as const

export function emptyKnowledgeSet(): KnowledgeSet {
  return { revealedEntityIds: [], revealedFieldKeys: [] }
}

export function emptyWorldModules(): WorldModules {
  return {
    customers: [],
    products: [],
    departments: [],
    projects: [],
    keyPeople: [],
    locations: [],
    contracts: [],
    competitors: [],
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizeKnowledgeSet(raw: unknown): KnowledgeSet {
  if (!isRecord(raw)) return emptyKnowledgeSet()
  return {
    revealedEntityIds: asStringArray(raw.revealedEntityIds),
    revealedFieldKeys: asStringArray(raw.revealedFieldKeys),
  }
}

function normalizeWorldModules(raw: unknown): WorldModules {
  if (!isRecord(raw)) return emptyWorldModules()
  const empty = emptyWorldModules()
  return {
    customers: Array.isArray(raw.customers) ? (raw.customers as WorldModules['customers']) : empty.customers,
    products: Array.isArray(raw.products) ? (raw.products as WorldModules['products']) : empty.products,
    departments: Array.isArray(raw.departments) ? (raw.departments as WorldModules['departments']) : empty.departments,
    projects: Array.isArray(raw.projects) ? (raw.projects as WorldModules['projects']) : empty.projects,
    keyPeople: Array.isArray(raw.keyPeople) ? (raw.keyPeople as WorldModules['keyPeople']) : empty.keyPeople,
    locations: Array.isArray(raw.locations) ? (raw.locations as WorldModules['locations']) : empty.locations,
    contracts: Array.isArray(raw.contracts) ? (raw.contracts as WorldModules['contracts']) : empty.contracts,
    competitors: Array.isArray(raw.competitors) ? (raw.competitors as WorldModules['competitors']) : empty.competitors,
  }
}

/** Clone scenario seed world into a run (immutable copy). */
export function cloneWorldModules(world: WorldModules): WorldModules {
  return {
    customers: world.customers.map((item) => ({ ...item })),
    products: world.products.map((item) => ({ ...item })),
    departments: world.departments.map((item) => ({ ...item })),
    projects: world.projects.map((item) => ({ ...item })),
    keyPeople: world.keyPeople.map((item) => ({ ...item })),
    locations: world.locations.map((item) => ({ ...item })),
    contracts: world.contracts.map((item) => ({ ...item })),
    competitors: world.competitors.map((item) => ({ ...item })),
  }
}

/**
 * Ensure run carries World State V2 modules + knowledge.
 * V1 snapshots get empty modules unless `seedWorld` is provided (from bound scenario version).
 */
export function ensureWorldStateV2(
  run: Omit<RunState, 'world' | 'playerKnowledge' | 'advisorKnowledge' | 'schemaVersion'> & {
    schemaVersion?: 1 | 2
    world?: WorldModules
    playerKnowledge?: KnowledgeSet
    advisorKnowledge?: KnowledgeSet
  },
  seedWorld?: WorldModules,
): RunState {
  const world =
    run.world !== undefined
      ? normalizeWorldModules(run.world)
      : cloneWorldModules(seedWorld ?? emptyWorldModules())
  return {
    ...run,
    schemaVersion: WORLD_STATE_SCHEMA_VERSION,
    world,
    playerKnowledge: normalizeKnowledgeSet(run.playerKnowledge),
    advisorKnowledge: normalizeKnowledgeSet(run.advisorKnowledge),
  }
}

function fieldKey(entityId: string, field: string): string {
  return `${entityId}:${field}`
}

function entityVisible(
  visibility: KnowledgeVisibility,
  knowledge: KnowledgeSet,
  entityId: string,
  audience: 'player' | 'advisor',
): boolean {
  if (knowledge.revealedEntityIds.includes(entityId)) return true
  if (visibility === 'system_only' || visibility === 'hidden' || visibility === 'researchable') {
    return false
  }
  if (visibility === 'player_visible') return true
  if (visibility === 'advisor_visible') return audience === 'advisor'
  return false
}

function fieldVisible(
  visibility: KnowledgeVisibility | undefined,
  knowledge: KnowledgeSet,
  entityId: string,
  field: string,
  audience: 'player' | 'advisor',
): boolean {
  if (visibility === undefined) return true
  if (knowledge.revealedFieldKeys.includes(fieldKey(entityId, field))) return true
  return entityVisible(visibility, knowledge, entityId, audience)
}

function mapCustomer(
  entity: CustomerEntity,
  knowledge: KnowledgeSet,
  audience: 'player' | 'advisor',
): PlayerCustomerView | null {
  if (!entityVisible(entity.visibility, knowledge, entity.id, audience)) return null
  const view: PlayerCustomerView = {
    id: entity.id,
    name: entity.name,
    lifecycle: entity.lifecycle,
    segment: entity.segment,
    revenueShareBps: entity.revenueShareBps,
  }
  if (
    entity.contributionMarginBps !== undefined &&
    fieldVisible(entity.contributionMarginVisibility, knowledge, entity.id, 'contributionMarginBps', audience)
  ) {
    view.contributionMarginBps = entity.contributionMarginBps
  }
  return view
}

function mapCompetitor(
  entity: CompetitorEntity,
  knowledge: KnowledgeSet,
  audience: 'player' | 'advisor',
): PlayerCompetitorView | null {
  if (!entityVisible(entity.visibility, knowledge, entity.id, audience)) return null
  const view: PlayerCompetitorView = {
    id: entity.id,
    name: entity.name,
    lifecycle: entity.lifecycle,
    segmentFocus: entity.segmentFocus,
  }
  if (
    entity.threatBps !== undefined &&
    fieldVisible(entity.threatVisibility, knowledge, entity.id, 'threatBps', audience)
  ) {
    view.threatBps = entity.threatBps
  }
  return view
}

function mapKeyPerson(
  entity: KeyPersonEntity,
  knowledge: KnowledgeSet,
  audience: 'player' | 'advisor',
): PlayerKeyPersonView | null {
  if (!entityVisible(entity.visibility, knowledge, entity.id, audience)) return null
  const view: PlayerKeyPersonView = {
    id: entity.id,
    name: entity.name,
    lifecycle: entity.lifecycle,
    role: entity.role,
  }
  if (entity.departmentId !== undefined) view.departmentId = entity.departmentId
  if (
    entity.flightRiskBps !== undefined &&
    fieldVisible(entity.flightRiskVisibility, knowledge, entity.id, 'flightRiskBps', audience)
  ) {
    view.flightRiskBps = entity.flightRiskBps
  }
  return view
}

function toAudienceWorldView(run: RunState, audience: 'player' | 'advisor'): PlayerWorldView {
  const knowledge = audience === 'player' ? run.playerKnowledge : run.advisorKnowledge
  const world = run.world

  const customers = world.customers
    .map((item) => mapCustomer(item, knowledge, audience))
    .filter((item): item is PlayerCustomerView => item !== null)

  const products: PlayerProductView[] = world.products
    .filter((item) => entityVisible(item.visibility, knowledge, item.id, audience))
    .map((item) => ({
      id: item.id,
      name: item.name,
      lifecycle: item.lifecycle,
      category: item.category,
      annualRevenueCents: item.annualRevenueCents,
    }))

  const departments: PlayerDepartmentView[] = world.departments
    .filter((item) => entityVisible(item.visibility, knowledge, item.id, audience))
    .map((item) => ({
      id: item.id,
      name: item.name,
      lifecycle: item.lifecycle,
      headcount: item.headcount,
      focus: item.focus,
    }))

  const projects: PlayerProjectView[] = world.projects
    .filter((item) => entityVisible(item.visibility, knowledge, item.id, audience))
    .map((item) => ({
      id: item.id,
      name: item.name,
      lifecycle: item.lifecycle,
      budgetCents: item.budgetCents,
      progressBps: item.progressBps,
    }))

  const keyPeople = world.keyPeople
    .map((item) => mapKeyPerson(item, knowledge, audience))
    .filter((item): item is PlayerKeyPersonView => item !== null)

  const locations: PlayerLocationView[] = world.locations
    .filter((item) => entityVisible(item.visibility, knowledge, item.id, audience))
    .map((item) => ({
      id: item.id,
      name: item.name,
      lifecycle: item.lifecycle,
      kind: item.kind,
      utilizationBps: item.utilizationBps,
    }))

  const contracts: PlayerContractView[] = world.contracts
    .filter((item) => entityVisible(item.visibility, knowledge, item.id, audience))
    .map((item) => ({
      id: item.id,
      name: item.name,
      lifecycle: item.lifecycle,
      counterpartyId: item.counterpartyId,
      renewalDay: item.renewalDay,
      annualValueCents: item.annualValueCents,
    }))

  const competitors = world.competitors
    .map((item) => mapCompetitor(item, knowledge, audience))
    .filter((item): item is PlayerCompetitorView => item !== null)

  return {
    customers,
    products,
    departments,
    projects,
    keyPeople,
    locations,
    contracts,
    competitors,
  }
}

/** Player read model — omit hidden/researchable/system_only unless revealed. */
export function getPlayerWorldView(run: RunState): PlayerWorldView {
  return toAudienceWorldView(run, 'player')
}

/**
 * Advisor read model — includes advisor_visible entities; still strips hidden/researchable
 * unless present in advisorKnowledge.
 */
export function getAdvisorWorldView(run: RunState): PlayerWorldView {
  return toAudienceWorldView(run, 'advisor')
}

/** Collect all opaque entity IDs in truth (for tests / referential checks). */
export function listWorldEntityIds(world: WorldModules): string[] {
  return [
    ...world.customers,
    ...world.products,
    ...world.departments,
    ...world.projects,
    ...world.keyPeople,
    ...world.locations,
    ...world.contracts,
    ...world.competitors,
  ].map((item) => item.id)
}

/** JSON-safe summary for AI visible context (player-safe only). */
export function playerWorldContextSummary(view: PlayerWorldView): Record<string, unknown> {
  return {
    customers: view.customers.map((c) => ({
      id: c.id,
      name: c.name,
      lifecycle: c.lifecycle,
      segment: c.segment,
      revenueShareBps: c.revenueShareBps,
      ...(c.contributionMarginBps !== undefined ? { contributionMarginBps: c.contributionMarginBps } : {}),
    })),
    products: view.products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      annualRevenueCents: p.annualRevenueCents,
    })),
    projects: view.projects.map((p) => ({
      id: p.id,
      name: p.name,
      lifecycle: p.lifecycle,
      progressBps: p.progressBps,
    })),
    locations: view.locations.map((l) => ({
      id: l.id,
      name: l.name,
      kind: l.kind,
      utilizationBps: l.utilizationBps,
    })),
    contracts: view.contracts.map((c) => ({
      id: c.id,
      name: c.name,
      counterpartyId: c.counterpartyId,
      renewalDay: c.renewalDay,
    })),
    departments: view.departments.map((d) => ({ id: d.id, name: d.name, headcount: d.headcount })),
    keyPeople: view.keyPeople.map((k) => ({
      id: k.id,
      name: k.name,
      role: k.role,
      ...(k.flightRiskBps !== undefined ? { flightRiskBps: k.flightRiskBps } : {}),
    })),
    competitors: view.competitors.map((c) => ({
      id: c.id,
      name: c.name,
      segmentFocus: c.segmentFocus,
      ...(c.threatBps !== undefined ? { threatBps: c.threatBps } : {}),
    })),
  }
}
