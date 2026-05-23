/* CADA LADO — RSS scrapers (TS port of backend/app/scrapers/*) */

import Parser from 'rss-parser'
import * as cheerio from 'cheerio'
import { SOURCES, type SourceMeta } from './sources'

/* ── Types ───────────────────────────────────────────────────────── */
export interface ScrapedArticle {
  sourceSlug:   string
  title:        string
  url:          string
  summary:      string
  publishedAt:  Date | null
  imageUrl:     string | null
}

/* ── Parser ──────────────────────────────────────────────────────── */
const parser = new Parser({
  timeout: 15_000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; CadaLadoBot/1.0; +https://cadalado.com.ar)',
    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
  },
  customFields: {
    item: [
      ['media:thumbnail', 'media:thumbnail'],
      ['media:content', 'media:content'],
    ],
  },
})

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'es-AR,es;q=0.9,en;q=0.6',
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function cleanHtml(html: string): string {
  if (!html) return ''
  try {
    const $ = cheerio.load(html)
    return $.root().text().replace(/\s+/g, ' ').trim()
  } catch {
    return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  }
}

function extractImageFromItem(item: unknown): string {
  const it = item as Record<string, unknown>

  // media:thumbnail
  const thumb = it['media:thumbnail'] as { $?: { url?: string } } | undefined
  if (thumb?.$?.url?.startsWith('http')) return thumb.$.url

  // media:content
  const mc = it['media:content'] as { $?: { url?: string } } | undefined
  if (mc?.$?.url?.startsWith('http')) return mc.$.url

  // enclosure
  const encl = it.enclosure as { url?: string; type?: string } | undefined
  if (encl?.url?.startsWith('http')) {
    const u = encl.url.toLowerCase()
    if (u.endsWith('.jpg') || u.endsWith('.jpeg') || u.endsWith('.png') || u.endsWith('.webp')) {
      return encl.url
    }
  }

  // Try to find image inside content:encoded
  const content = (it['content:encoded'] || it.content || '') as string
  if (content) {
    const match = content.match(/<img[^>]+src="([^"]+)"/i)
    if (match?.[1]?.startsWith('http')) return match[1]
  }

  return ''
}

/**
 * Fetch og:image from article HTML.
 * Only called if RSS didn't give us an image — kept short timeout to stay within Vercel limits.
 */
export async function fetchOgImage(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    const resp = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: 'follow',
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!resp.ok) return null
    const html = await resp.text()
    const $ = cheerio.load(html)

    for (const prop of ['og:image', 'og:image:url', 'og:image:secure_url', 'twitter:image', 'twitter:image:src']) {
      const content =
        $(`meta[property="${prop}"]`).attr('content') ||
        $(`meta[name="${prop}"]`).attr('content')
      if (content && content.startsWith('http')) return content
    }

    const linkSrc = $('link[rel="image_src"]').attr('href')
    if (linkSrc?.startsWith('http')) return linkSrc

    // Fallback: first <img> with a recognizable extension
    const img = $('img').toArray().find(el => {
      const src = ($(el).attr('src') || $(el).attr('data-src') || '').toLowerCase()
      return src.startsWith('http') && /\.(jpg|jpeg|png|webp|avif)(\?|$)/.test(src)
    })
    if (img) {
      const src = $(img).attr('src') || $(img).attr('data-src')
      if (src) return src
    }
  } catch {
    /* silent */
  }
  return null
}

/* ── Per-source scrape ───────────────────────────────────────────── */
async function scrapeRss(source: SourceMeta): Promise<ScrapedArticle[]> {
  try {
    const feed = await parser.parseURL(source.rssUrl)
    const out: ScrapedArticle[] = []
    for (const item of feed.items.slice(0, 30)) {
      const title = (item.title || '').trim()
      const url = (item.link || '').trim()
      if (!title || !url) continue

      const summary = cleanHtml(item.contentSnippet || item.summary || (item as unknown as Record<string, string>).description || '').slice(0, 500)
      const publishedAt = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : null)

      const imageUrl = extractImageFromItem(item)

      out.push({
        sourceSlug:   source.slug,
        title,
        url,
        summary,
        publishedAt,
        imageUrl: imageUrl || null,
      })
    }
    return out
  } catch (e) {
    console.error(`[${source.slug}] RSS scrape failed:`, (e as Error).message)
    return []
  }
}

/* ── Public entry: scrape ALL sources in parallel ────────────────── */
export async function scrapeAllSources(): Promise<ScrapedArticle[]> {
  const results = await Promise.allSettled(SOURCES.map(s => scrapeRss(s)))
  const all: ScrapedArticle[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }
  console.log(`Scraped ${all.length} articles from ${SOURCES.length} sources`)
  return all
}

/* ── Enrich missing images in parallel batches ───────────────────── */
export async function enrichImages(articles: ScrapedArticle[], batchSize = 8): Promise<void> {
  const missing = articles.filter(a => !a.imageUrl)
  for (let i = 0; i < missing.length; i += batchSize) {
    const batch = missing.slice(i, i + batchSize)
    const imgs = await Promise.all(batch.map(a => fetchOgImage(a.url)))
    batch.forEach((a, idx) => { if (imgs[idx]) a.imageUrl = imgs[idx] })
  }
}
