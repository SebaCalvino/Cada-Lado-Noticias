/**
 * Pipeline Phase 4 — Cleanup.
 *
 * Scores every published cluster (synthesis IS NOT NULL) against a TF-IDF
 * title-cosine + entity-overlap heuristic.  Clusters that score below
 * CLEANUP_QUALITY_THRESHOLD (0.06) are deleted along with their
 * cluster_articles rows, making their constituent articles eligible for
 * re-clustering on the next pipeline run.
 *
 * Clusters with source_count ≥ 3 are skipped — broad coverage from multiple
 * outlets is a strong editorial quality signal.
 *
 * This endpoint is NOT part of the automatic ingest → cluster → synthesize
 * chain.  It is intended to be called:
 *   - Manually via curl / admin dashboard to clean up historical bad clusters.
 *   - Optionally on a separate, less-frequent schedule (e.g. daily) to catch
 *     any bad clusters that slipped through the improved clustering logic.
 *
 * maxDuration = 120 s covers 100 clusters × ~1 DB round-trip each (~80 s p99).
 */

import { NextRequest, NextResponse } from 'next/server'
import { runCleanup, runArticlePrune } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 120   // 100 clusters × ~1 DB round-trip ≈ 80 s p99

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

  // Optional: override the default maxClusters cap via query param.
  // e.g.  POST /api/pipeline/cleanup?limit=200
  const url   = new URL(request.url)
  const limit = parseInt(url.searchParams.get('limit') ?? '100', 10)
  const maxClusters = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 500) : 100

  try {
    const [{ deleted, checked }, { pruned }] = await Promise.all([
      runCleanup(maxClusters),
      runArticlePrune(7),
    ])
    const cleanupMs = Date.now() - t0

    console.log(
      `[cleanup] Done in ${cleanupMs} ms — ${deleted} clusters deleted, ` +
      `${checked} checked, ${pruned} orphan articles pruned`
    )

    return NextResponse.json({
      ok:         true,
      deleted,
      checked,
      pruned,
      cleanupMs,
      message:    `Cleanup complete — ${deleted} clusters deleted, ${pruned} orphan articles pruned`,
    })
  } catch (err) {
    console.error('[cleanup] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed — use POST' }, { status: 405 })
}
