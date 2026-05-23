/* CADA LADO — TF-IDF + cosine similarity clustering (TS port of backend/app/clustering.py) */

const SPANISH_STOP_WORDS = new Set([
  'de', 'la', 'que', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las',
  'por', 'un', 'para', 'con', 'una', 'su', 'al', 'lo', 'como', 'más',
  'pero', 'sus', 'le', 'ya', 'o', 'este', 'sí', 'porque', 'esta', 'entre',
  'cuando', 'muy', 'sin', 'sobre', 'también', 'me', 'hasta', 'hay', 'donde',
  'quien', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni',
  'contra', 'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'mí',
  'antes', 'algunos', 'qué', 'unos', 'yo', 'otro', 'otras', 'otra', 'él',
  'tanto', 'esa', 'estos', 'mucho', 'quienes', 'nada', 'muchos', 'cual',
  'poco', 'ella', 'estar', 'estas', 'alguno', 'alguna', 'aunque', 'siempre',
  'fue', 'ser', 'es', 'son', 'han', 'ha', 'tiene', 'tienen', 'había',
  'argentina', 'argentino', 'argentinos', 'años', 'año',
])

export interface ArticleInput {
  id:         number
  title:      string
  summary:    string
  sourceSlug: string
}

export interface ClusterResult {
  articleIds:        number[]
  sourceSlugs:       string[]
  representativeTitle: string
  similarityScores:  Record<number, number>
}

/* ── Tokenization ────────────────────────────────────────────────── */
function tokenize(text: string): string[] {
  const lower = text.toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')   // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')
  const words = lower.split(/\s+/).filter(w => w.length > 2 && !SPANISH_STOP_WORDS.has(w))
  // unigrams + bigrams
  const tokens = [...words]
  for (let i = 0; i < words.length - 1; i++) {
    tokens.push(`${words[i]}_${words[i + 1]}`)
  }
  return tokens
}

/* ── TF-IDF ──────────────────────────────────────────────────────── */
interface Vector { [term: string]: number }

function tfidfVectors(documents: string[]): Vector[] {
  const docTokens = documents.map(tokenize)
  const n = documents.length

  // Document frequency
  const df: Record<string, number> = {}
  for (const tokens of docTokens) {
    const seen = new Set<string>()
    for (const t of tokens) {
      if (seen.has(t)) continue
      seen.add(t)
      df[t] = (df[t] ?? 0) + 1
    }
  }

  // IDF
  const idf: Record<string, number> = {}
  for (const t of Object.keys(df)) {
    idf[t] = Math.log((n + 1) / (df[t] + 1)) + 1   // smoothed
  }

  // TF-IDF vectors with L2 normalization
  return docTokens.map(tokens => {
    const tf: Record<string, number> = {}
    for (const t of tokens) tf[t] = (tf[t] ?? 0) + 1
    // sublinear tf
    for (const t of Object.keys(tf)) tf[t] = 1 + Math.log(tf[t])

    const vec: Vector = {}
    let norm = 0
    for (const t of Object.keys(tf)) {
      const w = tf[t] * (idf[t] ?? 0)
      vec[t] = w
      norm += w * w
    }
    norm = Math.sqrt(norm) || 1
    for (const t of Object.keys(vec)) vec[t] /= norm
    return vec
  })
}

function cosine(a: Vector, b: Vector): number {
  // Iterate over the smaller vector for efficiency
  const [small, big] = Object.keys(a).length < Object.keys(b).length ? [a, b] : [b, a]
  let dot = 0
  for (const t of Object.keys(small)) {
    if (big[t] !== undefined) dot += small[t] * big[t]
  }
  return dot   // vectors are L2-normalized → dot product is cosine
}

/* ── Main clustering function ────────────────────────────────────── */
export function clusterArticles(
  articles: ArticleInput[],
  threshold = 0.18,
): ClusterResult[] {
  if (articles.length < 2) return []

  const texts = articles.map(a => `${a.title} ${a.summary}`)
  const vectors = tfidfVectors(texts)
  const n = articles.length
  const visited = new Array<boolean>(n).fill(false)
  const clusters: ClusterResult[] = []

  for (let i = 0; i < n; i++) {
    if (visited[i]) continue
    const indices = [i]
    visited[i] = true

    for (let j = i + 1; j < n; j++) {
      if (visited[j]) continue
      const sim = cosine(vectors[i], vectors[j])
      if (sim >= threshold) {
        // Only cluster if source isn't already represented
        const sourcesIn = new Set(indices.map(k => articles[k].sourceSlug))
        if (!sourcesIn.has(articles[j].sourceSlug)) {
          indices.push(j)
          visited[j] = true
        }
      }
    }

    const sourceSlugs = indices.map(k => articles[k].sourceSlug)
    if (new Set(sourceSlugs).size >= 2) {
      const scores: Record<number, number> = {}
      for (const k of indices) scores[articles[k].id] = cosine(vectors[i], vectors[k])

      // Representative title: longest
      const repIdx = indices.reduce((a, b) =>
        articles[a].title.split(' ').length >= articles[b].title.split(' ').length ? a : b
      )
      clusters.push({
        articleIds: indices.map(k => articles[k].id),
        sourceSlugs,
        representativeTitle: articles[repIdx].title,
        similarityScores: scores,
      })
    }
  }

  console.log(`Clustered ${articles.length} articles into ${clusters.length} clusters`)
  return clusters
}
