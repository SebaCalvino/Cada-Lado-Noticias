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

  try {
    // ── Phase 1: Ingest (synchronous, fast) ──────────────────────────────────
    const { newArticles, sourceCount } = await runIngest()
    const ingestMs = Date.now() - t0

    // ── Phase 2: Cluster (fire-and-forget) ───────────────────────────────────
    // This creates a SEPARATE Vercel function invocation — the current request
    // does not wait for it.  The cluster route will itself fire the synthesize
    // route when it completes (same pattern).
    const origin = getSiteOrigin(request)
    const secret = process.env.CRON_SECRET
    const headers: HeadersInit = secret ? { Authorization: `Bearer ${secret}` } : {}

    fetch(`${origin}/api/pipeline/cluster`, { method: 'POST', headers })
      .catch(err => console.warn('[cron] Failed to trigger cluster phase:', String(err)))

    console.log(`[cron] Ingest done in ${ingestMs} ms — cluster phase triggered`)

    return NextResponse.json({
      ok:          true,
      newArticles,
      sourceCount,
      ingestMs,
      message:     'Ingest complete — cluster phase started in background',
    })
  } catch (err) {
    console.error('[cron] Ingest error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET  = handle
export const POST = handle
