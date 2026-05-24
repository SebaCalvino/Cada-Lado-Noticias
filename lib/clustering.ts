/**
 * Multi-stage clustering for Argentine news headlines.
 *
 * Stage 1 — Topic routing: each article is classified by topic (politics,
 *   economy, sports…) via keyword matching. Articles in DIFFERENT topics
 *   never enter the same comparison batch. This is the primary defense
 *   against false-positive clusters (e.g. "university elections" being
 *   merged with "how cats choose their human").
 *
 * Stage 2 — TF-IDF within topic: cosine similarity (threshold 0.15, raised
 *   from the previous 0.05) surfaces obvious same-event pairs cheaply.
 *
 * Stage 3 — AI validation (Groq, per-topic batches): remaining within-topic
 *   articles are sent with a strict no-false-positive prompt. The model must
 *   be ≥90% confident to group two articles. Bad examples are shown explicitly.
 *
 * Stage 4 — Coherence guard: every AI-produced cluster is checked with a
 *   lightweight TF-IDF cosine test. Clusters with near-zero vocabulary overlap
 *   (similarity < 0.05 for ALL pairs) are silently dropped — the final safety
 *   net against model hallucination.
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

// ── Topic classification ──────────────────────────────────────────────────────
// Keyword lists use normalized (no diacritics, lower-case) strings.
// A single article can only belong to ONE topic. Articles in different topics
// are NEVER compared — eliminating cross-topic false positives entirely.

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
      if (norm.includes(kw)) score += kw.includes(' ') ? 2 : 1 // multi-word phrases score higher
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
 * Default threshold raised to 0.15 (was 0.05) to reduce false positives.
 * Used directly as primary clustering when AI is unavailable (fallback).
 */
export function clusterArticles(
  articles: ArticleInput[],
  threshold = 0.15
): ClusterResult[] {
  if (articles.length < 2) return []

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
// Rejects a cluster if EVERY pairwise cosine similarity is below MIN_SIM.
// Catches clusters where the AI grouped articles with near-zero vocabulary
// overlap (e.g. "Russia attacks Kiev" + "Trump on Iran deal").

const COHERENCE_MIN_SIM = 0.05

function clusterIsCoherent(articleIds: number[], allArticles: ArticleInput[]): boolean {
  const arts = articleIds
    .map(id => allArticles.find(a => a.id === id))
    .filter(Boolean) as ArticleInput[]
  if (arts.length < 2) return false

  const docs    = arts.map(a => tokenize(`${a.title} ${a.title} ${a.summary}`))
  const vectors = computeTFIDF(docs)

  for (let i = 0; i < arts.length; i++)
    for (let j = i + 1; j < arts.length; j++)
      if (cosineSimilarity(vectors[i], vectors[j]) >= COHERENCE_MIN_SIM) return true

  return false // all pairs have near-zero overlap → unrelated
}

// ── AI clustering (Groq) ──────────────────────────────────────────────────────

/**
 * Strict no-false-positive prompt.
 *
 * Key rules explicitly encoded:
 *  • Articles must share a specific event, NOT just a topic
 *  • Must share at least one named person / org / place
 *  • Negative examples mirror the real bad cases observed in production
 *  • "If in doubt → don't group"
 */
const STRICT_PROMPT_HEADER = `Sos un editor jefe muy exigente. Tu única tarea: identificar pares de artículos que cubren EXACTAMENTE el mismo evento específico.

REQUISITOS para agrupar (deben cumplirse TODOS):
1. Mismo hecho puntual — no solo el mismo tema general
2. Al menos un protagonista, organización o lugar en común
3. Contexto temporal similar (mismo día o período muy cercano)
4. Confianza ≥ 90%

PROHIBIDO agrupar si:
• Solo comparten una categoría temática ("economía", "política", "internacional")
• Comparten una palabra suelta pero hablan de eventos distintos
• Son de países o instituciones diferentes sin relación directa
• Tenés menos del 90% de certeza

EJEMPLOS DE ERRORES GRAVES (nunca hacer esto):
❌ "Elecciones en la Facultad de Artes de la UNC" + "Cómo los gatos eligen a su humano preferido"
   → solo comparten el verbo "elegir" — son temas completamente distintos
❌ "Rusia lanza ataque con misiles contra Kiev" + "Trump negocia acuerdo con Irán"
   → ambos son noticias internacionales pero de eventos completamente distintos
❌ "Milei habla del acuerdo con el FMI" + "El Banco Central sube las tasas de interés"
   → misma categoría económica, distintos hechos

EJEMPLO CORRECTO:
✓ "Milei firma el DNU sobre desregulación" + "El Gobierno publicó el polémico DNU desregulador"
  → mismo decreto, mismos protagonistas ✓

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
        temperature: 0.0, // deterministic — we want strict factual matching, not creativity
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

      // ── Coherence guard ──────────────────────────────────────────────────
      // Reject clusters where all article pairs have near-zero vocabulary
      // overlap — these are hallucinated connections by the model.
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

/**
 * Multi-stage semantic clustering.
 *
 * False negatives (missed clusters) are MUCH better than false positives
 * (wrong merges). Every stage is tuned conservatively.
 */
export async function clusterArticlesWithAI(
  articles: ArticleInput[]
): Promise<ClusterResult[]> {
  if (articles.length < 2) return []

  // Stage 1: classify every article by topic
  type Tagged = ArticleInput & { topic: string }
  const tagged: Tagged[] = articles.map(a => ({
    ...a,
    topic: classifyTopic(`${a.title} ${a.summary}`),
  }))

  // Group by topic — cross-topic articles never compete
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

    // Stage 2: TF-IDF within topic (threshold 0.15 — 3× higher than before)
    const tfidfClusters = clusterArticles(topicArts, 0.15)
    for (const c of tfidfClusters) {
      const freshIds = c.articleIds.filter(id => !usedIds.has(id))
      const freshSlugs = freshIds.map(id => topicArts.find(a => a.id === id)!.sourceSlug)
      if (freshIds.length < 2 || new Set(freshSlugs).size < 2) continue
      for (const id of freshIds) usedIds.add(id)
      allClusters.push({ ...c, articleIds: freshIds, sourceSlugs: freshSlugs })
    }

    // Stage 3: AI for articles that TF-IDF didn't cluster (within same topic)
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
