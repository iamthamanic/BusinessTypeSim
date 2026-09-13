/** Hono app factory — no listen side effects (safe for tests). */
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { env } from './env.ts'
import { authRoutes } from './routes/auth.ts'
import { gameRoutes } from './routes/game.ts'
import { aiRoutes } from './routes/ai.ts'
import { debriefRoutes } from './routes/debrief.ts'

const allowedOrigins = env.corsOrigin === '*'
  ? null
  : env.corsOrigin.split(',').map((item) => item.trim()).filter(Boolean)

export function createApp(): Hono {
  const app = new Hono()

  app.use('*', cors({
    origin: (origin) => {
      if (!origin) return ''
      if (!allowedOrigins) return origin
      return allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? ''
    },
    credentials: true,
    allowHeaders: ['Authorization', 'Content-Type', 'X-Auth-Client', 'X-Refresh-Token'],
    allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  }))

  app.get('/healthz', (c) => c.json({ ok: true }))
  app.route('/auth', authRoutes)
  app.route('/game', gameRoutes)
  app.route('/ai', aiRoutes)
  app.route('/debrief', debriefRoutes)
  return app
}
