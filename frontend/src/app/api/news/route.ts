import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsClusters, clusterArticles, rawArticles, sources } from '@/lib/db/schema'
import { eq, desc, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') ?? '20', 10)))
    const category = searchParams.get('category')

    const whereExpr = category ? eq(newsClusters.category, category) : undefined

    const clusters = await db
      .select()
      .from(newsClusters)
      .where(whereExpr)
      .orderBy(desc(newsClusters.publishedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize)

    if (clusters.length === 0) return NextResponse.json([])

    // Fetch sources per cluster in one query
    const ids = clusters.map(c => c.id)
    const memberships = await db
      .select({
        clusterId:  clusterArticles.clusterId,
        sourceSlug: sources.slug,
      })
      .from(clusterArticles)
      .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .innerJoin(sources, eq(sources.id, rawArticles.sourceId))
      .where(ids.length === 1 ? eq(clusterArticles.clusterId, ids[0]) : undefined)

    const sourcesByCluster: Record<number, Set<string>> = {}
    for (const m of memberships) {
      if (!ids.includes(m.clusterId)) continue
      ;(sourcesByCluster[m.clusterId] ??= new Set()).add(m.sourceSlug)
    }

    const out = clusters.map(c => ({
      id:            c.id,
      title:         c.title,
      synthesis:     c.synthesis && c.synthesis.length > 200 ? c.synthesis.slice(0, 200) + '...' : c.synthesis,
      category:      c.category,
      source_count:  c.sourceCount,
      published_at:  c.publishedAt,
      sources:       Array.from(sourcesByCluster[c.id] ?? []),
      image_url:     c.imageUrl,
    }))

    return NextResponse.json(out)
  } catch (e) {
    console.error('GET /api/news failed:', e)
    return NextResponse.json([], { status: 200 })
  }
}
