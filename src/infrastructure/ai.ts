/**
 * Client AI adapters — cloud AI with local deterministic fallbacks.
 * Location: src/infrastructure/ai.ts
 */
import type { ActionProposal, RunState, SituationOpeningResult } from '../domain'
import {
  advisorVoiceForRole,
  buildSituationOpeningFallback,
  getPlayerCampaignView,
  getPublishedCampaignForScenario,
  getScenarioAtVersion,
  interpretDecisionLocally,
  situationOpeningAsPlainText,
} from '../domain'
import { formatMoney, formatPercent } from '../shared/format'
import { apiFetch, cloudConfigured, getSession } from './cloud'

interface InterpretResponse {
  proposal?: ActionProposal
  error?: string
}

interface AdvisorResponse {
  answer?: string
  error?: string
  source?: string
}

interface SituationOpeningResponse {
  messages?: string[]
  decisionPrompt?: string | null
  relevantAdvisorIds?: string[]
  source?: string
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

/**
 * Adalbert situation opening via dedicated LLM task (situation_opening).
 * Always returns usable structured messages; falls back deterministically on failure.
 */
export async function requestSituationOpening(
  run: RunState,
  useCloud: boolean,
): Promise<{ opening: SituationOpeningResult; source: 'llm' | 'fallback' }> {
  const fallback = buildSituationOpeningFallback(run)
  if (!useCloud || !cloudConfigured) {
    return { opening: fallback, source: 'fallback' }
  }
  try {
    const data = await apiFetch<SituationOpeningResponse>('/ai', {
      method: 'POST',
      body: JSON.stringify({
        mode: 'situation_opening',
        runId: run.runId,
      }),
    })
    const messages = Array.isArray(data.messages)
      ? data.messages.filter((item): item is string => typeof item === 'string' && item.trim().length >= 12)
      : []
    if (messages.length >= 2) {
      return {
        opening: {
          messages: messages.slice(0, 4),
          decisionPrompt:
            typeof data.decisionPrompt === 'string' && data.decisionPrompt.trim().length >= 8
              ? data.decisionPrompt.trim()
              : null,
          relevantAdvisorIds: Array.isArray(data.relevantAdvisorIds)
            ? data.relevantAdvisorIds.filter((id): id is string => typeof id === 'string').slice(0, 3)
            : [],
        },
        source: data.source === 'llm' ? 'llm' : 'fallback',
      }
    }
  } catch {
    // fall through
  }
  return { opening: fallback, source: 'fallback' }
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
      if (data.answer) return sanitizeAdvisorAnswer(data.answer)
    } catch {
      // fall through to local
    }
  }
  return localAdvisorAnswer(run, advisorId, question)
}

