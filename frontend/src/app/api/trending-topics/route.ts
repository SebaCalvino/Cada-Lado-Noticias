import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsClusters } from '@/lib/db/schema'
import { gte, isNotNull, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

const STOPWORDS = new Set([
  'de', 'la', 'el', 'en', 'y', 'a', 'los', 'las', 'que', 'del',
  'con', 'por', 'se', 'su', 'una', 'un', 'al', 'es', 'lo', 'no',
  'para', 'como', 'más', 'pero', 'o', 'fue', 'ha', 'le', 'ya',
])

export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const rows = await db
      .select({ category: newsClusters.category, title: newsClusters.title })
      .from(newsClusters)
      .where(and(gte(newsClusters.publishedAt, today), isNotNull(newsClusters.title)))

    const categoryCounts: Record<string, number> = {}
    const wordCounts: Record<string, number> = {}

    for (const r of rows) {
      if (r.category) categoryCounts[r.category] = (categoryCounts[r.category] ?? 0) + 1

      const seen = new Set<string>()
      for (const w of (r.title ?? '').toLowerCase().split(/\s+/)) {
        const c = w.replace(/[.,;:!?"'()[\]{}—-]/g, '')
        if (c.length > 2 && !STOPWORDS.has(c) && !seen.has(c)) {
          wordCounts[c] = (wordCounts[c] ?? 0) + 1
          seen.add(c)
        }
      }
    }

    const topics: { topic: string; count: number; category: boolean }[] = []
    for (const [cat, cnt] of Object.entries(categoryCounts)) {
      topics.push({ topic: cat, count: cnt, category: true })
    }
    const existing = new Set(topics.map(t => t.topic.toLowerCase()))
    for (const [w, c] of Object.entries(wordCounts).sort((a, b) => b[1] - a[1])) {
      if (c >= 2 && !existing.has(w)) {
        topics.push({ topic: w, count: c, category: false })
        if (topics.length >= 10) break
      }
    }

    topics.sort((a, b) => b.count - a.count)
    return NextResponse.json(topics.slice(0, 10))
  } catch (e) {
    console.error('GET /api/trending-topics failed:', e)
    return NextResponse.json([])
  }
}
