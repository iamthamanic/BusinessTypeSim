/**
 * Generic campaign / situation runtime — eligibility, priority, cooldown, exclusion.
 * Location: shared/domain/campaign.ts
 * Authoritative only; player views omit hidden triggers. No scenario story packs here.
 */
import type {
  CampaignDefinition,
  CampaignRuntimeState,
  CompanyMetrics,
  LedgerEvent,
  MetricTone,
  RunState,
  ScenarioDefinition,
  ScenarioId,
  SituationInstance,
  SituationStatus,
  SituationTemplate,
  SituationTrigger,
} from './types.ts'

export const CAMPAIGN_SCHEMA_VERSION = 1 as const
export const CAMPAIGN_DURATION_MONTHS = 36
export const DAYS_PER_CAMPAIGN_MONTH = 30

/** Player-safe situation summary — no trigger / authoring fields. */
export interface PlayerSituationView {
  instanceId: string
  templateId: string
  status: SituationStatus
  title: string
  context: string
  priority: number
  eligibleAtDay: number
  activatedAtDay?: number
  deadlineDay?: number
  resolvedAtDay?: number
  expiredAtDay?: number
}

export interface PlayerCampaignView {
  campaignId: string
  campaignVersion: number
  clockDay: number
  clockMonth: number
  durationMonths: number
  ended: boolean
  endReason?: CampaignRuntimeState['endReason']
  active: PlayerSituationView | null
  upcoming: PlayerSituationView[]
  recentResolved: PlayerSituationView[]
}

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

export function campaignMonthFromDay(day: number): number {
  return Math.max(0, Math.floor(day / DAYS_PER_CAMPAIGN_MONTH))
}

export function emptyCampaignState(
  campaign: Pick<CampaignDefinition, 'id' | 'version' | 'durationMonths'>,
  day = 0,
): CampaignRuntimeState {
  return {
    campaignId: campaign.id,
    campaignVersion: campaign.version,
    durationMonths: campaign.durationMonths,
    clockDay: day,
    clockMonth: campaignMonthFromDay(day),
    situations: [],
    cooldowns: {},
    exclusionClaims: {},
    ended: false,
  }
}

function metricPasses(metrics: CompanyMetrics, trigger: SituationTrigger): boolean {
  if (!trigger.metrics) return true
  for (const key of Object.keys(trigger.metrics) as Array<keyof CompanyMetrics>) {
    const clause = trigger.metrics[key]
    if (!clause) continue
    const value = metrics[key]
    if (typeof clause.min === 'number' && value < clause.min) return false
    if (typeof clause.max === 'number' && value > clause.max) return false
  }
  return true
}

/**
 * Pure eligibility check against authoritative run facts (authoring triggers stay here).
 */
export function isSituationEligible(
  template: SituationTemplate,
  args: {
    day: number
    month: number
    metrics: CompanyMetrics
    decisionCount: number
    resolvedTemplateIds: Set<string>
    seed: string
    cooldownUntilDay?: number
    exclusionClaimedBy?: string
  },
): boolean {
  if (template.visibility === 'system_only') return false
  const cooldownUntil = args.cooldownUntilDay ?? 0
  if (args.day < cooldownUntil) return false
  if (args.exclusionClaimedBy && args.exclusionClaimedBy !== template.id) return false

  const trigger = template.trigger
  if (typeof trigger.minDay === 'number' && args.day < trigger.minDay) return false
  if (typeof trigger.maxDay === 'number' && args.day > trigger.maxDay) return false
  if (typeof trigger.minMonth === 'number' && args.month < trigger.minMonth) return false
  if (typeof trigger.maxMonth === 'number' && args.month > trigger.maxMonth) return false
  if (typeof trigger.minDecisions === 'number' && args.decisionCount < trigger.minDecisions) return false
  if (typeof trigger.maxDecisions === 'number' && args.decisionCount > trigger.maxDecisions) return false
  if (!metricPasses(args.metrics, trigger)) return false
  for (const required of trigger.requiresResolvedTemplateIds ?? []) {
    if (!args.resolvedTemplateIds.has(required)) return false
  }
  if (typeof trigger.probabilityBps === 'number') {
    const roll = drawBps(args.seed, `campaign:elig:${template.id}:${args.day}`)
    if (roll >= trigger.probabilityBps) return false
  }
  return true
}

