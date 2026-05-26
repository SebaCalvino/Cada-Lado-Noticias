const GROQ_API = 'https://api.groq.com/openai/v1/chat/completions'

export class GroqRateLimitError extends Error {
  constructor() { super('Groq rate limit exhausted — retry later') }
}

const SYSTEM_PROMPT = `Sos un periodista neutral y experimentado argentino. Tu misión es analizar la misma noticia
cubierta por distintos medios argentinos y producir un análisis objetivo e imparcial.
Nunca tomás partido político. Tu objetivo es mostrar qué dice cada medio y qué omite,
para que el lector pueda formarse su propia opinión informada.`

const USER_PROMPT_TEMPLATE = `Analizá las siguientes notas periodísticas sobre el mismo hecho, publicadas por distintos medios argentinos:

{articles}

Producí un análisis en formato JSON con esta estructura exacta:
{
  "title": "Título neutral y descriptivo del hecho (máx 100 caracteres)",
  "synthesis": "Síntesis neutral de 250-350 palabras. Párrafos separados por \\n\\n. Estructura: (1) Lead con quién, qué, cuándo, dónde. \\n\\n (2) Contexto y antecedentes. \\n\\n (3) Consecuencias o estado actual. Solo hechos verificables, sin opinión. En castellano argentino.",
  "key_facts": ["Hecho clave 1", "Hecho clave 2", "Hecho clave 3"],
  "category": "Una de: Política, Economía, Sociedad, Seguridad, Internacional, Deportes, Cultura, Tecnología, Ambiente",
  "source_analyses": [
    {
      "source_slug": "slug del medio",
      "emphasis": "Qué aspectos enfatiza este medio y qué perspectiva refleja. 2 oraciones.",
      "omissions": "Qué datos o voces omite respecto a los demás. 2 oraciones. Si es completa: 'Sin omisiones destacadas.'"
    }
  ]
}

Respondé SOLO con el JSON, sin texto adicional ni bloques de código.`

export interface ArticleForSynthesis {
  sourceName: string
  sourceSlug: string
  title: string
  summary: string
  url: string
}

export interface SourceAnalysis {
  sourceSlug: string
  sourceName: string
  emphasis: string
  omissions: string
  coveragePercentage: number
}

export interface SynthesisResult {
  title: string
  synthesis: string
  keyFacts: string[]
  category: string
  sourceAnalyses: SourceAnalysis[]
}

async function callGroq(userPrompt: string, attempt = 0): Promise<string> {
  // 25 s hard cap per Groq call — prevents a single slow/hung request from
  // consuming the entire Vercel function budget (maxDuration = 300 s).
  const res = await fetch(GROQ_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // llama-3.3-70b-versatile handles large structured JSON far better than 8b.
      // Override with GROQ_SYNTH_MODEL if needed.
      model:      process.env.GROQ_SYNTH_MODEL || 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens:  2000,  // reduced prompt targets ~800-1200 tokens output
    }),
    signal: AbortSignal.timeout(25_000),  // 25 s cap: normal Groq call ~5-15 s
  })

  if (res.status === 429) {
    if (attempt < 2) {
      const retryAfterHeader = res.headers.get('retry-after')
      const wait = Math.min(
        retryAfterHeader
          ? Math.ceil(parseFloat(retryAfterHeader)) * 1000
          : Math.pow(2, attempt) * 5_000,  // 5 s, 10 s
        30_000
      )
      console.warn(`[groq] Rate limited — waiting ${wait / 1000}s (attempt ${attempt + 1}/2)`)
      await new Promise((r) => setTimeout(r, wait))
      return callGroq(userPrompt, attempt + 1)
    }
    throw new GroqRateLimitError()
  }

  if (!res.ok) throw new Error(`Groq API error: ${res.status} — ${await res.text().catch(() => '')}`)
  const data = await res.json()
  return data.choices[0].message.content
}

