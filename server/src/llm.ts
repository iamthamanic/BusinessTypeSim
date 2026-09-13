/** OpenAI-compatible chat client — default Ollama Cloud. */
import { env } from './env.ts'

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
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
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
  const content = payload.choices?.[0]?.message?.content
  if (!content?.trim()) throw new Error('LLM_EMPTY')
  return content
}

export async function callChatModel(messages: LlmMessage[]): Promise<string> {
  try {
    return await attemptChat(env.llmModel, messages)
  } catch (error) {
    console.error('llm primary failed', error instanceof Error ? error.message : 'unknown')
    return attemptChat(env.llmFallbackModel, messages)
  }
}