function compareSituationPriority(
  a: SituationTemplate,
  b: SituationTemplate,
  seed: string,
  day: number,
): number {
  if (b.priority !== a.priority) return b.priority - a.priority
  const ha = stableHash(`${seed}:campaign:prio:${day}:${a.id}`)
  const hb = stableHash(`${seed}:campaign:prio:${day}:${b.id}`)
  return ha - hb
}

function findTemplate(
  campaign: CampaignDefinition,
  templateId: string,
): SituationTemplate | undefined {
  return campaign.situations.find((item) => item.id === templateId)
}

function playerVisibleTemplate(template: SituationTemplate): boolean {
  return template.visibility === 'player_visible' || template.visibility === 'advisor_visible'
}

function toPlayerSituation(
  instance: SituationInstance,
  template: SituationTemplate | undefined,
): PlayerSituationView | null {
  if (!template || !playerVisibleTemplate(template)) return null
  return {
    instanceId: instance.instanceId,
    templateId: instance.templateId,
    status: instance.status,
    title: template.title,
    context: template.context,
    priority: template.priority,
    eligibleAtDay: instance.eligibleAtDay,
    ...(instance.activatedAtDay !== undefined ? { activatedAtDay: instance.activatedAtDay } : {}),
    ...(instance.deadlineDay !== undefined ? { deadlineDay: instance.deadlineDay } : {}),
    ...(instance.resolvedAtDay !== undefined ? { resolvedAtDay: instance.resolvedAtDay } : {}),
    ...(instance.expiredAtDay !== undefined ? { expiredAtDay: instance.expiredAtDay } : {}),
  }
}

export function getPlayerCampaignView(
  run: Pick<RunState, 'campaign' | 'scenarioId'>,
  campaignDef: CampaignDefinition,
): PlayerCampaignView {
  const situations = run.campaign.situations
    .map((instance) => toPlayerSituation(instance, findTemplate(campaignDef, instance.templateId)))
    .filter((item): item is PlayerSituationView => item !== null)

  const active = situations.find((item) => item.status === 'active') ?? null
  const upcoming = situations
    .filter((item) => item.status === 'pending')
    .sort((a, b) => b.priority - a.priority)
  const recentResolved = situations
    .filter((item) => item.status === 'resolved' || item.status === 'expired')
    .slice(-5)
    .reverse()

  return {
    campaignId: run.campaign.campaignId,
    campaignVersion: run.campaign.campaignVersion,
    clockDay: run.campaign.clockDay,
    clockMonth: run.campaign.clockMonth,
    durationMonths: run.campaign.durationMonths,
    ended: run.campaign.ended,
    ...(run.campaign.endReason !== undefined ? { endReason: run.campaign.endReason } : {}),
    active,
    upcoming,
    recentResolved,
  }
}

function ledgerEvent(args: {
  id: string
  day: number
  title: string
  body: string
  tone?: MetricTone
  causeId?: string
}): LedgerEvent {
  return {
    id: args.id,
    type: 'campaign',
    day: args.day,
    title: args.title,
    body: args.body,
    tone: args.tone ?? 'neutral',
    ...(args.causeId !== undefined ? { causeId: args.causeId } : {}),
  }
}

function cloneCampaign(state: CampaignRuntimeState): CampaignRuntimeState {
  return {
    ...state,
    situations: state.situations.map((item) => ({ ...item })),
    cooldowns: { ...state.cooldowns },
    exclusionClaims: { ...state.exclusionClaims },
  }
}

