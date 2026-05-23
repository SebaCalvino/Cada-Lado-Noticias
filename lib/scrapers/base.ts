import Parser from 'rss-parser'
import { load } from 'cheerio'

export interface ArticleData {
  title: string
  url: string
  sourceSlug: string
  summary: string
  publishedAt: Date | null
  imageUrl: string
}

export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CadaLadoBot/1.0)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) return null
    const html = await res.text()
    const $ = load(html)
    const ogImage =
      $('meta[property="og:image"]').attr('content') ||
      $('meta[name="twitter:image"]').attr('content')
    return ogImage || null
  } catch {
    return null
  }
}

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure'],
  },
})

export async function scrapeRSS(
  rssUrl: string,
  sourceSlug: string
): Promise<ArticleData[]> {
  const feed = await parser.parseURL(rssUrl)
  const articles: ArticleData[] = []

  for (const item of (feed.items || []).slice(0, 30)) {
    if (!item.title || !item.link) continue

    const summary = (item.contentSnippet || item.content || '').slice(0, 500)

    let imageUrl = ''
    const mc = (item as any)['media:content']
    const mt = (item as any)['media:thumbnail']
    const enc = item.enclosure

    if (mc?.$.url) {
      imageUrl = mc.$.url
    } else if (mt?.$.url) {
      imageUrl = mt.$.url
    } else if (enc?.url && /\.(jpg|jpeg|png|webp)$/i.test(enc.url)) {
      imageUrl = enc.url
    }

    articles.push({
      title: item.title.trim(),
      url: item.link.trim(),
      sourceSlug,
      summary,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      imageUrl,
    })
  }

  // Enrich images for articles without one (limit to 8)
  const noImage = articles.filter((a) => !a.imageUrl).slice(0, 8)
  await Promise.allSettled(
    noImage.map(async (a) => {
      a.imageUrl = (await fetchOgImage(a.url)) || ''
    })
  )

  return articles
}
