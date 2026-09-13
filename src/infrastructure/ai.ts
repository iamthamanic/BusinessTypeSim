import type { ActionProposal, RunState } from '../domain'
import { collectAdvisorToolContext, interpretDecisionLocally } from '../domain'
import { apiFetch, cloudConfigured, getSession } from './cloud'

interface InterpretResponse {
  proposal?: ActionProposal
  error?: string
}

interface AdvisorResponse {
  answer?: string
  error?: string
}

export async function interpretDecision(
  run: RunState,
  playerText: string,
  rationale: string,
  useCloud: boolean,
): Promise<ActionProposal> {
  if (!useCloud || !cloudConfigured) return interpretDecisionLocally(run, playerText, rationale)
  const session = await getSession()
  if (!session) return interpretDecisionLocally(run, playerText, rationale)
  try {
    const data = await apiFetch<InterpretResponse>('/ai', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'interpret_decision',
        runId: run.runId,
        playerText,
        rationale,
      }),
    })
    if (!data.proposal) return interpretDecisionLocally(run, playerText, rationale)
    return data.proposal
  } catch {
    return interpretDecisionLocally(run, playerText, rationale)
  }
}

export async function askAdvisor(
  run: RunState,
  advisorId: string,
  question: string,
  useCloud: boolean,
): Promise<string> {
  if (useCloud && cloudConfigured) {
    try {
      const data = await apiFetch<AdvisorResponse>('/ai', {
        method: 'POST',
        body: JSON.stringify({
          mode: 'advisor',
          runId: run.runId,
          advisorId,
          question,
        }),
      })
      if (data.answer) return data.answer
    } catch {
      // fall through to local
    }
  }
  return localAdvisorAnswer(run, advisorId, question)
}

function localAdvisorAnswer(run: RunState, advisorId: string, question: string): string {
  const toolContext = collectAdvisorToolContext(run, advisorId)
  const base = advisorId.includes('cfo') || advisorId.includes('finance')
    ? 'Aus Finance-Sicht würde ich Cash, Deckungsbeitrag und Downside getrennt betrachten.'
    : advisorId.includes('hr') || advisorId.includes('delivery')
      ? 'Aus People-/Operations-Sicht ist die Umsetzbarkeit wichtiger als ein theoretisch perfekter Business Case.'
      : 'Ich würde Kundenreaktion und strategische Optionalität nicht mit kurzfristigem Umsatz verwechseln.'
  return `${base}\n\nTool-Kontext (read-only):\n${toolContext}\n\nFrage: ${question}\nIch nutze nur freigeschaltete Evidence und rollenbezogene Tools.`
}
