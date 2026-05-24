import { scrapeRSS, type ArticleData } from './base'

export { type ArticleData } from './base'

export const SCRAPERS = [
  { slug: 'clarin',      rssUrl: 'https://www.clarin.com/rss/lo-ultimo/' },
  { slug: 'lanacion',    rssUrl: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/' },
  { slug: 'infobae',     rssUrl: 'https://www.infobae.com/feeds/rss/' },
  { slug: 'pagina12',    rssUrl: 'https://www.pagina12.com.ar/rss/portada' },
  { slug: 'ambito',      rssUrl: 'https://www.ambito.com/rss' },
  { slug: 'cronista',    rssUrl: 'https://www.cronista.com/rss/ultimas-noticias/' },
  { slug: 'perfil',      rssUrl: 'https://www.perfil.com/feed/' },
  { slug: 'laizquierda', rssUrl: 'https://www.laizquierdadiario.com/spip.php?page=backend' },
  { slug: 'tn',          rssUrl: 'https://tn.com.ar/rss/todas_las_noticias.xml' },
  { slug: 'eldestape',   rssUrl: 'https://www.eldestapeweb.com/rss/home.xml' },
  { slug: 'mdzol',       rssUrl: 'https://www.mdzol.com/rss' },
  { slug: 'minutouno',   rssUrl: 'https://www.minutouno.com/rss' },
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
