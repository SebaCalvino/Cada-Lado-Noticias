import { NextResponse } from 'next/server'
import { db, newsClusters } from '@/lib/db'
import { sql, isNotNull, desc } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db
      .select({
        category: newsClusters.category,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(newsClusters)
      .where(isNotNull(newsClusters.category))
      .groupBy(newsClusters.category)
      .orderBy(desc(sql`count(*)`))

    return NextResponse.json(rows)
  } catch (err) {
    console.error('/api/categories error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
