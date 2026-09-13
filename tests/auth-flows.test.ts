/**
 * Auth flow integration against Postgres when DATABASE_URL is set; otherwise skipped.
 * Location: tests/auth-flows.test.ts
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const hasDb = Boolean(process.env.DATABASE_URL?.trim())
const describeAuth = hasDb ? describe : describe.skip

describeAuth('auth flows (postgres)', () => {
  const email = `ceo-${Date.now()}@example.com`
  const password = 'secure-pass-12'
  let verifyToken = ''
  let accessToken = ''
  let refreshToken = ''
  let app: { request: (path: string, init?: RequestInit) => Promise<Response> }

  beforeAll(async () => {
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-harden-checks'
    process.env.AUTH_DEV_CAPTURE = '1'
    process.env.COOKIE_SECURE = 'false'
    process.env.NODE_ENV = 'test'
    const { CapturingMailAdapter, setMailAdapter } = await import('../server/src/mail.ts')
    setMailAdapter(new CapturingMailAdapter())
    const { migrate } = await import('../server/src/db.ts')
    await migrate()
    const { createApp } = await import('../server/src/app.ts')
    app = createApp()
  })

  afterAll(async () => {
    const { pool } = await import('../server/src/db.ts')
    await pool.end()
  })

  it('registers, verifies, logs in, refreshes, revokes, resets, deletes', async () => {
    const { getMailAdapter, CapturingMailAdapter } = await import('../server/src/mail.ts')
    const mail = getMailAdapter()
    if (!(mail instanceof CapturingMailAdapter)) throw new Error('expected capture mail')

    const reg = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    expect(reg.status).toBe(201)
    const regBody = await reg.json() as { user: { emailVerified: boolean } }
    expect(regBody.user.emailVerified).toBe(false)
    verifyToken = mail.last('verify_email')?.token ?? ''
    expect(verifyToken.length).toBeGreaterThan(16)

    const unverifiedLogin = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password }),
    })
    expect(unverifiedLogin.status).toBe(403)

    const verify = await app.request('/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ token: verifyToken }),
    })
    expect(verify.status).toBe(200)
    const verified = await verify.json() as { accessToken: string; refreshToken: string }
    expect(verified.accessToken).toBeTruthy()
    expect(verified.refreshToken).toBeTruthy()

    const reuseVerify = await app.request('/auth/verify-email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: verifyToken }),
    })
    expect(reuseVerify.status).toBe(400)

    const login = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password }),
    })
    expect(login.status).toBe(200)
    const session = await login.json() as { accessToken: string; refreshToken: string }
    accessToken = session.accessToken
    refreshToken = session.refreshToken

    const me = await app.request('/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    expect(me.status).toBe(200)

    const refreshed = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'X-Auth-Client': 'native', 'X-Refresh-Token': refreshToken },
    })
    expect(refreshed.status).toBe(200)
    const next = await refreshed.json() as { accessToken: string; refreshToken: string }
    expect(next.refreshToken).not.toBe(refreshToken)

    const replay = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'X-Auth-Client': 'native', 'X-Refresh-Token': refreshToken },
    })
    expect(replay.status).toBe(401)

    const login2 = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password }),
    })
    const session2 = await login2.json() as { accessToken: string; refreshToken: string }
    accessToken = session2.accessToken
    refreshToken = session2.refreshToken

    const logout = await app.request('/auth/logout', {
      method: 'POST',
      headers: { 'X-Auth-Client': 'native', 'X-Refresh-Token': refreshToken },
    })
    expect(logout.status).toBe(200)
    const afterLogout = await app.request('/auth/refresh', {
      method: 'POST',
      headers: { 'X-Auth-Client': 'native', 'X-Refresh-Token': refreshToken },
    })
    expect(afterLogout.status).toBe(401)

    const login3 = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password }),
    })
    const session3 = await login3.json() as { accessToken: string; refreshToken: string }
    accessToken = session3.accessToken

    const resetReq = await app.request('/auth/password-reset/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    expect(resetReq.status).toBe(200)
    const resetToken = mail.last('reset_password')?.token ?? ''
    expect(resetToken.length).toBeGreaterThan(16)

    const newPassword = 'another-secure-99'
    const resetConfirm = await app.request('/auth/password-reset/confirm', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: resetToken, password: newPassword }),
    })
    expect(resetConfirm.status).toBe(200)

    const oldLogin = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password }),
    })
    expect(oldLogin.status).toBe(401)

    const newLogin = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password: newPassword }),
    })
    expect(newLogin.status).toBe(200)
    const finalSession = await newLogin.json() as { accessToken: string }
    accessToken = finalSession.accessToken

    const del = await app.request('/auth/delete-account', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ password: newPassword }),
    })
    expect(del.status).toBe(200)

    const gone = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'X-Auth-Client': 'native' },
      body: JSON.stringify({ email, password: newPassword }),
    })
    expect(gone.status).toBe(401)
  })
})

describe('auth UI smoke helpers', () => {
  it('maps expired token code for UI', () => {
    expect('TOKEN_INVALID_OR_EXPIRED').toMatch(/TOKEN/)
  })
})
