/**
 * Economic ticks and soft-deadline consequences for advanceTime.
 * Pure domain — deterministic, integer money.
 * Location: shared/domain/economic-tick.ts
 */
import type {
  CompanyMetrics,
  LedgerEvent,
  ManagementAction,
  RunState,
  ScheduledEvent,
  WorldModules,
} from './types.ts'

export const ECONOMIC_TICK_SCHEMA_VERSION = 1
export const DAILY_PAYROLL_CENTS_PER_HEAD = 45_000
export const PROJECT_PROGRESS_BPS_PER_DAY = 80
export const HIRING_PIPELINE_CAPACITY_BPS_PER_DAY = 8
export const DEADLINE_MISSED_LEDGER_ID = 'deadline_missed'
export const DEADLINE_CUSTOMER_EVENT_ID = 'deadline_customer_decides'
export const DEADLINE_OFFER_EVENT_ID = 'deadline_offer_expires'

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeMetrics(metrics: CompanyMetrics): CompanyMetrics {
  return {
    ...metrics,
    headcount: Math.max(0, Math.round(metrics.headcount)),
    capacityUtilizationBps: clamp(Math.round(metrics.capacityUtilizationBps), 0, 12_000),
    customerConcentrationBps: clamp(Math.round(metrics.customerConcentrationBps), 0, 10_000),
    moraleBps: clamp(Math.round(metrics.moraleBps), 0, 10_000),
    resilienceBps: clamp(Math.round(metrics.resilienceBps), 0, 10_000),
    marketPositionBps: clamp(Math.round(metrics.marketPositionBps), 0, 10_000),
  }
}

function addMetricDelta(base: CompanyMetrics, delta: Partial<CompanyMetrics>): CompanyMetrics {
  return normalizeMetrics({
    revenueAnnualCents: base.revenueAnnualCents + (delta.revenueAnnualCents ?? 0),
    ebitdaAnnualCents: base.ebitdaAnnualCents + (delta.ebitdaAnnualCents ?? 0),
    cashCents: base.cashCents + (delta.cashCents ?? 0),
    headcount: base.headcount + (delta.headcount ?? 0),
    capacityUtilizationBps: base.capacityUtilizationBps + (delta.capacityUtilizationBps ?? 0),
    customerConcentrationBps: base.customerConcentrationBps + (delta.customerConcentrationBps ?? 0),
    moraleBps: base.moraleBps + (delta.moraleBps ?? 0),
    resilienceBps: base.resilienceBps + (delta.resilienceBps ?? 0),
    marketPositionBps: base.marketPositionBps + (delta.marketPositionBps ?? 0),
  })
}