function hasTerminalStatus(status: SituationStatus): boolean {
  return status === 'resolved' || status === 'expired' || status === 'suppressed'
}

function alreadyInstanced(state: CampaignRuntimeState, templateId: string): boolean {
  return state.situations.some(
    (item) => item.templateId === templateId && !hasTerminalStatus(item.status),
  )
}

function resolvedIds(state: CampaignRuntimeState): Set<string> {
  return new Set(
    state.situations.filter((item) => item.status === 'resolved').map((item) => item.templateId),
  )
}

/**
 * Bootstrap campaign state for a new run: activate opening situation.
 */
export function bootstrapCampaignState(args: {
  campaign: CampaignDefinition
  seed: string
  day?: number
  deadlineDay: number
}): { campaign: CampaignRuntimeState; ledger: LedgerEvent[]; deadlineDay: number } {
  const day = args.day ?? 0
  let state = emptyCampaignState(args.campaign, day)
  const ledger: LedgerEvent[] = []
  const deadlineDay = args.deadlineDay

  const opening =
    args.campaign.situations.find((item) => item.id === 'opening') ??
    [...args.campaign.situations].sort((a, b) => compareSituationPriority(a, b, args.seed, day))[0]

  if (opening && playerVisibleTemplate(opening)) {
    const instanceId = `sit_${stableHash(`${args.seed}:${opening.id}:0`).toString(36)}`
    const activated: SituationInstance = {
      instanceId,
      templateId: opening.id,
      templateVersion: opening.version,
      status: 'active',
      eligibleAtDay: day,
      activatedAtDay: day,
      deadlineDay,
      ...(opening.exclusionGroup !== undefined ? { exclusionGroup: opening.exclusionGroup } : {}),
      ledgerCauseId: `campaign_activate_${instanceId}`,
    }
    state = {
      ...state,
      situations: [activated],
      exclusionClaims: opening.exclusionGroup
        ? { ...state.exclusionClaims, [opening.exclusionGroup]: opening.id }
        : state.exclusionClaims,
    }
    ledger.push(
      ledgerEvent({
        id: `campaign_activate_${instanceId}`,
        day,
        title: `Situation aktiv: ${opening.title}`,
        body: opening.context,
        tone: 'warning',
      }),
    )
  }

  return { campaign: state, ledger, deadlineDay }
}

export interface CampaignTickResult {
  campaign: CampaignRuntimeState
  ledger: LedgerEvent[]
  deadlineDay: number
  status: RunState['status']
}

/**
 * Daily campaign step after economic ticks.
 * Cardinality: at most one activation per day; at most one active situation.
 */
