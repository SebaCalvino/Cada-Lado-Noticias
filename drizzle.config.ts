import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  schema: './frontend/src/lib/db/schema.ts',
  out: './frontend/drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
})
