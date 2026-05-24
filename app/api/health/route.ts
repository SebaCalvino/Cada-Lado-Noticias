import { NextRequest, NextResponse } from 'next/server'
import { db, sources, rawArticles, newsClusters } from '@/lib/db'
import { desc, count, sql } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // Requiere CRON_SECRET si está seteado
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = request.headers.get('authorization') || request.nextUrl.searchParams.get('secret')
    if (auth !== `Bearer ${secret}` && auth !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const checks: Record<string, unknown> = {}

  // ── Env vars ──────────────────────────────────────────────────────────────
  checks.env = {
    DATABASE_URL:  !!process.env.DATABASE_URL,
    GROQ_API_KEY:  !!process.env.GROQ_API_KEY,
    CRON_SECRET:   !!process.env.CRON_SECRET,
    GROQ_MODEL:    process.env.GROQ_MODEL || '(default: llama-3.1-8b-instant)',
  }

  // ── DB connectivity ───────────────────────────────────────────────────────
  try {
    const [[srcCount], [artCount], [clusterCount]] = await Promise.all([
      db.select({ n: count() }).from(sources),
      db.select({ n: count() }).from(rawArticles),
      db.select({ n: count() }).from(newsClusters),
    ])
    checks.db = { ok: true, sources: srcCount.n, raw_articles: artCount.n, clusters: clusterCount.n }
  } catch (err) {
    checks.db = { ok: false, error: String(err) }
  }

  // ── Latest scraped article ─────────────────────────────────────────────────
  if ((checks.db as any).ok) {
    try {
      const [latest] = await db
        .select({ title: rawArticles.title, scrapedAt: rawArticles.scrapedAt, clustered: rawArticles.clustered })
        .from(rawArticles)
        .orderBy(desc(rawArticles.scrapedAt))
        .limit(1)
      checks.latest_article = latest ?? null
    } catch { checks.latest_article = null }

    // ── Latest cluster ─────────────────────────────────────────────────────
    try {
      const [latest] = await db
        .select({ title: newsClusters.title, publishedAt: newsClusters.publishedAt })
        .from(newsClusters)
        .orderBy(desc(newsClusters.publishedAt))
        .limit(1)
      checks.latest_cluster = latest ?? null
    } catch { checks.latest_cluster = null }

    // ── Unclustered articles ───────────────────────────────────────────────
    try {
      const [{ n }] = await db
        .select({ n: count() })
        .from(rawArticles)
        .where(sql`clustered = false`)
      checks.unclustered_articles = n
    } catch { checks.unclustered_articles = null }
  }

  // ── Groq reachability (quick check, no tokens) ───────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/models', {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(6000),
      })
      checks.groq = { ok: res.ok, status: res.status }
    } catch (err) {
      checks.groq = { ok: false, error: String(err) }
    }
  } else {
    checks.groq = { ok: false, error: 'GROQ_API_KEY not set' }
  }

  const allOk =
    (checks.env as any).DATABASE_URL &&
    (checks.env as any).GROQ_API_KEY &&
    (checks.db as any).ok &&
    (checks.groq as any).ok

  return NextResponse.json({ status: allOk ? 'ok' : 'degraded', checks }, {
    status: allOk ? 200 : 500,
  })
}
