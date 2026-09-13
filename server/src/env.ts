/** Server env — secrets never go to the Vite client. */
export function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`Missing env ${name}`)
  return value
}

export function optional(name: string, fallback: string): string {
  const value = process.env[name]?.trim()
  return value && value.length > 0 ? value : fallback
}

export const env = {
  port: Number(optional('PORT', '3000')),
  databaseUrl: () => required('DATABASE_URL'),
  jwtSecret: () => required('JWT_SECRET'),
  corsOrigin: optional('CORS_ORIGIN', '*'),
  cookieSecure: optional('COOKIE_SECURE', 'true') !== 'false',
  nodeEnv: optional('NODE_ENV', 'development'),
  authDevCapture: optional('AUTH_DEV_CAPTURE', '0') === '1',
  publicAppUrl: optional('PUBLIC_APP_URL', 'http://localhost:5173'),
  authRegisterLimit: Number(optional('AUTH_REGISTER_HOURLY_LIMIT', '10')),
  authLoginLimit: Number(optional('AUTH_LOGIN_HOURLY_LIMIT', '30')),
  authResetLimit: Number(optional('AUTH_RESET_HOURLY_LIMIT', '10')),
  ollamaApiKey: () => process.env.OLLAMA_API_KEY?.trim() || process.env.LLM_API_KEY?.trim() || '',
  llmBaseUrl: optional('LLM_BASE_URL', 'https://ollama.com/v1'),
  llmModel: optional('LLM_MODEL', 'gpt-oss:120b'),
  llmFallbackModel: optional('LLM_FALLBACK_MODEL', 'llama3.1:8b'),
  llmTimeoutMs: Number(optional('LLM_TIMEOUT_MS', '25000')),
  tavilyApiKey: () => process.env.TAVILY_API_KEY?.trim() || '',
  aiHourlyLimit: Number(optional('AI_HOURLY_LIMIT', '30')),
}
