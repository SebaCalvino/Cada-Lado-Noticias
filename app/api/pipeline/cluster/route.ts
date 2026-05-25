/**
 * Pipeline Phase 2 — Cluster.
 *
 * Pulls unclustered articles, runs multi-stage clustering, and persists
 * cluster records WITHOUT synthesis (synthesis = null).  Then fires the
 * synthesize phase as a background task via waitUntil().
 *
 * waitUntil() keeps the Vercel function alive until the background fetch
 * completes, preventing the early-termination race that kills unawaited
 * fetch() calls after a response is returned.
 *
 * Chain: cron/pipeline → cluster (here) → synthesize
 */

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { runCluster } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 300   // Vercel Pro — AI clustering can take 2-3 min on large batches

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) {
    console.log('[cluster] checkAuth: CRON_SECRET not set — open access')
    return true
  }
  const authHeader    = req.headers.get('authorization') ?? ''
  const xCronSecret   = req.headers.get('x-cron-secret') ?? ''
  const auth          = authHeader || xCronSecret
  const ok = auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
  if (!ok) {
    // Log lengths only — never log the actual secret value
    console.warn(
      `[cluster] checkAuth FAILED — ` +
      `authorization: ${authHeader ? `len=${authHeader.length}` : 'absent'}, ` +
      `x-cron-secret: ${xCronSecret ? `len=${xCronSecret.length}` : 'absent'}, ` +
      `CRON_SECRET len: ${process.env.CRON_SECRET.length}`
    )
  }
  return ok
}

function getSiteOrigin(req: NextRequest): string {
  // Prefer the canonical production domain over request-derived host.
  // Deployment-specific Vercel URLs have Deployment Protection that blocks
  // internal fetches regardless of the Authorization header.
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  const host  = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? 'localhost:3000'
  const proto = req.headers.get('x-forwarded-proto') ?? (host.includes('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0     = Date.now()
  const origin = getSiteOrigin(request)
  // Vercel may strip the Authorization header on server-to-server fetches.
  // Send via both headers so checkAuth() can fall back to x-cron-secret.
  const secret = process.env.CRON_SECRET
  const incomingAuth = request.headers.get('authorization')
  const authHeader   = incomingAuth ?? (secret ? `Bearer ${secret}` : null)
  const headers: HeadersInit = {
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...(secret     ? { 'x-cron-secret': secret }   : {}),
    'Content-Type': 'application/json',
  }

  try {
    // runCluster must finish FIRST so new clusters are in the DB before
    // synthesize is triggered — otherwise synthesize finds 0 pending and exits.
    const { clustersCreated, singletons } = await runCluster(80)
    const clusterMs = Date.now() - t0

    // NOW trigger synthesize — clusters are persisted, safe to pick them up
    const synthFetch = fetch(`${origin}/api/pipeline/synthesize`, { method: 'POST', headers })
      .then(r => {
        if (!r.ok) console.warn(`[cluster] synthesize returned HTTP ${r.status}`)
        else        console.log('[cluster] synthesize phase accepted')
      })
      .catch(err => console.warn('[cluster] synthesize fetch failed:', String(err)))

    waitUntil(synthFetch)

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
