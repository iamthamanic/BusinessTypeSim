/** JWT session auth for self-hosted cloud mode. */
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import type { Context, Next } from 'hono'
import { env } from './env.ts'
import { pool } from './db.ts'

export interface AuthUser {
  id: string
  email: string
}

const encoder = new TextEncoder()

function secretKey() {
  return encoder.encode(env.jwtSecret())
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function issueToken(user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secretKey())
}

export async function userFromToken(token: string): Promise<AuthUser | null> {
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

export async function findUserByEmail(email: string): Promise<(AuthUser & { password_hash: string }) | null> {
  const result = await pool.query<{ id: string; email: string; password_hash: string }>(
    'select id, email, password_hash from users where lower(email) = lower($1) limit 1',
    [email.trim()],
  )
  return result.rows[0] ?? null
}

export async function createUser(email: string, password: string): Promise<AuthUser> {
  const passwordHash = await hashPassword(password)
  const result = await pool.query<{ id: string; email: string }>(
    'insert into users (email, password_hash) values (lower($1), $2) returning id, email',
    [email.trim(), passwordHash],
  )
  const row = result.rows[0]
  if (!row) throw new Error('USER_CREATE_FAILED')
  return { id: row.id, email: row.email }
}

export type AppVariables = { user: AuthUser }

export async function requireAuth(c: Context<{ Variables: AppVariables }>, next: Next) {
  const header = c.req.header('Authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) return c.json({ error: 'AUTH_REQUIRED' }, 401)
  const user = await userFromToken(token)
  if (!user) return c.json({ error: 'AUTH_REQUIRED' }, 401)
  c.set('user', user)
  await next()
}
