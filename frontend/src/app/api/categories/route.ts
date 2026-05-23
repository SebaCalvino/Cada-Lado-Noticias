import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsClusters } from '@/lib/db/schema'
import { count, desc, isNotNull } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const rows = await db
      .select({ category: newsClusters.category, count: count() })
      .from(newsClusters)
      .where(isNotNull(newsClusters.category))
      .groupBy(newsClusters.category)
      .orderBy(desc(count()))

    return NextResponse.json(rows.map(r => ({ category: r.category, count: r.count })))
  } catch (e) {
    console.error('GET /api/categories failed:', e)
    return NextResponse.json([])
  }
}
