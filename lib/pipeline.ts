/**
 * Pipeline split into three independent phases.
 *
 * Phase 1 — runIngest()
 *   Scrape all RSS feeds and persist new articles to the DB.
 *   Fast (~15 s). Always called first by the cron endpoint, which returns
 *   immediately after this phase completes.
 *
 * Phase 2 — runCluster(maxArticles)
 *   Pull unclustered articles, run multi-stage clustering, and persist the
 *   cluster records to the DB *without* synthesis (synthesis = null).
 *   Medium (~30 s). Triggered as a fire-and-forget HTTP call from the cron.
 *
 * Phase 3 — runSynthesize(maxClusters)
 *   Find clusters that have no synthesis yet, run Groq synthesis on them in
 *   a small bounded batch, and write the results back.
 *   Slow but bounded (~80 s for 10 clusters). Triggered by the cluster phase.
 *
 * This split keeps the cron endpoint's HTTP response time to ~15 s so
 * GitHub Actions and Vercel cron schedulers never time-out waiting for it.
 * Each phase runs in its own Vercel function invocation with its own budget.
 */

import { db, sources, rawArticles, newsClusters, clusterArticles } from './db'
import { eq, and, gte, inArray, isNull, isNotNull, ne, asc, desc } from 'drizzle-orm'
import { runAllScrapers } from './scrapers'
import {
  clusterArticlesWithAI,
  clusterArticles as clusterArticlesTFIDF,
  scoreClusterQuality,
  type ArticleInput,
} from './clustering'
import { synthesizeCluster, type ArticleForSynthesis } from './ai'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Minimum pause between consecutive Groq synthesis calls (30 RPM limit). */
const GROQ_CALL_DELAY_MS = 2_200

/** Expand the article window to 96 h if fewer than this many are available. */
const MIN_ARTICLES_FOR_CLUSTERING = 5

/**
 * Skip-if-recent threshold.
 * If the most-recent article in the DB is younger than this, runIngest() will
 * return early without hitting the RSS feeds.  Prevents duplicate work when
 * Vercel or GitHub Actions retries the cron within the same window.
 */
const SKIP_IF_SCRAPED_WITHIN_MS = 15 * 60 * 1_000   // 15 minutes

/**
 * Clusters whose scoreClusterQuality() falls below this value are deleted
 * by runCleanup().  Empirically: avg title-only TF-IDF cosine < 0.03 and no
 * shared named entity → the articles are not about the same event.
 */
const CLEANUP_QUALITY_THRESHOLD = 0.06

// ─── Source metadata ──────────────────────────────────────────────────────────

export const SOURCES_METADATA: Record<
  string,
  { name: string; url: string; color: string; ideologyScore: number; ideologyLabel: string }
> = {
  clarin:      { name: 'Clarín',             url: 'https://www.clarin.com',            color: '#004B87', ideologyScore:  0.3, ideologyLabel: 'Centro-derecha'   },
  lanacion:    { name: 'La Nación',           url: 'https://www.lanacion.com.ar',       color: '#1A3A5C', ideologyScore:  0.6, ideologyLabel: 'Centro-derecha'   },
  infobae:     { name: 'Infobae',             url: 'https://www.infobae.com',           color: '#E30613', ideologyScore:  0.2, ideologyLabel: 'Centro'           },
  pagina12:    { name: 'Página 12',           url: 'https://www.pagina12.com.ar',       color: '#1A1A1A', ideologyScore: -0.7, ideologyLabel: 'Izquierda'        },
  ambito:      { name: 'Ámbito',              url: 'https://www.ambito.com',            color: '#FF6B00', ideologyScore:  0.1, ideologyLabel: 'Centro'           },
  cronista:    { name: 'El Cronista',         url: 'https://www.cronista.com',          color: '#2C7BB6', ideologyScore:  0.2, ideologyLabel: 'Centro'           },
  perfil:      { name: 'Perfil',              url: 'https://www.perfil.com',            color: '#8B0000', ideologyScore: -0.1, ideologyLabel: 'Centro'           },
  laizquierda: { name: 'La Izquierda Diario', url: 'https://www.laizquierdadiario.com', color: '#CC0000', ideologyScore: -0.8, ideologyLabel: 'Izquierda'        },
  tn:          { name: 'TN',                  url: 'https://tn.com.ar',                 color: '#005BAC', ideologyScore:  0.2, ideologyLabel: 'Centro'           },
  eldestape:   { name: 'El Destape',          url: 'https://www.eldestapeweb.com',      color: '#e53e3e', ideologyScore: -0.5, ideologyLabel: 'Centro-izquierda' },
  mdzol:       { name: 'MDZ Online',          url: 'https://www.mdzol.com',             color: '#0077b6', ideologyScore:  0.0, ideologyLabel: 'Centro'           },
  minutouno:   { name: 'Minuto Uno',          url: 'https://www.minutouno.com',         color: '#e67e22', ideologyScore: -0.2, ideologyLabel: 'Centro'           },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms))
}

