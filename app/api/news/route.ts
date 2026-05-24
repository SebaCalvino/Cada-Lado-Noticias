import { NextRequest, NextResponse } from 'next/server'
import { db, newsClusters, clusterArticles, rawArticles, sources } from '@/lib/db'
import { eq, desc, and } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('page_size') || '20', 10)))
    const category = searchParams.get('category') || undefined

    const offset = (page - 1) * pageSize

    const rows = await db
      .select({
        cluster: newsClusters,
        ca: clusterArticles,
        article: rawArticles,
        source: sources,
      })
      .from(newsClusters)
      .leftJoin(clusterArticles, eq(clusterArticles.clusterId, newsClusters.id))
      .leftJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .leftJoin(sources, eq(sources.id, rawArticles.sourceId))
      .where(category ? eq(newsClusters.category, category) : undefined)
      .orderBy(desc(newsClusters.publishedAt))

    // Group by cluster id
    const clusterMap = new Map<
      number,
      { cluster: typeof rows[0]['cluster']; sourceSlugs: Set<string> }
    >()

    for (const row of rows) {
      if (!clusterMap.has(row.cluster.id)) {
        clusterMap.set(row.cluster.id, {
          cluster: row.cluster,
          sourceSlugs: new Set(),
        })
      }
      if (row.source?.slug) {
        clusterMap.get(row.cluster.id)!.sourceSlugs.add(row.source.slug)
      }
    }

    // Paginate
    const entries = Array.from(clusterMap.values()).slice(offset, offset + pageSize)

    const result = entries.map(({ cluster, sourceSlugs }) => ({
      id: cluster.id,
      title: cluster.title,
      synthesis:
        cluster.synthesis && cluster.synthesis.length > 200
          ? cluster.synthesis.slice(0, 200) + '...'
          : cluster.synthesis,
      category: cluster.category,
      source_count: cluster.sourceCount,
      published_at: cluster.publishedAt?.toISOString() ?? null,
      sources: Array.from(sourceSlugs),
      image_url: cluster.imageUrl ?? null,
    }))

    return NextResponse.json(result)
  } catch (err) {
    console.error('/api/news error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
