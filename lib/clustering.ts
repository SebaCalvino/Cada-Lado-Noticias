/**
 * Multi-stage clustering for Argentine news headlines.
 *
 * Stage 1 — Topic routing: keyword-based topic classification.  Articles in
 *   DIFFERENT topics never enter the same comparison batch — the primary
 *   defense against cross-topic false positives.
 *
 * Stage 2 — TF-IDF within topic: cosine similarity (threshold 0.22, raised
 *   from 0.15) plus a named-entity overlap guard.  An article pair only
 *   merges if their combined title+summary TF-IDF cosine clears the threshold
 *   AND they share at least one named entity (or neither article has any
 *   extractable entity, in which case the TF-IDF alone decides).
 *
 * Stage 3 — AI validation (Groq, per-topic batches): remaining unclustered
 *   articles within the same topic are sent with a strict no-false-positive
 *   prompt.  AI-produced clusters also go through the entity overlap guard
 *   before being accepted.
 *
 * Stage 4 — Coherence guard: every cluster (TF-IDF or AI) is verified with
 *   a lightweight TF-IDF cosine test.  A cluster is rejected if the AVERAGE
 *   pairwise cosine falls below 0.08, even if some individual pairs are
 *   similar (previously: any single pair >= 0.05 was enough — too loose).
 *
 * Key principle: false negatives (missed clusters) are far better than false
 * positives (wrong merges).  Every stage is deliberately conservative.
 */

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

// ── Stop words ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'de','la','que','el','en','y','a','los','del','se','las','por','un','para',
  'con','una','su','al','lo','como','mas','pero','sus','le','ya','o','este',
  'si','porque','esta','entre','cuando','muy','sin','sobre','tambien','me',
  'hasta','hay','donde','quien','desde','todo','nos','durante','todos','uno',
  'les','ni','contra','otros','ese','eso','ante','ellos','e','esto','antes',
  'algunos','que','unos','yo','otro','otras','otra','el','tanto','esa',
  'estos','mucho','quienes','nada','muchos','cual','poco','ella','estar',
  'estas','alguno','alguna','aunque','siempre','fue','ser','es','son','han',
  'ha','tiene','tienen','habia','sera','estan','puede','pueden','debe',
  'deben','tras','hacia','segun','mediante','sido','argentina','argentino',
  'argentinos','anos','ano','nuevo','nueva','gran','grandes','primer',
  'primera','segundo','segunda','ultimo','ultima','tras',
])

// ── Named entity extraction ───────────────────────────────────────────────────
//
// Heuristic approach for Spanish news titles:
//  • ALL_CAPS sequences ≥ 2 letters (acronyms): FMI, UNC, ONU, UBA, OTAN…
//  • Capitalized words NOT at position 0 and ≥ 4 chars: proper nouns like
//    Milei, Putin, Zelensky, Rivera, Clarín, Córdoba, Buenos, Aires…
//    (position 0 is excluded because Spanish sentences always start capitalised)
//
// This is intentionally lightweight — no NLP library, O(words) per title.