async function ensureSources(): Promise<Record<string, number>> {
  const existing = await db.select().from(sources)
  const bySlug: Record<string, number> = {}
  for (const s of existing) bySlug[s.slug] = s.id

  for (const [slug, meta] of Object.entries(SOURCES_METADATA)) {
    if (!bySlug[slug]) {
      const [inserted] = await db
        .insert(sources)
        .values({ slug, ...meta })
        .onConflictDoNothing()
        .returning({ id: sources.id })
      if (inserted) bySlug[slug] = inserted.id
    }
  }
  return bySlug
}

async function markProcessed(ids: number[]) {
  if (ids.length === 0) return
  await db.update(rawArticles).set({ clustered: true }).where(inArray(rawArticles.id, ids))
}

/**
 * Returns articles eligible for clustering within the given time window.
 *
 * "Eligible" means the article does NOT already appear in cluster_articles.
 * This catches both fresh (clustered=false) articles AND singletons from
 * previous runs that were marked clustered=true but never got a cluster entry.
 */
async function fetchClusterableArticles(cutoff: Date) {
  const inClusterRows = await db
    .select({ articleId: clusterArticles.articleId })
    .from(clusterArticles)
    .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
    .where(gte(rawArticles.scrapedAt, cutoff))

  const inClusterIds = new Set(inClusterRows.map(r => r.articleId))

  const allRecent = await db
    .select({
      id:       rawArticles.id,
      title:    rawArticles.title,
      summary:  rawArticles.summary,
      imageUrl: rawArticles.imageUrl,
      sourceId: rawArticles.sourceId,
    })
    .from(rawArticles)
    .where(gte(rawArticles.scrapedAt, cutoff))

  const toProcess = allRecent.filter(a => !inClusterIds.has(a.id))
  return { allRecent, toProcess, inClusterIds }
}

// ─── Phase 1: Ingest ──────────────────────────────────────────────────────────

/**
 * Scrape all RSS feeds and persist new articles.
 * Designed to complete in ≤ 20 s (12 feeds × 12 s timeout, parallel).
 *
 * Returns `skipped: true` (without hitting any RSS feed) when the most-recent
 * article in the DB is younger than SKIP_IF_SCRAPED_WITHIN_MS.  The caller
 * should treat a skipped run as a no-op and NOT fire subsequent pipeline phases.
 */
export async function runIngest(): Promise<{
  newArticles: number
  sourceCount: number
  skipped: boolean
}> {
  if (!process.env.DATABASE_URL) throw new Error('[ingest] DATABASE_URL is not set')

  // ── Skip-if-recent guard ───────────────────────────────────────────────────
  // Prevents duplicate work when Vercel / GitHub Actions retries or overlaps.
  const [latestScrape] = await db
    .select({ scrapedAt: rawArticles.scrapedAt })
    .from(rawArticles)
    .orderBy(desc(rawArticles.scrapedAt))
    .limit(1)

  if (latestScrape) {
    const ageMs  = Date.now() - latestScrape.scrapedAt.getTime()
    const ageMin = Math.round(ageMs / 60_000)
    if (ageMs < SKIP_IF_SCRAPED_WITHIN_MS) {
      console.log(`[ingest] Skipping — last scrape was ${ageMin} min ago (< 15 min threshold)`)
      return { newArticles: 0, sourceCount: 0, skipped: true }
    }
  }

  const sourceIds = await ensureSources()

  const scraperResults = await runAllScrapers()
  console.log(`[ingest] Scraped ${scraperResults.length} sources`)

  let newCount = 0
  for (const { slug, articles } of scraperResults) {
    const sourceId = sourceIds[slug]
    if (!sourceId) continue
    for (const art of articles) {
      try {
        await db
          .insert(rawArticles)
          .values({
            sourceId,
            title:       art.title,
            url:         art.url,
            summary:     art.summary,
            publishedAt: art.publishedAt,
            scrapedAt:   new Date(),
            imageUrl:    art.imageUrl || null,
            clustered:   false,
          })
          .onConflictDoNothing()
        newCount++
      } catch { /* duplicate URL — skip */ }
    }
  }

  console.log(`[ingest] Saved ${newCount} new articles`)
  return { newArticles: newCount, sourceCount: scraperResults.length, skipped: false }
}

