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

// Hard deadline per feed. rss-parser has no built-in timeout: if the RSS server
// accepts the TCP connection but never sends data, parseURL() hangs indefinitely
// and blocks that source's slot. We reject after FEED_TIMEOUT_MS and return [].
// In Vercel serverless, the lingering HTTP request is cleaned up on function exit.
const FEED_TIMEOUT_MS = 12_000

const parser = new Parser({
  customFields: {
    item: ['media:content', 'media:thumbnail', 'enclosure'],
  },
})

type FeedOutput = Awaited<ReturnType<typeof parser.parseURL>>

function parseWithTimeout(rssUrl: string): Promise<FeedOutput> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Feed timeout after ${FEED_TIMEOUT_MS / 1000}s`)),
      FEED_TIMEOUT_MS
    )
    parser.parseURL(rssUrl).then(
      (result) => { clearTimeout(timer); resolve(result) },
      (err)    => { clearTimeout(timer); reject(err) }
    )
  })
}

export async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; CadaLadoBot/1.0)' },
      signal: AbortSignal.timeout(8000),
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

export async function scrapeRSS(
  rssUrl: string,
  sourceSlug: string
): Promise<ArticleData[]> {
  let feed: FeedOutput
  try {
    feed = await parseWithTimeout(rssUrl)
  } catch (err) {
    // Feed failed (timeout, DNS error, malformed XML, …) → skip this source.
    // runAllScrapers() uses Promise.allSettled so other sources are unaffected.
    console.warn(`[scraper:${sourceSlug}] ✗ ${err instanceof Error ? err.message : String(err)}`)
    return []
  }

  const articles: ArticleData[] = []

  for (const item of (feed.items || []).slice(0, 30)) {
    if (!item.title || !item.link) continue

    const summary = (item.contentSnippet || item.content || '').slice(0, 500)

    let imageUrl = ''
    const mc  = (item as any)['media:content']
    const mt  = (item as any)['media:thumbnail']
    const enc = item.enclosure

    if (mc?.$.url) {
      imageUrl = mc.$.url
    } else if (mt?.$.url) {
      imageUrl = mt.$.url
    } else if (enc?.url && /\.(jpg|jpeg|png|webp)$/i.test(enc.url)) {
      imageUrl = enc.url
    }

    articles.push({
      title:       item.title.trim(),
      url:         item.link.trim(),
      sourceSlug,
      summary,
      publishedAt: item.pubDate ? new Date(item.pubDate) : null,
      imageUrl,
    })
  }

  // OG enrichment for articles missing an image. Concurrently fetched with an
  // 8s hard cap each, so this adds at most ~8s total (Promise.allSettled).
  // Capped at 5 articles to limit overhead on slow news nights.
  const noImage = articles.filter(a => !a.imageUrl).slice(0, 5)
  if (noImage.length > 0) {
    await Promise.allSettled(
      noImage.map(async (a) => {
        a.imageUrl = (await fetchOgImage(a.url)) || ''
      })
    )
  }

  return articles
}