function formatArticles(articles: ArticleForSynthesis[]): string {
  return articles
    .map((a, i) => {
      const lines = [`[${i + 1}] ${a.sourceName.toUpperCase()}`, `Título: ${a.title}`]
      if (a.summary) lines.push(`Resumen: ${a.summary}`)
      lines.push('')
      return lines.join('\n')
    })
    .join('\n')
}

function parseResponse(raw: string, articles: ArticleForSynthesis[]): SynthesisResult | null {
  try {
    let cleaned = raw.trim()

    // Strip ```json ... ``` fences (model may wrap output in markdown)
    if (cleaned.includes('```')) {
      const fenced = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (fenced) cleaned = fenced[1].trim()
    }

    // If there's prose BEFORE the JSON object, skip to the first '{'
    // Do NOT use lastIndexOf('}') — synthesis text may contain '}' and would
    // truncate the JSON.  Instead, rely on JSON.parse to find the end.
    const firstBrace = cleaned.indexOf('{')
    if (firstBrace > 0) cleaned = cleaned.slice(firstBrace)

    cleaned = cleaned.trim()

    const data = JSON.parse(cleaned)
    const allSlugs: Record<string, string> = {}
    for (const a of articles) allSlugs[a.sourceSlug] = a.sourceName
    const nSources = Object.keys(allSlugs).length

    const sourceAnalyses: SourceAnalysis[] = (data.source_analyses || []).map(
      (sa: any) => ({
        sourceSlug: sa.source_slug || '',
        sourceName: allSlugs[sa.source_slug] || sa.source_slug || '',
        emphasis: sa.emphasis || '',
        omissions: sa.omissions || '',
        coveragePercentage: Math.round((100 / nSources) * 10) / 10,
      })
    )

    return {
      title: data.title,
      synthesis: data.synthesis,
      keyFacts: data.key_facts || [],
      category: data.category || 'Política',
      sourceAnalyses,
    }
  } catch {
    return null
  }
}

export async function synthesizeCluster(
  articles: ArticleForSynthesis[]
): Promise<SynthesisResult | null> {
  if (articles.length < 2) return null
  try {
    const prompt = USER_PROMPT_TEMPLATE.replace('{articles}', formatArticles(articles))
    const raw = await callGroq(prompt)
    const result = parseResponse(raw, articles)
    if (!result) {
      console.error('[synthesis] parseResponse returned null. Raw response start:', raw.slice(0, 300))
    }
    return result
  } catch (err) {
    if (err instanceof GroqRateLimitError) throw err  // let caller decide — don't delete cluster
    // Transient errors (network, timeout) — let caller leave cluster for retry rather than deleting it
    if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) throw err
    console.error('[synthesis] callGroq threw:', err)
    return null
  }
}

export async function classifyComments(
  comments: { text: string; source_name: string }[]
): Promise<{ positive: number[]; negative: number[] }> {
  if (!comments.length) return { positive: [], negative: [] }
  try {
    const numbered = comments
      .slice(0, 30)
      .map((c, i) => `${i + 1}. [${c.source_name}] ${c.text}`)
      .join('\n')

    const prompt = `Tenés estos comentarios de lectores argentinos sobre una misma noticia, provenientes de distintos medios.

${numbered}

Seleccioná exactamente 3 comentarios con perspectiva FAVORABLE/positiva sobre el tema y 3 con perspectiva CRÍTICA/negativa. Priorizá los más sustanciales e interesantes (no los más cortos ni los más agresivos). No repitas índices entre positivos y negativos.

Respondé SOLO con JSON válido:
{"positive": [1, 2, 3], "negative": [4, 5, 6]}

Los números son los índices (empezando en 1). Si hay menos de 3 de algún tipo, devolvé los que haya.`

    const raw = await callGroq(prompt)
    let cleaned = raw.trim()
    if (cleaned.startsWith('```')) {
      const parts = cleaned.split('```')
      cleaned = parts[1] || cleaned
      if (cleaned.startsWith('json')) cleaned = cleaned.slice(4)
    }
    return JSON.parse(cleaned.trim())
  } catch {
    return { positive: [], negative: [] }
  }
}
