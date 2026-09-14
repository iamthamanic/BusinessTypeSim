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
  idempotencyKey: string,
): Promise<RunState> {
  return callGame({ op: 'commit', runId, revision, playerText, rationale, proposal, idempotencyKey })
}

export function advanceCloudTime(runId: string, revision: number, days: number): Promise<RunState> {
  return callGame({ op: 'advance', runId, revision, days })
}

export type CloudRunProgress = {
  scenarioId: ScenarioId
  percent: number
  status: 'active' | 'completed' | 'failed'
}

export async function listCloudRunProgress(): Promise<CloudRunProgress[]> {
  const data = await apiFetch<{ runs?: CloudRunProgress[]; error?: string }>('/game/runs')
  return data.runs ?? []
}

/** Wipe all cloud runs for the signed-in user. */
export async function deleteAllCloudRuns(): Promise<{ deleted: number }> {
  const data = await apiFetch<{ ok?: boolean; deleted?: number; error?: string }>('/game/runs', {
    method: 'DELETE',
  })
  return { deleted: data.deleted ?? 0 }
}
