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
  CompanyMetrics,
  CompetitorEntity,
  ContractEntity,
  CustomerEntity,
  DecisionQuality,
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
  commitDecision,
  createRun,
  getNextPendingEventDay,
  interpretDecisionLocally,
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
  hasDeadlineConsequence,
} from './economic-time.ts'

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
  collectAdvisorToolContext,
  runAdvisorTool,
  toolsForAdvisor,
  type AdvisorToolId,
} from './advisor-tools.ts'
