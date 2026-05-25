/**
 * Dynamic sitemap.xml — Next.js App Router native support.
 *
 * Includes:
 *  - Static pages (home, /noticias, /fuentes, /about, /terms, /privacy)
 *  - Every published cluster as /noticias/[slug]-[id]
 *
 * Google fetches this at /sitemap.xml automatically.
 */

import { MetadataRoute } from 'next'
import { db, newsClusters } from '@/lib/db'
import { isNotNull, ne, and, desc } from 'drizzle-orm'
import { noticiaHref } from '@/lib/utils'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cada-lado-noticias.vercel.app'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: SITE_URL,               lastModified: new Date(), changeFrequency: 'hourly',  priority: 1.0 },
    { url: `${SITE_URL}/noticias`, lastModified: new Date(), changeFrequency: 'hourly',  priority: 0.9 },
    { url: `${SITE_URL}/fuentes`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE_URL}/about`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.4 },
    { url: `${SITE_URL}/terms`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${SITE_URL}/privacy`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  // Published clusters
  let clusters: MetadataRoute.Sitemap = []
  try {
    const rows = await db
      .select({ id: newsClusters.id, title: newsClusters.title, publishedAt: newsClusters.publishedAt })
      .from(newsClusters)
      .where(
        and(
          isNotNull(newsClusters.synthesis),
          ne(newsClusters.synthesis, '')
        )
      )
      .orderBy(desc(newsClusters.publishedAt))

    clusters = rows.map(c => ({
      url:             `${SITE_URL}${noticiaHref(c.id, c.title ?? '')}`,
      lastModified:    c.publishedAt ?? new Date(),
      changeFrequency: 'weekly' as const,
      priority:        0.8,
    }))
  } catch (err) {
    console.error('[sitemap] Failed to fetch clusters:', err)
  }

  return [...staticPages, ...clusters]
}
