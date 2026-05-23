/* CADA LADO — Groq-based news synthesis (TS port of backend/app/ai_synthesis.py) */

import Groq from 'groq-sdk'

const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY ?? '',
})

/* ── Types ───────────────────────────────────────────────────────── */
export interface ArticleForSynthesis {
  sourceName: string
  sourceSlug: string
  title:      string
  summary:    string
  url:        string
}

export interface SourceAnalysis {
  sourceSlug:         string
  sourceName:         string
  emphasis:           string
  omissions:          string
  coveragePercentage: number
}

export interface SynthesisResult {
  title:           string
  synthesis:       string
  keyFacts:        string[]
  category:        string
  sourceAnalyses:  SourceAnalysis[]
}

/* ── Prompts (matching the Python backend) ───────────────────────── */
const SYSTEM_PROMPT = `Sos un periodista neutral y experimentado argentino. Tu misión es analizar la misma noticia
cubierta por distintos medios argentinos y producir un análisis objetivo e imparcial.
Nunca tomás partido político. Tu objetivo es mostrar qué dice cada medio y qué omite,
para que el lector pueda formarse su propia opinión informada.`

function buildUserPrompt(articles: ArticleForSynthesis[]): string {
  const formatted = articles.map((a, i) => {
    const lines = [`[${i + 1}] ${a.sourceName.toUpperCase()}`, `Título: ${a.title}`]
    if (a.summary) lines.push(`Resumen: ${a.summary}`)
    lines.push('')
    return lines.join('\n')
  }).join('\n')

  return `Analizá las siguientes notas periodísticas sobre el mismo hecho, publicadas por distintos medios argentinos:

${formatted}

Producí un análisis completo en formato JSON con esta estructura exacta:
{
  "title": "Título neutral y descriptivo del hecho (máx 100 caracteres)",
  "synthesis": "Síntesis neutral del hecho redactada como artículo periodístico real, de 500-700 palabras. Comenzá con un párrafo inicial impactante (lead) que responda quién, qué, cuándo, dónde y por qué. Continuá con párrafos separados por dos saltos de línea (\\n\\n) que desarrollen el contexto, las declaraciones relevantes si las hay, y un cierre que explique las consecuencias o estado actual. Solo hechos verificables, sin opinión. En castellano argentino.",
  "key_facts": ["Hecho clave 1", "Hecho clave 2", "Hecho clave 3", "Hecho clave 4", "Hecho clave 5"],
  "category": "Una de: Política, Economía, Sociedad, Seguridad, Internacional, Deportes, Cultura, Tecnología, Ambiente",
  "source_analyses": [
    {
      "source_slug": "slug del medio",
      "emphasis": "Qué aspectos, ángulos o datos enfatiza este medio. Incluí el tono editorial, a quién le dan voz, qué términos usa y qué perspectiva política o ideológica refleja su cobertura. 3-4 oraciones con sustancia.",
      "omissions": "Qué datos, voces o contexto relevante omite o minimiza este medio en comparación con los demás. Sé específico: qué fuentes no consultó, qué hechos no menciona, qué contexto histórico o económico ignoró. 3-4 oraciones. Si la cobertura es genuinamente completa, escribí 'Sin omisiones destacadas.'"
    }
  ]
}

Respondé SOLO con el JSON, sin texto adicional ni bloques de código.`
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function stripCodeFences(raw: string): string {
  let s = raw.trim()
  if (s.startsWith('```')) {
    s = s.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  }
  // Extract the outermost JSON object
  const start = s.indexOf('{')
  const end = s.lastIndexOf('}')
  if (start !== -1 && end !== -1 && end > start) s = s.slice(start, end + 1)
  return s.trim()
}

async function callGroq(prompt: string): Promise<string> {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature: 0.3,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user',   content: prompt },
    ],
    response_format: { type: 'json_object' },
  })
  return completion.choices[0]?.message?.content || ''
}

/* ── Main entry ──────────────────────────────────────────────────── */
export async function synthesizeCluster(
  articles: ArticleForSynthesis[],
): Promise<SynthesisResult | null> {
  if (articles.length < 2) return null

  try {
    const raw = await callGroq(buildUserPrompt(articles))
    const data = JSON.parse(stripCodeFences(raw))

    const nameBySlug = Object.fromEntries(articles.map(a => [a.sourceSlug, a.sourceName]))
    const nSources = Object.keys(nameBySlug).length
    const evenSplit = Math.round((100.0 / nSources) * 10) / 10

    const sourceAnalyses: SourceAnalysis[] = (data.source_analyses ?? []).map((sa: Record<string, string>) => ({
      sourceSlug:         sa.source_slug ?? '',
      sourceName:         nameBySlug[sa.source_slug] ?? sa.source_slug ?? '',
      emphasis:           sa.emphasis ?? '',
      omissions:          sa.omissions ?? '',
      coveragePercentage: evenSplit,
    }))

    return {
      title:          data.title ?? articles[0].title,
      synthesis:      data.synthesis ?? '',
      keyFacts:       Array.isArray(data.key_facts) ? data.key_facts : [],
      category:       data.category ?? 'Política',
      sourceAnalyses,
    }
  } catch (e) {
    console.error('synthesizeCluster failed:', (e as Error).message)
    return null
  }
}
