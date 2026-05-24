import { db, sources, rawArticles, newsClusters, clusterArticles } from './db'
import { eq, and, gte, inArray } from 'drizzle-orm'
import { runAllScrapers } from './scrapers'
import { clusterArticles as clusterArticlesFn, type ArticleInput } from './clustering'
import { synthesizeCluster, type ArticleForSynthesis } from './ai'

// Max clusters sintetizados por corrida — previene timeout y rate-limit de Groq.
// Con el cron cada 1h se procesan hasta 15 clusters/h, más que suficiente.
const MAX_CLUSTERS_PER_RUN = 15

// Pausa entre llamadas a Groq — evita hit del límite de 30 RPM.
const GROQ_CALL_DELAY_MS = 2200

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

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms))
}

/** Marca artículos como procesados en lote para limpiar el queue. */
async function markProcessed(ids: number[]) {
  if (ids.length === 0) return
  await db.update(rawArticles).set({ clustered: true }).where(inArray(rawArticles.id, ids))
}

export async function runPipeline() {
  console.log('[pipeline] Starting...')

  // Fail-fast si faltan env vars críticas
  if (!process.env.DATABASE_URL) throw new Error('[pipeline] DATABASE_URL no está configurada')
  if (!process.env.GROQ_API_KEY)  throw new Error('[pipeline] GROQ_API_KEY no está configurada')

  // 1. Asegurar que existan las fuentes
  const sourceIds = await ensureSources()
  console.log('[pipeline] Sources ensured:', Object.keys(sourceIds).length)

  // 2. Scraping RSS de todos los medios
  const scraperResults = await runAllScrapers()
  console.log('[pipeline] Scraped', scraperResults.length, 'sources')

  // 3. Guardar artículos nuevos (dedup por URL)
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
      } catch { /* URL duplicada — ignorar */ }
    }
  }
  console.log('[pipeline] Saved', newCount, 'new articles')

  // 4. Artículos sin clusterizar de las últimas 48h
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000)
  const recentArticles = await db
    .select({
      id:       rawArticles.id,
      title:    rawArticles.title,
      summary:  rawArticles.summary,
      imageUrl: rawArticles.imageUrl,
      sourceId: rawArticles.sourceId,
    })
    .from(rawArticles)
    .where(and(gte(rawArticles.scrapedAt, cutoff), eq(rawArticles.clustered, false)))

  console.log('[pipeline] Unclustered articles to process:', recentArticles.length)
  if (recentArticles.length < 2) {
    console.log('[pipeline] Not enough articles to cluster, done.')
    return
  }

  // Mapa sourceId → { slug, name }
  const allSources = await db.select().from(sources)
  const sourceMap: Record<number, { slug: string; name: string }> = {}
  for (const s of allSources) sourceMap[s.id] = { slug: s.slug, name: s.name }

  const inputs: ArticleInput[] = recentArticles
    .filter(a => sourceMap[a.sourceId])
    .map(a => ({
      id:         a.id,
      title:      a.title,
      summary:    a.summary || '',
      sourceSlug: sourceMap[a.sourceId].slug,
    }))

  // 5. Clustering TF-IDF
  const clusters = clusterArticlesFn(inputs)
  console.log('[pipeline] Found', clusters.length, 'clusters')

  // ── Marcar singletons como procesados de inmediato ──────────────────────
  // Artículos que no coincidieron con ningún otro no van a aparecer en
  // ningún cluster. Marcarlos ahora libera el queue y evita que se
  // re-intenten en cada corrida.
  const articlesInClusters = new Set(clusters.flatMap(c => c.articleIds))
  const singletonIds = inputs.filter(a => !articlesInClusters.has(a.id)).map(a => a.id)
  if (singletonIds.length > 0) {
    await markProcessed(singletonIds)
    console.log(`[pipeline] Marked ${singletonIds.length} singleton articles as processed`)
  }

  // Limitar a MAX_CLUSTERS_PER_RUN para no exceder el timeout ni el rate-limit
  const toProcess = clusters.slice(0, MAX_CLUSTERS_PER_RUN)
  if (clusters.length > MAX_CLUSTERS_PER_RUN) {
    console.log(`[pipeline] Processing ${MAX_CLUSTERS_PER_RUN}/${clusters.length} clusters this run, rest next hour`)
  }

  // 6. Sintetizar y guardar cada cluster
  let saved = 0
  for (let i = 0; i < toProcess.length; i++) {
    const cluster = toProcess[i]
    const arts = recentArticles.filter(a => cluster.articleIds.includes(a.id))
    const articleIds = arts.map(a => a.id)

    const artsForSynthesis: ArticleForSynthesis[] = arts
      .filter(a => sourceMap[a.sourceId])
      .map(a => ({
        sourceName: sourceMap[a.sourceId].name,
        sourceSlug: sourceMap[a.sourceId].slug,
        title:      a.title,
        summary:    a.summary || '',
        url:        '',
      }))

    // Pausa antes de cada llamada a Groq (excepto la primera) para evitar 429
    if (i > 0) await sleep(GROQ_CALL_DELAY_MS)

    const synthesis = await synthesizeCluster(artsForSynthesis)

    if (!synthesis) {
      // Síntesis falló: marcar igualmente como procesados para no re-intentar
      console.warn(`[pipeline] Synthesis failed for cluster ${i + 1}/${toProcess.length} (${artsForSynthesis.map(a => a.sourceSlug).join(', ')}) — marking as processed`)
      await markProcessed(articleIds)
      continue
    }

    const imageUrl = arts.find(a => a.imageUrl)?.imageUrl ?? null

    // Guardar cluster
    const [savedCluster] = await db
      .insert(newsClusters)
      .values({
        title:       synthesis.title,
        synthesis:   synthesis.synthesis,
        keyFacts:    synthesis.keyFacts,
        category:    synthesis.category,
        publishedAt: new Date(),
        sourceCount: new Set(cluster.sourceSlugs).size,
        imageUrl,
      })
      .returning()

    if (!savedCluster) {
      await markProcessed(articleIds)
      continue
    }

    // Guardar cluster_articles y marcar artículos como procesados
    const saBySlug: Record<string, (typeof synthesis.sourceAnalyses)[0]> = {}
    for (const sa of synthesis.sourceAnalyses) saBySlug[sa.sourceSlug] = sa

    for (const art of arts) {
      const slug = sourceMap[art.sourceId]?.slug
      const sa   = slug ? saBySlug[slug] : undefined
      await db.insert(clusterArticles).values({
        clusterId:           savedCluster.id,
        articleId:           art.id,
        coveragePercentage:  sa?.coveragePercentage ?? 0,
        emphasis:            sa?.emphasis ?? '',
        omissions:           sa?.omissions ?? '',
        similarityScore:     cluster.similarityScores[art.id] ?? 0,
      }).onConflictDoNothing()
    }

    await markProcessed(articleIds)
    saved++
    console.log(`[pipeline] ✓ Cluster ${i + 1}/${toProcess.length}: "${synthesis.title}" (${arts.length} articles)`)
  }

  console.log(`[pipeline] Complete — ${saved}/${toProcess.length} clusters saved`)
}
