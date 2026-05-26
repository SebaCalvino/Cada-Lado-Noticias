/**
 * POST /api/admin/reset-singletons
 *
 * Resetea a clustered=false los artículos recientes que quedaron como singletons
 * (marcados clustered=true pero que nunca entraron a ningún cluster).
 *
 * Útil para re-procesar artículos que el algoritmo viejo descartó por el bug
 * de batches aislados. Después de llamar esto, el próximo pipeline run los
 * incluirá automáticamente.
 *
 * Auth: Bearer <CRON_SECRET> o X-Cron-Secret: <CRON_SECRET>
 * Body (opcional): { "hours": 72 }  — ventana de tiempo a resetear (default 48h)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db, rawArticles, clusterArticles } from '@/lib/db'
import { eq, gte, and, inArray } from 'drizzle-orm'

export const runtime = 'nodejs'

function checkAuth(request: NextRequest): boolean {
  if (!process.env.CRON_SECRET) return true
  const auth = request.headers.get('authorization') || request.headers.get('x-cron-secret')
  return auth === `Bearer ${process.env.CRON_SECRET}` || auth === process.env.CRON_SECRET
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let hours = 48
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.hours === 'number' && body.hours > 0 && body.hours <= 168) {
      hours = body.hours
    }
  } catch { /* ignorar */ }

  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000)

  // Artículos recientes que están en algún cluster (estos NO se tocan)
  const inClusterRows = await db
    .select({ articleId: clusterArticles.articleId })
    .from(clusterArticles)
  const inClusterIds = new Set(inClusterRows.map(r => r.articleId))

  // Artículos recientes marcados como procesados pero SIN cluster asignado (singletons)
  const singletonRows = await db
    .select({ id: rawArticles.id })
    .from(rawArticles)
    .where(and(gte(rawArticles.scrapedAt, cutoff), eq(rawArticles.clustered, true)))

  const singletonIds = singletonRows
    .map(r => r.id)
    .filter(id => !inClusterIds.has(id))

  if (singletonIds.length === 0) {
    return NextResponse.json({
      status: 'ok',
      reset: 0,
      message: 'No hay singletons para resetear en ese período',
    })
  }

  // Reset: poner clustered=false para que el próximo pipeline los procese
  await db
    .update(rawArticles)
    .set({ clustered: false })
    .where(inArray(rawArticles.id, singletonIds))

  console.log(`[reset-singletons] Reset ${singletonIds.length} singletons from last ${hours}h`)

  return NextResponse.json({
    status: 'ok',
    reset: singletonIds.length,
    hours,
    message: `${singletonIds.length} artículos reseteados. Corré el pipeline para re-procesarlos.`,
  })
}
