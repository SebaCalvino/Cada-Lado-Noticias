/**
 * Cron endpoint — Phase 1 (Ingest) + triggers Phase 2+3 in-process.
 *
 * Runs ingest synchronously (~15 s), returns HTTP 200, then runs cluster
 * and synthesize as a background task via waitUntil().
 *
 * WHY in-process instead of HTTP chaining:
 *   Vercel Deployment Protection intercepts server→server fetch() calls before
 *   they reach function code, returning 401 regardless of Authorization headers.
 *   Calling runCluster/runSynthesize directly bypasses the HTTP layer entirely.
 *
 * Chain: cron/pipeline → runCluster() → runSynthesize()  (all in one invocation)
 */

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { runIngest, runCluster, runSynthesize } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 300   // cluster + synthesize run inside waitUntil()

// Synthesize at most this many clusters per cron run.
// 3 clusters × worst-case 55 s (3 rate-limit retries) = 165 s
// + cluster overhead (~60 s) + ingest (~15 s) = ~240 s < 300 s budget.
const MAX_SYNTH_CLUSTERS = 3

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

async function handle(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const t0 = Date.now()

  try {
    // ── Phase 1: Ingest (synchronous — completes before HTTP response) ─────────
    const { newArticles, sourceCount, skipped } = await runIngest()
    const ingestMs = Date.now() - t0

    // ── Phases 2+3: Cluster → Synthesize (background, keeps function alive) ────
    // Direct in-process calls — no internal HTTP fetch — immune to Deployment
    // Protection.  waitUntil() keeps the Vercel invocation alive until done.
    const clusterAndSynthPromise = (async () => {
      try {
        const t1 = Date.now()
        const { clustersCreated, singletons } = await runCluster(300)
        console.log(
          `[cron] cluster done in ${Date.now() - t1} ms — ` +
          `${clustersCreated} clusters, ${singletons} singletons`
        )

        const t2 = Date.now()
        const { synthesized, failed } = await runSynthesize(MAX_SYNTH_CLUSTERS)
        console.log(
          `[cron] synthesize done in ${Date.now() - t2} ms — ` +
          `${synthesized} synthesized, ${failed} failed`
        )
      } catch (err) {
        console.error('[cron] cluster/synthesize error:', err)
      }
    })()

    waitUntil(clusterAndSynthPromise)

    if (skipped) {
      console.log(`[cron] Ingest skipped in ${ingestMs} ms — cluster+synthesize triggered anyway`)
      return NextResponse.json({
        ok:      true,
        skipped: true,
        ingestMs,
        message: 'Ingest skipped — cluster+synthesize running in background',
      })
    }

    console.log(
      `[cron] Ingest done in ${ingestMs} ms — ${newArticles} new articles — ` +
      `cluster+synthesize running in background`
    )
    return NextResponse.json({
      ok:          true,
      skipped:     false,
      newArticles,
      sourceCount,
      ingestMs,
      message:     'Ingest complete — cluster+synthesize running in background',
    })
  } catch (err) {
    console.error('[cron] Ingest error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export const GET  = handle
export const POST = handle
