/**
 * Economic ticks and soft-deadline consequences for advanceTime.
 * Pure domain — deterministic, integer money, seeded where probabilistic.
 * Location: shared/domain/economic-time.ts
 */
import type { CompanyMetrics, LedgerEvent, RunState, ScheduledEvent, WorldModules } from './types.ts'

function stableHash(input: string): number {
  let hash = 2166136261
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function drawBps(seed: string, key: string): number {
  return stableHash(`${seed}:${key}`) % 10_000
}

function addMetricDelta(base: CompanyMetrics, delta: Partial<CompanyMetrics>): CompanyMetrics {
  return {
    revenueAnnualCents: base.revenueAnnualCents + (delta.revenueAnnualCents ?? 0),
    ebitdaAnnualCents: base.ebitdaAnnualCents + (delta.ebitdaAnnualCents ?? 0),
    cashCents: base.cashCents + (delta.cashCents ?? 0),
    headcount: base.headcount + (delta.headcount ?? 0),
    capacityUtilizationBps: base.capacityUtilizationBps + (delta.capacityUtilizationBps ?? 0),
    customerConcentrationBps: base.customerConcentrationBps + (delta.customerConcentrationBps ?? 0),
    moraleBps: base.moraleBps + (delta.moraleBps ?? 0),
    resilienceBps: base.resilienceBps + (delta.resilienceBps ?? 0),
    marketPositionBps: base.marketPositionBps + (delta.marketPositionBps ?? 0),
  }
}

/** Approximate daily cash burn from annual EBITDA (negative EBITDA → cash out). */
export function dailyCashDeltaFromEbitda(ebitdaAnnualCents: number): number {
  return Math.trunc(ebitdaAnnualCents / 365)
}

/** Daily revenue recognition proxy (1/365 of annual). */
export function dailyRevenueRecognitionCents(revenueAnnualCents: number): number {
  return Math.trunc(revenueAnnualCents / 365)
}

export function advanceWorldProjects(world: WorldModules, days: number): WorldModules {
  if (days <= 0) return world
  const progressPerDay = 80 // bps ≈ 0.8% per day for active projects
  return {
    ...world,
    projects: world.projects.map((project) => {
      if (project.lifecycle !== 'active') return project
      const next = Math.min(10_000, project.progressBps + progressPerDay * days)
      return { ...project, progressBps: next }
    }),
  }
}

export type EconomicDayResult = {
  metrics: CompanyMetrics
  world: WorldModules
  ledger: LedgerEvent[]
}

/**
 * Apply one simulation day's economic effects. Idempotent per day via ledger ids.
 */
export function applyEconomicDay(run: RunState, day: number): EconomicDayResult {
  const ledgerId = `econ_tick_${day}`
  if (run.ledger.some((entry) => entry.id === ledgerId)) {
    return { metrics: run.metrics, world: run.world, ledger: [] }
  }

  const cashDelta = dailyCashDeltaFromEbitda(run.metrics.ebitdaAnnualCents)
  const metrics = addMetricDelta(run.metrics, { cashCents: cashDelta })
  const world = advanceWorldProjects(run.world, 1)
  const ledger: LedgerEvent[] = [
    {
      id: ledgerId,
      type: 'system',
      day,
      title: 'Wirtschaftlicher Tag',
      body:
        cashDelta === 0
          ? 'Kein materieller Cash-Effekt an diesem Tag.'
          : `Cash-Effekt aus Betrieb: ${cashDelta >= 0 ? '+' : '−'}${Math.abs(Math.trunc(cashDelta / 100))} € (Tagesanteil EBITDA).`,
      tone: cashDelta >= 0 ? 'positive' : 'warning',
    },
  ]
  return { metrics, world, ledger }
}

export function hasDeadlineConsequence(run: RunState): boolean {
  return run.ledger.some((entry) => entry.id === 'deadline_missed')
    || run.scheduledEvents.some((event) => event.id.startsWith('deadline_'))
}

/**
 * Soft deadline: world continues; inject consequence if day crosses deadline without a decision.
 */
export function softDeadlineConsequence(run: RunState, targetDay: number): {
  scheduledEvents: ScheduledEvent[]
  ledger: LedgerEvent[]
  metrics: Partial<CompanyMetrics>
} {
  if (targetDay < run.deadlineDay) {
    return { scheduledEvents: [], ledger: [], metrics: {} }
  }
  if (run.decisions.length > 0 || hasDeadlineConsequence(run)) {
    return { scheduledEvents: [], ledger: [], metrics: {} }
  }

  const draw = drawBps(run.seed, `deadline:${run.deadlineDay}`)
  const boardHit = draw < 5500
  const metrics: Partial<CompanyMetrics> = {
    moraleBps: boardHit ? -400 : -200,
    marketPositionBps: boardHit ? -300 : -150,
    cashCents: boardHit ? -2_000_000 : -500_000,
  }

  const ledger: LedgerEvent[] = [
    {
      id: 'deadline_missed',
      type: 'system',
      day: run.deadlineDay,
      title: 'Entscheidungsfrist verpasst',
      body: boardHit
        ? 'Das Board verliert Vertrauen; ein Kunde trifft eine Vorentscheidung ohne euch. Der Run geht weiter — mit spürbaren Konsequenzen.'
        : 'Ein Angebot verfällt und die Organisation spürt Entscheidungsdruck. Kein Game Over, aber irreversible Kosten.',
      tone: 'negative',
    },
  ]

  const scheduledEvents: ScheduledEvent[] = [
    {
      id: `deadline_followup_${run.deadlineDay}`,
      dueDay: run.deadlineDay + 7,
      decisionId: 'deadline_missed',
      title: 'Nachwirkung der verpassten Frist',
      body: 'Stakeholder reagieren auf die Verzögerung.',
      probabilityBps: 6500,
      successMetrics: { resilienceBps: -100 },
      failureMetrics: { resilienceBps: -350, moraleBps: -200 },
      resolved: false,
    },
  ]

  return { scheduledEvents, ledger, metrics }
}

export function analysisCompletesAfterDeadline(
  availableAtDay: number,
  deadlineDay: number,
): boolean {
  return availableAtDay > deadlineDay
}
