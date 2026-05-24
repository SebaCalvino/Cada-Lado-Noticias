/**
 * Pipeline Phase 3 — Synthesize.
 *
 * Finds up to `MAX_CLUSTERS` clusters whose synthesis is still null (created
 * by the cluster phase) and runs Groq to produce:
 *   • A neutral AI-generated title
 *   • A 500-700 word synthesis paragraph
 *   • 5 key facts
 *   • A category label
 *   • Per-source emphasis / omissions analysis
 *
 * Results are written back into news_clusters and cluster_articles in place.
 *
 * If synthesis fails for a cluster (Groq error, malformed JSON, etc.), the
 * cluster record and its cluster_articles links are DELETED so the constituent
 * articles re-enter the eligible pool on the next run.  This is safer than
 * storing a half-baked record that users would see.
 *
 * Rate limiting: 2.2 s between Groq calls keeps throughput at ~27 req/min,
 * safely under Groq's 30 RPM limit.  10 clusters × ~8 s total per call ≈ 80 s
 * — well within maxDuration = 120 s.
 *
 * Accepts POST only (same pattern as the cluster phase).
 */

import { NextRequest, NextResponse } from 'next/server'
import { runSynthesize } from '@/lib/pipeline'

export const runtime     = 'nodejs'
export const maxDuration = 120  // 10 clusters × ~10 s each (delay + API call)

// Limit per invocation.  Keeps execution within maxDuration even if a large
// backlog of pending clusters exists.  The next cron run will continue from
// where this one left off.
const MAX_CLUSTERS = 10

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
    const { synthesized, failed } = await runSynthesize(MAX_CLUSTERS)
    const synthesizeMs = Date.now() - t0

    console.log(`[synthesize] Done in ${synthesizeMs} ms — ${synthesized} synthesized, ${failed} failed/deleted`)

    return NextResponse.json({
      ok:           true,
      synthesized,
      failed,
      synthesizeMs,
    })
  } catch (err) {
    console.error('[synthesize] Error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed — use POST' }, { status: 405 })
}
