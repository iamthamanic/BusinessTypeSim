/** AI orchestrator — interpret decisions + advisor answers via Ollama Cloud. */
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, type AppVariables } from '../auth.ts'
import { actionProposalSchema } from '../contracts.ts'
import { pool } from '../db.ts'
import { callChatModel } from '../llm.ts'
import { interpretOwnedRunLookup } from '../owned-run.ts'
import { claimAiRequest } from '../rate-limit.ts'
import {
  advisorVoiceForRole,
  collectAdvisorToolContext,
  getScenarioAtVersion,
  getPlayerWorldView,
  normalizeRunState,
  playerWorldContextSummary,
  type ActionProposal,
  type RunState,
} from '../../../shared/domain/index.ts'

const inputSchema = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('interpret_decision'),
    runId: z.string().min(1),
    playerText: z.string().min(3).max(4000),
    rationale: z.string().max(6000),
  }),
  z.object({
    mode: z.literal('advisor'),
    runId: z.string().min(1),
    advisorId: z.string().min(1).max(120),
    question: z.string().min(2).max(2500),
  }),
])

function visibleContext(run: RunState) {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const analyses = run.completedAnalyses.map((item) => ({
    id: item.analysisId,
    title: item.resultTitle,
    result: item.resultBody,
    confidence: item.confidence,
  }))
  return {
    company: scenario.companyName,
    situation: scenario.decisionContext,
    day: run.day,
    deadlineDay: run.deadlineDay,
    metrics: run.metrics,
    knownFacts: scenario.knownFacts,
    analyses,
    world: playerWorldContextSummary(getPlayerWorldView(run)),
  }
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1]
  return JSON.parse((fenced ?? text).trim())
}

export const aiRoutes = new Hono<{ Variables: AppVariables }>()

aiRoutes.post('/', requireAuth, async (c) => {
  const parsed = inputSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const user = c.get('user')
  const input = parsed.data

  try {
    const allowed = await claimAiRequest(user.id)
    if (!allowed) return c.json({ error: 'RATE_LIMITED' }, 429)

    const loaded = await pool.query<{ owner_id: string; revision: number; state: RunState }>(
      `select owner_id, revision, state from game_runs where id = $1 and owner_id = $2`,
      [input.runId, user.id],
    )
    const owned = interpretOwnedRunLookup(loaded.rows, user.id)
    if (!owned.ok) return c.json({ error: owned.error }, owned.status)
    const run = normalizeRunState(owned.row.state)
    const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
    const contextData = visibleContext(run)

    if (input.mode === 'advisor') {
      const advisor = scenario.advisors.find((candidate) => candidate.id === input.advisorId)
      if (!advisor) return c.json({ error: 'ADVISOR_NOT_FOUND' }, 404)
      const toolContext = collectAdvisorToolContext(run, input.advisorId)
      const voice = advisorVoiceForRole(advisor.role)
      const answer = await callChatModel([
        {
          role: 'system',
          content:
            `Du spielst ${advisor.name}, ${advisor.role}. Haltung: ${advisor.stance}. `
            + `${voice.prompt} `
            + 'Nutze ausschließlich Tool-Kontext und sichtbaren Unternehmenskontext. Benenne Unsicherheit offen. Erfinde keine Zahlen. Keine gesperrten Analysen.',
        },
        {
          role: 'user',
          content: `Tool-Kontext:\n${toolContext}\n\nSichtbarer Kontext:\n${JSON.stringify(contextData)}\n\nFrage: ${input.question}`,
        },
      ], { task: 'advisor_chat' })
      return c.json({ answer })
    }

    const content = await callChatModel([
      {
        role: 'system',
        content:
          'Interpretiere eine freie CEO-Entscheidung als JSON. Du darfst keinen Spielzustand verändern. '
          + 'Erlaubte kind-Werte: allocate_capital, change_hiring_policy, change_headcount_plan, set_pricing_policy, '
          + 'renegotiate_customer, accept_contract, reject_contract, prioritize_product, start_project, cancel_project, '
          + 'request_analysis, restructure_organization. '
          + 'Jede Action braucht schemaVersion: 1 und params (Objekt). '
          + 'Für allocate_capital / renegotiate_customer / start_project: amountCents als Integer (Cent, keine Floats), optional targetId, scope, timingDays, conditions, fallback. '
          + 'Für change_headcount_plan: headcountDelta (Integer). Für set_pricing_policy: priceChangeBps (Integer). '
          + 'Für start_project zusätzlich optional projectId. Für restructure_organization: orgChange. '
          + 'Erfinde keine Beträge oder Zahlen — fehlende/unklare Werte weglassen und in ambiguities nennen. '
          + 'Gib ausschließlich ein JSON-Objekt mit actions, assumptions, ambiguities, extractedObjectives, extractedRisks, extractedAlternatives, evidenceRefs zurück. Maximal 6 Actions.',
      },
      {
        role: 'user',
        content: `Sichtbarer Kontext:\n${JSON.stringify(contextData)}\n\nEntscheidung: ${input.playerText}\nBegründung: ${input.rationale}`,
      },
    ], { task: 'decision_interpret' })
    const validated = actionProposalSchema.safeParse(extractJson(content))
    if (!validated.success) return c.json({ error: 'INVALID_MODEL_OUTPUT' }, 422)
    const proposal: ActionProposal = validated.data
    return c.json({ proposal })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown'
    if (message === 'LLM_NOT_CONFIGURED') return c.json({ error: 'LLM_NOT_CONFIGURED' }, 503)
    console.error('ai error', message)
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
