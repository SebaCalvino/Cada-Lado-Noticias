/* CADA LADO — Postgres + Drizzle connection (lazy init for Vercel Hobby) */

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type SQL = ReturnType<typeof postgres>
type DB  = ReturnType<typeof drizzle<typeof schema>>

const g = globalThis as unknown as { _caSql?: SQL; _caDb?: DB }

function getClient(): DB {
  if (g._caDb) return g._caDb
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is not set — add it in Vercel → Project Settings → Environment Variables')
  g._caSql = postgres(url, { max: 1, prepare: false, idle_timeout: 20, connect_timeout: 10 })
  g._caDb = drizzle(g._caSql, { schema })
  return g._caDb
}

// Lazy proxy — only connects when first DB operation runs, not at import time
export const db: DB = new Proxy({} as DB, {
  get(_, prop) {
    const client = getClient()
    const val = Reflect.get(client, prop)
    return typeof val === 'function' ? val.bind(client) : val
  },
})
export { schema }
