import { NextRequest, NextResponse } from 'next/server'
import { db, newsClusters, clusterArticles, rawArticles } from '@/lib/db'
import { eq, inArray } from 'drizzle-orm'

export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { ids } = await request.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    const articles = await db
      .select({ articleId: clusterArticles.articleId })
      .from(clusterArticles)
      .where(inArray(clusterArticles.clusterId, ids))

    for (const { articleId } of articles) {
      await db.update(rawArticles).set({ clustered: false }).where(eq(rawArticles.id, articleId))
    }

    await db.delete(clusterArticles).where(inArray(clusterArticles.clusterId, ids))
    await db.delete(newsClusters).where(inArray(newsClusters.id, ids))

    return NextResponse.json({ deleted: ids.length })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