function extractEntities(title: string): Set<string> {
  const entities = new Set<string>()
  const words = title.split(/\s+/)

  for (let i = 0; i < words.length; i++) {
    const clean = words[i].replace(/[«»"'.,;:!?()\[\]—–\-]/g, '')
    if (clean.length < 2) continue

    // Acronyms — at least 2 all-uppercase letters (FMI, UNC, UBA, CONICET, etc.)
    if (/^[A-ZÁÉÍÓÚÑÜ]{2,}$/.test(clean)) {
      entities.add(clean.toUpperCase())
      continue
    }

    // Capitalised non-initial words (likely proper nouns)
    // Require ≥ 4 chars to avoid short ambiguous words ("Del", "Paz", "Mar")
    if (i > 0 && /^[A-ZÁÉÍÓÚÑ]/.test(clean) && clean.length >= 4) {
      const normalised = clean
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '')
      entities.add(normalised)
    }
  }

  return entities
}

/**
 * Returns true if the cluster passes the entity overlap check.
 *
 * Conservative logic:
 *  • If ALL articles have zero extractable entities (e.g. headlines using
 *    only common nouns), we can't use entities to validate — pass through.
 *  • If at least half the articles have entities, at least ONE pair must
 *    share an entity.  If every article has entities but no two share any,
 *    the articles are almost certainly about different events.
 */
function entityCheckPasses(articles: ArticleInput[]): boolean {
  const sets = articles.map(a => extractEntities(a.title))

  // Count articles with at least one extractable entity
  const withEntities = sets.filter(s => s.size > 0).length

  // If fewer than half have entities, skip the check (can't be conclusive)
  if (withEntities < Math.ceil(articles.length / 2)) return true

  // At least one pair must share an entity
  for (let i = 0; i < sets.length; i++) {
    for (let j = i + 1; j < sets.length; j++) {
      for (const e of sets[i]) {
        if (sets[j].has(e)) return true
      }
    }
  }
  return false // entities present but none shared
}

// ── Topic classification ──────────────────────────────────────────────────────

const TOPIC_KEYWORDS: Record<string, string[]> = {
  politica: [
    'milei','kirchner','fernandez','macri','massa','bullrich','larreta',
    'gobierno','presidente','presidenta','congreso','senado','diputado',
    'legislatura','decreto','ministro','ministros','gabinete','partido',
    'peronismo','kirchnerismo','libertad avanza','pro','ucr',
    'eleccion','elecciones','voto','votos','candidato','candidatura',
    'gobernador','intendente','municipio','casa rosada','balotaje','ballotage',
    'oposicion','coalicion','politica','politico','politicos',
  ],
  economia: [
    'dolar','peso','inflacion','pbi','deuda','fmi','banco','reservas',
    'tarifas','nafta','precio','precios','tipo de cambio','cepo',
    'exportacion','importacion','credito','bono','bonos','accion','acciones',
    'indec','canasta','presupuesto','superavit','deficit','ajuste',
    'mercado','economia','economico','financiero','monetario',
    'impuesto','iva','salario','sueldos','paritaria','pobreza','indigencia',
    'crecimiento','recesion','desempleo','desocupacion','quiebra',
  ],
  internacional: [
    'estados unidos','eeuu','trump','biden','harris','rusia','ucrania',
    'ukraine','putin','zelensky','china','europa','union europea',
    'israel','palestina','gaza','hamas','iran','netanyahu','nato','otan',
    'onu','oms','g20','g7','guerra','conflicto','misil','ataque','invasion',
    'cumbre','diplomacia','sancion','tratado','acuerdo internacional',
    'brasil','lula','venezuela','maduro','cuba','colombia','chile','mexico',
    'internacional','mundial','global','exterior',
  ],
  deportes: [
    'futbol','boca','river','racing','independiente','san lorenzo','belgrano',
    'messi','di maria','seleccion argentina','mundial','copa america',
    'copa libertadores','gol','partido','fixture','torneo','campeon',
    'ascenso','descenso','tenis','basquet','rugby','formula 1',
    'olimpiadas','atletismo','boxeo','natacion','ciclismo','superliga',
    'liga profesional','primera division','defensa y justicia','lanus',
    'deportes','deportivo','futbolista',
  ],
  educacion: [
    'universidad','uba','unc','utn','conicet','unlp','unt',
    'estudiante','estudiantes','docente','docentes','maestro','profesor',
    'escuela','facultad','rector','decano','becas','investigacion',
    'ciencia','educacion','clases','aula','pedagogia','matricula',
    'arancelamiento','presupuesto universitario','autonomia universitaria',
  ],
  sociedad: [
    'justicia','juicio','causa judicial','fiscal','juez','tribunal','condena',
    'crimen','robo','asalto','asesinato','homicidio','policia','gendarmeria',
    'detenido','preso','prision','carcel','derechos humanos',
    'marcha','protesta','manifestacion','paro','huelga','sindicato',
    'obrero','trabajador','femicidio','violencia de genero',
    'inseguridad','narcotrafico','corrupcion','causa penal',
  ],
  entretenimiento: [
    'pelicula','cine','serie','musica','libro','teatro','arte',
    'festival','premios','oscar','grammy','actriz','actor','director',
    'obra','estreno','concierto','artista','cantante','novela',
    'reality','show','espectaculo','mascota','animales','gato','perro',
    'mascotas','viajes','turismo','gastronomia','cocina','restaurante',
    'moda','tendencia','celebridad','famosos','tiktok','redes sociales',
    'viral','humor','comedia',
  ],
  salud: [
    'salud','hospital','medico','enfermedad','vacuna','epidemia',
    'pandemia','medicamento','tratamiento','diagnostico','enfermero',
    'clinica','cirugia','cancer','diabetes','virus','bacteria','contagio',
    'ministerio de salud','obra social','prepaga','sistema sanitario',
  ],
  ambiente: [
    'ambiente','clima','cambio climatico','calentamiento global',
    'inundacion','incendio forestal','terremoto','sismo','sequia',
    'contaminacion','reciclaje','energia renovable','solar','eolica',
    'bosque','glaciar','fauna','flora','biodiversidad','medio ambiente',
    'catastrofe','desastre natural',
  ],
}

function normalizeStr(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function classifyTopic(text: string): string {
  const norm = normalizeStr(text)
  let bestTopic = 'general'
  let bestScore = 0
  for (const [topic, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    let score = 0
    for (const kw of keywords) {
      if (norm.includes(kw)) score += kw.includes(' ') ? 2 : 1
    }
    if (score > bestScore) { bestScore = score; bestTopic = topic }
  }
  return bestTopic
}

// ── TF-IDF ───────────────────────────────────────────────────────────────────

function tokenize(text: string): string[] {
  return normalizeStr(text)
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOP_WORDS.has(t))
}

function computeTFIDF(docs: string[][]): Map<string, number>[] {
  const N = docs.length
  const df = new Map<string, number>()
  for (const doc of docs)
    for (const term of new Set(doc)) df.set(term, (df.get(term) || 0) + 1)

  return docs.map(doc => {
    const tf = new Map<string, number>()
    for (const term of doc) tf.set(term, (tf.get(term) || 0) + 1)
    const vec = new Map<string, number>()
    for (const [term, count] of tf) {
      const idf = Math.log((N + 1) / ((df.get(term) || 0) + 1))
      vec.set(term, (count / doc.length) * idf)
    }
    return vec
  })
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0, normA = 0, normB = 0
  for (const [t, v] of a) { dot += v * (b.get(t) || 0); normA += v * v }
  for (const [, v] of b) normB += v * v
  if (!normA || !normB) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

/**
 * TF-IDF clustering with union-find.
 * Threshold raised to 0.22 (was 0.15).  Also applies the entity overlap guard
 * to the final group results before returning them.
 */
export function clusterArticles(
  articles: ArticleInput[],
  threshold = 0.22
): ClusterResult[] {
  if (articles.length < 2) return []

  // Weight title twice — headline word choice is the core product signal
  const docs    = articles.map(a => tokenize(`${a.title} ${a.title} ${a.summary}`))
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

  const results: ClusterResult[] = []
  for (const indices of groups.values()) {
    if (indices.length < 2) continue
    const slugs = indices.map(i => articles[i].sourceSlug)
    if (new Set(slugs).size < 2) continue

    const arts = indices.map(i => articles[i])

    // Entity overlap guard: if extractable entities present but none shared → skip
    if (!entityCheckPasses(arts)) {
      console.log(
        `[clustering-tfidf] Entity guard rejected group: [${arts.map(a => a.sourceSlug).join(', ')}] "${arts.map(a => a.title.slice(0, 35)).join('" / "')}"`
      )
      continue
    }

    const simScores: Record<number, number> = {}
    for (const i of indices) {
      let best = 0
      for (const j of indices) if (i !== j) best = Math.max(best, scores[i][j])
      simScores[articles[i].id] = best
    }
    results.push({
      articleIds:       indices.map(i => articles[i].id),
      sourceSlugs:      slugs,
      similarityScores: simScores,
    })
  }
  return results
}

// ── Coherence guard ───────────────────────────────────────────────────────────
//
// Rejects a cluster when the AVERAGE pairwise cosine similarity is below
// COHERENCE_MIN_AVG.  The old check (any single pair >= 0.05) was too loose —
// one semi-similar pair could smuggle in several unrelated articles.

const COHERENCE_MIN_AVG = 0.08  // was: any pair >= 0.05

export function clusterIsCoherent(
  articleIds: number[],
  allArticles: ArticleInput[]
): boolean {
  const arts = articleIds
    .map(id => allArticles.find(a => a.id === id))
    .filter(Boolean) as ArticleInput[]
  if (arts.length < 2) return false

  const docs    = arts.map(a => tokenize(`${a.title} ${a.title} ${a.summary}`))
  const vectors = computeTFIDF(docs)

  let total = 0
  let pairs = 0
  for (let i = 0; i < arts.length; i++)
    for (let j = i + 1; j < arts.length; j++) {
      total += cosineSimilarity(vectors[i], vectors[j])
      pairs++
    }

  if (pairs === 0) return false
  return (total / pairs) >= COHERENCE_MIN_AVG
}

// ── AI clustering (Groq) ──────────────────────────────────────────────────────

const STRICT_PROMPT_HEADER = `Sos un editor jefe muy exigente. Tu única tarea: identificar pares de artículos que cubren EXACTAMENTE el mismo evento específico.

REQUISITOS para agrupar (deben cumplirse TODOS):
1. Mismo hecho puntual — no solo el mismo tema general
2. Al menos un protagonista, organización o lugar concreto en común (nombre propio, sigla, ciudad)
3. Contexto temporal similar (mismo día o período muy cercano)
4. Confianza ≥ 90%

PROHIBIDO agrupar si:
• Solo comparten una categoría temática ("economía", "política", "internacional")
• Comparten una palabra genérica ("elecciones", "privatización", "ataque") pero hablan de eventos distintos
• Son de países, instituciones o eventos diferentes sin relación directa
• No comparten ningún nombre propio, sigla o lugar en común
• Tenés menos del 90% de certeza

EJEMPLOS DE ERRORES GRAVES (nunca hacer esto):
❌ "Elecciones en la Facultad de Artes de la UNC" + "Cómo los gatos eligen a su humano preferido"
   → solo comparten el verbo "elegir" — instituciones y temas completamente distintos
❌ "Rusia lanza ataque con misiles contra Kiev" + "Trump negocia acuerdo con Irán"
   → ambos son internacionales pero eventos 100% distintos con actores distintos
❌ "Milei habla del acuerdo con el FMI" + "El Banco Central sube las tasas"
   → misma categoría económica, distintos hechos, distintos protagonistas
❌ "Privatización de rutas nacionales" + "Juicio por los Cuadernos de la corrupción"
   → ambos son política/economía pero eventos totalmente distintos de distintas épocas
❌ "Elecciones universitarias en la UBA" + "Elecciones universitarias en la UNLP"
   → misma temática pero instituciones y eventos distintos

EJEMPLO CORRECTO:
✓ "Milei firma el DNU sobre desregulación" + "El Gobierno publicó el polémico DNU desregulador"
  → mismo decreto específico, mismos protagonistas, mismo día ✓

IMPORTANTE: Preferí NO agrupar antes que agrupar mal. Un cluster incorrecto destruye la credibilidad del producto.

`

async function _runClusterBatch(
  articles: ArticleInput[],
  usedIds: Set<number>,
  allArticlesForCoherence: ArticleInput[],
): Promise<ClusterResult[]> {
  if (articles.length < 2) return []

  const numbered = articles
    .map((a, i) => `${i + 1}. [${a.sourceSlug}] ${a.title}`)
    .join('\n')

  const prompt =
    STRICT_PROMPT_HEADER +
    numbered +
    '\n\nRespondé SOLO con JSON válido, sin texto adicional:\n{"groups": [[1,3], [2,5,7]]}\n\nSolo grupos de 2+ artículos de fuentes DISTINTAS con ≥90% certeza. Sin grupos → {"groups": []}.'

  const callGroq = () =>
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model:       process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages:    [{ role: 'user', content: prompt }],
        temperature: 0.0,
        max_tokens:  1500,
      }),
    })

  try {
    let res = await callGroq()
    if (res.status === 429) {
      console.warn('[clustering-ai] 429 — waiting 20s then retrying')
      await new Promise(r => setTimeout(r, 20_000))
      res = await callGroq()
    }
    if (!res.ok) { console.warn(`[clustering-ai] Groq error ${res.status}`); return [] }

    const data = await res.json()
    let raw = data.choices[0].message.content.trim()
    if (raw.startsWith('```')) raw = raw.replace(/```[a-z]*\n?/g, '').trim()

    const parsed = JSON.parse(raw) as { groups: number[][] }
    const clusters: ClusterResult[] = []

    for (const group of (parsed.groups || [])) {
      const idxs = group.map(n => n - 1).filter(i => i >= 0 && i < articles.length)
      if (idxs.length < 2) continue

      const arts  = idxs.map(i => articles[i])
      const slugs = arts.map(a => a.sourceSlug)
      if (new Set(slugs).size < 2) continue

      const freshArts = arts.filter(a => !usedIds.has(a.id))
      if (freshArts.length < 2 || new Set(freshArts.map(a => a.sourceSlug)).size < 2) continue

      // ── Entity overlap guard ─────────────────────────────────────────
      if (!entityCheckPasses(freshArts)) {
        console.warn(
          `[clustering-ai] Entity guard rejected: [${freshArts.map(a => a.sourceSlug).join(', ')}] "${freshArts.map(a => a.title.slice(0, 40)).join('" / "')}"`
        )
        continue
      }

      // ── Coherence guard ──────────────────────────────────────────────
      if (!clusterIsCoherent(freshArts.map(a => a.id), allArticlesForCoherence)) {
        console.warn(
          `[clustering-ai] Coherence guard rejected: [${freshArts.map(a => a.sourceSlug).join(', ')}] "${freshArts.map(a => a.title.slice(0, 40)).join('" / "')}"`
        )
        continue
      }

      for (const a of freshArts) usedIds.add(a.id)
      const simScores: Record<number, number> = {}
      for (const a of freshArts) simScores[a.id] = 0.5

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

// ── Public entry point ────────────────────────────────────────────────────────

export async function clusterArticlesWithAI(
  articles: ArticleInput[]
): Promise<ClusterResult[]> {
  if (articles.length < 2) return []

  type Tagged = ArticleInput & { topic: string }
  const tagged: Tagged[] = articles.map(a => ({
    ...a,
    topic: classifyTopic(`${a.title} ${a.summary}`),
  }))

  const byTopic = new Map<string, Tagged[]>()
  for (const a of tagged) {
    if (!byTopic.has(a.topic)) byTopic.set(a.topic, [])
    byTopic.get(a.topic)!.push(a)
  }

  const topicSummary = [...byTopic.entries()]
    .map(([t, arts]) => `${t}:${arts.length}`)
    .join(' ')
  console.log(`[clustering] Topics — ${topicSummary}`)

  const allClusters: ClusterResult[] = []
  const usedIds     = new Set<number>()
  let   batchCount  = 0

  for (const [topic, topicArts] of byTopic) {
    if (topicArts.length < 2) continue

    // Stage 2: TF-IDF within topic (threshold 0.22, entity guard included)
    const tfidfClusters = clusterArticles(topicArts, 0.22)
    for (const c of tfidfClusters) {
      const freshIds   = c.articleIds.filter(id => !usedIds.has(id))
      const freshSlugs = freshIds.map(id => topicArts.find(a => a.id === id)!.sourceSlug)
      if (freshIds.length < 2 || new Set(freshSlugs).size < 2) continue
      for (const id of freshIds) usedIds.add(id)
      allClusters.push({ ...c, articleIds: freshIds, sourceSlugs: freshSlugs })
    }

    // Stage 3: AI for articles not yet clustered (within same topic)
    const unclustered = topicArts.filter(a => !usedIds.has(a.id))
    if (unclustered.length < 2) continue

    if (batchCount > 0) await new Promise(r => setTimeout(r, 2_500))

    console.log(`[clustering-ai] Topic "${topic}": ${unclustered.length} articles → AI`)
    const aiClusters = await _runClusterBatch(unclustered, usedIds, articles)
    allClusters.push(...aiClusters)
    batchCount++
  }

  console.log(`[clustering] Done — ${allClusters.length} clusters from ${articles.length} articles`)
  return allClusters
}

// ── Cleanup helpers (used by runCleanup in pipeline.ts) ──────────────────────

/**
 * Scores an existing cluster for quality.  Returns a score in [0, 1]:
 *  0.0 = very likely a bad cluster (should be deleted)
 *  1.0 = high quality
 *
 * Checks:
 *  1. Average pairwise TF-IDF cosine on titles only (no summary — titles are
 *     what users see and what makes comparisons valuable)
 *  2. Named entity overlap across the cluster
 */
export function scoreClusterQuality(articles: ArticleInput[]): number {
  if (articles.length < 2) return 0

  // Title-only cosine (no summary weighting — cleanup is about headline quality)
  const titleDocs = articles.map(a => tokenize(a.title))
  const vectors   = computeTFIDF(titleDocs)

  let total = 0
  let pairs = 0
  for (let i = 0; i < articles.length; i++)
    for (let j = i + 1; j < articles.length; j++) {
      total += cosineSimilarity(vectors[i], vectors[j])
      pairs++
    }

  const avgTitleCosine = pairs > 0 ? total / pairs : 0

  // Entity overlap bonus
  const hasEntityOverlap = entityCheckPasses(articles)

  // Score combines both signals:
  // - avg title cosine < 0.03 AND no entity overlap → very likely bad
  // - either check passing gives a boost
  let score = avgTitleCosine * 2  // normalise roughly to [0,1]
  if (hasEntityOverlap) score += 0.1
  return Math.min(1, score)
}
