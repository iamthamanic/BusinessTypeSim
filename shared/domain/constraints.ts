/**
 * Authoritative feasibility / constraint evaluation for ManagementAction packages.
 * Pure domain: deterministic preconditions against World State V2 + metrics.
 * Location: shared/domain/constraints.ts
 */
import { getScenarioAtVersion } from './scenarios.ts'
import type {
  ActionKind,
  ActionProposal,
  ManagementAction,
  RunState,
  ScenarioDefinition,
  WorldModules,
} from './types.ts'
import { ensureManagementAction } from './action-params.ts'

export type ConstraintSeverity = 'blocker' | 'warning'

export type ConstraintCode =
  | 'INSUFFICIENT_CASH'
  | 'INSUFFICIENT_FREE_CASH'
  | 'PACKAGE_INSUFFICIENT_CASH'
  | 'PACKAGE_INSUFFICIENT_FREE_CASH'
  | 'UNKNOWN_ENTITY'
  | 'ENTITY_NOT_ACTIVE'
  | 'PROJECT_ALREADY_ACTIVE'
  | 'CAPACITY_EXHAUSTED'
  | 'CAPACITY_TIGHT'
  | 'HEADCOUNT_FLOOR'
  | 'ACTION_CONFLICT'
  | 'RESOURCE_BOUND'

export interface ConstraintIssue {
  code: ConstraintCode
  severity: ConstraintSeverity
  message: string
  actionIds: string[]
  resourceIds: string[]
}

export interface ConstraintEvaluation {
  blockers: ConstraintIssue[]
  warnings: ConstraintIssue[]
}

/** Thrown when commitDecision refuses a package with blockers. */
export class ConstraintViolationError extends Error {
  readonly code = 'CONSTRAINT_VIOLATION' as const
  readonly evaluation: ConstraintEvaluation

  constructor(evaluation: ConstraintEvaluation) {
    const summary = evaluation.blockers.map((item) => item.message).join(' ')
    super(summary || 'Constraint violation')
    this.name = 'ConstraintViolationError'
    this.evaluation = evaluation
  }
}

const CASH_SPENDING_KINDS: ReadonlySet<ActionKind> = new Set([
  'allocate_capital',
  'start_project',
  'change_hiring_policy',
  'change_headcount_plan',
])

const CAPACITY_LOAD_KINDS: ReadonlySet<ActionKind> = new Set([
  'allocate_capital',
  'start_project',
  'accept_contract',
  'prioritize_product',
])

/** Soft capacity pressure (warning). */
const CAPACITY_TIGHT_BPS = 9_000
/** Hard capacity ceiling for additional load (blocker). */
const CAPACITY_EXHAUSTED_BPS = 11_000

function scenarioForRun(run: Pick<RunState, 'scenarioId' | 'scenarioVersion'>): ScenarioDefinition {
  return getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
}

function issue(
  code: ConstraintCode,
  severity: ConstraintSeverity,
  message: string,
  actionIds: string[] = [],
  resourceIds: string[] = [],
): ConstraintIssue {
  return { code, severity, message, actionIds, resourceIds }
}

/** Remaining committed project budget still locking free cash. */
export function reservedCashCents(world: WorldModules): number {
  let reserved = 0
  for (const project of world.projects) {
    if (project.lifecycle !== 'active') continue
    const remainingBps = Math.max(0, 10_000 - project.progressBps)
    reserved += Math.round((project.budgetCents * remainingBps) / 10_000)
  }
  return reserved
}

export function availableCashCents(run: Pick<RunState, 'metrics' | 'world'>): number {
  return run.metrics.cashCents - reservedCashCents(run.world)
}

function ruleCashOutflowCents(scenario: ScenarioDefinition, kind: ActionKind): number {
  const rule = scenario.actionRules.find((candidate) => candidate.kind === kind)
  const delta = rule?.effect.metrics.cashCents
  if (typeof delta !== 'number' || delta >= 0) return 0
  return -delta
}

/**
 * Cash demanded by one action.
 * Explicit params.amountCents wins; otherwise scenario rule immediate cash drain.
 * Hiring growth uses rule cash only when headcount increases.
 */
export function actionCashDemandCents(scenario: ScenarioDefinition, action: ManagementAction): number {
  if (typeof action.params.amountCents === 'number' && action.params.amountCents > 0) {
    return action.params.amountCents
  }
  if (action.kind === 'change_headcount_plan') {
    const delta = action.params.headcountDelta
    if (typeof delta === 'number' && delta <= 0) return 0
  }
  if (!CASH_SPENDING_KINDS.has(action.kind)) return 0
  return ruleCashOutflowCents(scenario, action.kind)
}

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-')
}

