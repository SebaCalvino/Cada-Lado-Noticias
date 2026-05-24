/**
 * Manual cluster deletion endpoint.
 *
 * Deletes a single cluster by ID along with its cluster_articles rows.
 * The constituent raw_articles are preserved — they will re-enter the
 * eligible pool on the next cluster phase run.
 *
 * Usage:
 *   curl -X POST /api/pipeline/delete-cluster \
 *     -H "Authorization: Bearer $CRON_SECRET" \
 *     -H "Content-Type: application/json" \
 *     -d '{"id": 4}'
 *
 * Use this when a specific bad cluster survives the automatic cleanup
 * (e.g. because the automated score is marginal but the merge is clearly wrong).
 */

import { NextRequest, NextResponse } from 'next/server'
import { db, newsClusters, clusterArticles } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const runtime     = 'nodejs'
export const maxDuration = 15

function checkAuth(req: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = req.headers.get('authorization') ?? req.headers.get('x-cron-secret') ?? ''
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let id: number
  try {
    const body = await request.json()
    id = parseInt(body.id, 10)
    if (!Number.isFinite(id) || id <= 0) throw new Error('invalid id')
  } catch {
    return NextResponse.json(
      { error: 'Body must be JSON with a positive integer "id" field' },
      { status: 400 }
    )
  }

  // Verify the cluster exists before deleting
  const [cluster] = await db
    .select({ id: newsClusters.id, title: newsClusters.title })
    .from(newsClusters)
    .where(eq(newsClusters.id, id))

  if (!cluster) {
    return NextResponse.json(
      { error: `Cluster ${id} not found` },
      { status: 404 }
    )
  }

  // Delete links first (FK constraint), then the cluster
  const { rowCount: linksDeleted } = await db
    .delete(clusterArticles)
    .where(eq(clusterArticles.clusterId, id))

  await db
    .delete(newsClusters)
    .where(eq(newsClusters.id, id))

  console.log(
    `[delete-cluster] ✗ Deleted cluster ${id} ` +
    `(${linksDeleted ?? 0} article links removed) "${cluster.title?.slice(0, 60)}"`
  )

  return NextResponse.json({
    ok:           true,
    id,
    title:        cluster.title,
    linksDeleted: linksDeleted ?? 0,
    message:      `Cluster ${id} deleted. Articles re-enter the eligible pool on next cluster run.`,
  })
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed — use POST' }, { status: 405 })
}
