/**
 * Role-scoped read-only advisor tools — domain-side, no LLM mutation authority.
 * Location: shared/domain/advisor-tools.ts
 */
import type { AdvisorDefinition, RunState } from './types.ts'
import { getScenarioAtVersion } from './scenarios.ts'
import { getAdvisorWorldView, playerWorldContextSummary } from './world-state.ts'

export type AdvisorToolId =
  | 'get_company_metrics'
  | 'get_completed_analyses'
  | 'get_ledger_summary'
  | 'get_deadline'
  | 'get_visible_world'

const TOOL_DOMAINS: Record<AdvisorToolId, string[]> = {
  get_company_metrics: ['finance', 'runway', 'margin', 'capex', 'pricing', 'retail', 'operations'],
  get_completed_analyses: ['finance', 'operations', 'product', 'technical', 'sales', 'customer', 'people', 'quality', 'marketplace', 'brand', 'cx', 'risk', 'governance', 'organization'],
  get_ledger_summary: ['finance', 'operations', 'sales', 'customer', 'people', 'quality', 'risk', 'governance'],
  get_deadline: ['finance', 'operations', 'sales', 'product', 'people', 'risk'],
  get_visible_world: ['finance', 'operations', 'product', 'technical', 'sales', 'customer', 'people', 'quality', 'marketplace', 'brand', 'cx', 'risk', 'governance', 'organization'],
}

export function toolsForAdvisor(advisor: AdvisorDefinition): AdvisorToolId[] {
  return (Object.keys(TOOL_DOMAINS) as AdvisorToolId[]).filter((toolId) =>
    TOOL_DOMAINS[toolId].some((domain) => advisor.domains.includes(domain)),
  )
}

export function runAdvisorTool(
  run: RunState,
  advisorId: string,
  toolId: AdvisorToolId,
): { ok: true; toolId: AdvisorToolId; payload: string } | { ok: false; reason: string } {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const advisor = scenario.advisors.find((item) => item.id === advisorId)
  if (!advisor) return { ok: false, reason: 'Unbekannter Advisor.' }

  const allowed = toolsForAdvisor(advisor)
  if (!allowed.includes(toolId)) {
    return { ok: false, reason: `Tool „${toolId}“ ist für Rolle ${advisor.role} nicht freigegeben.` }
  }

  if (toolId === 'get_company_metrics') {
    const m = run.metrics
    return {
      ok: true,
      toolId,
      payload: `Cash ${m.cashCents} · ARR ${m.revenueAnnualCents} · EBITDA ${m.ebitdaAnnualCents} · Headcount ${m.headcount} · MoraleBps ${m.moraleBps} · KonzentrationBps ${m.customerConcentrationBps}`,
    }
  }

  if (toolId === 'get_completed_analyses') {
    if (run.completedAnalyses.length === 0) {
      return { ok: true, toolId, payload: 'Keine freigeschalteten Analysen.' }
    }
    const lines = run.completedAnalyses.map(
      (item) => `${item.analysisId} (Tag ${item.completedAtDay}, ${item.confidence}): ${item.resultTitle} — ${item.resultBody}`,
    )
    return { ok: true, toolId, payload: lines.join('\n') }
  }

  if (toolId === 'get_ledger_summary') {
    const recent = run.ledger.slice(-5).map((event) => `Tag ${event.day} [${event.type}] ${event.title}`)
    return { ok: true, toolId, payload: recent.length ? recent.join('\n') : 'Ledger leer.' }
  }

  if (toolId === 'get_visible_world') {
    const view = getAdvisorWorldView(run)
    return {
      ok: true,
      toolId,
      payload: JSON.stringify(playerWorldContextSummary(view)),
    }
  }

  const daysLeft = Math.max(0, run.deadlineDay - run.day)
  return {
    ok: true,
    toolId,
    payload: `Tag ${run.day} von ${run.deadlineDay} · ${daysLeft} Tage verbleibend · Status ${run.status}`,
  }
}

/** Gather tool payloads for an advisor turn (read-only context block). */
export function collectAdvisorToolContext(run: RunState, advisorId: string): string {
  const scenario = getScenarioAtVersion(run.scenarioId, run.scenarioVersion)
  const advisor = scenario.advisors.find((item) => item.id === advisorId)
  if (!advisor) return 'Advisor unbekannt.'

  const chunks: string[] = [`Rolle: ${advisor.role}. Haltung: ${advisor.stance}.`]
  for (const toolId of toolsForAdvisor(advisor)) {
    const result = runAdvisorTool(run, advisorId, toolId)
    if (result.ok) chunks.push(`[${toolId}]\n${result.payload}`)
    else chunks.push(`[${toolId}] verweigert: ${result.reason}`)
  }
  return chunks.join('\n\n')
}
