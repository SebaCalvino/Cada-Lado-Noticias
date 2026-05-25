/**
 * Pipeline status — diagnostic endpoint.
 *
 * GET /api/pipeline/status
 * (No auth required — read-only, no sensitive data)
 *
 * Returns a JSON snapshot of the current DB state so you can see
 * exactly what's in the pipeline without needing Vercel logs.
 */

import { NextResponse } from 'next/server'
import { db, newsClusters, clusterArticles, rawArticles } from '@/lib/db'
import { isNull, isNotNull, ne, and, desc, gte, lt, sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()
    const cutoff48h = new Date(now.getTime() - 48 * 60 * 60 * 1000)
    const cutoff7d  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000)

    const [
      [{ total_raw }],
      [{ raw_48h }],
      [{ clustered_rows }],
      [{ pending_synthesis }],
      [{ published }],
      [{ orphans_7d }],
      latestArticle,
      latestCluster,
    ] = await Promise.all([
      // Total raw articles
      db.select({ total_raw: sql<number>`count(*)::int` }).from(rawArticles),

      // Raw articles in last 48h
      db.select({ raw_48h: sql<number>`count(*)::int` })
        .from(rawArticles)
        .where(gte(rawArticles.scrapedAt, cutoff48h)),

      // Articles already assigned to a cluster
      db.select({ clustered_rows: sql<number>`count(*)::int` }).from(clusterArticles),

      // Clusters waiting for synthesis (synthesis = null)
      db.select({ pending_synthesis: sql<number>`count(*)::int` })
        .from(newsClusters)
        .where(isNull(newsClusters.synthesis)),

      // Fully published clusters
      db.select({ published: sql<number>`count(*)::int` })
        .from(newsClusters)
        .where(and(isNotNull(newsClusters.synthesis), ne(newsClusters.synthesis, ''))),

      // Orphan articles > 7d (not in any cluster)
      db.select({ orphans_7d: sql<number>`count(*)::int` })
        .from(rawArticles)
        .where(
          and(
            lt(rawArticles.scrapedAt, cutoff7d),
            sql`${rawArticles.id} NOT IN (SELECT article_id FROM cluster_articles)`
          )
        ),

      // Most recently scraped article
      db.select({
        title:     rawArticles.title,
        scrapedAt: rawArticles.scrapedAt,
        sourceId:  rawArticles.sourceId,
      })
        .from(rawArticles)
        .orderBy(desc(rawArticles.scrapedAt))
        .limit(1),

      // Most recently published cluster
      db.select({
        id:          newsClusters.id,
        title:       newsClusters.title,
        publishedAt: newsClusters.publishedAt,
        synthesis:   newsClusters.synthesis,
      })
        .from(newsClusters)
        .where(and(isNotNull(newsClusters.synthesis), ne(newsClusters.synthesis, '')))
        .orderBy(desc(newsClusters.publishedAt))
        .limit(1),
    ])

    // How many articles in 48h window are not in any cluster
    const eligible48h_count = await db.select({ c: sql<number>`count(*)::int` })
      .from(rawArticles)
      .where(
        and(
          gte(rawArticles.scrapedAt, cutoff48h),
          sql`${rawArticles.id} NOT IN (SELECT article_id FROM cluster_articles)`
        )
      )

    // Per-source article count for last 48h
    const perSource = await db.execute(sql`
      SELECT s.slug, count(*)::int as cnt
      FROM raw_articles ra
      JOIN sources s ON s.id = ra.source_id
      WHERE ra.scraped_at >= ${cutoff48h}
      GROUP BY s.slug
      ORDER BY cnt DESC
    `)

    // Sample of 10 eligible article titles (newest first)
    const sample = await db.execute(sql`
      SELECT ra.id, ra.title, s.slug, ra.published_at
      FROM raw_articles ra
      JOIN sources s ON s.id = ra.source_id
      WHERE ra.scraped_at >= ${cutoff48h}
        AND ra.id NOT IN (SELECT article_id FROM cluster_articles)
      ORDER BY ra.published_at DESC NULLS LAST
      LIMIT 10
    `)

    return NextResponse.json({
      ok: true,
      ts: now.toISOString(),
      raw_articles: {
        total:           total_raw,
        last_48h:        raw_48h,
        eligible_for_cluster: eligible48h_count[0]?.c ?? 0,
        orphans_gt_7d:   orphans_7d,
        latest: latestArticle[0] ? {
          title:     latestArticle[0].title?.slice(0, 80),
          scrapedAt: latestArticle[0].scrapedAt?.toISOString(),
        } : null,
        per_source: [...perSource],
        sample_eligible: [...sample].map((r: any) => ({
          id:    r.id,
          slug:  r.slug,
          title: (r.title as string)?.slice(0, 100),
          pub:   r.published_at,
        })),
      },
      clusters: {
        published,
        pending_synthesis,
        latest: latestCluster[0] ? {
          id:          latestCluster[0].id,
          title:       latestCluster[0].title?.slice(0, 80),
          publishedAt: latestCluster[0].publishedAt?.toISOString(),
          hasSynthesis: !!latestCluster[0].synthesis,
        } : null,
      },
      cluster_articles: {
        total: clustered_rows,
      },
    })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
