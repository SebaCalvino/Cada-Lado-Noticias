/**
 * Cron endpoint — Phase 1 only (Ingest).
 *
 * Runs the ingest phase synchronously (~15 s), returns an HTTP 200, then
 * fires the cluster phase as a separate, non-blocking HTTP request to
 * /api/pipeline/cluster.  That route in turn fires the synthesize phase when
 * it finishes.
 *
 * Result: GitHub Actions (and Vercel's cron scheduler) receive a response
 * within ~15 s regardless of how long clustering or synthesis takes.
 *
 * maxDuration is set to 30 s — generous for ingest, tight enough to surface
 * any hang rather than silently burning the full 600 s budget.
 */

import { NextRequest, NextResponse } from 'next/server'
import { runIngest } from '@/lib/pipeline'

export const runtime    = 'nodejs'
export const maxDuration = 30   // ingest only — should finish in <20 s

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

/** Derive the site origin from the incoming request headers.
 *  Works on Vercel (x-forwarded-host), Railway, and local dev. */
function getSiteOrigin(req: NextRequest): string {
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

async function handle(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()

  // Origin + auth headers — used for both cluster and synthesize triggers
  const origin = getSiteOrigin(request)
  const secret = process.env.CRON_SECRET
  const headers: HeadersInit = secret ? { Authorization: `Bearer ${secret}` } : {}

  try {
    // ── Phase 1: Ingest (synchronous, fast) ──────────────────────────────────
    const { newArticles, sourceCount, skipped } = await runIngest()
    const ingestMs = Date.now() - t0

    // ── Phase 2+3: Cluster → Synthesize (fire-and-forget) ────────────────────
    // We ALWAYS trigger the cluster phase regardless of whether ingest was
    // skipped.  Reason: a previous run may have articles that were clustered
    // but not yet synthesized (synthesis = null), or clustering may have failed
    // mid-run leaving articles in limbo.  The cluster + synthesize phases each
    // return early if there is nothing to do — triggering them costs < 1 ms.
    fetch(`${origin}/api/pipeline/cluster`, { method: 'POST', headers })
      .catch(err => console.warn('[cron] Failed to trigger cluster phase:', String(err)))

    if (skipped) {
      console.log(
        `[cron] Ingest skipped (recent scrape) in ${ingestMs} ms — cluster phase triggered to drain backlog`
      )
      return NextResponse.json({
        ok:      true,
        skipped: true,
        ingestMs,
        message: 'Ingest skipped — cluster/synthesize triggered to drain any pending backlog',
      })
    }

    console.log(`[cron] Ingest done in ${ingestMs} ms — cluster phase triggered`)

    return NextResponse.json({
      ok:          true,
      skipped:     false,
      newArticles,
      sourceCount,
      ingestMs,
      message:     'Ingest complete — cluster phase started in background',
    })
  } catch (err) {
    console.error('[cron] Ingest error:', err)
    // Even on ingest error, try to drain any pending synthesis backlog
    fetch(`${origin}/api/pipeline/synthesize`, { method: 'POST', headers })
      .catch(() => {})
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET  = handle
export const POST = handle
