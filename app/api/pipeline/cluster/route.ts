/**
 * Pipeline Phase 2 — Cluster.
 *
 * Pulls unclustered articles from the DB, runs multi-stage clustering
 * (TF-IDF within topic + AI per-topic batch), and persists the cluster
 * records WITHOUT synthesis (synthesis = null).  Synthesis is intentionally
 * deferred to Phase 3 so this phase stays within a tight time budget.
 *
 * When finished, fires /api/pipeline/synthesize as a separate non-blocking
 * HTTP request.  This creates a clean chain:
 *
 *   cron/pipeline (ingest) → pipeline/cluster → pipeline/synthesize
 *
 * maxDuration = 90 s covers the worst-case scenario of 9 per-topic AI batches
 * with 2.5 s spacing between them plus actual Groq API call time.
 *
 * The endpoint is protected by the same CRON_SECRET used by the cron job.
 * It accepts POST only (GET returns 405) to prevent accidental browser hits.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runCluster } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 90   // AI clustering: up to 9 topics × ~8 s each

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

function getSiteOrigin(req: NextRequest): string {
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()

  try {
    // Run bounded cluster phase (max 80 articles per invocation)
    const { clustersCreated, singletons } = await runCluster(80)
    const clusterMs = Date.now() - t0

    // ── Fire synthesize phase (fire-and-forget) ───────────────────────────────
    // Separate Vercel function invocation — no response wait.
    const origin = getSiteOrigin(request)
    const secret = process.env.CRON_SECRET
    const headers: HeadersInit = secret ? { Authorization: `Bearer ${secret}` } : {}

    fetch(`${origin}/api/pipeline/synthesize`, { method: 'POST', headers })
      .catch(err => console.warn('[cluster] Failed to trigger synthesize phase:', String(err)))

    console.log(
      `[cluster] Done in ${clusterMs} ms — ${clustersCreated} clusters, ${singletons} singletons — synthesize triggered`
    )

    return NextResponse.json({
      ok:             true,
      clustersCreated,
      singletons,
      clusterMs,
      message:        'Cluster phase complete — synthesize phase started in background',
    })
  } catch (err) {
    console.error('[cluster] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed — use POST' }, { status: 405 })
}
