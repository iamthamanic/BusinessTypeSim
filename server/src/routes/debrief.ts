/** Read-only real-world debrief via Tavily — never mutates game state. */
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, type AppVariables } from '../auth.ts'
import { pool } from '../db.ts'
import { env } from '../env.ts'
import { claimAiRequest } from '../rate-limit.ts'
import { getScenarioAtVersion, type RunState } from '../../../shared/domain/index.ts'

const inputSchema = z.object({
  runId: z.string().min(1),
  decisionId: z.string().min(1),
})

interface SearchResult {
  title?: string
  url?: string
  content?: string
}

export const debriefRoutes = new Hono<{ Variables: AppVariables }>()

debriefRoutes.post('/', requireAuth, async (c) => {
  const parsed = inputSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const user = c.get('user')
  const tavilyKey = env.tavilyApiKey()
  if (!tavilyKey) return c.json({ error: 'SEARCH_NOT_CONFIGURED' }, 503)

  try {
    const allowed = await claimAiRequest(user.id)
    if (!allowed) return c.json({ error: 'RATE_LIMITED' }, 429)

    const loaded = await pool.query<{ state: RunState }>(
      `select state from game_runs where id = $1 and owner_id = $2`,
      [parsed.data.runId, user.id],
    )
    const run = loaded.rows[0]?.state
    if (!run) return c.json({ error: 'RUN_NOT_FOUND' }, 404)
    const decision = run.decisions.find((candidate) => candidate.id === parsed.data.decisionId)
    if (!decision) return c.json({ error: 'DECISION_NOT_FOUND' }, 404)
    const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)

    const query = `${scenario.industry} company strategy case ${decision.proposal.actions.map((action) => action.label).join(' ')} real example`
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { Authorization: `Bearer ${tavilyKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, max_results: 5, search_depth: 'advanced', include_answer: true }),
      signal: AbortSignal.timeout(18_000),
    })
    if (!response.ok) return c.json({ error: 'SEARCH_FAILED' }, 502)
    const payload = await response.json() as { answer?: string; results?: SearchResult[] }
    const sources = (payload.results ?? [])
      .filter((item) => item.title && item.url)
      .slice(0, 5)
      .map((item) => ({
        title: item.title ?? 'Quelle',
        url: item.url ?? '',
        snippet: (item.content ?? '').slice(0, 420),
      }))
    return c.json({
      summary: payload.answer ?? 'Die Recherche liefert reale Vergleichsfälle. Sie beeinflussen den simulierten Run nicht.',
      sources,
    })
  } catch (error) {
    console.error('debrief error', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
