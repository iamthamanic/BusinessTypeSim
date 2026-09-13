/** Business Type self-hosted API entry — migrate + listen. */
import { serve } from '@hono/node-server'
import { createApp } from './app.ts'
import { migrate } from './db.ts'
import { env } from './env.ts'
import { CapturingMailAdapter, setMailAdapter } from './mail.ts'

const app = createApp()

async function main() {
  if (env.authDevCapture) {
    setMailAdapter(new CapturingMailAdapter())
  }
  await migrate()
  const port = Number.isFinite(env.port) ? env.port : 3000
  console.log(`business-type-api listening on :${port}`)
  serve({ fetch: app.fetch, port })
}

main().catch((error) => {
  console.error('fatal', error instanceof Error ? error.message : error)
  process.exit(1)
})

export { app }
