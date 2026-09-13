import type { ActionProposal, RunState, ScenarioId } from '../domain'
import { apiFetch } from './cloud'

interface GameResponse {
  run?: RunState
  error?: string
}

async function callGame(body: Record<string, unknown>): Promise<RunState> {
  const data = await apiFetch<GameResponse>('/game', { method: 'POST', body: JSON.stringify(body) })
  if (!data.run) throw new Error(data.error ?? 'Ungültige Serverantwort.')
  return data.run
}

export function createCloudRun(scenarioId: ScenarioId, seed: string): Promise<RunState> {
  return callGame({ op: 'create', scenarioId, seed })
}

export function requestCloudAnalysis(runId: string, revision: number, analysisId: string): Promise<RunState> {
  return callGame({ op: 'analysis', runId, revision, analysisId })
}

export function commitCloudDecision(
  runId: string,
  revision: number,
  playerText: string,
  rationale: string,
  proposal: ActionProposal,
): Promise<RunState> {
  return callGame({ op: 'commit', runId, revision, playerText, rationale, proposal })
}

export function advanceCloudTime(runId: string, revision: number, days: number): Promise<RunState> {
  return callGame({ op: 'advance', runId, revision, days })
}
