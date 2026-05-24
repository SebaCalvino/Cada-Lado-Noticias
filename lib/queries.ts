/**
 * Server-side data access functions.
 * Call these directly from Server Components — they bypass the HTTP API layer,
 * which avoids the relative-URL issue that breaks axios in Node.js.
 */

import { db, newsClusters, clusterArticles, rawArticles, sources, clusterComments } from './db'
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

/** Detalle completo de un cluster: artículos por fuente + comentarios */
export async function getNewsDetailServer(id: number) {
  try {
    const [cluster] = await db
      .select()
      .from(newsClusters)
      .where(eq(newsClusters.id, id))

    if (!cluster) return null

    const [articleRows, comments] = await Promise.all([
      db
        .select({ ca: clusterArticles, article: rawArticles, source: sources })
        .from(clusterArticles)
        .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
        .innerJoin(sources,     eq(sources.id,     rawArticles.sourceId))
        .where(eq(clusterArticles.clusterId, id)),
      db
        .select()
        .from(clusterComments)
        .where(eq(clusterComments.clusterId, id)),
    ])

    return {
      id:           cluster.id,
      title:        cluster.title,
      synthesis:    cluster.synthesis    ?? null,
      key_facts:    cluster.keyFacts     ?? null,
      category:     cluster.category     ?? null,
      source_count: cluster.sourceCount,
      published_at: cluster.publishedAt?.toISOString() ?? null,
      image_url:    cluster.imageUrl     ?? null,
      articles: articleRows.map(({ ca, article, source }) => ({
        source_slug:          source.slug,
        source_name:          source.name,
        source_color:         source.color,
        article_title:        article.title,
        article_url:          article.url,
        coverage_percentage:  ca.coveragePercentage,
        emphasis:             ca.emphasis   ?? null,
        omissions:            ca.omissions  ?? null,
        similarity_score:     ca.similarityScore,
      })),
      comments: comments.map(c => ({
        id:          c.id,
        author:      c.author    ?? null,
        text:        c.text,
        sentiment:   c.sentiment ?? null,
        votes:       c.votes,
        source_slug: c.sourceSlug,
      })),
    }
  } catch (err) {
    console.error('[getNewsDetailServer] error:', err)
    return null
  }
}

export async function getSourcesServer() {
  try {
    const rows = await db
      .select()
      .from(sources)
      .where(eq(sources.active, true))
      .orderBy(sources.name)
    return rows.map(s => ({
      id:             s.id,
      slug:           s.slug,
      name:           s.name,
      url:            s.url,
      color:          s.color,
      ideology_score: s.ideologyScore,
      ideology_label: s.ideologyLabel ?? null,
    }))
  } catch {
    return []
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
