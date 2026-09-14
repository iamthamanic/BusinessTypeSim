import { describe, expect, it } from 'vitest'
import {
  DEFAULT_LLM_FALLBACK_MODEL,
  DEFAULT_LLM_MODEL,
  EVAL_BASELINE_MODEL,
  resolveLlmRoute,
} from '../server/src/llm-routing.ts'
import { env } from '../server/src/env.ts'

describe('llm routing', () => {
  it('defaults production models to GLM Flash / GLM-5.3', () => {
    expect(DEFAULT_LLM_MODEL).toBe('glm-5.3-flash:cloud')
    expect(DEFAULT_LLM_FALLBACK_MODEL).toBe('glm-5.3:cloud')
    expect(EVAL_BASELINE_MODEL).toBe('gpt-oss:120b')
    expect(env.llmModel).toBe('glm-5.3-flash:cloud')
    expect(env.llmFallbackModel).toBe('glm-5.3:cloud')
  })

  it('routes advisor/decision/debrief/situation briefing to Flash by default', () => {
    for (const task of [
      'advisor_chat',
      'company_qa',
      'decision_interpret',
      'dq_extraction',
      'outcome_narration',
      'real_world_debrief',
      'situation_briefing',
    ] as const) {
      const route = resolveLlmRoute({ task })
      expect(route.model).toBe(DEFAULT_LLM_MODEL)
      expect(route.reason).toBe('default_flash')
    }
  })

  it('repairs on Flash then escalates to GLM-5.3', () => {
    const repair = resolveLlmRoute({ task: 'decision_interpret', attempt: 2, schemaInvalid: true })
    expect(repair.model).toBe(DEFAULT_LLM_MODEL)
    expect(repair.reason).toBe('repair_retry_flash')

    const escalate = resolveLlmRoute({ task: 'decision_interpret', attempt: 3, schemaInvalid: true })
    expect(escalate.model).toBe(DEFAULT_LLM_FALLBACK_MODEL)
    expect(escalate.reason).toBe('complexity_escalate')
  })

  it('sends admin authoring to heavy model', () => {
    const route = resolveLlmRoute({ task: 'admin_authoring' })
    expect(route.model).toBe(DEFAULT_LLM_FALLBACK_MODEL)
    expect(route.reason).toBe('admin_heavy')
  })
})
