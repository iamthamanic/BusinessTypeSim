import type { ActionProposal, RunState, ScenarioId } from '../domain'
import { supabase } from './supabase'

interface GameResponse {
  run?: RunState
  error?: string
}

async function callGame(body: Record<string, unknown>): Promise<RunState> {
  if (!supabase) throw new Error('Cloud-Modus ist nicht konfiguriert.')
  const { data, error } = await supabase.functions.invoke<GameResponse>('game-api', { body })
  if (error) throw new Error(error.message)
  if (!data?.run) throw new Error(data?.error ?? 'Ungültige Serverantwort.')
  return data.run
}

export function createCloudRun(scenarioId: ScenarioId, seed: string): Promise<RunState> {
  return callGame({ op: 'create', scenarioId, seed })
}

export function requestCloudAnalysis(runId: string, revision: number, analysisId: string): Promise<RunState> {
  return callGame({ op: 'analysis', runId, revision, analysisId })
}

export function commitCloudDecision(runId: string, revision: number, playerText: string, rationale: string, proposal: ActionProposal): Promise<RunState> {
  return callGame({ op: 'commit', runId, revision, playerText, rationale, proposal })
}

export function advanceCloudTime(runId: string, revision: number, days: number): Promise<RunState> {
  return callGame({ op: 'advance', runId, revision, days })
}
