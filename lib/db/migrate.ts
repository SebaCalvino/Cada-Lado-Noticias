import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import { migrate } from 'drizzle-orm/neon-http/migrator'

async function runMigration() {
  const sql = neon(process.env.DATABASE_URL!)
  const db = drizzle(sql)
  await migrate(db, { migrationsFolder: './drizzle' })
  console.log('Migrations complete')
}

runMigration().catch(console.error)
