/**
 * Server-side data access functions.
 * Call these directly from Server Components — they bypass the HTTP API layer,
 * which avoids the relative-URL issue that breaks axios in Node.js.
 */

import { db, newsClusters, clusterArticles, rawArticles, sources } from './db'
import { eq, desc, sql, isNotNull } from 'drizzle-orm'

export async function getNewsClustersServer(
  page = 1,
  pageSize = 20,
  category?: string
) {
  try {
    const offset = (page - 1) * pageSize

    const rows = await db
      .select({ cluster: newsClusters, source: sources })
      .from(newsClusters)
      .leftJoin(clusterArticles, eq(clusterArticles.clusterId, newsClusters.id))
      .leftJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .leftJoin(sources, eq(sources.id, rawArticles.sourceId))
      .where(category ? eq(newsClusters.category, category) : undefined)
      .orderBy(desc(newsClusters.publishedAt))

    const clusterMap = new Map<
      number,
      { cluster: (typeof rows)[0]['cluster']; sourceSlugs: Set<string> }
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

    const entries = Array.from(clusterMap.values()).slice(offset, offset + pageSize)

    return entries.map(({ cluster, sourceSlugs }) => ({
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
  } catch {
    return []
  }
}

export async function getStatsServer() {
  try {
    const [[{ total_clusters }], [{ total_articles }], [{ sources_active }]] =
      await Promise.all([
        db
          .select({ total_clusters: sql<number>`count(*)::int` })
          .from(newsClusters),
        db
          .select({ total_articles: sql<number>`count(*)::int` })
          .from(rawArticles),
        db
          .select({ sources_active: sql<number>`count(*)::int` })
          .from(sources)
          .where(eq(sources.active, true)),
      ])

    return {
      total_clusters: total_clusters || 0,
      total_articles: total_articles || 0,
      sources_active: sources_active || 0,
    }
  } catch {
    return null
  }
}

export async function getCategoriesServer() {
  try {
    return await db
      .select({
        category: newsClusters.category,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(newsClusters)
      .where(isNotNull(newsClusters.category))
      .groupBy(newsClusters.category)
      .orderBy(desc(sql`count(*)`))
      .then(rows => rows.filter(r => r.category) as { category: string; count: number }[])
  } catch {
    return []
  }
}
