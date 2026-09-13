/**
 * Auth routes: register, verify, login, refresh, reset, sessions, logout, delete.
 * Location: server/src/routes/auth.ts
 */
import { Hono } from 'hono'
import { z } from 'zod'
import {
  consumeResetToken,
  consumeVerificationToken,
  createResetToken,
  createUser,
  createVerificationToken,
  deleteUserAccount,
  extractRefreshToken,
  findUserByEmail,
  issueSessionPair,
  listSessions,
  requireAuth,
  revokeAllSessions,
  revokeRefreshToken,
  revokeSessionForUser,
  rotateRefreshSession,
  verifyPassword,
  type AppVariables,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  ACCESS_MAX_AGE_SEC,
} from '../auth.ts'
import {
  REFRESH_TTL_MS,
  clearCookie,
  cookieOptions,
  serializeCookie,
} from '../auth-tokens.ts'
import { env } from '../env.ts'
import { getMailAdapter } from '../mail.ts'
import { claimAuthRequest, clientIp } from '../rate-limit.ts'

const credentialsSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(128),
})

const tokenSchema = z.object({
  token: z.string().min(16).max(256),
})

const resetConfirmSchema = z.object({
  token: z.string().min(16).max(256),
  password: z.string().min(8).max(128),
})

const deleteSchema = z.object({
  password: z.string().min(8).max(128),
})

export const authRoutes = new Hono<{ Variables: AppVariables }>()

function wantsJsonTokens(c: { req: { header: (name: string) => string | undefined } }): boolean {
  const mode = c.req.header('X-Auth-Client')
  return mode === 'native' || mode === 'json'
}

function setSessionCookies(
  c: { header: (name: string, value: string, options?: { append?: boolean }) => void },
  accessToken: string,
  refreshToken: string,
): void {
  const secure = env.cookieSecure
  c.header(
    'Set-Cookie',
    serializeCookie(COOKIE_ACCESS, accessToken, cookieOptions(ACCESS_MAX_AGE_SEC, secure)),
    { append: true },
  )
  c.header(
    'Set-Cookie',
    serializeCookie(
      COOKIE_REFRESH,
      refreshToken,
      cookieOptions(Math.floor(REFRESH_TTL_MS / 1000), secure),
    ),
    { append: true },
  )
}

function clearSessionCookies(c: {
  header: (name: string, value: string, options?: { append?: boolean }) => void
}): void {
  const secure = env.cookieSecure
  c.header('Set-Cookie', clearCookie(COOKIE_ACCESS, secure), { append: true })
  c.header('Set-Cookie', clearCookie(COOKIE_REFRESH, secure), { append: true })
}

