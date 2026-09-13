export type ScenarioId =
  | 'nexora-saas'
  | 'nordkern-foods'
  | 'klarwerk-services'
  | 'heliora-clinic'
  | 'marktwerk-marketplace'
  | 'stromfeld-energy'
  | 'urbanfit-retail'

export type AnalysisId = string

export type ActionKind =
  | 'allocate_capital'
  | 'change_hiring_policy'
  | 'change_headcount_plan'
  | 'set_pricing_policy'
  | 'renegotiate_customer'
  | 'accept_contract'
  | 'reject_contract'
  | 'prioritize_product'
  | 'start_project'
  | 'cancel_project'
  | 'request_analysis'
  | 'restructure_organization'

export type MetricTone = 'positive' | 'negative' | 'neutral' | 'warning'

export interface CompanyMetrics {
  revenueAnnualCents: number
  ebitdaAnnualCents: number
  cashCents: number
  headcount: number
  capacityUtilizationBps: number
  customerConcentrationBps: number
  moraleBps: number
  resilienceBps: number
  marketPositionBps: number
}

export interface MetricDefinition {
  key: keyof CompanyMetrics
  label: string
  format: 'currency' | 'percent' | 'integer'
  inverse?: boolean
}

export interface AnalysisDefinition {
  id: AnalysisId
  title: string
  description: string
  durationDays: number
  /** Authoring-only; never expose via player read-model until unlock. */
  resultTitle: string
  /** Authoring-only; never expose via player read-model until unlock. */
  resultBody: string
  confidence: 'low' | 'medium' | 'high'
  evidenceTags: string[]
}

/** Player-facing analysis catalog entry (no spoilers). */
export interface PlayerAnalysisDefinition {
  id: AnalysisId
  title: string
  description: string
  durationDays: number
  confidence: 'low' | 'medium' | 'high'
  evidenceTags: string[]
}

export interface PendingAnalysis {
  analysisId: AnalysisId
  requestedAtDay: number
  availableAtDay: number
}

export interface ScenarioEffect {
  metrics: Partial<CompanyMetrics>
  delayed?: {
    days: number
    title: string
    body: string
    probabilityBps: number
    successMetrics: Partial<CompanyMetrics>
    failureMetrics: Partial<CompanyMetrics>
  }
}

export interface ScenarioActionRule {
  kind: ActionKind
  label: string
  keywords: string[]
  effect: ScenarioEffect
}

export interface ScoreRubric {
  framingKeywords: string[]
  objectiveKeywords: string[]
  riskKeywords: string[]
  relevantAnalysisIds: AnalysisId[]
}

export interface AdvisorDefinition {
  id: string
  name: string
  role: string
  stance: string
  domains: string[]
}

/** Visibility for entities / sensitive fields (SIMULATION_MODEL §9–10). */
export type KnowledgeVisibility =
  | 'player_visible'
  | 'advisor_visible'
  | 'researchable'
  | 'hidden'
  | 'system_only'

/** Lifecycle so ended entities stay historically referenceable. */
export type EntityLifecycle = 'active' | 'ended' | 'cancelled' | 'tombstoned'

export interface WorldEntityBase {
  id: string
  name: string
  lifecycle: EntityLifecycle
  visibility: KnowledgeVisibility
}

export interface CustomerEntity extends WorldEntityBase {
  segment: string
  revenueShareBps: number
  /** Optional; may be hidden/researchable independently of entity visibility. */
  contributionMarginBps?: number
  contributionMarginVisibility?: KnowledgeVisibility
}

export interface ProductEntity extends WorldEntityBase {
  category: string
  annualRevenueCents: number
}

export interface DepartmentEntity extends WorldEntityBase {
  headcount: number
  focus: string
}

export interface ProjectEntity extends WorldEntityBase {
  budgetCents: number
  progressBps: number
}

export interface KeyPersonEntity extends WorldEntityBase {
  role: string
  departmentId?: string
  flightRiskBps?: number
  flightRiskVisibility?: KnowledgeVisibility
}

export interface LocationEntity extends WorldEntityBase {
  kind: 'plant' | 'office' | 'warehouse' | 'other'
  utilizationBps: number
}

