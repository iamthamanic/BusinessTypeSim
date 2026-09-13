import { describe, expect, it } from 'vitest'
import { Hono } from 'hono'
import { interpretOwnedRunLookup } from '../server/src/owned-run.ts'
import { assertSameOwner } from '../server/src/authz.ts'
import {
  createRun,
  requestAnalysis,
  UnknownAnalysisError,
} from '../shared/domain/index.ts'

describe('authz ownership', () => {
  it('denies foreign owner', () => {
    expect(assertSameOwner('owner-a', 'owner-b')).toBe(false)
    expect(assertSameOwner('owner-a', 'owner-a')).toBe(true)
    expect(assertSameOwner('', 'owner-a')).toBe(false)
  })
})

describe('HTTP AuthZ — foreign runId → 404', () => {
  const app = new Hono()
  app.post('/game', async (c) => {
    const body = await c.req.json<{ runId: string; requesterId: string }>()
    // Simulate owner-scoped SQL: foreign runId returns zero rows.
    const rows =
      body.runId === 'run-owned-by-a'
        ? [{ owner_id: 'user-a', revision: 1, state: { ok: true } }]
        : []
    const owned = interpretOwnedRunLookup(rows, body.requesterId)
    if (!owned.ok) return c.json({ error: owned.error }, owned.status)
    return c.json({ ok: true })
  })

  it('returns 404 when run is not owned by requester', async () => {
    const response = await app.request('/game', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runId: 'run-owned-by-someone-else', requesterId: 'user-b' }),
    })
    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'RUN_NOT_FOUND' })
  })

  it('returns 404 when row owner mismatches requester (defense in depth)', async () => {
    const owned = interpretOwnedRunLookup(
      [{ owner_id: 'user-a', revision: 1, state: {} }],
      'user-b',
    )
    expect(owned).toEqual({ ok: false, status: 404, error: 'RUN_NOT_FOUND' })
  })

  it('returns 200 for owner', async () => {
    const response = await app.request('/game', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ runId: 'run-owned-by-a', requesterId: 'user-a' }),
    })
    expect(response.status).toBe(200)
  })
})

describe('unknown analysis → client error', () => {
  it('throws UnknownAnalysisError with stable code', () => {
    const run = createRun('nordkern-foods', 'unknown-analysis')
    expect(() => requestAnalysis(run, 'does-not-exist')).toThrow(UnknownAnalysisError)
    try {
      requestAnalysis(run, 'does-not-exist')
    } catch (error) {
      expect(error).toBeInstanceOf(UnknownAnalysisError)
      expect((error as UnknownAnalysisError).code).toBe('UNKNOWN_ANALYSIS')
    }
  })
})