// ─── Phase 2: Cluster ─────────────────────────────────────────────────────────

/**
 * Cluster up to `maxArticles` unclustered articles and persist the cluster
 * records WITHOUT synthesis (synthesis = null).
 *
 * Synthesis is intentionally deferred to Phase 3 so this phase can return
 * quickly. The provisional title is the top article's title; Phase 3 replaces
 * it with the AI-generated one.
 *
 * Designed to complete in ≤ 60 s (TF-IDF is instant; AI clustering adds
 * one Groq call per topic with 2.5 s spacing between topics).
 */
export async function runCluster(
  maxArticles = 80
): Promise<{ clustersCreated: number; singletons: number }> {
  if (!process.env.DATABASE_URL) throw new Error('[cluster] DATABASE_URL is not set')
  if (!process.env.GROQ_API_KEY)  throw new Error('[cluster] GROQ_API_KEY is not set')

  // Build source map
  const allSources = await db.select().from(sources)
  const sourceMap: Record<number, { slug: string; name: string }> = {}
  for (const s of allSources) sourceMap[s.id] = { slug: s.slug, name: s.name }

  // Fetch eligible articles (48 h window, expand to 96 h if thin)
  const WINDOW_48H = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const WINDOW_96H = new Date(Date.now() - 96 * 60 * 60 * 1000)

  let { toProcess: eligible } = await fetchClusterableArticles(WINDOW_48H)
  if (eligible.length < MIN_ARTICLES_FOR_CLUSTERING) {
    console.log(`[cluster] Thin content (${eligible.length} in 48 h) — expanding to 96 h`)
    ;({ toProcess: eligible } = await fetchClusterableArticles(WINDOW_96H))
  }

  // Cap to maxArticles for this run
  const batch = eligible.slice(0, maxArticles)
  console.log(`[cluster] Processing ${batch.length} articles (${eligible.length} eligible)`)

  if (batch.length < 2) {
    console.log('[cluster] Not enough articles — done')
    return { clustersCreated: 0, singletons: 0 }
  }

  const inputs: ArticleInput[] = batch
    .filter(a => sourceMap[a.sourceId])
    .map(a => ({
      id:         a.id,
      title:      a.title,
      summary:    a.summary || '',
      sourceSlug: sourceMap[a.sourceId].slug,
    }))

  // Multi-stage clustering (AI with TF-IDF fallback)
  let clusters = await clusterArticlesWithAI(inputs).catch(err => {
    console.warn('[cluster] AI clustering failed, falling back to TF-IDF:', err)
    return clusterArticlesTFIDF(inputs)
  })
  if (clusters.length === 0) {
    console.log('[cluster] AI produced 0 clusters — trying TF-IDF fallback')
    clusters = clusterArticlesTFIDF(inputs)
  }
  console.log(`[cluster] Found ${clusters.length} clusters`)

  // Mark singletons immediately so they don't queue-up forever
  const articlesInClusters = new Set(clusters.flatMap(c => c.articleIds))
  const singletonIds = inputs.filter(a => !articlesInClusters.has(a.id)).map(a => a.id)
  if (singletonIds.length > 0) {
    await markProcessed(singletonIds)
    console.log(`[cluster] Marked ${singletonIds.length} singletons as processed`)
  }

  // Persist clusters WITHOUT synthesis — Phase 3 will fill that in
  let created = 0
  for (const cluster of clusters) {
    const arts = batch.filter(a => cluster.articleIds.includes(a.id))
    if (arts.length < 2) continue

    const articleIds = arts.map(a => a.id)
    const imageUrl   = arts.find(a => a.imageUrl)?.imageUrl ?? null

    // Provisional title from the first article — replaced by AI in Phase 3
    const provisionalTitle = arts[0].title

    const [savedCluster] = await db
      .insert(newsClusters)
      .values({
        title:       provisionalTitle,
        synthesis:   null,           // ← filled by runSynthesize
        keyFacts:    null,
        category:    null,
        publishedAt: new Date(),
        sourceCount: new Set(cluster.sourceSlugs).size,
        imageUrl,
      })
      .returning()

    if (!savedCluster) {
      await markProcessed(articleIds)
      continue
    }

    // Link articles to cluster (no emphasis/omissions yet)
    for (const art of arts) {
      await db
        .insert(clusterArticles)
        .values({
          clusterId:          savedCluster.id,
          articleId:          art.id,
          coveragePercentage: 0,
          emphasis:           '',
          omissions:          '',
          similarityScore:    cluster.similarityScores[art.id] ?? 0,
        })
        .onConflictDoNothing()
    }

    await markProcessed(articleIds)
    created++
    console.log(
      `[cluster] ✓ Cluster ${created}: "${provisionalTitle.slice(0, 60)}" (${arts.length} articles)`
    )
  }

  console.log(`[cluster] Done — ${created} clusters created, ${singletonIds.length} singletons`)
  return { clustersCreated: created, singletons: singletonIds.length }
}

