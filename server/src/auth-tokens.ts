/** Opaque token hashing and access JWT helpers (no DB). */
import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { env } from './env.ts'

export const ACCESS_TTL = '15m'
export const ACCESS_MAX_AGE_SEC = 15 * 60
export const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000
export const RESET_TTL_MS = 60 * 60 * 1000

export const COOKIE_ACCESS = 'bt_access'
export const COOKIE_REFRESH = 'bt_refresh'

const encoder = new TextEncoder()

function secretKey() {
  return encoder.encode(env.jwtSecret())
}

export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex')
}

export type AccessClaims = { id: string; email: string }

export async function issueAccessToken(user: AccessClaims): Promise<string> {
  return new SignJWT({ email: user.email, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TTL)
    .sign(secretKey())
}

export async function verifyAccessToken(token: string): Promise<AccessClaims | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey())
    const id = typeof payload.sub === 'string' ? payload.sub : null
    const email = typeof payload.email === 'string' ? payload.email : null
    if (!id || !email) return null
    return { id, email }
  } catch {
    return null
  }
}

export type CookieOpts = {
  httpOnly: true
  secure: boolean
  sameSite: 'Lax' | 'Strict'
  path: string
  maxAge: number
}

export function cookieOptions(maxAgeSec: number, secure: boolean): CookieOpts {
  return {
    httpOnly: true,
    secure,
    sameSite: 'Lax',
    path: '/',
    maxAge: maxAgeSec,
  }
}

export function serializeCookie(name: string, value: string, opts: CookieOpts): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    `Path=${opts.path}`,
    `Max-Age=${opts.maxAge}`,
    `SameSite=${opts.sameSite}`,
    'HttpOnly',
  ]
  if (opts.secure) parts.push('Secure')
  return parts.join('; ')
}

export function clearCookie(name: string, secure: boolean): string {
  return serializeCookie(name, '', { ...cookieOptions(0, secure), maxAge: 0 })
}

export function readCookie(header: string | undefined, name: string): string | null {
  if (!header) return null
  const parts = header.split(';')
  for (const part of parts) {
    const trimmed = part.trim()
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq)
    if (key !== name) continue
    return decodeURIComponent(trimmed.slice(eq + 1))
  }
  return null
}
