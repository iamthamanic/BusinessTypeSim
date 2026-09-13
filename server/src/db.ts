/** Postgres pool for the self-hosted API. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { env } from './env.ts'

const { Pool } = pg

export const pool = new Pool({
  connectionString: env.databaseUrl(),
  max: 10,
})

export async function migrate(): Promise<void> {
  const here = path.dirname(fileURLToPath(import.meta.url))
  const sqlPath = path.resolve(here, '../sql/001_init.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')
  await pool.query(sql)
}
