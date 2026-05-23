import { NextRequest, NextResponse } from 'next/server'
import { db, newsClusters, clusterArticles, rawArticles, sources, clusterComments } from '@/lib/db'
import { eq } from 'drizzle-orm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id, 10)
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    // Fetch cluster
    const [cluster] = await db
      .select()
      .from(newsClusters)
      .where(eq(newsClusters.id, id))

    if (!cluster) {
      return NextResponse.json({ error: 'Cluster not found' }, { status: 404 })
    }

    // Fetch cluster articles with source info
    const articleRows = await db
      .select({
        ca: clusterArticles,
        article: rawArticles,
        source: sources,
      })
      .from(clusterArticles)
      .innerJoin(rawArticles, eq(rawArticles.id, clusterArticles.articleId))
      .innerJoin(sources, eq(sources.id, rawArticles.sourceId))
      .where(eq(clusterArticles.clusterId, id))

    // Fetch comments
    const comments = await db
      .select()
      .from(clusterComments)
      .where(eq(clusterComments.clusterId, id))

    const articles = articleRows.map(({ ca, article, source }) => ({
      source_slug: source.slug,
      source_name: source.name,
      source_color: source.color,
      article_title: article.title,
      article_url: article.url,
      coverage_percentage: ca.coveragePercentage,
      emphasis: ca.emphasis ?? null,
      omissions: ca.omissions ?? null,
      similarity_score: ca.similarityScore,
    }))

    const commentsOut = comments.map((c) => ({
      id: c.id,
      author: c.author ?? null,
      text: c.text,
      sentiment: c.sentiment ?? null,
      votes: c.votes,
      source_slug: c.sourceSlug,
    }))

    return NextResponse.json({
      id: cluster.id,
      title: cluster.title,
      synthesis: cluster.synthesis ?? null,
      key_facts: cluster.keyFacts ?? null,
      category: cluster.category ?? null,
      source_count: cluster.sourceCount,
      published_at: cluster.publishedAt?.toISOString() ?? null,
      articles,
      image_url: cluster.imageUrl ?? null,
      comments: commentsOut,
    })
  } catch (err) {
    console.error('/api/news/[id] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
