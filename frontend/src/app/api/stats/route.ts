import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsClusters, rawArticles, sources } from '@/lib/db/schema'
import { count, eq, max } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [c] = await db.select({ v: count() }).from(newsClusters)
    const [a] = await db.select({ v: count() }).from(rawArticles)
    const [s] = await db.select({ v: count() }).from(sources).where(eq(sources.active, true))
    const [last] = await db.select({ v: max(rawArticles.scrapedAt) }).from(rawArticles)

    return NextResponse.json({
      total_clusters:  c?.v ?? 0,
      total_articles:  a?.v ?? 0,
      sources_active:  s?.v ?? 0,
      last_scrape:     last?.v ?? null,
    })
  } catch (e) {
    console.error('GET /api/stats failed:', e)
    return NextResponse.json({
      total_clusters: 0, total_articles: 0, sources_active: 0, last_scrape: null,
    })
  }
}
