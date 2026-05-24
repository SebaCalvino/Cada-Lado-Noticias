// Clustering híbrido: TF-IDF cosine similarity + agrupación semántica vía Groq
// El TF-IDF solo falla en noticias argentinas porque cada medio usa vocabulario
// completamente distinto para el mismo hecho ("dólar sube" vs "tipo de cambio escala").
// La solución: umbral muy bajo (0.05) para capturar solapamiento parcial, más
// un paso de agrupación por Groq que entiende sinónimos y contexto semántico.

export interface ArticleInput {
  id: number
  title: string
  summary: string
  sourceSlug: string
}

export interface ClusterResult {
  articleIds: number[]
  sourceSlugs: string[]
  similarityScores: Record<number, number>
}

const STOP_WORDS = new Set([
  'de','la','que','el','en','y','a','los','del','se','las','por','un','para',
  'con','una','su','al','lo','como','más','pero','sus','le','ya','o','este',
  'sí','porque','esta','entre','cuando','muy','sin','sobre','también','me',
  'hasta','hay','donde','quien','desde','todo','nos','durante','todos','uno',
  'les','ni','contra','otros','ese','eso','ante','ellos','e','esto','antes',
  'algunos','qué','unos','yo','otro','otras','otra','él','tanto','esa',
  'estos','mucho','quienes','nada','muchos','cual','poco','ella','estar',
  'estas','alguno','alguna','aunque','siempre','fue','ser','es','son','han',
  'ha','tiene','tienen','había','será','están','puede','pueden','debe',
  'deben','tras','hacia','según','mediante','sido','sido','ser',
  'argentina','argentino','argentinos','años','año',
])

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/\p{Diacritic}/gu, '') // quita acentos para mejor match
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

function computeTFIDF(docs: string[][]): Map<string, number>[] {
  const N = docs.length
  const df = new Map<string, number>()
  for (const doc of docs) {
    for (const term of new Set(doc)) df.set(term, (df.get(term) || 0) + 1)
  }
  return docs.map(doc => {
    const tf = new Map<string, number>()
    for (const term of doc) tf.set(term, (tf.get(term) || 0) + 1)
    const tfidf = new Map<string, number>()
    for (const [term, count] of tf) {
      const idf = Math.log((N + 1) / ((df.get(term) || 0) + 1))
      tfidf.set(term, (count / doc.length) * idf)
    }
    return tfidf
  })
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  for (const [term, val] of a) {
    dot   += val * (b.get(term) || 0)
    normA += val * val
  }
  for (const [, val] of b) normB += val * val
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * Clustering basado en TF-IDF con umbral bajo (0.05).
 * Alcanza para noticias con algún vocabulario en común.
 * Para noticias con vocabulario completamente distinto, se usa
 * clusterArticlesWithAI() en el pipeline.
 */
export function clusterArticles(
  articles: ArticleInput[],
  threshold = 0.05   // Bajo: captura más solapamiento parcial
): ClusterResult[] {
  if (articles.length < 2) return []

  const docs    = articles.map(a => tokenize(`${a.title} ${a.title} ${a.summary}`)) // título x2 para darle más peso
  const vectors = computeTFIDF(docs)
  const n       = articles.length
  const parent  = Array.from({ length: n }, (_, i) => i)
  const scores: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  function find(i: number): number {
    while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i] }
    return i
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (articles[i].sourceSlug === articles[j].sourceSlug) continue
      const sim = cosineSimilarity(vectors[i], vectors[j])
      scores[i][j] = scores[j][i] = sim
      if (sim >= threshold) {
        const pi = find(i), pj = find(j)
        if (pi !== pj) parent[pi] = pj
      }
    }
  }

  const groups = new Map<number, number[]>()
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root)!.push(i)
  }

  const clusters: ClusterResult[] = []
  for (const indices of groups.values()) {
    if (indices.length < 2) continue
    const sourceSlugs = indices.map(i => articles[i].sourceSlug)
    if (new Set(sourceSlugs).size < 2) continue
    const simScores: Record<number, number> = {}
    for (const i of indices) {
      let maxSim = 0
      for (const j of indices) { if (i !== j) maxSim = Math.max(maxSim, scores[i][j]) }
      simScores[articles[i].id] = maxSim
    }
    clusters.push({ articleIds: indices.map(i => articles[i].id), sourceSlugs, similarityScores: simScores })
  }
  return clusters
}

/**
 * Envía un lote de artículos a Groq y devuelve los clusters encontrados.
 * El usedIds externo permite evitar duplicados entre lotes solapados.
 */