/** Strip accidental tool dumps if a model echoes raw context. */
function sanitizeAdvisorAnswer(answer: string): string {
  const trimmed = answer.trim()
  if (!trimmed.includes('Tool-Kontext') && !trimmed.includes('[get_visible_world]')) return trimmed
  const cleaned = trimmed
    .replace(/Tool-Kontext[\s\S]*?(?=\n{2,}[A-ZÄÖÜ]|$)/i, '')
    .replace(/\[get_visible_world\][\s\S]*?(?=\[get_|\n{2,}|$)/g, '')
    .replace(/Frage:\s*.+$/im, '')
    .replace(/Ich nutze nur freigeschaltete Evidence.*$/im, '')
    .trim()
  return cleaned.length > 20 ? cleaned : trimmed
}

function localAdvisorAnswer(run: RunState, advisorId: string, question: string): string {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const advisor = scenario.advisors.find((candidate) => candidate.id === advisorId)
  const campaign = getPublishedCampaignForScenario(run.scenarioId)
  const campaignView = getPlayerCampaignView(run, campaign)
  const m = run.metrics
  const daysLeft = Math.max(0, run.deadlineDay - run.day)
  const voice = advisorVoiceForRole(advisor?.role ?? 'Assistent')
  const opener = advisor ? `${advisor.name}:` : 'Adalbert:'
  const styleHint = voice.blurb
  const q = question.trim()
  const qLower = q.toLowerCase()

  if (q.length < 3 || /^(test|hallo|hi|hey|ok|ping|asdf)\b/i.test(qLower)) {
    return `${opener} Ich bin da (${styleHint}). Frag konkret nach Cash, Frist, aktueller Lage oder einer Kennzahl — dann antworte ich mit freigeschaltetem Wissen.`
  }

  if (/cash|liquid|runway|kontostand|burn/.test(qLower)) {
    return `${opener} Cash steht bei ${formatMoney(m.cashCents)}. Ob das reicht, hängt vom operativen Ergebnis ab (EBITDA ${formatMoney(m.ebitdaAnnualCents)} — also dem Ergebnis vor Zinsen und Steuern). Für eine Empfehlung brauche ich dein Ziel — Liquidität halten oder investieren?`
  }

  if (/ebitda|marge|deckungsbeitrag|profitabilität|gewinn/.test(qLower)) {
    return `${opener} EBITDA liegt bei ${formatMoney(m.ebitdaAnnualCents)} (operatives Ergebnis vor Zinsen und Steuern). Das sagt etwas über die Tragfähigkeit, nicht über kurzfristige Liquidität (Cash ${formatMoney(m.cashCents)}).`
  }

  if (/umsatz|arr|revenue|erlös/.test(qLower)) {
    return `${opener} Umsatz bzw. ARR (jährlich wiederkehrender Umsatz) liegt bei ${formatMoney(m.revenueAnnualCents)}. Kundenkonzentration: ${formatPercent(m.customerConcentrationBps)}.`
  }

  if (/headcount|mitarbeit|personal|teamgröße|hc\b/.test(qLower)) {
    return `${opener} Headcount ${m.headcount}, Kapazitätsdruck ${formatPercent(m.capacityUtilizationBps)}, Organisation/Morale ${formatPercent(m.moraleBps)}.`
  }

  if (/frist|deadline|zeitdruck|wie viele tage|wann.+entscheid/.test(qLower)) {
    return `${opener} Tag ${run.day} von ${run.deadlineDay} — noch ${daysLeft} Tage bis zur Soft Deadline. Verpasste Fristen erzeugen Folgen, aber kein künstliches Game Over.`
  }

  if (/lage|situation|campaign|was steht an|priorität/.test(qLower)) {
    if (campaignView.active) {
      return situationOpeningAsPlainText(buildSituationOpeningFallback(run))
    }
    return `${opener} Gerade ist keine dringende Unternehmenssituation aktiv. Du kannst Zeit voranschreiten oder auf die nächste Entwicklung warten.`
  }

  if (/analyse|bericht|studie|untersuchung/.test(qLower)) {
    if (run.completedAnalyses.length === 0) {
      return `${opener} Es liegen noch keine freigeschalteten Analysen vor. Über Info → „Weitere Informationen anfordern“ kannst du welche anstoßen.`
    }
    const latest = run.completedAnalyses.at(-1)!
    return `${opener} Zuletzt freigeschaltet: „${latest.resultTitle}“ (Tag ${latest.completedAtDay}, Confidence ${latest.confidence}). ${latest.resultBody}`
  }

  if (/ledger|verlauf|was passiert|ereignis/.test(qLower)) {
    const recent = run.ledger.slice(-3)
    if (recent.length === 0) {
      return `${opener} Im Ledger steht noch nichts Substanzielles — wir sind früh im Run (Tag ${run.day}).`
    }
    const lines = recent.map((event) => `Tag ${event.day}: ${event.title}`).join('; ')
    return `${opener} Letzte Einträge: ${lines}.`
  }

  return `${opener} Dazu halte ich mich an freigeschaltetes Wissen. Frag gezielt nach Cash, EBITDA, Frist, aktueller Lage oder freigeschalteten Analysen — dann wird die Antwort konkret.`
}
