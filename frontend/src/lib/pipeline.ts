/* CADA LADO — Scrape → cluster → synthesize pipeline (orchestrator) */

import { and, eq, gte, desc } from 'drizzle-orm'
import { db } from './db'
import {
  sources, rawArticles, newsClusters, clusterArticles,
  type NewRawArticle,
} from './db/schema'
import { SOURCES } from './sources'
import { scrapeAllSources } from './scrapers'
import { clusterArticles as runClustering, type ArticleInput } from './clustering'
import { synthesizeCluster, type ArticleForSynthesis } from './ai-synthesis'

/* ── Seed sources (idempotent upsert) ─────────────────────────────── */
export async function ensureSources(): Promise<void> {
  for (const s of SOURCES) {
    await db.insert(sources).values({
      slug:           s.slug,
      name:           s.name,
      url:            s.url,
      rssUrl:         s.rssUrl,
      color:          s.color,
      ideologyScore:  s.ideologyScore,
      ideologyLabel:  s.ideologyLabel,
      active:         true,
    }).onConflictDoNothing({ target: sources.slug })
  }
}

/* ── Stage 1: Scrape + save raw articles ─────────────────────────── */
export async function ingestNewArticles(): Promise<number> {
  await ensureSources()

  // Build slug → id map
  const allSources = await db.select().from(sources)
  const idBySlug = new Map(allSources.map(s => [s.slug, s.id]))

  const scraped = await scrapeAllSources()
  // enrichImages skipped — fetches full HTML per article, too slow for Vercel 10s limit

  let newCount = 0
  for (const art of scraped) {
    const sourceId = idBySlug.get(art.sourceSlug)
    if (!sourceId) continue

    const row: NewRawArticle = {
      sourceId,
      title:       art.title.slice(0, 500),
      url:         art.url.slice(0, 1000),
      summary:     art.summary,
      publishedAt: art.publishedAt ?? new Date(),
      scrapedAt:   new Date(),
      imageUrl:    art.imageUrl,
      clustered:   false,
    }
    const result = await db.insert(rawArticles).values(row).onConflictDoNothing({ target: rawArticles.url }).returning({ id: rawArticles.id })
    if (result.length > 0) newCount++
  }

  console.log(`Inserted ${newCount} new articles`)
  return newCount
}

/* ── Stage 2: Cluster + synthesize (batch-limited for Vercel timeouts) ── */
export async function clusterAndSynthesize(maxClustersPerRun = 5): Promise<{ created: number; total: number }> {
  const cutoff = new Date(Date.now() - 48 * 3600 * 1000)

  // Fetch all unclustered recent articles
  const recent = await db
    .select({
      id:           rawArticles.id,
      title:        rawArticles.title,
      summary:      rawArticles.summary,
      url:          rawArticles.url,
      imageUrl:     rawArticles.imageUrl,
      sourceSlug:   sources.slug,
      sourceName:   sources.name,
    })
    .from(rawArticles)
    .innerJoin(sources, eq(sources.id, rawArticles.sourceId))
    .where(and(eq(rawArticles.clustered, false), gte(rawArticles.scrapedAt, cutoff)))
    .orderBy(desc(rawArticles.scrapedAt))

  console.log(`Unclustered articles (last 48h): ${recent.length}`)
  if (recent.length < 2) return { created: 0, total: 0 }

  const idToRow = new Map(recent.map(r => [r.id, r]))

  const inputs: ArticleInput[] = recent.map(r => ({
    id:         r.id,
    title:      r.title,
    summary:    r.summary ?? '',
    sourceSlug: r.sourceSlug,
  }))

  const clusters = runClustering(inputs)
  const toProcess = clusters.slice(0, maxClustersPerRun)
  let created = 0

  for (const cluster of toProcess) {
    const artsForSynth: ArticleForSynthesis[] = cluster.articleIds
      .map(id => idToRow.get(id))
      .filter((x): x is NonNullable<typeof x> => x !== undefined)
      .map(r => ({
        sourceName: r.sourceName,
        sourceSlug: r.sourceSlug,
        title:      r.title,
        summary:    r.summary ?? '',
        url:        r.url,
      }))

    const synth = await synthesizeCluster(artsForSynth)
    if (!synth) {
      console.warn(`Synthesis failed for cluster of ${artsForSynth.length} articles`)
      continue
    }

    // Find an image: from cluster articles, or fetch og:image from first one
    let imageUrl: string | null = null
    for (const id of cluster.articleIds) {
      const r = idToRow.get(id)
      if (r?.imageUrl) { imageUrl = r.imageUrl; break }
    }
    // og:image fallback skipped — too slow for Vercel 10s limit

    const [nc] = await db.insert(newsClusters).values({
      title:        synth.title.slice(0, 500),
      synthesis:    synth.synthesis,
      keyFacts:     synth.keyFacts,
      category:     synth.category,
      publishedAt:  new Date(),
      sourceCount:  new Set(cluster.sourceSlugs).size,
      imageUrl,
    }).returning({ id: newsClusters.id })

    const saBySlug = Object.fromEntries(synth.sourceAnalyses.map(sa => [sa.sourceSlug, sa]))

    for (const artId of cluster.articleIds) {
      const r = idToRow.get(artId)
      if (!r) continue
      const sa = saBySlug[r.sourceSlug]
      await db.insert(clusterArticles).values({
        clusterId:          nc.id,
        articleId:          artId,
        coveragePercentage: sa?.coveragePercentage ?? 0,
        emphasis:           sa?.emphasis ?? '',
        omissions:          sa?.omissions ?? '',
        similarityScore:    cluster.similarityScores[artId] ?? 0,
      }).onConflictDoNothing()
      await db.update(rawArticles).set({ clustered: true }).where(eq(rawArticles.id, artId))
    }

    created++
  }

  console.log(`Created ${created} clusters (of ${clusters.length} candidates)`)
  return { created, total: clusters.length }
}

/* ── Combined runner used by the cron endpoint ───────────────────── */
export async function runScrapingPipeline(): Promise<{ scraped: number; clustersCreated: number }> {
  const scraped = await ingestNewArticles()
  const { created } = await clusterAndSynthesize(1)
  return { scraped, clustersCreated: created }
}
