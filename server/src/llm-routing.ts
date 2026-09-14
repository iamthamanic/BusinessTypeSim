/**
 * LLM model routing — Flash default, GLM-5.3 escalation after repair/complexity.
 * Location: server/src/llm-routing.ts
 * Domain never imports this; model IDs are infrastructure-only.
 */
export const DEFAULT_LLM_MODEL = 'glm-5.3-flash:cloud'
export const DEFAULT_LLM_FALLBACK_MODEL = 'glm-5.3:cloud'
/** Eval baseline only — not a production default. */
export const EVAL_BASELINE_MODEL = 'gpt-oss:120b'

export type LlmTaskKind =
  | 'advisor_chat'
  | 'company_qa'
  | 'decision_interpret'
  | 'dq_extraction'
  | 'outcome_narration'
  | 'real_world_debrief'
  | 'situation_briefing'
  | 'admin_authoring'

export type LlmRouteDecision = {
  task: LlmTaskKind
  model: string
  reason: 'default_flash' | 'repair_retry_flash' | 'complexity_escalate' | 'admin_heavy'
  attempt: number
}

const FLASH_TASKS: ReadonlySet<LlmTaskKind> = new Set([
  'advisor_chat',
  'company_qa',
  'decision_interpret',
  'dq_extraction',
  'outcome_narration',
  'real_world_debrief',
  'situation_briefing',
])

export function resolveLlmRoute(args: {
  task: LlmTaskKind
  attempt?: number
  schemaInvalid?: boolean
  complexityEscalate?: boolean
  primaryModel?: string
  fallbackModel?: string
}): LlmRouteDecision {
  const attempt = Math.max(1, args.attempt ?? 1)
  const primary = args.primaryModel ?? DEFAULT_LLM_MODEL
  const fallback = args.fallbackModel ?? DEFAULT_LLM_FALLBACK_MODEL

  if (args.task === 'admin_authoring') {
    return { task: args.task, model: fallback, reason: 'admin_heavy', attempt }
  }

  if (args.complexityEscalate) {
    return { task: args.task, model: fallback, reason: 'complexity_escalate', attempt }
  }

  // Attempt 1: Flash. Attempt 2 after schema invalid: Flash repair. Attempt 3+: escalate.
  if (args.schemaInvalid && attempt >= 3) {
    return { task: args.task, model: fallback, reason: 'complexity_escalate', attempt }
  }

  if (args.schemaInvalid && attempt === 2) {
    return { task: args.task, model: primary, reason: 'repair_retry_flash', attempt }
  }

  if (FLASH_TASKS.has(args.task)) {
    return { task: args.task, model: primary, reason: 'default_flash', attempt }
  }

  return { task: args.task, model: primary, reason: 'default_flash', attempt }
}

export type LlmCallMeta = {
  task: LlmTaskKind
  model: string
  reason: LlmRouteDecision['reason']
  attempt: number
  latencyMs: number
  ok: boolean
  /** Never include prompts, keys, or run payloads. */
  errorCode?: string
}