function entityMatchesRef(entityId: string, entityName: string, ref: string): boolean {
  const needle = normalizeSlug(ref)
  if (!needle) return false
  const id = normalizeSlug(entityId)
  const name = normalizeSlug(entityName)
  if (id === needle || name === needle) return true
  if (id.endsWith(`-${needle}`) || id.includes(`-${needle}-`) || id.endsWith(`_${needle}`)) return true
  if (name.includes(needle)) return true
  // Short aliases e.g. "lidl" inside "nk-cust-lidl"
  const idTail = id.split('-').pop()
  return idTail === needle
}

type WorldEntityRef = { id: string; name: string; lifecycle: string; module: keyof WorldModules }

function allWorldEntities(world: WorldModules): WorldEntityRef[] {
  const out: WorldEntityRef[] = []
  for (const item of world.customers) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'customers' })
  for (const item of world.products) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'products' })
  for (const item of world.departments) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'departments' })
  for (const item of world.projects) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'projects' })
  for (const item of world.keyPeople) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'keyPeople' })
  for (const item of world.locations) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'locations' })
  for (const item of world.contracts) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'contracts' })
  for (const item of world.competitors) out.push({ id: item.id, name: item.name, lifecycle: item.lifecycle, module: 'competitors' })
  return out
}

function findInModule(
  world: WorldModules,
  module: keyof WorldModules,
  ref: string,
): WorldEntityRef | undefined {
  return allWorldEntities(world).find((entity) => entity.module === module && entityMatchesRef(entity.id, entity.name, ref))
}

function findAnyEntity(world: WorldModules, ref: string): WorldEntityRef | undefined {
  return allWorldEntities(world).find((entity) => entityMatchesRef(entity.id, entity.name, ref))
}

function pushUnique(target: ConstraintIssue[], next: ConstraintIssue): void {
  const duplicate = target.some(
    (item) =>
      item.code === next.code &&
      item.message === next.message &&
      item.actionIds.join(',') === next.actionIds.join(','),
  )
  if (!duplicate) target.push(next)
}

