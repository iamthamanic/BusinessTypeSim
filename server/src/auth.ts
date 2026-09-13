/** JWT + refresh-session auth for self-hosted cloud mode. */
import bcrypt from 'bcryptjs'
import type { Context, Next } from 'hono'
import { pool } from './db.ts'
import {
  ACCESS_MAX_AGE_SEC,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  REFRESH_TTL_MS,
  RESET_TTL_MS,
  VERIFY_TTL_MS,
  hashToken,
  issueAccessToken,
  randomToken,
  readCookie,
  verifyAccessToken,
} from './auth-tokens.ts'

export interface AuthUser {
  id: string
  email: string
  emailVerifiedAt: string | null
}

export type AppVariables = { user: AuthUser }

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export async function findUserByEmail(
  email: string,
): Promise<(AuthUser & { password_hash: string }) | null> {
  const result = await pool.query<{
    id: string
    email: string
    password_hash: string
    email_verified_at: Date | null
  }>(
    `select id, email, password_hash, email_verified_at
     from users where lower(email) = lower($1) limit 1`,
    [email.trim()],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    password_hash: row.password_hash,
    emailVerifiedAt: row.email_verified_at ? row.email_verified_at.toISOString() : null,
  }
}

export async function findUserById(id: string): Promise<AuthUser | null> {
  const result = await pool.query<{ id: string; email: string; email_verified_at: Date | null }>(
    `select id, email, email_verified_at from users where id = $1 limit 1`,
    [id],
  )
  const row = result.rows[0]
  if (!row) return null
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at ? row.email_verified_at.toISOString() : null,
  }
}

export async function createUser(email: string, password: string): Promise<AuthUser> {
  const passwordHash = await hashPassword(password)
  const result = await pool.query<{ id: string; email: string; email_verified_at: Date | null }>(
    `insert into users (email, password_hash)
     values (lower($1), $2)
     returning id, email, email_verified_at`,
    [email.trim(), passwordHash],
  )
  const row = result.rows[0]
  if (!row) throw new Error('USER_CREATE_FAILED')
  return {
    id: row.id,
    email: row.email,
    emailVerifiedAt: row.email_verified_at ? row.email_verified_at.toISOString() : null,
  }
}

export async function createVerificationToken(userId: string): Promise<string> {
  const token = randomToken()
  const expires = new Date(Date.now() + VERIFY_TTL_MS)
  await pool.query(
    `insert into verification_tokens (user_id, token_hash, expires_at)
     values ($1, $2, $3)`,
    [userId, hashToken(token), expires.toISOString()],
  )
  return token
}

