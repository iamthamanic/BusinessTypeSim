/** Hourly AI request limiter per authenticated user. */
import { pool } from './db.ts'
import { env } from './env.ts'

export async function claimAiRequest(ownerId: string): Promise<boolean> {
  const windowKey = new Date().toISOString().slice(0, 13).replace(/[-:T]/g, '')
  const result = await pool.query<{ request_count: number }>(
    `insert into ai_usage_windows (owner_id, window_key, request_count)
     values ($1, $2, 1)
     on conflict (owner_id, window_key)
     do update set request_count = ai_usage_windows.request_count + 1, updated_at = now()
     returning request_count`,
    [ownerId, windowKey],
  )
  const count = result.rows[0]?.request_count ?? 999
  return count <= Math.max(1, env.aiHourlyLimit)
}