async function _runClusterBatch(
  articles: ArticleInput[],
  usedIds: Set<number> = new Set()
): Promise<ClusterResult[]> {
  if (articles.length < 2) return []

  const numbered = articles
    .map((a, i) => `${i + 1}. [${a.sourceSlug}] ${a.title}`)
    .join('\n')

  const prompt = `Tenés estos titulares de medios argentinos. Agrupá los que cubren EXACTAMENTE el mismo hecho noticioso (mismo evento, mismo día). Un artículo puede estar en un solo grupo. Los artículos del MISMO medio NO pueden estar en el mismo grupo.

${numbered}

Respondé SOLO con JSON válido, sin texto adicional:
{"groups": [[1,3,7], [2,5], [4,6,8]]}

Solo incluí grupos de 2 o más artículos de fuentes distintas. Si no hay grupos, respondé {"groups": []}.`

  const callGroq = async (): Promise<Response> =>
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        // Aumentado: con 200+ artículos pueden ser 50+ grupos → más tokens de respuesta
        max_tokens: 2000,
      }),
    })

  try {
    let res = await callGroq()

    // Rate-limit: esperar y reintentar una vez
    if (res.status === 429) {
      console.warn('[clustering-ai] 429 rate limit — esperando 20s...')
      await new Promise(r => setTimeout(r, 20000))
      res = await callGroq()
    }

    if (!res.ok) {
      console.warn(`[clustering-ai] Groq error ${res.status}`)
      return []
    }

    const data  = await res.json()
    let raw = data.choices[0].message.content.trim()
    if (raw.startsWith('```')) raw = raw.replace(/```[a-z]*\n?/g, '').trim()

    const parsed = JSON.parse(raw) as { groups: number[][] }
    const clusters: ClusterResult[] = []

    for (const group of (parsed.groups || [])) {
      // group contiene índices 1-based dentro del batch
      const idxs = group.map(n => n - 1).filter(i => i >= 0 && i < articles.length)
      if (idxs.length < 2) continue

      const arts = idxs.map(i => articles[i])
      const slugs = arts.map(a => a.sourceSlug)
      if (new Set(slugs).size < 2) continue

      // Evitar que un artículo aparezca en múltiples clusters
      const freshArts = arts.filter(a => !usedIds.has(a.id))
      if (freshArts.length < 2) continue
      if (new Set(freshArts.map(a => a.sourceSlug)).size < 2) continue

      for (const a of freshArts) usedIds.add(a.id)

      const simScores: Record<number, number> = {}
      for (const a of freshArts) simScores[a.id] = 0.5 // score simbólico para clusters AI

      clusters.push({
        articleIds:       freshArts.map(a => a.id),
        sourceSlugs:      freshArts.map(a => a.sourceSlug),
        similarityScores: simScores,
      })
    }

    return clusters
  } catch (err) {
    console.warn('[clustering-ai] batch failed:', err)
    return []
  }
}

/**
 * Agrupación semántica vía Groq: le pasamos todos los títulos y nos dice cuáles
 * cubren el mismo hecho. Mucho más preciso que TF-IDF para noticias argentinas.
 *
 * CAMBIO CLAVE: antes procesaba en batches aislados de 60 artículos. Si el artículo
 * de La Nación sobre el mismo tema que Página 12 caía en distinto batch, NUNCA se
 * comparaban → ambos quedaban como singletons. Ahora enviamos todos juntos en un
 * solo llamado (llama-3.1-8b-instant soporta 131k tokens; 250 títulos ≈ 5k tokens).
 */
export async function clusterArticlesWithAI(
  articles: ArticleInput[]
): Promise<ClusterResult[]> {
  if (articles.length < 2) return []

  // Para ≤250 artículos: un solo batch — todos los artículos se comparan entre sí.
  const MAX_SINGLE_BATCH = 250
  if (articles.length <= MAX_SINGLE_BATCH) {
    console.log(`[clustering-ai] Single batch: ${articles.length} articles`)
    return _runClusterBatch(articles)
  }

  // Para >250: batches solapados (OVERLAP artículos compartidos entre lotes
  // consecutivos) para que artículos en el borde del lote se comparen con los
  // del lote siguiente.
  const BATCH   = 180
  const OVERLAP = 60
  const allClusters: ClusterResult[] = []
  const usedIds = new Set<number>()

  console.log(`[clustering-ai] Overlapping batches: ${articles.length} articles, batch=${BATCH}, overlap=${OVERLAP}`)

  for (let start = 0; start < articles.length; start += BATCH - OVERLAP) {
    const batch = articles.slice(start, Math.min(start + BATCH, articles.length))
    const freshBatch = batch.filter(a => !usedIds.has(a.id))
    if (freshBatch.length < 2) continue

    console.log(`[clustering-ai] Batch ${start}–${start + batch.length}: ${freshBatch.length} fresh articles`)
    const clusters = await _runClusterBatch(freshBatch, usedIds)
    allClusters.push(...clusters)

    if (start + BATCH < articles.length) {
      await new Promise(r => setTimeout(r, 3000))
    }
  }

  return allClusters
}
