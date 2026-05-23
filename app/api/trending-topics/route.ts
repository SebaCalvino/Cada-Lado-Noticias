import { NextResponse } from 'next/server'
import { db, newsClusters } from '@/lib/db'
import { gte, sql, isNotNull, desc } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STOP_WORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'del', 'se', 'las', 'por', 'un', 'para',
  'con', 'una', 'su', 'al', 'lo', 'como', 'más', 'pero', 'sus', 'le', 'ya', 'o',
  'este', 'esta', 'entre', 'cuando', 'muy', 'sin', 'sobre', 'también', 'hasta', 'hay',
  'donde', 'desde', 'todo', 'nos', 'durante', 'todos', 'uno', 'les', 'ni', 'contra',
  'otros', 'ese', 'eso', 'ante', 'ellos', 'e', 'esto', 'antes', 'algunos', 'unos', 'yo',
  'otro', 'otras', 'otra', 'él', 'tanto', 'esa', 'estos', 'mucho', 'nada', 'muchos',
  'cual', 'poco', 'ella', 'estar', 'estas', 'alguno', 'alguna', 'aunque', 'siempre',
  'fue', 'ser', 'es', 'son', 'han', 'ha', 'tiene', 'tienen', 'había', 'que',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-záéíóúñüa-záéíóúñü\s]/gi, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3 && !STOP_WORDS.has(w))
}

export async function GET() {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000)

    const todayClusters = await db
      .select({
        title: newsClusters.title,
        category: newsClusters.category,
        count: sql<number>`count(*)::int`.as('count'),
      })
      .from(newsClusters)
      .where(gte(newsClusters.publishedAt, since))
      .groupBy(newsClusters.category, newsClusters.title)
      .orderBy(desc(newsClusters.publishedAt))
      .limit(50)

    // Category counts
    const categoryCounts: Record<string, number> = {}
    for (const row of todayClusters) {
      if (row.category) {
        categoryCounts[row.category] = (categoryCounts[row.category] || 0) + 1
      }
    }

    // Keyword extraction
    const wordFreq: Record<string, number> = {}
    for (const row of todayClusters) {
      for (const word of extractKeywords(row.title)) {
        wordFreq[word] = (wordFreq[word] || 0) + 1
      }
    }

    const keywords = Object.entries(wordFreq)
      .filter(([, count]) => count > 1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word)

    const categories = Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .map(([category, count]) => ({ category, count }))

    return NextResponse.json({ keywords, categories })
  } catch (err) {
    console.error('/api/trending-topics error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