export function applyCampaignDay(
  run: Pick<
    RunState,
    'campaign' | 'metrics' | 'decisions' | 'seed' | 'status' | 'deadlineDay' | 'scenarioId'
  >,
  campaignDef: CampaignDefinition,
  day: number,
): CampaignTickResult {
  if (run.status === 'failed') {
    const failed = cloneCampaign(run.campaign)
    failed.clockDay = day
    failed.clockMonth = campaignMonthFromDay(day)
    failed.ended = true
    failed.endReason = 'failure'
    return {
      campaign: failed,
      ledger: [],
      deadlineDay: run.deadlineDay,
      status: 'failed',
    }
  }

  if (run.campaign.ended || run.status === 'completed') {
    const ended = cloneCampaign(run.campaign)
    ended.clockDay = day
    ended.clockMonth = campaignMonthFromDay(day)
    return {
      campaign: ended,
      ledger: [],
      deadlineDay: run.deadlineDay,
      status: run.status === 'completed' ? 'completed' : run.status,
    }
  }

  const month = campaignMonthFromDay(day)
  const state = cloneCampaign(run.campaign)
  state.clockDay = day
  state.clockMonth = month
  const ledger: LedgerEvent[] = []
  let deadlineDay = run.deadlineDay
  let status: RunState['status'] = run.status
  const decisionCount = run.decisions.length
  const resolved = resolvedIds(state)

  // 1) Expire pending that lost eligibility.
  state.situations = state.situations.map((instance) => {
    if (instance.status !== 'pending') return instance
    const template = findTemplate(campaignDef, instance.templateId)
    if (!template) {
      ledger.push(
        ledgerEvent({
          id: `campaign_expire_${instance.instanceId}_${day}`,
          day,
          title: 'Situation verfallen',
          body: 'Unbekannte Situation wurde fail-closed beendet.',
          tone: 'warning',
          ...(instance.ledgerCauseId !== undefined ? { causeId: instance.ledgerCauseId } : {}),
        }),
      )
      return { ...instance, status: 'expired', expiredAtDay: day }
    }
    const stillEligible = isSituationEligible(template, {
      day,
      month,
      metrics: run.metrics,
      decisionCount,
      resolvedTemplateIds: resolved,
      seed: run.seed,
      ...(state.cooldowns[template.id] !== undefined
        ? { cooldownUntilDay: state.cooldowns[template.id] }
        : {}),
      ...(template.exclusionGroup !== undefined && state.exclusionClaims[template.exclusionGroup] !== undefined
        ? { exclusionClaimedBy: state.exclusionClaims[template.exclusionGroup] }
        : {}),
    })
    if (stillEligible) return instance
    ledger.push(
      ledgerEvent({
        id: `campaign_expire_${instance.instanceId}_${day}`,
        day,
        title: `Situation verfallen: ${template.title}`,
        body: 'Die Lage ist nicht mehr eligible, bevor sie aktiv wurde.',
        tone: 'warning',
        ...(instance.ledgerCauseId !== undefined ? { causeId: instance.ledgerCauseId } : {}),
      }),
    )
    return { ...instance, status: 'expired', expiredAtDay: day }
  })

  // 2) Soft-expire non-opening actives past deadline without resolve.
  state.situations = state.situations.map((instance) => {
    if (instance.status !== 'active' || instance.deadlineDay === undefined) return instance
    if (day <= instance.deadlineDay) return instance
    if (instance.templateId === 'opening') return instance
    const template = findTemplate(campaignDef, instance.templateId)
    ledger.push(
      ledgerEvent({
        id: `campaign_expire_active_${instance.instanceId}_${day}`,
        day,
        title: `Situation abgelaufen: ${template?.title ?? instance.templateId}`,
        body: 'Die Entscheidungsfrist der Situation ist ohne Abschluss verstrichen.',
        tone: 'negative',
        ...(instance.ledgerCauseId !== undefined ? { causeId: instance.ledgerCauseId } : {}),
      }),
    )
    if (template && template.cooldownDays > 0) {
      state.cooldowns[template.id] = day + template.cooldownDays
    }
    return { ...instance, status: 'expired', expiredAtDay: day }
  })

  // 3) Enroll newly eligible templates as pending.
  const candidates = [...campaignDef.situations].sort((a, b) =>
    compareSituationPriority(a, b, run.seed, day),
  )
  for (const template of candidates) {
    if (template.visibility === 'system_only') continue
    if (alreadyInstanced(state, template.id)) continue

    const priorTerminal = state.situations.filter((item) => item.templateId === template.id)
    if (priorTerminal.some((item) => item.status === 'resolved' || item.status === 'expired' || item.status === 'suppressed')) {
      const until = state.cooldowns[template.id] ?? 0
      if (day < until) continue
      // One-shot by default: no re-enrollment after terminal without positive cooldown re-entry.
      if (template.cooldownDays <= 0) continue
      // After cooldown, allow a fresh instance only if exclusion not claimed by another.
    }

    const claimed = template.exclusionGroup
      ? state.exclusionClaims[template.exclusionGroup]
      : undefined
    if (claimed && claimed !== template.id) continue

    const eligible = isSituationEligible(template, {
      day,
      month,
      metrics: run.metrics,
      decisionCount,
      resolvedTemplateIds: resolved,
      seed: run.seed,
      ...(state.cooldowns[template.id] !== undefined
        ? { cooldownUntilDay: state.cooldowns[template.id] }
        : {}),
      ...(claimed !== undefined ? { exclusionClaimedBy: claimed } : {}),
    })
    if (!eligible) continue
    if (template.id === 'opening' && state.situations.some((item) => item.templateId === 'opening')) {
      continue
    }

    const instanceId = `sit_${stableHash(`${run.seed}:${template.id}:${day}:${state.situations.length}`).toString(36)}`
    state.situations.push({
      instanceId,
      templateId: template.id,
      templateVersion: template.version,
      status: 'pending',
      eligibleAtDay: day,
      ...(template.exclusionGroup !== undefined ? { exclusionGroup: template.exclusionGroup } : {}),
      ledgerCauseId: `campaign_pending_${instanceId}`,
    })
    if (playerVisibleTemplate(template)) {
      ledger.push(
        ledgerEvent({
          id: `campaign_pending_${instanceId}`,
          day,
          title: `Situation möglich: ${template.title}`,
          body: 'Eine neue Managementlage ist eligible und wartet auf Priorisierung.',
          tone: 'neutral',
        }),
      )
    }
  }

  // 4) Activate highest-priority pending if no active situation.
  // Hidden templates never occupy the player-facing active slot.
  const hasActive = state.situations.some((item) => {
    if (item.status !== 'active') return false
    const template = findTemplate(campaignDef, item.templateId)
    return template ? playerVisibleTemplate(template) : true
  })
  if (!hasActive) {
    const pending = state.situations
      .filter((item) => item.status === 'pending')
      .map((item) => ({
        item,
        template: findTemplate(campaignDef, item.templateId),
      }))
      .filter((entry): entry is { item: SituationInstance; template: SituationTemplate } =>
        entry.template !== undefined && playerVisibleTemplate(entry.template),
      )
      .sort((a, b) => compareSituationPriority(a.template, b.template, run.seed, day))

    // Expire/suppress hidden pendings that would otherwise stall the queue (no player activation).
    state.situations = state.situations.map((instance) => {
      if (instance.status !== 'pending') return instance
      const template = findTemplate(campaignDef, instance.templateId)
      if (!template || playerVisibleTemplate(template)) return instance
      return { ...instance, status: 'suppressed', suppressedAtDay: day }
    })

    const winner = pending[0]
    if (winner) {
      const activatedDeadline = day + winner.template.deadlineDays
      state.situations = state.situations.map((instance) => {
        if (instance.instanceId === winner.item.instanceId) {
          return {
            ...instance,
            status: 'active',
            activatedAtDay: day,
            deadlineDay: activatedDeadline,
            ledgerCauseId: `campaign_activate_${instance.instanceId}`,
          }
        }
        if (
          instance.status === 'pending' &&
          winner.template.exclusionGroup &&
          instance.exclusionGroup === winner.template.exclusionGroup
        ) {
          ledger.push(
            ledgerEvent({
              id: `campaign_suppress_${instance.instanceId}_${day}`,
              day,
              title: 'Situation ausgeschlossen',
              body: `Gegenseitig ausschließende Gruppe „${winner.template.exclusionGroup}“ — andere Lage hat Vorrang.`,
              tone: 'warning',
              causeId: `campaign_activate_${winner.item.instanceId}`,
            }),
          )
          return { ...instance, status: 'suppressed', suppressedAtDay: day }
        }
        return instance
      })
      if (winner.template.exclusionGroup) {
        state.exclusionClaims[winner.template.exclusionGroup] = winner.template.id
      }
      deadlineDay = activatedDeadline
      if (playerVisibleTemplate(winner.template)) {
        ledger.push(
          ledgerEvent({
            id: `campaign_activate_${winner.item.instanceId}`,
            day,
            title: `Situation aktiv: ${winner.template.title}`,
            body: winner.template.context,
            tone: 'warning',
          }),
        )
      }
    }
  }

  // 5) Campaign duration end.
  if (month >= state.durationMonths) {
    state.ended = true
    state.endReason = 'duration'
    status = 'completed'
    ledger.push(
      ledgerEvent({
        id: `campaign_end_duration_${day}`,
        day,
        title: 'Campaign abgeschlossen',
        body: `Die Laufzeit von ${state.durationMonths} Simulationsmonaten ist erreicht.`,
        tone: 'positive',
      }),
    )
  }

  return { campaign: state, ledger, deadlineDay, status }
}