export async function consumeVerificationToken(token: string): Promise<AuthUser | null> {
  const tokenHash = hashToken(token)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const found = await client.query<{
      id: string
      user_id: string
      expires_at: Date
      used_at: Date | null
    }>(
      `select id, user_id, expires_at, used_at from verification_tokens
       where token_hash = $1 for update`,
      [tokenHash],
    )
    const row = found.rows[0]
    if (!row || row.used_at || row.expires_at.getTime() < Date.now()) {
      await client.query('rollback')
      return null
    }
    await client.query(`update verification_tokens set used_at = now() where id = $1`, [row.id])
    const userResult = await client.query<{ id: string; email: string; email_verified_at: Date | null }>(
      `update users set email_verified_at = coalesce(email_verified_at, now())
       where id = $1
       returning id, email, email_verified_at`,
      [row.user_id],
    )
    await client.query('commit')
    const user = userResult.rows[0]
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.email_verified_at ? user.email_verified_at.toISOString() : null,
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function createResetToken(userId: string): Promise<string> {
  const token = randomToken()
  const expires = new Date(Date.now() + RESET_TTL_MS)
  await pool.query(
    `insert into reset_tokens (user_id, token_hash, expires_at) values ($1, $2, $3)`,
    [userId, hashToken(token), expires.toISOString()],
  )
  return token
}

export async function consumeResetToken(token: string, newPassword: string): Promise<AuthUser | null> {
  const tokenHash = hashToken(token)
  const passwordHash = await hashPassword(newPassword)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const found = await client.query<{
      id: string
      user_id: string
      expires_at: Date
      used_at: Date | null
    }>(
      `select id, user_id, expires_at, used_at from reset_tokens
       where token_hash = $1 for update`,
      [tokenHash],
    )
    const row = found.rows[0]
    if (!row || row.used_at || row.expires_at.getTime() < Date.now()) {
      await client.query('rollback')
      return null
    }
    await client.query(`update reset_tokens set used_at = now() where id = $1`, [row.id])
    const userResult = await client.query<{ id: string; email: string; email_verified_at: Date | null }>(
      `update users set password_hash = $2 where id = $1
       returning id, email, email_verified_at`,
      [row.user_id, passwordHash],
    )
    await client.query(
      `update refresh_sessions set revoked_at = now()
       where user_id = $1 and revoked_at is null`,
      [row.user_id],
    )
    await client.query('commit')
    const user = userResult.rows[0]
    if (!user) return null
    return {
      id: user.id,
      email: user.email,
      emailVerifiedAt: user.email_verified_at ? user.email_verified_at.toISOString() : null,
    }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export type RefreshSessionRow = {
  id: string
  userId: string
  tokenHash: string
  revokedAt: string | null
  expiresAt: string
  userAgent: string | null
  createdAt: string
}

export async function createRefreshSession(
  userId: string,
  userAgent: string | null,
  rotatedFrom: string | null = null,
): Promise<{ sessionId: string; refreshToken: string }> {
  const refreshToken = randomToken()
  const expires = new Date(Date.now() + REFRESH_TTL_MS)
  const result = await pool.query<{ id: string }>(
    `insert into refresh_sessions (user_id, token_hash, rotated_from, user_agent, expires_at)
     values ($1, $2, $3, $4, $5)
     returning id`,
    [userId, hashToken(refreshToken), rotatedFrom, userAgent, expires.toISOString()],
  )
  const row = result.rows[0]
  if (!row) throw new Error('REFRESH_CREATE_FAILED')
  return { sessionId: row.id, refreshToken }
}

export async function rotateRefreshSession(
  refreshToken: string,
  userAgent: string | null,
): Promise<{ user: AuthUser; accessToken: string; refreshToken: string; sessionId: string } | null> {
  const tokenHash = hashToken(refreshToken)
  const client = await pool.connect()
  try {
    await client.query('begin')
    const found = await client.query<{
      id: string
      user_id: string
      revoked_at: Date | null
      expires_at: Date
    }>(
      `select id, user_id, revoked_at, expires_at from refresh_sessions
       where token_hash = $1 for update`,
      [tokenHash],
    )
    const row = found.rows[0]
    if (!row) {
      await client.query('rollback')
      return null
    }
    if (row.revoked_at || row.expires_at.getTime() < Date.now()) {
      // Reuse / revoked: invalidate all sessions for this user.
      await client.query(
        `update refresh_sessions set revoked_at = coalesce(revoked_at, now())
         where user_id = $1 and revoked_at is null`,
        [row.user_id],
      )
      await client.query('commit')
      return null
    }
    await client.query(`update refresh_sessions set revoked_at = now() where id = $1`, [row.id])
    const newToken = randomToken()
    const expires = new Date(Date.now() + REFRESH_TTL_MS)
    const inserted = await client.query<{ id: string }>(
      `insert into refresh_sessions (user_id, token_hash, rotated_from, user_agent, expires_at)
       values ($1, $2, $3, $4, $5) returning id`,
      [row.user_id, hashToken(newToken), row.id, userAgent, expires.toISOString()],
    )
    const userResult = await client.query<{ id: string; email: string; email_verified_at: Date | null }>(
      `select id, email, email_verified_at from users where id = $1`,
      [row.user_id],
    )
    await client.query('commit')
    const userRow = userResult.rows[0]
    const sessionId = inserted.rows[0]?.id
    if (!userRow || !sessionId) return null
    const user: AuthUser = {
      id: userRow.id,
      email: userRow.email,
      emailVerifiedAt: userRow.email_verified_at ? userRow.email_verified_at.toISOString() : null,
    }
    const accessToken = await issueAccessToken(user)
    return { user, accessToken, refreshToken: newToken, sessionId }
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    client.release()
  }
}

export async function revokeRefreshToken(refreshToken: string): Promise<boolean> {
  const result = await pool.query(
    `update refresh_sessions set revoked_at = now()
     where token_hash = $1 and revoked_at is null`,
    [hashToken(refreshToken)],
  )
  return (result.rowCount ?? 0) > 0
}

export async function revokeSessionForUser(userId: string, sessionId: string): Promise<boolean> {
  const result = await pool.query(
    `update refresh_sessions set revoked_at = now()
     where id = $1 and user_id = $2 and revoked_at is null`,
    [sessionId, userId],
  )
  return (result.rowCount ?? 0) > 0
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const result = await pool.query(
    `update refresh_sessions set revoked_at = now()
     where user_id = $1 and revoked_at is null`,
    [userId],
  )
  return result.rowCount ?? 0
}

export async function listSessions(userId: string): Promise<Array<{
  id: string
  createdAt: string
  expiresAt: string
  revokedAt: string | null
  userAgent: string | null
  current: boolean
}>> {
  const result = await pool.query<{
    id: string
    created_at: Date
    expires_at: Date
    revoked_at: Date | null
    user_agent: string | null
  }>(
    `select id, created_at, expires_at, revoked_at, user_agent
     from refresh_sessions
     where user_id = $1
     order by created_at desc
     limit 50`,
    [userId],
  )
  return result.rows.map((row) => ({
    id: row.id,
    createdAt: row.created_at.toISOString(),
    expiresAt: row.expires_at.toISOString(),
    revokedAt: row.revoked_at ? row.revoked_at.toISOString() : null,
    userAgent: row.user_agent,
    current: false,
  }))
}

export async function deleteUserAccount(userId: string): Promise<void> {
  await pool.query(`delete from users where id = $1`, [userId])
}

export async function issueSessionPair(
  user: AuthUser,
  userAgent: string | null,
): Promise<{ accessToken: string; refreshToken: string; sessionId: string }> {
  const accessToken = await issueAccessToken(user)
  const refresh = await createRefreshSession(user.id, userAgent)
  return { accessToken, refreshToken: refresh.refreshToken, sessionId: refresh.sessionId }
}

function extractAccessToken(c: Context): string | null {
  const header = c.req.header('Authorization')
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return readCookie(c.req.header('Cookie'), COOKIE_ACCESS)
}

export function extractRefreshToken(c: Context): string | null {
  const header = c.req.header('X-Refresh-Token')
  if (header && header.length > 0) return header
  return readCookie(c.req.header('Cookie'), COOKIE_REFRESH)
}

export async function requireAuth(c: Context<{ Variables: AppVariables }>, next: Next) {
  const token = extractAccessToken(c)
  if (!token) return c.json({ error: 'AUTH_REQUIRED' }, 401)
  const claims = await verifyAccessToken(token)
  if (!claims) return c.json({ error: 'AUTH_REQUIRED' }, 401)
  const user = await findUserById(claims.id)
  if (!user) return c.json({ error: 'AUTH_REQUIRED' }, 401)
  c.set('user', user)
  await next()
}

/** @deprecated Prefer issueSessionPair — kept for transitional callers. */
export async function issueToken(user: AuthUser): Promise<string> {
  return issueAccessToken(user)
}

export async function userFromToken(token: string): Promise<AuthUser | null> {
  const claims = await verifyAccessToken(token)
  if (!claims) return null
  return findUserById(claims.id)
}

export { ACCESS_MAX_AGE_SEC, COOKIE_ACCESS, COOKIE_REFRESH, issueAccessToken }
