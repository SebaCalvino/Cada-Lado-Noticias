/**
 * Pipeline Phase 2 — Cluster (standalone endpoint).
 *
 * Primary path: the cron endpoint (cron/pipeline) now calls runCluster and
 * runSynthesize directly in-process via waitUntil(), bypassing Vercel
 * Deployment Protection that blocked server→server fetch() calls.
 *
 * This endpoint remains useful as:
 *   • A manual trigger from the Vercel dashboard or curl
 *   • A future GitHub Actions step if needed
 *
 * It still chains to synthesize via waitUntil() for convenience when called
 * directly.
 */

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { runCluster, runSynthesize } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 300   // AI clustering can take 2-3 min on large batches

// Synthesize limit when triggered from this endpoint directly.
const MAX_SYNTH_CLUSTERS = 5

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()

  try {
    const { clustersCreated, singletons } = await runCluster(300)
    const clusterMs = Date.now() - t0

    // Trigger synthesize in background
    const synthPromise = (async () => {
      try {
        const { synthesized, failed } = await runSynthesize(MAX_SYNTH_CLUSTERS)
        console.log(`[cluster] synthesize done — ${synthesized} synthesized, ${failed} failed`)
      } catch (err) {
        console.error('[cluster] synthesize error:', err)
      }
    })()

    waitUntil(synthPromise)

    console.log(
      `[cluster] Done in ${clusterMs} ms — ${clustersCreated} clusters, ` +
      `${singletons} singletons — synthesize triggered`
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