/**
 * Resolve the active situation after a committed decision (one resolution per commit).
 */
export function resolveActiveSituation(
  run: Pick<RunState, 'campaign' | 'day' | 'seed'>,
  campaignDef: CampaignDefinition,
  decisionId: string,
): { campaign: CampaignRuntimeState; ledger: LedgerEvent[] } {
  const state = cloneCampaign(run.campaign)
  const ledger: LedgerEvent[] = []
  const active = state.situations.find((item) => item.status === 'active')
  if (!active) return { campaign: state, ledger }

  const template = findTemplate(campaignDef, active.templateId)
  state.situations = state.situations.map((instance) =>
    instance.instanceId === active.instanceId
      ? { ...instance, status: 'resolved', resolvedAtDay: run.day }
      : instance,
  )
  if (template && template.cooldownDays > 0) {
    state.cooldowns[template.id] = run.day + template.cooldownDays
  }
  ledger.push(
    ledgerEvent({
      id: `campaign_resolve_${active.instanceId}`,
      day: run.day,
      title: `Situation abgeschlossen: ${template?.title ?? active.templateId}`,
      body: 'Entscheidung committed — die Lage ist im Ledger als resolved verknüpft.',
      tone: 'positive',
      causeId: decisionId,
    }),
  )
  return { campaign: state, ledger }
}

