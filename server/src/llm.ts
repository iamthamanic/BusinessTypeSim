/** OpenAI-compatible chat client — default Ollama Cloud with routed models. */
import { env } from './env.ts'
import {
  resolveLlmRoute,
  type LlmCallMeta,
  type LlmTaskKind,
} from './llm-routing.ts'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type CallChatOptions = {
  task?: LlmTaskKind
  attempt?: number
  schemaInvalid?: boolean
  complexityEscalate?: boolean
  onMeta?: (meta: LlmCallMeta) => void
}

async function attemptChat(model: string, messages: LlmMessage[]): Promise<string> {
  const apiKey = env.ollamaApiKey()
  if (!apiKey) throw new Error('LLM_NOT_CONFIGURED')
  const baseUrl = env.llmBaseUrl.replace(/\/$/, '')
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, messages, temperature: 0.2, stream: false }),
    signal: AbortSignal.timeout(env.llmTimeoutMs),
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    console.error('llm http error', response.status, detail.slice(0, 400))
    throw new Error(`LLM_HTTP_${response.status}`)
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content
  if (!content?.trim()) throw new Error('LLM_EMPTY')
  return content
}

export async function callChatModel(
  messages: LlmMessage[],
  options: CallChatOptions = {},
): Promise<string> {
  const task = options.task ?? 'advisor_chat'
  const route = resolveLlmRoute({
    task,
    attempt: options.attempt ?? 1,
    schemaInvalid: options.schemaInvalid,
    complexityEscalate: options.complexityEscalate,
    primaryModel: env.llmModel,
    fallbackModel: env.llmFallbackModel,
  })

  const started = Date.now()
  try {
    const content = await attemptChat(route.model, messages)
    options.onMeta?.({
      task,
      model: route.model,
      reason: route.reason,
      attempt: route.attempt,
      latencyMs: Date.now() - started,
      ok: true,
    })
    return content
  } catch (error) {
    const code = error instanceof Error ? error.message : 'unknown'
    options.onMeta?.({
      task,
      model: route.model,
      reason: route.reason,
      attempt: route.attempt,
      latencyMs: Date.now() - started,
      ok: false,
      errorCode: code.slice(0, 64),
    })

    // Structured repair: one Flash retry on schema-ish failures before escalation.
    if (!options.schemaInvalid && route.attempt === 1) {
      return callChatModel(messages, {
        ...options,
        attempt: 2,
        schemaInvalid: true,
      })
    }
    if (options.schemaInvalid && (options.attempt ?? 1) < 3) {
      return callChatModel(messages, {
        ...options,
        attempt: 3,
        schemaInvalid: true,
        complexityEscalate: true,
      })
    }

    // Last resort: try configured fallback once if we haven't already.
    if (route.model !== env.llmFallbackModel) {
      return attemptChat(env.llmFallbackModel, messages)
    }
    throw error
  }
}
