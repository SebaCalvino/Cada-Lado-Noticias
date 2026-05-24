import type { Config } from 'drizzle-kit'

export default {
  schema: './frontend/src/lib/db/schema.ts',
  out: './frontend/migrations',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config
