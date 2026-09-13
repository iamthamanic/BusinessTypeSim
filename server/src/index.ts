/** Business Type self-hosted API — auth, game, AI, debrief. */
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { migrate } from './db.ts'
import { env } from './env.ts'
import { authRoutes } from './routes/auth.ts'
import { gameRoutes } from './routes/game.ts'
import { aiRoutes } from './routes/ai.ts'
import { debriefRoutes } from './routes/debrief.ts'

const app = new Hono()

app.use('*', cors({
  origin: env.corsOrigin === '*' ? '*' : env.corsOrigin.split(',').map((item) => item.trim()),
  allowHeaders: ['Authorization', 'Content-Type'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
}))

app.get('/healthz', (c) => c.json({ ok: true }))

app.route('/auth', authRoutes)
app.route('/game', gameRoutes)
app.route('/ai', aiRoutes)
app.route('/debrief', debriefRoutes)

async function main() {
  await migrate()
  const port = Number.isFinite(env.port) ? env.port : 3000
  console.log(`business-type-api listening on :${port}`)
  serve({ fetch: app.fetch, port })
}

main().catch((error) => {
  console.error('fatal', error instanceof Error ? error.message : error)
  process.exit(1)
})
