import { NextRequest, NextResponse } from 'next/server'
import { Groq } from 'groq-sdk'
import { db, newsClusters, clusterArticles, rawArticles, sources } from '@/lib/db'
import { eq } from 'drizzle-orm'

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY })

async function validateCluster(
  title: string,
  synthesis: string,
  articles: Array<{ title: string; summary: string; source: string }>,
  avgSim: number
): Promise<{ valid: boolean; confidence: number; reason: string }> {
  const prompt = `Validate if these news articles belong in ONE cluster.

CLUSTER: "${title}"
SYNTHESIS: ${synthesis || 'N/A'}
AVG SIMILARITY: ${avgSim.toFixed(2)}

Articles:
${articles.map((a, i) => `${i + 1}. [${a.source}] ${a.title}\n${a.summary}`).join('\n\n')}

RULES:
1. All must discuss SAME primary event
2. Different perspectives on same event = OK
3. Same topic, different events = NO
4. Respond JSON: {"valid": bool, "confidence": 0-1, "reason": "brief"}
5. Default to valid=false if uncertain`

  try {
    const msg = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = msg.choices[0]?.message?.content ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return { valid: false, confidence: 0, reason: 'Parse error' }

    const r = JSON.parse(match[0])
    return {
      valid: r.valid ?? false,
      confidence: Math.min(1, Math.max(0, r.confidence ?? 0)),
      reason: r.reason ?? 'No reason',
    }
  } catch (e) {
    return { valid: false, confidence: 0, reason: 'AI error' }
  }
}

export async function POST(request: NextRequest) {
  const { action } = await request.json()

  if (action === 'validate-all') {
    const clusters = await db
      .select({ id: newsClusters.id, title: newsClusters.title, synthesis: newsClusters.synthesis })
      .from(newsClusters)

    const results = []
    const badIds = []

    for (const cluster of clusters) {
      const articles = await db
        .select({
          title: rawArticles.title,
          summary: rawArticles.summary,
          slug: sources.slug,
          similarityScore: clusterArticles.similarityScore,
        })
        .from(clusterArticles)
        .innerJoin(rawArticles, eq(clusterArticles.articleId, rawArticles.id))
        .innerJoin(sources, eq(rawArticles.sourceId, sources.id))
        .where(eq(clusterArticles.clusterId, cluster.id))

      const avgSim = articles.reduce((s, a) => s + a.similarityScore, 0) / articles.length

      const validation = await validateCluster(
        cluster.title,
        cluster.synthesis || '',
        articles.map((a) => ({ title: a.title, summary: a.summary || '', source: a.slug })),
        avgSim
      )

      results.push({
        id: cluster.id,
        title: cluster.title,
        valid: validation.valid,
        confidence: validation.confidence,
        reason: validation.reason,
      })

      if (!validation.valid) badIds.push(cluster.id)
      await new Promise((r) => setTimeout(r, 1000))
    }

    // Delete bad clusters
    for (const cid of badIds) {
      const arts = await db
        .select({ articleId: clusterArticles.articleId })
        .from(clusterArticles)
        .where(eq(clusterArticles.clusterId, cid))

      for (const { articleId } of arts) {
        await db.update(rawArticles).set({ clustered: false }).where(eq(rawArticles.id, articleId))
      }

      await db.delete(clusterArticles).where(eq(clusterArticles.clusterId, cid))
      await db.delete(newsClusters).where(eq(newsClusters.id, cid))
    }

    return NextResponse.json({
      total: clusters.length,
      valid: results.filter((r) => r.valid).length,
      invalid: badIds.length,
      results,
      deleted: badIds,
    })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
