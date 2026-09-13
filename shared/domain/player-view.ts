/**
 * Player read-model helpers — strip spoiler fields from scenario catalogs.
 * Location: shared/domain/player-view.ts
 */
import { getScenario } from './scenarios.ts'
import { ensureManagementAction } from './action-params.ts'
import type {
  AnalysisDefinition,
  AnalysisResult,
  PlayerAnalysisDefinition,
  RunState,
  ScenarioDefinition,
  ScenarioId,
} from './types.ts'

export function toPlayerAnalysis(analysis: AnalysisDefinition): PlayerAnalysisDefinition {
  return {
    id: analysis.id,
    title: analysis.title,
    description: analysis.description,
    durationDays: analysis.durationDays,
    confidence: analysis.confidence,
    evidenceTags: analysis.evidenceTags,
  }
}

export function listPlayerAnalyses(scenarioId: ScenarioId): PlayerAnalysisDefinition[] {
  return getScenario(scenarioId).analyses.map(toPlayerAnalysis)
}

/** Scenario view safe for UI — analyses without result bodies. */
export function getPlayerScenario(scenarioId: ScenarioId): Omit<ScenarioDefinition, 'analyses'> & {
  analyses: PlayerAnalysisDefinition[]
} {
  const scenario = getScenario(scenarioId)
  return {
    ...scenario,
    analyses: scenario.analyses.map(toPlayerAnalysis),
  }
}

export function getUnlockedAnalysis(
  run: RunState,
  analysisId: string,
): AnalysisResult | undefined {
  return run.completedAnalyses.find((item) => item.analysisId === analysisId)
}

/** Normalize persisted runs that predate pendingAnalyses / idempotency / reveal fields / action params. */
export function normalizeRunState(run: RunState): RunState {
  const pendingAnalyses = run.pendingAnalyses ?? []
  const processedIdempotencyKeys = run.processedIdempotencyKeys ?? []
  const completedAnalyses = (run.completedAnalyses ?? []).map((item) => {
    if ('resultBody' in item && item.resultBody) return item as AnalysisResult
    const scenario = getScenario(run.scenarioId)
    const def = scenario.analyses.find((candidate) => candidate.id === item.analysisId)
    return {
      analysisId: item.analysisId,
      completedAtDay: item.completedAtDay,
      resultTitle: def?.resultTitle ?? 'Analyse',
      resultBody: def?.resultBody ?? '',
      confidence: def?.confidence ?? 'medium',
    } satisfies AnalysisResult
  })
  const decisions = (run.decisions ?? []).map((decision) => ({
    ...decision,
    proposal: {
      ...decision.proposal,
      actions: decision.proposal.actions.map(ensureManagementAction),
    },
  }))
  return {
    ...run,
    pendingAnalyses,
    completedAnalyses,
    processedIdempotencyKeys,
    decisions,
  }
}
