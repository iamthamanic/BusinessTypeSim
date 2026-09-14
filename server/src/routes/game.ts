/** Authoritative game mutations — same ops as former Edge game-api. */
import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth, type AppVariables } from '../auth.ts'
import { actionProposalSchema } from '../contracts.ts'
import { pool } from '../db.ts'
import { interpretOwnedRunLookup } from '../owned-run.ts'
import {
  advanceTime,
  commitDecision,
  ConstraintViolationError,
  createRun,
  normalizeRunState,
  requestAnalysis,
  scenarios,
  UnknownAnalysisError,
  type RunState,
  type ScenarioId,
} from '../../../shared/domain/index.ts'

const requestSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('create'), scenarioId: z.string().min(3).max(64), seed: z.string().min(3).max(200) }),
  z.object({
    op: z.literal('analysis'),
    runId: z.string().min(1),
    revision: z.number().int().positive(),
    analysisId: z.string().min(1).max(120),
  }),
  z.object({
    op: z.literal('commit'),
    runId: z.string().min(1),
    revision: z.number().int().positive(),
    playerText: z.string().min(3).max(4000),
    rationale: z.string().max(6000),
    proposal: actionProposalSchema,
    idempotencyKey: z.string().min(8).max(120),
  }),
  z.object({
    op: z.literal('advance'),
    runId: z.string().min(1),
    revision: z.number().int().positive(),
    days: z.number().int().min(1).max(730),
  }),
])

export const gameRoutes = new Hono<{ Variables: AppVariables }>()

/** Latest run progress per scenario for the signed-in owner (picker cards). */
gameRoutes.get('/runs', requireAuth, async (c) => {
  const user = c.get('user')
  try {
    const result = await pool.query<{
      scenario_id: string
      status: string
      day: number
      duration_months: number
      clock_month: number
      ended: boolean
    }>(
      `select distinct on (scenario_id)
         scenario_id,
         coalesce(state->>'status', 'active') as status,
         coalesce((state->>'day')::int, 0) as day,
         coalesce((state->'campaign'->>'durationMonths')::int, 36) as duration_months,
         coalesce((state->'campaign'->>'clockMonth')::int, 0) as clock_month,
         coalesce((state->'campaign'->>'ended')::boolean, false) as ended
       from game_runs
       where owner_id = $1
       order by scenario_id, updated_at desc`,
      [user.id],
    )
    const runs = result.rows.map((row) => {
      const status: 'active' | 'completed' | 'failed' =
        row.status === 'completed' || row.status === 'failed' ? row.status : 'active'
      const ended = Boolean(row.ended) || status === 'completed'
      const durationMonths = Math.max(1, row.duration_months || 36)
      const totalDays = durationMonths * 30
      const byDay = Math.round((Math.max(0, row.day) / totalDays) * 100)
      const byMonth = Math.round((Math.max(0, row.clock_month) / durationMonths) * 100)
      const percent = ended ? 100 : Math.min(100, Math.max(byDay, byMonth))
      return {
        scenarioId: row.scenario_id,
        percent,
        status,
      }
    })
    return c.json({ runs })
  } catch (error) {
    console.error('list runs failed', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

/** Delete every run owned by the signed-in user (scenario progress wipe). */
gameRoutes.delete('/runs', requireAuth, async (c) => {
  const user = c.get('user')
  try {
    const result = await pool.query(`delete from game_runs where owner_id = $1`, [user.id])
    return c.json({ ok: true, deleted: result.rowCount ?? 0 })
  } catch (error) {
    console.error('delete runs failed', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})

gameRoutes.post('/', requireAuth, async (c) => {
  const parsed = requestSchema.safeParse(await c.req.json())
  if (!parsed.success) return c.json({ error: 'INVALID_INPUT' }, 400)
  const input = parsed.data
  const user = c.get('user')

  try {
    if (input.op === 'create') {
      const scenario = scenarios.find((candidate) => candidate.id === input.scenarioId)
      if (!scenario) return c.json({ error: 'SCENARIO_NOT_FOUND' }, 404)
      const run = createRun(input.scenarioId as ScenarioId, input.seed)
      try {
        await pool.query(
          `insert into game_runs (id, owner_id, scenario_id, scenario_version, seed, revision, state)
           values ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
          [run.runId, user.id, run.scenarioId, run.scenarioVersion, run.seed, run.revision, JSON.stringify(run)],
        )
      } catch {
        return c.json({ error: 'RUN_CREATE_FAILED' }, 409)
      }
      return c.json({ run }, 201)
    }

    const loaded = await pool.query<{ id: string; owner_id: string; revision: number; state: RunState }>(
      `select id, owner_id, revision, state from game_runs where id = $1 and owner_id = $2`,
      [input.runId, user.id],
    )
    const owned = interpretOwnedRunLookup(loaded.rows, user.id)
    if (!owned.ok) return c.json({ error: owned.error }, owned.status)

    const row = owned.row
    const state = normalizeRunState(row.state)
    if (row.revision !== input.revision) {
      if (
        input.op === 'commit' &&
        state.processedIdempotencyKeys.includes(input.idempotencyKey)
      ) {
        return c.json({ run: state })
      }
      return c.json({ error: 'REVISION_CONFLICT', currentRevision: row.revision }, 409)
    }

    let next: RunState
    if (input.op === 'analysis') next = requestAnalysis(state, input.analysisId)
    else if (input.op === 'advance') next = advanceTime(state, input.days)
    else next = commitDecision(state, input.playerText, input.rationale, input.proposal, input.idempotencyKey)

    const updated = await pool.query(
      `update game_runs
       set state = $1::jsonb, revision = $2, updated_at = now()
       where id = $3 and owner_id = $4 and revision = $5
       returning revision`,
      [JSON.stringify(next), next.revision, input.runId, user.id, input.revision],
    )
    if (updated.rowCount === 0) return c.json({ error: 'REVISION_CONFLICT' }, 409)
    return c.json({ run: next })
  } catch (error) {
    if (error instanceof UnknownAnalysisError) {
      return c.json({ error: error.code }, 400)
    }
    if (error instanceof ConstraintViolationError) {
      return c.json(
        {
          error: error.code,
          blockers: error.evaluation.blockers,
          warnings: error.evaluation.warnings,
        },
        400,
      )
    }
    console.error('game error', error instanceof Error ? error.message : 'unknown')
    return c.json({ error: 'INTERNAL_ERROR' }, 500)
  }
})