/** Bind opening template copy from scenario without embedding industry plot packs. */
export function openingTemplateFromScenario(
  scenario: Pick<ScenarioDefinition, 'decisionTitle' | 'decisionContext' | 'deadlineDays'>,
): SituationTemplate {
  return {
    id: 'opening',
    version: 1,
    familyId: 'opening',
    title: scenario.decisionTitle,
    context: scenario.decisionContext,
    priority: 1000,
    cooldownDays: 0,
    deadlineDays: scenario.deadlineDays,
    visibility: 'player_visible',
    trigger: { minDay: 0, maxDecisions: 0 },
  }
}

export function getActiveSituation(
  campaign: CampaignRuntimeState,
): SituationInstance | undefined {
  return campaign.situations.find((item) => item.status === 'active')
}

export type CampaignCatalog = Record<string, CampaignDefinition[]>

/** Lookup published campaign version; fail-closed to undefined if missing. */
export function getCampaignAtVersion(
  catalog: CampaignCatalog,
  campaignId: string,
  version: number,
): CampaignDefinition | undefined {
  const versions = catalog[campaignId]
  if (!versions || versions.length === 0) return undefined
  return versions.find((item) => item.version === version)
}

export function latestCampaignForScenario(
  catalog: CampaignCatalog,
  scenarioId: ScenarioId,
): CampaignDefinition | undefined {
  const matches: CampaignDefinition[] = []
  for (const versions of Object.values(catalog)) {
    for (const def of versions) {
      if (def.scenarioId === scenarioId) matches.push(def)
    }
  }
  if (matches.length === 0) return undefined
  matches.sort((a, b) => b.version - a.version || a.id.localeCompare(b.id))
  return matches[0]
}