export interface ContractEntity extends WorldEntityBase {
  counterpartyId: string
  renewalDay: number
  annualValueCents: number
}

export interface CompetitorEntity extends WorldEntityBase {
  segmentFocus: string
  threatBps?: number
  threatVisibility?: KnowledgeVisibility
}

/**
 * Compact World State V2 modules — empty arrays = module disabled for the industry
 * (never filled with fake placeholder entities).
 */
export interface WorldModules {
  customers: CustomerEntity[]
  products: ProductEntity[]
  departments: DepartmentEntity[]
  projects: ProjectEntity[]
  keyPeople: KeyPersonEntity[]
  locations: LocationEntity[]
  contracts: ContractEntity[]
  competitors: CompetitorEntity[]
}

/** Player-/advisor-revealed knowledge — does not mutate truth. */
export interface KnowledgeSet {
  revealedEntityIds: string[]
  /** Field keys as `${entityId}:${field}` e.g. `cust_lidl:contributionMarginBps`. */
  revealedFieldKeys: string[]
}

/** Player-safe entity summaries (no hidden/researchable fields). */
export interface PlayerCustomerView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  segment: string
  revenueShareBps: number
  contributionMarginBps?: number
}

export interface PlayerProductView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  category: string
  annualRevenueCents: number
}

export interface PlayerDepartmentView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  headcount: number
  focus: string
}

export interface PlayerProjectView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  budgetCents: number
  progressBps: number
}

export interface PlayerKeyPersonView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  role: string
  departmentId?: string
  flightRiskBps?: number
}

export interface PlayerLocationView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  kind: LocationEntity['kind']
  utilizationBps: number
}

export interface PlayerContractView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  counterpartyId: string
  renewalDay: number
  annualValueCents: number
}

export interface PlayerCompetitorView {
  id: string
  name: string
  lifecycle: EntityLifecycle
  segmentFocus: string
  threatBps?: number
}

export interface PlayerWorldView {
  customers: PlayerCustomerView[]
  products: PlayerProductView[]
  departments: PlayerDepartmentView[]
  projects: PlayerProjectView[]
  keyPeople: PlayerKeyPersonView[]
  locations: PlayerLocationView[]
  contracts: PlayerContractView[]
  competitors: PlayerCompetitorView[]
}

export interface ScenarioDefinition {
  id: ScenarioId
  version: number
  companyName: string
  industry: string
  stage: string
  scaleLabel: string
  headline: string
  description: string
  decisionTitle: string
  decisionContext: string
  deadlineDays: number
  startingMetrics: CompanyMetrics
  metricDefinitions: MetricDefinition[]
  knownFacts: string[]
  analyses: AnalysisDefinition[]
  actionRules: ScenarioActionRule[]
  scoreRubric: ScoreRubric
  advisors: AdvisorDefinition[]
  /**
   * World State V2 seed for this published scenario version.
   * Absent/empty modules = disabled for this industry snapshot.
   */
  initialWorld?: WorldModules
}

/**
 * Kind-specific parameter bag (integer money in cents / bps as integers).
 * Validated via shared/domain/action-params.ts — never invent missing fields.
 * Optional fields allow explicit `undefined` so UI can clear values under exactOptionalPropertyTypes.
 */
export interface ActionParams {
  amountCents?: number | undefined
  targetId?: string | undefined
  scope?: string | undefined
  timingDays?: number | undefined
  conditions?: string | undefined
  fallback?: string | undefined
  headcountDelta?: number | undefined
  priceChangeBps?: number | undefined
  projectId?: string | undefined
  orgChange?: string | undefined
}

export interface ManagementAction {
  id: string
  kind: ActionKind
  label: string
  sourceText: string
  /** Parameter schema version; starts at 1. */
  schemaVersion: number
  params: ActionParams
}

export interface ActionProposal {
  actions: ManagementAction[]
  assumptions: string[]
  ambiguities: string[]
  extractedObjectives: string[]
  extractedRisks: string[]
  extractedAlternatives: string[]
  evidenceRefs: string[]
}

