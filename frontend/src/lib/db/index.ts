/* CADA LADO — Postgres + Drizzle connection (Supabase compatible) */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL is not set — set it to your Supabase connection string')
}

/* Single client per process (or warm Lambda) — Supabase pooler friendly */
const globalForSql = globalThis as unknown as { _sql?: ReturnType<typeof postgres> }

export const sql = globalForSql._sql ?? postgres(connectionString, {
  max: 1,
  prepare: false, // required for Supabase transaction pooler (port 6543)
  idle_timeout: 20,
  connect_timeout: 10,
})

if (process.env.NODE_ENV !== 'production') {
  globalForSql._sql = sql
}

export const db = drizzle(sql, { schema })
export { schema }
