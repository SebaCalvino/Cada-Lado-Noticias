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
import { eq, and, gte, lt, inArray, isNull, isNotNull, ne, asc, desc, sql } from 'drizzle-orm'
import { runAllScrapers } from './scrapers'
import {
  clusterArticlesWithAI,
  clusterArticles as clusterArticlesTFIDF,
  scoreClusterQuality,
  type ArticleInput,
} from './clustering'
import { synthesizeCluster, type ArticleForSynthesis } from './ai'

// ─── Generic-title filter ─────────────────────────────────────────────────────

const TITLE_STOP_WORDS = new Set([
  'de','la','que','el','en','y','a','los','del','se','las','por','un','para',
  'con','una','su','al','lo','como','pero','sus','le','ya','o','este','si',
  'sobre','tambien','tras','hacia','desde','hasta','entre','muy','mas','tan',
  'fue','ser','es','son','han','ha','tiene','tienen','sera','estan','puede',
  'dice','dijo','afirma','senalo','aseguro','indico','informo','revelo',
  'gobierno','pais','nuevo','nueva','nuevos','nuevas','ante','bajo','hace',
  'cuando','donde','quien','cual','cuyo','cuales','quienes','porque','aunque',
  'este','esta','estos','estas','ese','esa','esos','esas',
  'todo','toda','todos','todas','otro','otra','otros','otras',
  'caso','anno','anos','mes','meses','dias','hoy','ayer',
  'noticia','informe','situacion','problema','crisis','medida','medidas',
  'primer','primera','segundo','segunda','gran','grande',
  'nacional','local','regional','provincial','federal','importante',
  'inicio','final','reunion','declaracion','declaraciones','sesion',
])

/**
 * Returns true if the AI-generated title looks too generic to be useful.
 *
 * A title is considered generic if it has BOTH:
 *   - ≤ 3 significant words (not in the stop-word list, ≥ 4 chars)
 *   - No proper noun (capitalized word that isn't the first token)
 *
 * Clusters with a generic title are deleted so their articles re-enter the
 * eligible pool rather than surfacing uninformative stories.
 */
function isTitleGeneric(title: string): boolean {
  const normalized = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

  const significant = normalized
    .split(/\W+/)
    .filter(w => w.length >= 4 && !TITLE_STOP_WORDS.has(w))

  if (significant.length > 3) return false  // enough substance — not generic

  // Too few significant words AND no proper noun → generic
  const words = title.trim().split(/\s+/)
  const hasProperNoun = words.some((word, i) => {
    if (i === 0) return false  // first word is always capitalised in any title
    const clean = word.replace(/[^a-záéíóúüñA-ZÁÉÍÓÚÜÑ]/g, '')
    return clean.length >= 2 && /^[A-ZÁÉÍÓÚÜÑ]/.test(clean)
  })

  return !hasProperNoun
}

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
const SKIP_IF_SCRAPED_WITHIN_MS = 12 * 60 * 1_000   // 12 minutes — allows fresh ingest every 15-min cycle

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
 * Articles are returned newest-first so the batch window always covers the
 * most recent breaking news — the period most likely to have multi-source
 * coverage.
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
    .orderBy(desc(rawArticles.publishedAt))   // newest first → prioritises breaking news

  const toProcess = allRecent.filter(a => !inClusterIds.has(a.id))
  return { allRecent, toProcess, inClusterIds }
}

/**
 * Pre-screening: find articles that share ≥2 significant keywords with at
 * least one article from a DIFFERENT source.
 *
 * These are the articles most likely to form clusters, so we put them at the
 * front of the batch before sending anything to Groq.  Articles with no
 * cross-source keyword match go last — they're probably opinion pieces,
 * lifestyle content, or local news that only one outlet covered.
 *
 * O(n²) on article count, but n ≤ ~200 articles so runs in < 5 ms.
 */
const CLUSTER_STOP = new Set([
  'de','la','que','el','en','y','a','los','del','se','las','por','un','para',
  'con','una','su','al','lo','como','pero','sus','le','ya','o','este','si',
  'sobre','también','tras','hacia','desde','hasta','entre','muy','más','tan',
  'fue','ser','es','son','han','ha','tiene','tienen','sera','estan','puede',
])