function evaluateSingleAction(
  run: RunState,
  scenario: ScenarioDefinition,
  action: ManagementAction,
  freeCash: number,
): { blockers: ConstraintIssue[]; warnings: ConstraintIssue[] } {
  const blockers: ConstraintIssue[] = []
  const warnings: ConstraintIssue[] = []
  const cash = run.metrics.cashCents
  const demand = actionCashDemandCents(scenario, action)
  const explicitAmount = typeof action.params.amountCents === 'number' && action.params.amountCents > 0

  if (demand > cash) {
    pushUnique(
      blockers,
      issue(
        'INSUFFICIENT_CASH',
        'blocker',
        `Cash reicht nicht: ${action.label} benötigt ${formatEuro(demand)}, verfügbar sind ${formatEuro(cash)}.`,
        [action.id],
      ),
    )
  } else if (explicitAmount && demand > freeCash) {
    pushUnique(
      blockers,
      issue(
        'INSUFFICIENT_FREE_CASH',
        'blocker',
        `Freies Cash reicht nicht: ${action.label} benötigt ${formatEuro(demand)}, nach gebundenen Projektbudgets bleiben ${formatEuro(Math.max(0, freeCash))}.`,
        [action.id],
      ),
    )
  } else if (!explicitAmount && demand > freeCash && demand > 0) {
    pushUnique(
      warnings,
      issue(
        'INSUFFICIENT_FREE_CASH',
        'warning',
        `Liquiditäts-Trade-off: ${action.label} zieht ca. ${formatEuro(demand)} — nach laufenden Projekten sind nur ${formatEuro(Math.max(0, freeCash))} frei.`,
        [action.id],
      ),
    )
  }

  if (action.kind === 'change_headcount_plan') {
    const delta = action.params.headcountDelta
    if (typeof delta === 'number' && run.metrics.headcount + delta < 0) {
      pushUnique(
        blockers,
        issue(
          'HEADCOUNT_FLOOR',
          'blocker',
          `Headcount darf nicht unter 0 fallen (aktuell ${run.metrics.headcount}, geplant ${delta}).`,
          [action.id],
        ),
      )
    }
  }

  if (CAPACITY_LOAD_KINDS.has(action.kind)) {
    if (run.metrics.capacityUtilizationBps >= CAPACITY_EXHAUSTED_BPS) {
      pushUnique(
        blockers,
        issue(
          'CAPACITY_EXHAUSTED',
          'blocker',
          `Kapazität ist ausgereizt (${(run.metrics.capacityUtilizationBps / 100).toFixed(0)} %). ${action.label} ist derzeit nicht zulässig.`,
          [action.id],
        ),
      )
    } else if (run.metrics.capacityUtilizationBps >= CAPACITY_TIGHT_BPS) {
      pushUnique(
        warnings,
        issue(
          'CAPACITY_TIGHT',
          'warning',
          `Kapazität ist eng (${(run.metrics.capacityUtilizationBps / 100).toFixed(0)} %). ${action.label} erhöht den Engpass-Trade-off.`,
          [action.id],
        ),
      )
    }
  }

  if (action.kind === 'renegotiate_customer' || action.kind === 'accept_contract' || action.kind === 'reject_contract') {
    const targetRef = action.params.targetId
    if (targetRef) {
      const module = action.kind === 'renegotiate_customer' ? 'customers' : 'contracts'
      const preferred = findInModule(run.world, module, targetRef)
      const matched = preferred ?? findAnyEntity(run.world, targetRef)
      if (!matched) {
        if (run.world.customers.length + run.world.contracts.length > 0) {
          pushUnique(
            blockers,
            issue(
              'UNKNOWN_ENTITY',
              'blocker',
              `Ziel „${targetRef}“ existiert nicht im Unternehmenszustand.`,
              [action.id],
              [targetRef],
            ),
          )
        }
      } else if (matched.lifecycle !== 'active') {
        pushUnique(
          blockers,
          issue(
            'ENTITY_NOT_ACTIVE',
            'blocker',
            `„${matched.name}“ ist nicht aktiv (${matched.lifecycle}) und kann nicht Ziel dieser Action sein.`,
            [action.id],
            [matched.id],
          ),
        )
      }
    }
  }

  if (action.kind === 'start_project') {
    const projectRef = action.params.projectId ?? action.params.targetId
    if (projectRef) {
      const existing = findInModule(run.world, 'projects', projectRef)
      if (existing?.lifecycle === 'active') {
        pushUnique(
          blockers,
          issue(
            'PROJECT_ALREADY_ACTIVE',
            'blocker',
            `Projekt „${existing.name}“ läuft bereits — Start würde den gebundenen Status doppelbelegen.`,
            [action.id],
            [existing.id],
          ),
        )
      }
    }
  }

  if (action.kind === 'cancel_project') {
    const projectRef = action.params.projectId ?? action.params.targetId
    if (projectRef) {
      const existing = findInModule(run.world, 'projects', projectRef)
      if (!existing) {
        if (run.world.projects.length > 0) {
          pushUnique(
            blockers,
            issue(
              'UNKNOWN_ENTITY',
              'blocker',
              `Projekt „${projectRef}“ existiert nicht und kann nicht gestoppt werden.`,
              [action.id],
              [projectRef],
            ),
          )
        }
      } else if (existing.lifecycle !== 'active') {
        pushUnique(
          blockers,
          issue(
            'ENTITY_NOT_ACTIVE',
            'blocker',
            `Projekt „${existing.name}“ ist nicht aktiv und kann nicht gestoppt werden.`,
            [action.id],
            [existing.id],
          ),
        )
      }
    }
  }

  // Resource bound: active project already claiming a location/department named in scope/target.
  if (action.kind === 'allocate_capital' || action.kind === 'start_project') {
    const scopeRef = action.params.scope ?? action.params.targetId
    if (scopeRef) {
      const location = findInModule(run.world, 'locations', scopeRef)
      if (location?.lifecycle === 'active') {
        const boundProject = run.world.projects.find(
          (project) =>
            project.lifecycle === 'active' &&
            (entityMatchesRef(project.id, project.name, scopeRef) ||
              normalizeSlug(project.name).includes(normalizeSlug(scopeRef))),
        )
        if (boundProject && action.kind === 'start_project') {
          pushUnique(
            warnings,
            issue(
              'RESOURCE_BOUND',
              'warning',
              `Standort/Scope „${location.name}“ ist bereits über Projekt „${boundProject.name}“ gebunden.`,
              [action.id],
              [location.id, boundProject.id],
            ),
          )
        }
      }
    }
  }

  return { blockers, warnings }
}

