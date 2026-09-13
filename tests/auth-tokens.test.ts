/**
 * Auth token + cookie unit tests (no Postgres).
 * Location: tests/auth-tokens.test.ts
 */
import { beforeAll, describe, expect, it } from 'vitest'

beforeAll(() => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-auth-harden-checks'
})

describe('auth tokens', () => {
  it('hashes tokens stably and issues verifiable access JWTs', async () => {
    const {
      hashToken,
      randomToken,
      issueAccessToken,
      verifyAccessToken,
      serializeCookie,
      cookieOptions,
      readCookie,
      clearCookie,
      COOKIE_ACCESS,
    } = await import('../server/src/auth-tokens.ts')

    const raw = randomToken()
    expect(hashToken(raw)).toBe(hashToken(raw))
    expect(hashToken(raw)).not.toBe(raw)

    const access = await issueAccessToken({ id: '11111111-1111-1111-1111-111111111111', email: 'ceo@example.com' })
    const claims = await verifyAccessToken(access)
    expect(claims).toEqual({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'ceo@example.com',
    })
    expect(await verifyAccessToken('not-a-jwt')).toBeNull()

    const cookie = serializeCookie(COOKIE_ACCESS, access, cookieOptions(900, true))
    expect(cookie).toContain('HttpOnly')
    expect(cookie).toContain('Secure')
    expect(cookie).toContain('SameSite=Lax')
    expect(readCookie(`${COOKIE_ACCESS}=${encodeURIComponent(access)}; Path=/`, COOKIE_ACCESS)).toBe(access)
    expect(clearCookie(COOKIE_ACCESS, true)).toContain('Max-Age=0')
  })
})

describe('mail adapter capture cardinality', () => {
  it('records exactly one message per send', async () => {
    const { CapturingMailAdapter } = await import('../server/src/mail.ts')
    const mail = new CapturingMailAdapter()
    await mail.send({
      to: 'a@example.com',
      subject: 'v',
      text: 't',
      purpose: 'verify_email',
      token: 'token-a',
    })
    await mail.send({
      to: 'a@example.com',
      subject: 'r',
      text: 't',
      purpose: 'reset_password',
      token: 'token-b',
    })
    expect(mail.sent).toHaveLength(2)
    expect(mail.last('verify_email')?.token).toBe('token-a')
    expect(mail.last('reset_password')?.token).toBe('token-b')
  })
})