function sessionPayload(
  user: { id: string; email: string; emailVerifiedAt: string | null },
  accessToken: string,
  refreshToken: string,
  includeTokens: boolean,
) {
  return {
    user: {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    ...(includeTokens ? { accessToken, refreshToken } : {}),
  }
}

authRoutes.post('/register', async (c) => {
  const ip = clientIp(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'))
  if (!(await claimAuthRequest(`register:${ip}`, env.authRegisterLimit))) {
    return c.json({ error: 'RATE_LIMITED' }, 429)
  }
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const existing = await findUserByEmail(parsed.data.email)
  if (existing) return c.json({ error: 'EMAIL_TAKEN' }, 409)
  try {
    const user = await createUser(parsed.data.email, parsed.data.password)
    const token = await createVerificationToken(user.id)
    await getMailAdapter().send({
      to: user.email,
      subject: 'Business Type — E-Mail bestätigen',
      text: `Bestätige deine E-Mail mit diesem Token: ${token}\nOder öffne: ${env.publicAppUrl}/?verify=${token}`,
      purpose: 'verify_email',
      token,
    })
    return c.json({
      ok: true,
      user: { id: user.id, email: user.email, emailVerified: false },
      message: 'VERIFY_EMAIL_SENT',
    }, 201)
  } catch (error) {
    console.error('register failed', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'REGISTER_FAILED' }, 500)
  }
})

authRoutes.post('/verify-email', async (c) => {
  const parsed = tokenSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const user = await consumeVerificationToken(parsed.data.token)
  if (!user) return c.json({ error: 'TOKEN_INVALID_OR_EXPIRED' }, 400)
  const ua = c.req.header('user-agent') ?? null
  const pair = await issueSessionPair(user, ua)
  const jsonTokens = wantsJsonTokens(c)
  if (!jsonTokens) setSessionCookies(c, pair.accessToken, pair.refreshToken)
  return c.json(sessionPayload(user, pair.accessToken, pair.refreshToken, jsonTokens))
})

authRoutes.post('/login', async (c) => {
  const ip = clientIp(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'))
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const emailKey = parsed.data.email.trim().toLowerCase()
  if (!(await claimAuthRequest(`login:${ip}:${emailKey}`, env.authLoginLimit))) {
    return c.json({ error: 'RATE_LIMITED' }, 429)
  }
  const user = await findUserByEmail(parsed.data.email)
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return c.json({ error: 'INVALID_CREDENTIALS' }, 401)
  }
  if (!user.emailVerifiedAt) {
    return c.json({ error: 'EMAIL_NOT_VERIFIED' }, 403)
  }
  const pair = await issueSessionPair(
    { id: user.id, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
    c.req.header('user-agent') ?? null,
  )
  const jsonTokens = wantsJsonTokens(c)
  if (!jsonTokens) setSessionCookies(c, pair.accessToken, pair.refreshToken)
  return c.json(sessionPayload(user, pair.accessToken, pair.refreshToken, jsonTokens))
})

authRoutes.post('/refresh', async (c) => {
  const refreshToken = extractRefreshToken(c)
  if (!refreshToken) return c.json({ error: 'AUTH_REQUIRED' }, 401)
  const rotated = await rotateRefreshSession(refreshToken, c.req.header('user-agent') ?? null)
  if (!rotated) {
    clearSessionCookies(c)
    return c.json({ error: 'SESSION_REVOKED' }, 401)
  }
  const jsonTokens = wantsJsonTokens(c)
  if (!jsonTokens) setSessionCookies(c, rotated.accessToken, rotated.refreshToken)
  return c.json(sessionPayload(rotated.user, rotated.accessToken, rotated.refreshToken, jsonTokens))
})

authRoutes.post('/logout', async (c) => {
  const refreshToken = extractRefreshToken(c)
  if (refreshToken) await revokeRefreshToken(refreshToken)
  clearSessionCookies(c)
  return c.json({ ok: true })
})

authRoutes.post('/logout-all', requireAuth, async (c) => {
  const user = c.get('user')
  await revokeAllSessions(user.id)
  clearSessionCookies(c)
  return c.json({ ok: true })
})

authRoutes.get('/sessions', requireAuth, async (c) => {
  const user = c.get('user')
  const sessions = await listSessions(user.id)
  return c.json({ sessions })
})

authRoutes.post('/sessions/:id/revoke', requireAuth, async (c) => {
  const user = c.get('user')
  const sessionId = c.req.param('id')
  if (!sessionId) return c.json({ error: 'SESSION_NOT_FOUND' }, 404)
  const ok = await revokeSessionForUser(user.id, sessionId)
  if (!ok) return c.json({ error: 'SESSION_NOT_FOUND' }, 404)
  return c.json({ ok: true })
})

authRoutes.post('/password-reset/request', async (c) => {
  const ip = clientIp(c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip'))
  const parsed = z.object({ email: z.string().email().max(320) }).safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const emailKey = parsed.data.email.trim().toLowerCase()
  if (!(await claimAuthRequest(`reset:${ip}:${emailKey}`, env.authResetLimit))) {
    return c.json({ error: 'RATE_LIMITED' }, 429)
  }
  const user = await findUserByEmail(parsed.data.email)
  // Always 200 — no email enumeration.
  if (user) {
    const token = await createResetToken(user.id)
    await getMailAdapter().send({
      to: user.email,
      subject: 'Business Type — Passwort zurücksetzen',
      text: `Setze dein Passwort mit diesem Token: ${token}\nOder öffne: ${env.publicAppUrl}/?reset=${token}`,
      purpose: 'reset_password',
      token,
    })
  }
  return c.json({ ok: true, message: 'RESET_EMAIL_IF_EXISTS' })
})

authRoutes.post('/password-reset/confirm', async (c) => {
  const parsed = resetConfirmSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const user = await consumeResetToken(parsed.data.token, parsed.data.password)
  if (!user) return c.json({ error: 'TOKEN_INVALID_OR_EXPIRED' }, 400)
  clearSessionCookies(c)
  return c.json({ ok: true, user: { id: user.id, email: user.email } })
})

authRoutes.get('/me', requireAuth, (c) => {
  const user = c.get('user')
  return c.json({
    user: {
      id: user.id,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
  })
})

authRoutes.post('/delete-account', requireAuth, async (c) => {
  const user = c.get('user')
  const parsed = deleteSchema.safeParse(await c.req.json().catch(() => null))
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const row = await findUserByEmail(user.email)
  if (!row || !(await verifyPassword(parsed.data.password, row.password_hash))) {
    return c.json({ error: 'INVALID_CREDENTIALS' }, 401)
  }
  await deleteUserAccount(user.id)
  clearSessionCookies(c)
  return c.json({ ok: true })
})

/** Dev/E2E only: last captured mail token when AUTH_DEV_CAPTURE=1. */
authRoutes.get('/dev/last-mail', async (c) => {
  if (!env.authDevCapture || env.nodeEnv === 'production') {
    return c.json({ error: 'NOT_FOUND' }, 404)
  }
  const purpose = c.req.query('purpose')
  const { CapturingMailAdapter, getMailAdapter } = await import('../mail.ts')
  const adapter = getMailAdapter()
  if (!(adapter instanceof CapturingMailAdapter)) {
    return c.json({ error: 'CAPTURE_INACTIVE' }, 404)
  }
  const last = adapter.last(
    purpose === 'verify_email' || purpose === 'reset_password' ? purpose : undefined,
  )
  if (!last) return c.json({ error: 'NO_MAIL' }, 404)
  return c.json({ to: last.to, purpose: last.purpose, token: last.token })
})
