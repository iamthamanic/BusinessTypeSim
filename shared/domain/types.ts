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
}

export interface ManagementAction {
  id: string
  kind: ActionKind
  label: string
  sourceText: string
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

export interface DecisionQuality {
  framing: number
  information: number
  alternatives: number
  objectives: number
  reasoning: number
  execution: number
  total: number
}

export type LedgerEventType =
  | 'situation'
  | 'information'
  | 'decision'
  | 'immediate_effect'
  | 'delayed_effect'
  | 'review'

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
  before: CompanyMetrics
  afterImmediate: CompanyMetrics
}

export interface RunState {
  schemaVersion: 1
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
}
