import { db, sources, rawArticles, newsClusters, clusterArticles, clusterComments } from './db'
import { eq, and, gte, isNull, inArray, not } from 'drizzle-orm'
import { runAllScrapers } from './scrapers'
import { clusterArticles as clusterArticlesFn, type ArticleInput } from './clustering'
import { synthesizeCluster, classifyComments, type ArticleForSynthesis } from './ai'

export const SOURCES_METADATA: Record<
  string,
  { name: string; url: string; color: string; ideologyScore: number; ideologyLabel: string }
> = {
  clarin:      { name: 'Clarín',             url: 'https://www.clarin.com',            color: '#004B87', ideologyScore:  0.3, ideologyLabel: 'Centro-derecha' },
  lanacion:    { name: 'La Nación',           url: 'https://www.lanacion.com.ar',       color: '#1A3A5C', ideologyScore:  0.6, ideologyLabel: 'Centro-derecha' },
  infobae:     { name: 'Infobae',             url: 'https://www.infobae.com',           color: '#E30613', ideologyScore:  0.2, ideologyLabel: 'Centro'         },
  pagina12:    { name: 'Página 12',           url: 'https://www.pagina12.com.ar',       color: '#1A1A1A', ideologyScore: -0.7, ideologyLabel: 'Izquierda'      },
  ambito:      { name: 'Ámbito',              url: 'https://www.ambito.com',            color: '#FF6B00', ideologyScore:  0.1, ideologyLabel: 'Centro'         },
  cronista:    { name: 'El Cronista',         url: 'https://www.cronista.com',          color: '#2C7BB6', ideologyScore:  0.2, ideologyLabel: 'Centro'         },
  perfil:      { name: 'Perfil',              url: 'https://www.perfil.com',            color: '#8B0000', ideologyScore: -0.1, ideologyLabel: 'Centro'         },
  laizquierda: { name: 'La Izquierda Diario', url: 'https://www.laizquierdadiario.com', color: '#CC0000', ideologyScore: -0.8, ideologyLabel: 'Izquierda'      },
  tn:          { name: 'TN',                  url: 'https://tn.com.ar',                 color: '#005BAC', ideologyScore:  0.2, ideologyLabel: 'Centro'         },
  eldestape:   { name: 'El Destape',          url: 'https://www.eldestapeweb.com',      color: '#e53e3e', ideologyScore: -0.5, ideologyLabel: 'Centro-izquierda'},
  mdzol:       { name: 'MDZ Online',          url: 'https://www.mdzol.com',             color: '#0077b6', ideologyScore:  0.0, ideologyLabel: 'Centro'         },
  minutouno:   { name: 'Minuto Uno',          url: 'https://www.minutouno.com',         color: '#e67e22', ideologyScore: -0.2, ideologyLabel: 'Centro'         },
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

export async function runPipeline() {
  console.log('[pipeline] Starting...')

  // 1. Ensure sources exist
  const sourceIds = await ensureSources()
  console.log('[pipeline] Sources ensured:', Object.keys(sourceIds).length)

  // 2. Scrape all RSS feeds
  const scraperResults = await runAllScrapers()
  console.log('[pipeline] Scraped', scraperResults.length, 'sources')

  // 3. Save new articles (dedup by URL)
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
            title: art.title,
            url: art.url,
            summary: art.summary,
            publishedAt: art.publishedAt,
            scrapedAt: new Date(),
            imageUrl: art.imageUrl || null,
            clustered: false,
          })
          .onConflictDoNothing()
        newCount++
      } catch {
        // duplicate URL — skip
      }
    }
  }
  console.log('[pipeline] Saved', newCount, 'new articles')

  // 4. Find unclustered articles from last 48h
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const recentArticles = await db
    .select({
      id: rawArticles.id,
      title: rawArticles.title,
      summary: rawArticles.summary,
      imageUrl: rawArticles.imageUrl,
      sourceId: rawArticles.sourceId,
    })
    .from(rawArticles)
    .where(and(gte(rawArticles.scrapedAt, cutoff), eq(rawArticles.clustered, false)))

  console.log('[pipeline] Unclustered articles:', recentArticles.length)
  if (recentArticles.length < 2) {
    console.log('[pipeline] Not enough articles to cluster')
    return
  }

  // Resolve source slugs
  const allSources = await db.select().from(sources)
  const sourceMap: Record<number, { slug: string; name: string }> = {}
  for (const s of allSources) sourceMap[s.id] = { slug: s.slug, name: s.name }

  const inputs: ArticleInput[] = recentArticles
    .filter((a) => sourceMap[a.sourceId])
    .map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary || '',
      sourceSlug: sourceMap[a.sourceId].slug,
    }))

  // 5. Run TF-IDF clustering
  const clusters = clusterArticlesFn(inputs)
  console.log('[pipeline] Found', clusters.length, 'clusters')

  // 6. For each cluster, synthesize and save
  for (const cluster of clusters) {
    const arts = recentArticles.filter((a) => cluster.articleIds.includes(a.id))

    const artsForSynthesis: ArticleForSynthesis[] = arts
      .filter((a) => sourceMap[a.sourceId])
      .map((a) => ({
        sourceName: sourceMap[a.sourceId].name,
        sourceSlug: sourceMap[a.sourceId].slug,
        title: a.title,
        summary: a.summary || '',
        url: '',
      }))

    // Rate limit: Groq free tier ~6k TPM, each synthesis ~3k tokens → wait 30s between calls
    await new Promise((r) => setTimeout(r, 30_000))
    const synthesis = await synthesizeCluster(artsForSynthesis)
    if (!synthesis) continue

    const imageUrl =
      arts.find((a) => a.imageUrl)?.imageUrl || null

    // Save cluster
    const [savedCluster] = await db
      .insert(newsClusters)
      .values({
        title: synthesis.title,
        synthesis: synthesis.synthesis,
        keyFacts: synthesis.keyFacts,
        category: synthesis.category,
        publishedAt: new Date(),
        sourceCount: new Set(cluster.sourceSlugs).size,
        imageUrl,
      })
      .returning()

    if (!savedCluster) continue

    // Save cluster_articles
    const saBySlug: Record<string, (typeof synthesis.sourceAnalyses)[0]> = {}
    for (const sa of synthesis.sourceAnalyses) saBySlug[sa.sourceSlug] = sa

    for (const art of arts) {
      const slug = sourceMap[art.sourceId]?.slug
      const sa = slug ? saBySlug[slug] : undefined

      await db.insert(clusterArticles).values({
        clusterId: savedCluster.id,
        articleId: art.id,
        coveragePercentage: sa?.coveragePercentage ?? 0,
        emphasis: sa?.emphasis ?? '',
        omissions: sa?.omissions ?? '',
        similarityScore: cluster.similarityScores[art.id] ?? 0,
      }).onConflictDoNothing()

      // Mark article as clustered
      await db
        .update(rawArticles)
        .set({ clustered: true })
        .where(eq(rawArticles.id, art.id))
    }

    console.log(`[pipeline] Created cluster "${synthesis.title}" with ${arts.length} articles`)
  }

  console.log('[pipeline] Complete')
}
