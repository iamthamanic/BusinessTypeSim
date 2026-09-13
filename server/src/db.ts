/** Postgres pool for the self-hosted API (lazy — import-safe for unit tests). */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { env } from './env.ts'

const { Pool } = pg

let poolInstance: pg.Pool | null = null

function getPool(): pg.Pool {
  if (!poolInstance) {
    poolInstance = new Pool({
      connectionString: env.databaseUrl(),
      max: 10,
    })
  }
  return poolInstance
}

/** Lazy pool proxy so importing auth modules does not require DATABASE_URL until query time. */
export const pool = {
  query: ((...args: Parameters<pg.Pool['query']>) => getPool().query(...args)) as pg.Pool['query'],
  connect: (() => getPool().connect()) as pg.Pool['connect'],
  end: (async () => {
    if (poolInstance) {
      await poolInstance.end()
      poolInstance = null
    }
  }) as pg.Pool['end'],
}

/** Apply all numbered SQL migrations in order. */
export async function migrate(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const sqlDir = path.resolve(here, '../sql')
  const files = fs
    .readdirSync(sqlDir)
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort()
  for (const file of files) {
    const sql = fs.readFileSync(path.join(sqlDir, file), 'utf8')
    await pool.query(sql)
  }
}
