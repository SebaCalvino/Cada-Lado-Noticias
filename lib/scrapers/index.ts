import { scrapeRSS, type ArticleData } from './base'

export { type ArticleData } from './base'

// RSS URLs last verified: 2026-05-25
// To re-verify: fetch each URL and confirm it returns valid RSS/XML with <item> tags.
export const SCRAPERS = [
  // ── Verified working ────────────────────────────────────────────────────────
  { slug: 'clarin',      rssUrl: 'https://www.clarin.com/rss/lo-ultimo/' },
  { slug: 'lanacion',    rssUrl: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/' },
  { slug: 'infobae',     rssUrl: 'https://www.infobae.com/arc/outboundfeeds/rss/' },
  { slug: 'pagina12',    rssUrl: 'https://www.pagina12.com.ar/arc/outboundfeeds/rss/secciones/el-pais/notas' },
  { slug: 'ambito',      rssUrl: 'https://www.ambito.com/rss/pages/ultimas-noticias.xml' },
  { slug: 'cronista',    rssUrl: 'https://www.cronista.com/files/rss/news.xml' },
  { slug: 'perfil',      rssUrl: 'https://www.perfil.com/feed/' },
  { slug: 'laizquierda', rssUrl: 'https://www.laizquierdadiario.com/spip.php?page=backend' },
  { slug: 'mdzol',       rssUrl: 'https://www.mdzol.com/rss/pages/noticias.xml' },
  // ── Unverified — may work from Vercel even if blocked by some proxies ──────
  { slug: 'tn',          rssUrl: 'https://tn.com.ar/rss/todas_las_noticias.xml' },
  // ── Disabled — RSS discontinued or not publicly accessible (2026-05-25) ────
  // { slug: 'eldestape',   rssUrl: '' },   // eldestapeweb.com removed public RSS
  // { slug: 'minutouno',   rssUrl: '' },   // minutouno.com removed public RSS
]

export async function runAllScrapers(): Promise<
  { slug: string; articles: ArticleData[] }[]
> {
  const results = await Promise.allSettled(
    SCRAPERS.map(async ({ slug, rssUrl }) => {
      const articles = await scrapeRSS(rssUrl, slug)
      return { slug, articles }
    })
  )

  return results.flatMap((r) => {
    if (r.status === 'fulfilled') return [r.value]
    console.error('Scraper failed:', r.reason)
    return []
  })
}