// ─── Phase 3: Synthesize ──────────────────────────────────────────────────────

/**
 * Synthesize up to `maxClusters` clusters that have synthesis = null.
 *
 * For each cluster, calls Groq to produce a neutral title, synthesis paragraph,
 * key facts, category, and per-source emphasis/omissions analysis. Updates the
 * cluster and its cluster_articles rows in place.
 *
 * If synthesis fails, the cluster record is DELETED (along with its
 * cluster_articles) so the constituent articles re-enter the eligible pool on
 * the next pipeline run rather than being silently buried.
 *
 * At 2.2 s between Groq calls: 10 clusters ≈ 80 s → fits in maxDuration=120.
 */
export async function runSynthesize(
  maxClusters = 10
): Promise<{ synthesized: number; failed: number }> {
  if (!process.env.DATABASE_URL) throw new Error('[synthesize] DATABASE_URL is not set')
  if (!process.env.GROQ_API_KEY)  throw new Error('[synthesize] GROQ_API_KEY is not set')

  // Pending clusters — synthesis = null, ordered oldest-first
  const pending = await db
    .select()
    .from(newsClusters)
    .where(isNull(newsClusters.synthesis))
    .limit(maxClusters)

  if (pending.length === 0) {
    console.log('[synthesize] No pending clusters — done')
    return { synthesized: 0, failed: 0 }
  }
  console.log(`[synthesize] Processing ${pending.length} pending clusters`)

  // Source map (id → { slug, name })
  const allSources = await db.select().from(sources)
  const sourceMap: Record<number, { slug: string; name: string }> = {}
  for (const s of allSources) sourceMap[s.id] = { slug: s.slug, name: s.name }

  let synthesized = 0
  let failed = 0

  for (let i = 0; i < pending.length; i++) {
    const cluster = pending[i]

    // Fetch this cluster's articles with their source info
    const articleRows = await db
      .select({
        ca:      clusterArticles,
        article: rawArticles,
        source:  sources,
      })
      .from(clusterArticles)
      .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .innerJoin(sources,     eq(sources.id,     rawArticles.sourceId))
      .where(eq(clusterArticles.clusterId, cluster.id))

    // Need at least 2 articles from different sources
    const distinctSources = new Set(articleRows.map(r => r.source.slug))
    if (articleRows.length < 2 || distinctSources.size < 2) {
      console.warn(`[synthesize] Cluster ${cluster.id} has <2 sources — deleting`)
      await db.delete(clusterArticles).where(eq(clusterArticles.clusterId, cluster.id))
      await db.delete(newsClusters).where(eq(newsClusters.id, cluster.id))
      failed++
      continue
    }

    const artsForSynthesis: ArticleForSynthesis[] = articleRows.map(r => ({
      sourceName: r.source.name,
      sourceSlug: r.source.slug,
      title:      r.article.title,
      summary:    r.article.summary || '',
      url:        r.article.url,
    }))

    // Throttle: pause before all calls except the first
    if (i > 0) await sleep(GROQ_CALL_DELAY_MS)

    const synthesis = await synthesizeCluster(artsForSynthesis)

    if (!synthesis) {
      console.warn(
        `[synthesize] Synthesis failed for cluster ${cluster.id} — deleting for retry`
      )
      // Delete cluster + its links so articles re-enter the eligible pool
      await db.delete(clusterArticles).where(eq(clusterArticles.clusterId, cluster.id))
      await db.delete(newsClusters).where(eq(newsClusters.id, cluster.id))
      failed++
      continue
    }

    // Update cluster with AI-generated content
    await db
      .update(newsClusters)
      .set({
        title:     synthesis.title,
        synthesis: synthesis.synthesis,
        keyFacts:  synthesis.keyFacts,
        category:  synthesis.category,
      })
      .where(eq(newsClusters.id, cluster.id))

    // Update per-source analysis in cluster_articles
    const saBySlug: Record<string, (typeof synthesis.sourceAnalyses)[0]> = {}
    for (const sa of synthesis.sourceAnalyses) saBySlug[sa.sourceSlug] = sa

    for (const { ca, source } of articleRows) {
      const sa = saBySlug[source.slug]
      if (!sa) continue
      await db
        .update(clusterArticles)
        .set({
          coveragePercentage: sa.coveragePercentage,
          emphasis:           sa.emphasis,
          omissions:          sa.omissions,
        })
        .where(
          and(
            eq(clusterArticles.clusterId, cluster.id),
            eq(clusterArticles.articleId, ca.articleId)
          )
        )
    }

    synthesized++
    console.log(
      `[synthesize] ✓ Cluster ${cluster.id}: "${synthesis.title.slice(0, 60)}" (${articleRows.length} articles)`
    )
  }

  console.log(`[synthesize] Done — ${synthesized} synthesized, ${failed} deleted/failed`)
  return { synthesized, failed }
}