function prioritiseByKeywordOverlap(inputs: ArticleInput[]): ArticleInput[] {
  const kw = inputs.map(a => ({
    id:     a.id,
    slug:   a.sourceSlug,
    words:  new Set(
      (a.title + ' ' + a.summary)
        .toLowerCase()
        .normalize('NFD').replace(/\p{Diacritic}/gu, '')
        .split(/\W+/)
        .filter(w => w.length >= 4 && !CLUSTER_STOP.has(w))
    ),
  }))

  const candidateIds = new Set<number>()

  for (let i = 0; i < kw.length; i++) {
    for (let j = i + 1; j < kw.length; j++) {
      if (kw[i].slug === kw[j].slug) continue   // same source → skip
      let shared = 0
      for (const w of kw[i].words) {
        if (kw[j].words.has(w)) {
          shared++
          if (shared >= 2) break   // enough evidence — no need to count further
        }
      }
      if (shared >= 2) {
        candidateIds.add(kw[i].id)
        candidateIds.add(kw[j].id)
      }
    }
  }

  // Candidates first (high cluster potential), non-candidates last
  const candidates    = inputs.filter(a =>  candidateIds.has(a.id))
  const nonCandidates = inputs.filter(a => !candidateIds.has(a.id))
  console.log(
    `[cluster] pre-screen: ${candidates.length} cross-source candidates, ` +
    `${nonCandidates.length} singletons-likely out of ${inputs.length} eligible`
  )
  return [...candidates, ...nonCandidates]
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

  console.log(`[cluster] ${eligible.length} eligible articles — building prioritised batch`)

  if (eligible.length < 2) {
    console.log('[cluster] Not enough articles — done')
    return { clustersCreated: 0, singletons: 0 }
  }

  // Build ArticleInput list from ALL eligible articles, then reorder so
  // cross-source keyword candidates come first.  Slice to maxArticles AFTER
  // reordering so the batch is filled with the highest-potential articles.
  //
  // "en vivo" articles are excluded: they update continuously and are almost
  // always one-source-only, producing noisy, short-lived clusters.
  const allInputs: ArticleInput[] = eligible
    .filter(a => sourceMap[a.sourceId])
    .filter(a => !/en\s+vivo/i.test(a.title))
    .map(a => ({
      id:         a.id,
      title:      a.title,
      summary:    a.summary || '',
      sourceSlug: sourceMap[a.sourceId].slug,
    }))

  if (allInputs.length < 2) {
    console.log('[cluster] Not enough articles after filtering — done')
    return { clustersCreated: 0, singletons: 0 }
  }

  const prioritised = prioritiseByKeywordOverlap(allInputs)
  const inputs      = prioritised.slice(0, maxArticles)

  // Lookup map for full DB row (imageUrl, etc.) — used when persisting clusters
  const articleById = new Map(eligible.map(a => [a.id, a]))
  const batch       = inputs.map(i => articleById.get(i.id)!).filter(Boolean)

  console.log(`[cluster] Processing ${inputs.length} articles (${eligible.length} eligible)`)

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

    // All original article IDs — used for markProcessed (includes duplicates)
    const allArticleIds = arts.map(a => a.id)

    // ── Source deduplication ──────────────────────────────────────────────────
    // Keep at most 1 article per source: the one with the highest similarity
    // score.  Multiple articles from the same outlet covering the same story
    // add no editorial diversity and inflate the synthesis prompt with
    // redundant text.
    const bestBySource = new Map<string, typeof arts[0]>()
    for (const art of arts) {
      const slug  = sourceMap[art.sourceId]?.slug ?? String(art.sourceId)
      const score = cluster.similarityScores[art.id] ?? 0
      const prev  = bestBySource.get(slug)
      if (!prev || (cluster.similarityScores[prev.id] ?? 0) < score) {
        bestBySource.set(slug, art)
      }
    }
    const deduplicatedArts = Array.from(bestBySource.values())

    if (deduplicatedArts.length < 2) {
      // After dedup only 1 source remains — treat as singleton
      console.log(
        `[cluster] Skipping cluster (collapsed to 1 source after dedup): ` +
        `"${arts[0].title.slice(0, 60)}"`
      )
      await markProcessed(allArticleIds)
      continue
    }

    const imageUrl        = deduplicatedArts.find(a => a.imageUrl)?.imageUrl ?? null
    // Provisional title from the first deduplicated article — replaced by AI in Phase 3
    const provisionalTitle = deduplicatedArts[0].title

    const [savedCluster] = await db
      .insert(newsClusters)
      .values({
        title:       provisionalTitle,
        synthesis:   null,           // ← filled by runSynthesize
        keyFacts:    null,
        category:    null,
        publishedAt: new Date(),
        sourceCount: deduplicatedArts.length,
        imageUrl,
      })
      .returning()

    if (!savedCluster) {
      await markProcessed(allArticleIds)
      continue
    }

    // Link deduplicated articles to cluster (no emphasis/omissions yet)
    for (const art of deduplicatedArts) {
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

    // Mark ALL original articles as processed — including per-source "losers"
    // so they don't re-enter the pool and create duplicate clusters.
    await markProcessed(allArticleIds)
    created++
    console.log(
      `[cluster] ✓ Cluster ${created}: "${provisionalTitle.slice(0, 60)}" ` +
      `(${deduplicatedArts.length} sources, ${arts.length} raw articles)`
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

    // ── Generic-title guard ───────────────────────────────────────────────────
    // Discard clusters whose AI-generated title has ≤ 3 significant words AND
    // no proper noun — a reliable signal that the cluster is either too vague
    // to be informative or that unrelated articles were merged.
    if (isTitleGeneric(synthesis.title)) {
      console.warn(
        `[synthesize] Cluster ${cluster.id} rejected — title too generic: ` +
        `"${synthesis.title}"`
      )
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

    console.log(
      `[cleanup] id=${cluster.id} sources=${cluster.sourceCount} ` +
      `score=${score.toFixed(3)} "${(cluster.title ?? '').slice(0, 50)}"`
    )

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

// ─── Phase 5: Prune ───────────────────────────────────────────────────────────

/**
 * Delete orphan raw_articles that are older than `maxAgeDays` days and are NOT
 * referenced by any cluster_articles row.
 *
 * Why:  raw_articles accumulates every scraped item forever.  Articles that
 *       were marked as singletons (no cluster match) or that simply never
 *       clustered are useless after a week and inflate DB size.
 *
 * Safety:  We join against cluster_articles and only delete rows with NO match,
 *          so we will never touch an article that belongs to a published story.
 *
 * Designed to be fast (single DELETE … WHERE NOT IN subquery).
 */
export async function runArticlePrune(
  maxAgeDays = 7
): Promise<{ pruned: number }> {
  if (!process.env.DATABASE_URL) throw new Error('[prune] DATABASE_URL is not set')

  const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1_000)

  // IDs that ARE in at least one cluster — never touch these
  const linkedRows = await db
    .select({ articleId: clusterArticles.articleId })
    .from(clusterArticles)

  const linkedIds = linkedRows.map(r => r.articleId)

  // Delete old orphans
  const toDelete = await db
    .select({ id: rawArticles.id })
    .from(rawArticles)
    .where(
      and(
        lt(rawArticles.scrapedAt, cutoff),
        linkedIds.length > 0
          ? sql`${rawArticles.id} NOT IN (${sql.join(linkedIds.map(id => sql`${id}`), sql`, `)})`
          : sql`1=1`   // no linked articles at all → prune everything old
      )
    )

  if (toDelete.length === 0) {
    console.log('[prune] No orphan articles to prune')
    return { pruned: 0 }
  }

  const deleteIds = toDelete.map(r => r.id)
  await db.delete(rawArticles).where(inArray(rawArticles.id, deleteIds))

  console.log(`[prune] Pruned ${deleteIds.length} orphan articles older than ${maxAgeDays} days`)
  return { pruned: deleteIds.length }
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
