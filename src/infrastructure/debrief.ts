import { apiFetch, cloudConfigured } from './cloud'

export interface DebriefSource {
  title: string
  url: string
  snippet: string
}

export interface DebriefResult {
  summary: string
  sources: DebriefSource[]
}

interface DebriefResponse extends Partial<DebriefResult> {
  error?: string
}

export async function fetchDebrief(runId: string, decisionId: string): Promise<DebriefResult> {
  if (!cloudConfigured) throw new Error('Für reale Vergleichsfälle ist der Cloud-Modus erforderlich.')
  const data = await apiFetch<DebriefResponse>('/debrief', {
    method: 'POST',
    body: JSON.stringify({ runId, decisionId }),
  })
  if (!data.summary || !data.sources) throw new Error(data.error ?? 'Kein Debrief verfügbar.')
  return { summary: data.summary, sources: data.sources }
}
