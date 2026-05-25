/**
 * Cron endpoint — Phase 1 only (Ingest).
 *
 * Runs the ingest phase synchronously (~15 s), returns an HTTP 200, then
 * fires the cluster phase as a background task via waitUntil().
 *
 * waitUntil() (from @vercel/functions) keeps the Vercel function invocation
 * alive until the background fetch completes — solving the fire-and-forget
 * termination race that caused cluster/synthesize to never execute.
 *
 * Chain: cron/pipeline (ingest) → pipeline/cluster → pipeline/synthesize
 */

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { runIngest } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 30   // ingest only — should finish in <20 s

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

/** Derive the site origin for internal API chaining.
 *
 * Priority:
 *  1. VERCEL_PROJECT_PRODUCTION_URL — Vercel system env, always the canonical
 *     production domain (e.g. "myapp.vercel.app"), never deployment-specific.
 *     Deployment-specific URLs (e.g. "myapp-abc123.vercel.app") have Vercel
 *     Deployment Protection enabled and return 401 for internal fetches even
 *     when the correct Authorization header is present.
 *  2. x-forwarded-host / host — fallback for local dev & non-Vercel hosts.
 */
function getSiteOrigin(req: NextRequest): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

async function handle(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0     = Date.now()
  const origin = getSiteOrigin(request)
  // Forward the incoming auth header so the cluster endpoint receives valid auth
  // regardless of which Vercel deployment handles this request.
  // Fallback: rebuild from CRON_SECRET (e.g. direct curl calls, GitHub Actions).
  const incomingAuth = request.headers.get('authorization')
  const secret       = process.env.CRON_SECRET
  const authHeader   = incomingAuth ?? (secret ? `Bearer ${secret}` : null)
  const headers: HeadersInit = {
    ...(authHeader ? { Authorization: authHeader } : {}),
    'Content-Type': 'application/json',
  }

  try {
    // ── Phase 1: Ingest (synchronous) ─────────────────────────────────────────
    const { newArticles, sourceCount, skipped } = await runIngest()
    const ingestMs = Date.now() - t0

    // ── Trigger cluster AFTER ingest so new articles are already in the DB ────
    // waitUntil() keeps the function alive until the fetch resolves.
    const clusterFetch = fetch(`${origin}/api/pipeline/cluster`, { method: 'POST', headers })
      .then(r => {
        if (!r.ok) console.warn(`[cron] cluster phase returned HTTP ${r.status}`)
        else        console.log('[cron] cluster phase accepted')
      })
      .catch(err => console.warn('[cron] cluster phase fetch failed:', String(err)))

    waitUntil(clusterFetch)

    if (skipped) {
      console.log(`[cron] Ingest skipped in ${ingestMs} ms — cluster triggered to drain backlog`)
      return NextResponse.json({
        ok:      true,
        skipped: true,
        ingestMs,
        message: 'Ingest skipped — cluster triggered to drain any pending backlog',
      })
    }

    console.log(`[cron] Ingest done in ${ingestMs} ms — ${newArticles} new articles — cluster triggered`)
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
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET  = handle
export const POST = handle
