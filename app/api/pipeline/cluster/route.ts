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

  const t0     = Date.now()
  const origin = getSiteOrigin(request)
  const secret = process.env.CRON_SECRET
  const headers: HeadersInit = {
    ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    'Content-Type': 'application/json',
  }

  // Queue the synthesize phase now — waitUntil keeps the function alive
  // until the fetch resolves, even after we return the HTTP response.
  const synthFetch = fetch(`${origin}/api/pipeline/synthesize`, { method: 'POST', headers })
    .then(r => {
      if (!r.ok) console.warn(`[cluster] synthesize phase returned HTTP ${r.status}`)
      else        console.log('[cluster] synthesize phase accepted')
    })
    .catch(err => console.warn('[cluster] synthesize phase fetch failed:', String(err)))

  waitUntil(synthFetch)

  try {
    const { clustersCreated, singletons } = await runCluster(40)
    const clusterMs = Date.now() - t0

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
