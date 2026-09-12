import { supabase } from './supabase'

export interface DebriefSource {
  title: string
  url: string
  snippet: string
}

export interface DebriefResult {
  summary: string
  sources: DebriefSource[]
}

export async function fetchDebrief(runId: string, decisionId: string): Promise<DebriefResult> {
  if (!supabase) throw new Error('Cloud-Modus erforderlich.')
  const result = await supabase.functions.invoke<DebriefResult>('research-debrief', { body: { runId, decisionId } })
  if (result.error || !result.data) throw new Error('Debrief nicht verfügbar.')
  return result.data
}