function cloneWorld(world: WorldModules): WorldModules {
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

function isHiringRelatedEvent(run: Pick<RunState, 'decisions'>, event: ScheduledEvent): boolean {
  if (/einstell|hiring|headcount|nachbesetz|fluktuation|recruit/i.test(`${event.title} ${event.body}`)) return true
  const decision = run.decisions.find((item) => item.id === event.decisionId)
  if (!decision) return false
  return decision.proposal.actions.some(
    (action: ManagementAction) =>
      action.kind === 'change_hiring_policy' || action.kind === 'change_headcount_plan',
  )
}

export function dailyCashDeltaFromEbitda(ebitdaAnnualCents: number): number {
  return Math.trunc(ebitdaAnnualCents / 365)
}

export function dailyRevenueRecognitionCents(revenueAnnualCents: number): number {
  return Math.trunc(revenueAnnualCents / 365)
}

export function dailyPayrollBurnCents(headcount: number): number {
  return Math.trunc(headcount * DAILY_PAYROLL_CENTS_PER_HEAD)
}

export function hasDeadlineConsequence(run: Pick<RunState, 'ledger' | 'scheduledEvents'>): boolean {
  if (run.ledger.some((entry) => entry.id === DEADLINE_MISSED_LEDGER_ID)) return true
  return run.scheduledEvents.some(
    (event) => event.id === DEADLINE_CUSTOMER_EVENT_ID || event.id === DEADLINE_OFFER_EVENT_ID,
  )
}

export function analysisCompletesAfterDeadline(availableAtDay: number, deadlineDay: number): boolean {
  return availableAtDay > deadlineDay
}

export function daysUntilDeadline(run: Pick<RunState, 'day' | 'deadlineDay'>): number {
  return run.deadlineDay - run.day
}

export type EconomicDayResult = {
  metrics: CompanyMetrics
  world: WorldModules
  ledger: LedgerEvent[]
}

export function applyEconomicDay(
  run: Pick<RunState, 'metrics' | 'world' | 'ledger' | 'scheduledEvents' | 'decisions'>,
  day: number,
): EconomicDayResult {
  const ledgerId = `econ_tick_${day}`
  if (run.ledger.some((entry) => entry.id === ledgerId)) {
    return { metrics: run.metrics, world: run.world, ledger: [] }
  }

  const revenueInflowCents = dailyRevenueRecognitionCents(run.metrics.revenueAnnualCents)
  const payrollBurnCents = dailyPayrollBurnCents(run.metrics.headcount)
  const netOperatingCashCents = dailyCashDeltaFromEbitda(run.metrics.ebitdaAnnualCents)

  let metrics = addMetricDelta(run.metrics, { cashCents: netOperatingCashCents })
  const world = cloneWorld(run.world)
  const ledger: LedgerEvent[] = []

  const capacityFactor = 1 + Math.trunc(metrics.capacityUtilizationBps / 10_000)
  const progressGain = Math.max(1, PROJECT_PROGRESS_BPS_PER_DAY * capacityFactor)

  for (const project of world.projects) {
    if (project.lifecycle !== 'active' || project.progressBps >= 10_000) continue
    const nextProgress = Math.min(10_000, project.progressBps + progressGain)
    project.progressBps = nextProgress
    if (nextProgress >= 10_000) {
      project.lifecycle = 'ended'
      metrics = addMetricDelta(metrics, {
        capacityUtilizationBps: -120,
        resilienceBps: 80,
        ebitdaAnnualCents: Math.trunc(project.budgetCents / 100),
      })
      ledger.push({
        id: `project_complete_${project.id}_${day}`,
        type: 'economic',
        day,
        title: `Projekt abgeschlossen: ${project.name}`,
        body: 'Fortschritt erreicht 100 %. Kapazität und Ergebnis reagieren auf den Abschluss.',
        tone: 'positive',
      })
    }
  }

  for (const contract of world.contracts) {
    if (contract.lifecycle !== 'active' || contract.renewalDay !== day) continue
    metrics = addMetricDelta(metrics, {
      marketPositionBps: -80,
      resilienceBps: -40,
      moraleBps: -30,
    })
    ledger.push({
      id: `contract_renewal_${contract.id}_${day}`,
      type: 'economic',
      day,
      title: `Vertragsfenster: ${contract.name}`,
      body: `Erneuerung an Tag ${day}. Ohne aktive Verhandlung steigt Druck auf Konditionen und Planungssicherheit.`,
      tone: 'warning',
    })
  }

  const hiringPipelineActive = run.scheduledEvents.some(
    (event) => !event.resolved && event.dueDay >= day && isHiringRelatedEvent(run, event),
  )
  if (hiringPipelineActive) {
    metrics = addMetricDelta(metrics, { capacityUtilizationBps: HIRING_PIPELINE_CAPACITY_BPS_PER_DAY })
  }

  ledger.unshift({
    id: ledgerId,
    type: 'economic',
    day,
    title: 'Wirtschaftlicher Tag',
    body:
      netOperatingCashCents === 0
        ? `Kein materieller Cash-Effekt. Umsatz-Proxy ${revenueInflowCents} ct · Payroll ${payrollBurnCents} ct.`
        : `Cash-Effekt aus Betrieb: ${netOperatingCashCents >= 0 ? '+' : '−'}${Math.abs(Math.trunc(netOperatingCashCents / 100))} € (EBITDA/365). Payroll ≈ ${Math.trunc(payrollBurnCents / 100)} € · Umsatz-Proxy ≈ ${Math.trunc(revenueInflowCents / 100)} €.${hiringPipelineActive ? ' Hiring-Pipeline belastet Kapazität.' : ''}`,
    tone: netOperatingCashCents >= 0 ? 'positive' : 'warning',
  })

  return { metrics, world, ledger }
}

export function softDeadlineConsequence(
  run: Pick<RunState, 'metrics' | 'ledger' | 'scheduledEvents' | 'decisions' | 'deadlineDay' | 'seed'>,
  day: number,
): {
  scheduledEvents: ScheduledEvent[]
  ledger: LedgerEvent[]
  metrics: Partial<CompanyMetrics>
} {
  if (day <= run.deadlineDay) return { scheduledEvents: [], ledger: [], metrics: {} }
  if (run.decisions.length > 0 || hasDeadlineConsequence(run)) {
    return { scheduledEvents: [], ledger: [], metrics: {} }
  }

  return {
    metrics: { moraleBps: -450, marketPositionBps: -280, resilienceBps: -200 },
    ledger: [
      {
        id: DEADLINE_MISSED_LEDGER_ID,
        type: 'deadline_consequence',
        day,
        title: 'Entscheidungsfrist verpasst',
        body: `Keine Entscheidung bis Tag ${run.deadlineDay}. Board-Confidence sinkt; Kunde und Angebot reagieren zeitverzögert. Kein künstliches Game Over.`,
        tone: 'negative',
      },
    ],
    scheduledEvents: [
      {
        id: DEADLINE_OFFER_EVENT_ID,
        dueDay: day + 1,
        decisionId: DEADLINE_MISSED_LEDGER_ID,
        title: 'Angebot verfällt',
        body: 'Ein zeitkritisches Angebot oder eine Konditionsoption läuft ohne CEO-Entscheidung aus.',
        probabilityBps: 0,
        successMetrics: { revenueAnnualCents: -40_000_000, marketPositionBps: -80 },
        failureMetrics: { revenueAnnualCents: -85_000_000, marketPositionBps: -180, cashCents: -25_000_000 },
        resolved: false,
      },
      {
        id: DEADLINE_CUSTOMER_EVENT_ID,
        dueDay: day + 3,
        decisionId: DEADLINE_MISSED_LEDGER_ID,
        title: 'Kunde entscheidet ohne euch',
        body: 'Der Schlüsselkunde setzt Alternativen um oder schreibt neu aus.',
        probabilityBps: 8_200,
        successMetrics: { customerConcentrationBps: -120, revenueAnnualCents: -40_000_000 },
        failureMetrics: {
          revenueAnnualCents: -220_000_000,
          ebitdaAnnualCents: -55_000_000,
          customerConcentrationBps: -350,
          marketPositionBps: -220,
        },
        resolved: false,
      },
    ],
  }
}
