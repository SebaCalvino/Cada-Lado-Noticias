import { NextResponse } from 'next/server'
import { db, newsClusters, rawArticles, sources } from '@/lib/db'
import { sql, eq, max } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const [[{ total_clusters }], [{ total_articles }], [{ sources_active }], [{ last_scrape }]] =
      await Promise.all([
        db.select({ total_clusters: sql<number>`count(*)::int` }).from(newsClusters),
        db.select({ total_articles: sql<number>`count(*)::int` }).from(rawArticles),
        db
          .select({ sources_active: sql<number>`count(*)::int` })
          .from(sources)
          .where(eq(sources.active, true)),
        db.select({ last_scrape: max(rawArticles.scrapedAt) }).from(rawArticles),
      ])

    return NextResponse.json({
      total_clusters: total_clusters || 0,
      total_articles: total_articles || 0,
      sources_active: sources_active || 0,
      last_scrape: last_scrape?.toISOString() ?? null,
    })
  } catch (err) {
    console.error('/api/stats error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
