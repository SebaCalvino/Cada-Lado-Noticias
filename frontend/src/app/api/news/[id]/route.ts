import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { newsClusters, clusterArticles, clusterComments, rawArticles, sources } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

  try {
    const [cluster] = await db.select().from(newsClusters).where(eq(newsClusters.id, id)).limit(1)
    if (!cluster) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const articles = await db
      .select({
        sourceSlug:         sources.slug,
        sourceName:         sources.name,
        sourceColor:        sources.color,
        articleTitle:       rawArticles.title,
        articleUrl:         rawArticles.url,
        articleImageUrl:    rawArticles.imageUrl,
        coveragePercentage: clusterArticles.coveragePercentage,
        emphasis:           clusterArticles.emphasis,
        omissions:          clusterArticles.omissions,
        similarityScore:    clusterArticles.similarityScore,
      })
      .from(clusterArticles)
      .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .innerJoin(sources,     eq(sources.id, rawArticles.sourceId))
      .where(eq(clusterArticles.clusterId, id))

    const comments = await db.select().from(clusterComments).where(eq(clusterComments.clusterId, id))

    return NextResponse.json({
      id:           cluster.id,
      title:        cluster.title,
      synthesis:    cluster.synthesis,
      key_facts:    cluster.keyFacts ?? [],
      category:     cluster.category,
      source_count: cluster.sourceCount,
      published_at: cluster.publishedAt,
      image_url:    cluster.imageUrl,
      articles: articles.map(a => ({
        source_slug:          a.sourceSlug,
        source_name:          a.sourceName,
        source_color:         a.sourceColor,
        article_title:        a.articleTitle,
        article_url:          a.articleUrl,
        article_image_url:    a.articleImageUrl,
        coverage_percentage:  a.coveragePercentage,
        emphasis:             a.emphasis,
        omissions:            a.omissions,
        similarity_score:     a.similarityScore,
      })),
      comments: comments.map(c => ({
        id:          c.id,
        author:      c.author,
        text:        c.text,
        sentiment:   c.sentiment,
        votes:       c.votes,
        source_slug: c.sourceSlug,
      })),
    })
  } catch (e) {
    console.error('GET /api/news/[id] failed:', e)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
