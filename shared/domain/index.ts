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
  DecisionQuality,
  DecisionRecord,
  LedgerEvent,
  LedgerEventType,
  ManagementAction,
  MetricDefinition,
  MetricTone,
  PendingAnalysis,
  PlayerAnalysisDefinition,
  RunState,
  ScenarioDefinition,
  ScenarioId,
  ScheduledEvent,
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

export { scenarios, getScenario } from './scenarios.ts'

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
  getPlayerScenario,
  getUnlockedAnalysis,
  listPlayerAnalyses,
  normalizeRunState,
  toPlayerAnalysis,
} from './player-view.ts'

export {
  collectAdvisorToolContext,
  runAdvisorTool,
  toolsForAdvisor,
  type AdvisorToolId,
} from './advisor-tools.ts'