// ─── Phase 4: Cleanup ─────────────────────────────────────────────────────────

/**
 * Score and delete low-quality clusters from the visible corpus.
 *
 * Works through up to `maxClusters` published clusters (synthesis IS NOT NULL),
 * ordered oldest-first, and deletes any whose scoreClusterQuality() is below
 * CLEANUP_QUALITY_THRESHOLD (0.06).
 *
 * Clusters with source_count ≥ 3 are skipped — three or more outlets covering
 * the same story is a strong editorial quality signal that the merge was valid.
 *
 * Designed to complete in ≤ 90 s (100 clusters × 1 DB round trip each).
 * Deleting a cluster also removes its cluster_articles rows; the constituent
 * rawArticles are left in place (no cluster_articles link means they become
 * eligible for re-clustering on the next pipeline run).
 */
export async function runCleanup(
  maxClusters = 100
): Promise<{ deleted: number; checked: number }> {
  if (!process.env.DATABASE_URL) throw new Error('[cleanup] DATABASE_URL is not set')

  // Candidates: published clusters, oldest first (pre-improvement clusters
  // are more likely to be bad), limited to keep the call bounded.
  const candidates = await db
    .select()
    .from(newsClusters)
    .where(
      and(
        isNotNull(newsClusters.synthesis),
        ne(newsClusters.synthesis, '')
      )
    )
    .orderBy(asc(newsClusters.publishedAt))
    .limit(maxClusters)

  if (candidates.length === 0) {
    console.log('[cleanup] No published clusters found')
    return { deleted: 0, checked: 0 }
  }
  console.log(`[cleanup] Checking ${candidates.length} clusters...`)

  let checked = 0
  let deleted = 0

  for (const cluster of candidates) {
    checked++

    // High source_count is a strong validity signal — skip to avoid false positives
    if ((cluster.sourceCount ?? 0) >= 3) continue

    // Fetch this cluster's articles for quality scoring
    const articleRows = await db
      .select({ article: rawArticles })
      .from(clusterArticles)
      .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .where(eq(clusterArticles.clusterId, cluster.id))

    // A cluster with fewer than 2 articles is definitionally invalid
    if (articleRows.length < 2) {
      await db.delete(clusterArticles).where(eq(clusterArticles.clusterId, cluster.id))
      await db.delete(newsClusters).where(eq(newsClusters.id, cluster.id))
      deleted++
      console.log(
        `[cleanup] ✗ Deleted near-empty cluster ${cluster.id} ` +
        `"${(cluster.title ?? '').slice(0, 60)}" (${articleRows.length} articles)`
      )
      continue
    }

    const inputs: ArticleInput[] = articleRows.map(r => ({
      id:         r.article.id,
      title:      r.article.title,
      summary:    r.article.summary || '',
      sourceSlug: '',
    }))

    const score = scoreClusterQuality(inputs)

    if (score < CLEANUP_QUALITY_THRESHOLD) {
      await db.delete(clusterArticles).where(eq(clusterArticles.clusterId, cluster.id))
      await db.delete(newsClusters).where(eq(newsClusters.id, cluster.id))
      deleted++
      console.log(
        `[cleanup] ✗ Deleted cluster ${cluster.id} score=${score.toFixed(3)} ` +
        `"${(cluster.title ?? '').slice(0, 60)}"`
      )
    }
  }

  console.log(`[cleanup] Done — ${deleted} deleted out of ${checked} checked`)
  return { deleted, checked }
}

// ─── Legacy wrapper (manual triggers / dev) ───────────────────────────────────

/**
 * Run the full pipeline sequentially in one call.
 * Used for manual admin triggers. NOT used by the cron endpoint.
 */
export async function runPipeline() {
  console.log('[pipeline] Starting full run...')
  const ingest   = await runIngest()
  const cluster  = await runCluster(80)
  const synth    = await runSynthesize(50)
  const cleanup  = await runCleanup(100)
  console.log('[pipeline] Complete', { ingest, cluster, synth, cleanup })
}
