// TF-IDF cosine similarity clustering
// Groups articles covering the same news event

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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñüa-záéíóúñü\s]/gi, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !SPANISH_STOP_WORDS.has(t))
}

function computeTFIDF(docs: string[][]): Map<string, number>[] {
  const N = docs.length
  const df = new Map<string, number>()
  for (const doc of docs) {
    for (const term of new Set(doc)) {
      df.set(term, (df.get(term) || 0) + 1)
    }
  }
  return docs.map((doc) => {
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

function cosineSimilarity(
  a: Map<string, number>,
  b: Map<string, number>
): number {
  let dot = 0, normA = 0, normB = 0
  for (const [term, val] of a) {
    dot += val * (b.get(term) || 0)
    normA += val * val
  }
  for (const [, val] of b) normB += val * val
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export function clusterArticles(
  articles: ArticleInput[],
  threshold = 0.12
): ClusterResult[] {
  if (articles.length < 2) return []

  const docs = articles.map((a) => tokenize(`${a.title} ${a.summary}`))
  const vectors = computeTFIDF(docs)
  const n = articles.length
  const parent = Array.from({ length: n }, (_, i) => i)
  const scores: number[][] = Array.from({ length: n }, () => Array(n).fill(0))

  function find(i: number): number {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (articles[i].sourceSlug === articles[j].sourceSlug) continue
      const sim = cosineSimilarity(vectors[i], vectors[j])
      scores[i][j] = scores[j][i] = sim
      if (sim >= threshold) {
        const pi = find(i)
        const pj = find(j)
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
    const sourceSlugs = indices.map((i) => articles[i].sourceSlug)
    if (new Set(sourceSlugs).size < 2) continue
    const simScores: Record<number, number> = {}
    for (const i of indices) {
      let maxSim = 0
      for (const j of indices) {
        if (i !== j) maxSim = Math.max(maxSim, scores[i][j])
      }
      simScores[articles[i].id] = maxSim
    }
    clusters.push({
      articleIds: indices.map((i) => articles[i].id),
      sourceSlugs,
      similarityScores: simScores,
    })
  }
  return clusters
}