function evaluatePackageConflicts(
  run: RunState,
  scenario: ScenarioDefinition,
  actions: ManagementAction[],
  freeCash: number,
): { blockers: ConstraintIssue[]; warnings: ConstraintIssue[] } {
  const blockers: ConstraintIssue[] = []
  const warnings: ConstraintIssue[] = []
  const cash = run.metrics.cashCents

  const packageDemand = actions.reduce((sum, action) => sum + actionCashDemandCents(scenario, action), 0)
  const explicitPackage = actions.some(
    (action) => typeof action.params.amountCents === 'number' && action.params.amountCents > 0,
  )
  const spendingActions = actions.filter((action) => actionCashDemandCents(scenario, action) > 0)

  if (packageDemand > cash && spendingActions.length >= 2) {
    pushUnique(
      blockers,
      issue(
        'PACKAGE_INSUFFICIENT_CASH',
        'blocker',
        `Aktionspaket überschreitet Cash: zusammen ${formatEuro(packageDemand)}, verfügbar ${formatEuro(cash)}.`,
        spendingActions.map((action) => action.id),
      ),
    )
  } else if (explicitPackage && packageDemand > freeCash && spendingActions.length >= 2) {
    pushUnique(
      blockers,
      issue(
        'PACKAGE_INSUFFICIENT_FREE_CASH',
        'blocker',
        `Aktionspaket überschreitet freies Cash: zusammen ${formatEuro(packageDemand)}, nach gebundenen Budgets ${formatEuro(Math.max(0, freeCash))}.`,
        spendingActions.map((action) => action.id),
      ),
    )
  } else if (!explicitPackage && packageDemand > freeCash && spendingActions.length >= 2) {
    pushUnique(
      warnings,
      issue(
        'PACKAGE_INSUFFICIENT_FREE_CASH',
        'warning',
        `Paket-Trade-off: gemeinsame Liquiditätswirkung ca. ${formatEuro(packageDemand)} bei ${formatEuro(Math.max(0, freeCash))} freiem Cash.`,
        spendingActions.map((action) => action.id),
      ),
    )
  }

  const acceptIds = new Map<string, string>()
  const rejectIds = new Map<string, string>()
  const startProjectKeys = new Map<string, string[]>()
  const cancelKeys = new Map<string, string>()

  for (const action of actions) {
    const target = action.params.targetId ? normalizeSlug(action.params.targetId) : ''
    const projectKey = normalizeSlug(action.params.projectId ?? action.params.targetId ?? '')

    if (action.kind === 'accept_contract' && target) acceptIds.set(target, action.id)
    if (action.kind === 'reject_contract' && target) rejectIds.set(target, action.id)

    if (action.kind === 'start_project' && projectKey) {
      const list = startProjectKeys.get(projectKey) ?? []
      list.push(action.id)
      startProjectKeys.set(projectKey, list)
    }
    if (action.kind === 'cancel_project' && projectKey) cancelKeys.set(projectKey, action.id)
  }

  for (const [target, acceptId] of acceptIds) {
    const rejectId = rejectIds.get(target)
    if (rejectId) {
      pushUnique(
        blockers,
        issue(
          'ACTION_CONFLICT',
          'blocker',
          `Konflikt: Vertrag „${target}“ kann nicht gleichzeitig angenommen und abgelehnt werden.`,
          [acceptId, rejectId],
          [target],
        ),
      )
    }
  }

  for (const [projectKey, ids] of startProjectKeys) {
    if (ids.length > 1) {
      pushUnique(
        blockers,
        issue(
          'ACTION_CONFLICT',
          'blocker',
          `Konflikt: Projekt „${projectKey}“ würde mehrfach gestartet.`,
          ids,
          [projectKey],
        ),
      )
    }
    const cancelId = cancelKeys.get(projectKey)
    if (cancelId && ids[0]) {
      pushUnique(
        blockers,
        issue(
          'ACTION_CONFLICT',
          'blocker',
          `Konflikt: Projekt „${projectKey}“ kann nicht gleichzeitig gestartet und gestoppt werden.`,
          [ids[0], cancelId],
          [projectKey],
        ),
      )
    }
  }

  return { blockers, warnings }
}

function formatEuro(cents: number): string {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    cents / 100,
  )
}

/**
 * Evaluate deterministic preconditions for a proposal package against World State V2.
 * Does not mutate state. Blockers must fail-close; warnings are advisory only.
 */
export function evaluateConstraints(run: RunState, proposal: ActionProposal): ConstraintEvaluation {
  const scenario = scenarioForRun(run)
  const actions = proposal.actions.map(ensureManagementAction)
  const freeCash = availableCashCents(run)
  const blockers: ConstraintIssue[] = []
  const warnings: ConstraintIssue[] = []

  for (const action of actions) {
    const single = evaluateSingleAction(run, scenario, action, freeCash)
    for (const item of single.blockers) pushUnique(blockers, item)
    for (const item of single.warnings) pushUnique(warnings, item)
  }

  const pack = evaluatePackageConflicts(run, scenario, actions, freeCash)
  for (const item of pack.blockers) pushUnique(blockers, item)
  for (const item of pack.warnings) pushUnique(warnings, item)

  return { blockers, warnings }
}

export function hasConstraintBlockers(evaluation: ConstraintEvaluation): boolean {
  return evaluation.blockers.length > 0
}
