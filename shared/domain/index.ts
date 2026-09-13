/**
 * Pure authoritative simulation domain — no React, Capacitor, DB, or LLM imports.
 * Location: shared/domain/
 * Explicit re-exports (avoid `export *`) so Node/tsx ESM named imports stay stable.
 */
export type {
  ActionKind,
  ActionParams,
  ActionProposal,
  AdvisorDefinition,
  AnalysisDefinition,
  AnalysisResult,
  CampaignDefinition,
  CampaignRuntimeState,
  CompanyMetrics,
  CompetitorEntity,
  ContractEntity,
  CustomerEntity,
  DecisionContextSnapshot,
  DecisionQuality,
  DecisionQualityEvidence,
  DecisionRecord,
  DepartmentEntity,
  EntityLifecycle,
  KeyPersonEntity,
  KnowledgeSet,
  KnowledgeVisibility,
  LedgerEvent,
  LedgerEventType,
  LocationEntity,
  ManagementAction,
  MetricDefinition,
  MetricTone,
  PendingAnalysis,
  PlayerAnalysisDefinition,
  PlayerCompetitorView,
  PlayerContractView,
  PlayerCustomerView,
  PlayerDepartmentView,
  PlayerKeyPersonView,
  PlayerLocationView,
  PlayerProductView,
  PlayerProjectView,
  PlayerWorldView,
  ProductEntity,
  ProjectEntity,
  RunState,
  ScenarioDefinition,
  ScenarioId,
  ScheduledEvent,
  SituationInstance,
  SituationStatus,
  SituationTemplate,
  SituationTrigger,
  SituationVisibility,
  WorldModules,
} from './types.ts'

export {
  ACTION_PARAMS_SCHEMA_VERSION,
  PARAMETERIZED_ACTION_KINDS,
  actionKindSchema,
  actionProposalSchema,
  allocateCapitalParamsSchema,
  changeHeadcountPlanParamsSchema,
  ensureManagementAction,
  genericActionParamsSchema,
  inferParamsFromText,
  isParameterizedActionKind,
  managementActionSchema,
  normalizeActionParams,
  paramsSchemaForKind,
  parseManagementAction,
  renegotiateCustomerParamsSchema,
  restructureOrganizationParamsSchema,
  setPricingPolicyParamsSchema,
  startProjectParamsSchema,
  type ParameterizedActionKind,
} from './action-params.ts'

export {
  scenarios,
  getScenario,
  getScenarioAtVersion,
  listPublishedScenarioVersions,
  listPlayableScenarios,
} from './scenarios.ts'

export {
  advanceTime,
  buildAlternateProposal,
  commitDecision,
  compareDecisionOutcomes,
  createRun,
  getNextPendingEventDay,
  interpretDecisionLocally,
  projectCounterfactualAlternate,
  requestAnalysis,
  scoreDecision,
  summarizeMetricDelta,
  UnknownAnalysisError,
} from './engine.ts'

export {
  applyEconomicDay,
  softDeadlineConsequence,
  analysisCompletesAfterDeadline,
  dailyCashDeltaFromEbitda,
  dailyPayrollBurnCents,
  dailyRevenueRecognitionCents,
  daysUntilDeadline,
  hasDeadlineConsequence,
  DAILY_PAYROLL_CENTS_PER_HEAD,
  DEADLINE_MISSED_LEDGER_ID,
  ECONOMIC_TICK_SCHEMA_VERSION,
} from './economic-tick.ts'

export {
  ConstraintViolationError,
  actionCashDemandCents,
  availableCashCents,
  evaluateConstraints,
  hasConstraintBlockers,
  reservedCashCents,
  type ConstraintCode,
  type ConstraintEvaluation,
  type ConstraintIssue,
  type ConstraintSeverity,
} from './constraints.ts'

export {
  decisionContextSnapshotSchema,
  decisionQualityEvidenceSchema,
  emptyDecisionContextSnapshot,
  emptyDecisionQualityEvidence,
  extractDecisionEvidence,
  parseDecisionQualityEvidence,
  scoreDecisionFromEvidence,
  scoreDecisionSemantic,
} from './decision-quality.ts'

export {
  OUTCOME_HORIZON_DAYS,
  DEFAULT_COMPARISON_BATCH_SIZE,
  captureOutcomeBaseSnapshot,
  compareOutcomes,
  comparisonSeed,
  projectToHorizon,
  runFromOutcomeSnapshot,
  type CounterfactualProjection,
  type HorizonProjection,
  type OutcomeBaseSnapshot,
  type OutcomeComparison,
  type OutcomeSample,
} from './outcomes.ts'

export {
  getPlayerRunWorld,
  getPlayerScenario,
  getUnlockedAnalysis,
  listPlayerAnalyses,
  normalizeRunState,
  toPlayerAnalysis,
} from './player-view.ts'

export {
  WORLD_STATE_SCHEMA_VERSION,
  cloneWorldModules,
  emptyKnowledgeSet,
  emptyWorldModules,
  ensureWorldStateV2,
  getAdvisorWorldView,
  getPlayerWorldView,
  listWorldEntityIds,
  playerWorldContextSummary,
} from './world-state.ts'

export { nexoraWorldV2, nordkernWorldV2 } from './world-fixtures.ts'

export {
  CAMPAIGN_DURATION_MONTHS,
  CAMPAIGN_SCHEMA_VERSION,
  DAYS_PER_CAMPAIGN_MONTH,
  applyCampaignDay,
  bootstrapCampaignState,
  campaignMonthFromDay,
  emptyCampaignState,
  getActiveSituation,
  getCampaignAtVersion,
  getPlayerCampaignView,
  isSituationEligible,
  latestCampaignForScenario,
  openingTemplateFromScenario,
  resolveActiveSituation,
  type CampaignCatalog,
  type PlayerCampaignView,
  type PlayerSituationView,
} from './campaign.ts'

export {
  buildTestCampaign,
  getPublishedCampaignForScenario,
  publishedCampaigns,
} from './campaign-fixtures.ts'

export {
  collectAdvisorToolContext,
  runAdvisorTool,
  toolsForAdvisor,
  type AdvisorToolId,
} from './advisor-tools.ts'