export interface AnalysisResult {
  analysisId: AnalysisId
  completedAtDay: number
  resultTitle: string
  resultBody: string
  confidence: 'low' | 'medium' | 'high'
}

export interface ScheduledEvent {
  id: string
  dueDay: number
  decisionId: string
  title: string
  body: string
  probabilityBps: number
  successMetrics: Partial<CompanyMetrics>
  failureMetrics: Partial<CompanyMetrics>
  resolved: boolean
  outcome?: 'success' | 'failure'
}

/** Structured semantic signals per DQ dimension (deterministic extraction). */
export interface DecisionQualityEvidence {
  framingSignals: string[]
  informationSignals: string[]
  alternativeSignals: string[]
  objectiveSignals: string[]
  reasoningSignals: string[]
  executionSignals: string[]
  /** Penalty applied when text looks like keyword stuffing without structure. */
  keywordStuffingPenalty: number
}

/** Frozen player-visible decision context at commit time (DQ must not use later knowledge). */
export interface DecisionContextSnapshot {
  day: number
  deadlineDay: number
  completedAnalysisIds: string[]
  pendingAnalysisIds: string[]
  revealedEntityIds: string[]
  constraintBlockers: string[]
  constraintWarnings: string[]
  actionKinds: string[]
  playerTextLength: number
  rationaleLength: number
  evidence: DecisionQualityEvidence
}

export interface DecisionQuality {
  framing: number
  information: number
  alternatives: number
  objectives: number
  reasoning: number
  execution: number
  total: number
  evidence: DecisionQualityEvidence
}

export type LedgerEventType =
  | 'situation'
  | 'information'
  | 'decision'
  | 'immediate_effect'
  | 'delayed_effect'
  | 'review'
  | 'economic'
  | 'deadline_consequence'
  | 'system'

export interface LedgerEvent {
  id: string
  type: LedgerEventType
  day: number
  title: string
  body: string
  causeId?: string
  tone: MetricTone
}

export interface DecisionRecord {
  id: string
  day: number
  playerText: string
  rationale: string
  proposal: ActionProposal
  quality: DecisionQuality
  /** Knowledge + constraints frozen at commit; later unlocks must not rewrite DQ. */
  contextSnapshot: DecisionContextSnapshot
  /**
   * Post-commit world snapshot for long-term outcome / counterfactual batches.
   * Shape matches `OutcomeBaseSnapshot` in outcomes.ts (kept structural to avoid cycles).
   */
  outcomeBaseSnapshot?: {
    schemaVersion: 1 | 2
    runId: string
    scenarioId: ScenarioId
    scenarioVersion: number
    seed: string
    revision: number
    day: number
    deadlineDay: number
    metrics: CompanyMetrics
    world: WorldModules
    playerKnowledge: KnowledgeSet
    advisorKnowledge: KnowledgeSet
    pendingAnalyses: PendingAnalysis[]
    completedAnalyses: AnalysisResult[]
    decisions: DecisionRecord[]
    scheduledEvents: ScheduledEvent[]
    ledger: LedgerEvent[]
    processedIdempotencyKeys: string[]
    status: 'active' | 'completed' | 'failed'
  }
  before: CompanyMetrics
  afterImmediate: CompanyMetrics
}

export interface RunState {
  /** 1 = legacy metrics-only; 2 = World State modules + knowledge sets. */
  schemaVersion: 1 | 2
  runId: string
  scenarioId: ScenarioId
  scenarioVersion: number
  seed: string
  revision: number
  day: number
  deadlineDay: number
  metrics: CompanyMetrics
  pendingAnalyses: PendingAnalysis[]
  completedAnalyses: AnalysisResult[]
  decisions: DecisionRecord[]
  scheduledEvents: ScheduledEvent[]
  ledger: LedgerEvent[]
  processedIdempotencyKeys: string[]
  status: 'active' | 'completed' | 'failed'
  /** Present after normalize / createRun for schemaVersion 2. */
  world: WorldModules
  playerKnowledge: KnowledgeSet
  advisorKnowledge: KnowledgeSet
}
