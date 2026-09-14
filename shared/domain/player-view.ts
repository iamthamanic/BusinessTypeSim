/**
 * Player read-model helpers — strip spoiler fields from scenario catalogs + world.
 * Location: shared/domain/player-view.ts
 */
import { getScenario, getScenarioAtVersion } from './scenarios.ts'
import { ensureManagementAction } from './action-params.ts'
import {
  emptyDecisionContextSnapshot,
  emptyDecisionQualityEvidence,
} from './decision-quality.ts'
import {
  ensureWorldStateV2,
  getPlayerWorldView,
} from './world-state.ts'
import { emptyCampaignState, getCampaignAtVersion } from './campaign.ts'
import { getPublishedCampaignForScenario, publishedCampaigns } from './campaign-fixtures.ts'
import type {
  AnalysisDefinition,
  AnalysisResult,
  DecisionQuality,
  DecisionRecord,
  PlayerAnalysisDefinition,
  PlayerWorldView,
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

export function listPlayerAnalyses(scenarioId: ScenarioId, version?: number): PlayerAnalysisDefinition[] {
  const scenario =
    version === undefined ? getScenario(scenarioId) : getScenarioAtVersion(scenarioId, version)
  return scenario.analyses.map(toPlayerAnalysis)
}

/** Scenario view safe for UI — analyses without result bodies. */
export function getPlayerScenario(
  scenarioId: ScenarioId,
  version?: number,
): Omit<ScenarioDefinition, 'analyses' | 'initialWorld'> & {
  analyses: PlayerAnalysisDefinition[]
} {
  const scenario =
    version === undefined ? getScenario(scenarioId) : getScenarioAtVersion(scenarioId, version)
  return {
    id: scenario.id,
    version: scenario.version,
    companyName: scenario.companyName,
    industry: scenario.industry,
    stage: scenario.stage,
    scaleLabel: scenario.scaleLabel,
    headline: scenario.headline,
    description: scenario.description,
    decisionTitle: scenario.decisionTitle,
    decisionContext: scenario.decisionContext,
    companyPitch: scenario.companyPitch,
    deadlineDays: scenario.deadlineDays,
    startingMetrics: scenario.startingMetrics,
    metricDefinitions: scenario.metricDefinitions,
    knownFacts: scenario.knownFacts,
    actionRules: scenario.actionRules,
    scoreRubric: scenario.scoreRubric,
    advisors: scenario.advisors,
    analyses: scenario.analyses.map(toPlayerAnalysis),
  }
}

export function getUnlockedAnalysis(
  run: RunState,
  analysisId: string,
): AnalysisResult | undefined {
  return run.completedAnalyses.find((item) => item.analysisId === analysisId)
}

/**
 * Normalize persisted runs: analysis fields, action params, and World State V2.
 * V1 snapshots upgrade deterministically; scenario-bound `initialWorld` is only seeded
 * when the bound scenario version publishes one and the snapshot had no `world` yet.
 */
export function normalizeRunState(
  run: Omit<RunState, 'world' | 'playerKnowledge' | 'advisorKnowledge' | 'schemaVersion' | 'campaign'> & {
    schemaVersion?: 1 | 2
    world?: RunState['world']
    playerKnowledge?: RunState['playerKnowledge']
    advisorKnowledge?: RunState['advisorKnowledge']
    pendingAnalyses?: RunState['pendingAnalyses']
    completedAnalyses?: RunState['completedAnalyses']
    processedIdempotencyKeys?: RunState['processedIdempotencyKeys']
    decisions?: RunState['decisions']
    campaign?: RunState['campaign']
  },
): RunState {
  const pendingAnalyses = run.pendingAnalyses ?? []
  const processedIdempotencyKeys = run.processedIdempotencyKeys ?? []
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const completedAnalyses = (run.completedAnalyses ?? []).map((item) => {
    if ('resultBody' in item && item.resultBody) return item as AnalysisResult
    const def = scenario.analyses.find((candidate) => candidate.id === item.analysisId)
    return {
      analysisId: item.analysisId,
      completedAtDay: item.completedAtDay,
      resultTitle: def?.resultTitle ?? 'Analyse',
      resultBody: def?.resultBody ?? '',
      confidence: def?.confidence ?? 'medium',
    } satisfies AnalysisResult
  })
  const decisions = (run.decisions ?? []).map((decision): DecisionRecord => {
    const quality: DecisionQuality = {
      ...decision.quality,
      evidence: decision.quality.evidence ?? emptyDecisionQualityEvidence(),
    }
    return {
      ...decision,
      proposal: {
        ...decision.proposal,
        actions: decision.proposal.actions.map(ensureManagementAction),
      },
      quality,
      contextSnapshot:
        decision.contextSnapshot ??
        emptyDecisionContextSnapshot(decision.day, run.deadlineDay),
    }
  })

  const published = getPublishedCampaignForScenario(run.scenarioId)
  const bound =
    run.campaign !== undefined
      ? getCampaignAtVersion(publishedCampaigns, run.campaign.campaignId, run.campaign.campaignVersion) ??
        published
      : published
  const campaign = run.campaign ?? emptyCampaignState(bound, run.day)

  const withBasics = {
    ...run,
    pendingAnalyses,
    completedAnalyses,
    processedIdempotencyKeys,
    decisions,
    campaign,
  }

  const seedWorld =
    run.world === undefined && scenario.initialWorld !== undefined
      ? scenario.initialWorld
      : undefined

  return ensureWorldStateV2(withBasics, seedWorld)
}

/** Convenience: player-safe world modules for UI. */
export function getPlayerRunWorld(run: RunState): PlayerWorldView {
  return getPlayerWorldView(normalizeRunState(run))
}
