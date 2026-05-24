import { NextRequest, NextResponse } from 'next/server'
import { db, newsClusters } from '@/lib/db'
import { eq } from 'drizzle-orm'
import Parser from 'rss-parser'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

// Instancias públicas de Nitter — se prueba en orden hasta que una responda
const NITTER_INSTANCES = [
  'nitter.privacydev.net',
  'nitter.poast.org',
  'nitter.1d4.us',
  'nitter.unixfox.eu',
]

const STOP_WORDS = new Set([
  'de','la','que','el','en','y','a','los','del','se','las','por','un','para',
  'con','una','su','al','lo','como','más','pero','sus','le','ya','o','este',
  'sí','porque','esta','entre','cuando','muy','sin','sobre','también','me',
  'hasta','hay','donde','quien','desde','todo','nos','durante','todos','uno',
  'les','ni','contra','otros','ese','eso','ante','ellos','e','esto','antes',
  'algunos','qué','unos','yo','otro','otras','otra','él','tanto','esa',
  'estos','mucho','quienes','nada','muchos','cual','poco','ella','estar',
  'estas','alguno','alguna','aunque','siempre','fue','ser','es','son','han',
  'ha','tiene','tienen','había','será','están','puede','pueden','debe',
  'deben','tras','hacia','según','mediante',
])

/**
 * Extrae los términos más significativos del título del cluster
 * para armar la query de búsqueda en Twitter/X.
 */
function buildSearchQuery(title: string): string {
  const words = title
    .toLowerCase()
    .replace(/[¿¡]/g, '')
    .replace(/[^\wáéíóúñü\s]/gi, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w))

  // Tomar hasta 5 palabras clave, priorizando las más largas (más específicas)
  const keywords = [...words]
    .sort((a, b) => b.length - a.length)
    .slice(0, 5)

  return encodeURIComponent(keywords.join(' '))
}

/** Convierte una URL de Nitter a la URL real de X/Twitter */
function toTwitterUrl(nitterUrl: string): string {
  try {
    const url = new URL(nitterUrl)
    // /username/status/ID#m → https://x.com/username/status/ID
    const path = url.pathname.replace(/^\//, '').replace(/#.*$/, '')
    return `https://x.com/${path}`
  } catch {
    return nitterUrl
  }
}

/** Parsea el campo dc:creator de Nitter: "Nombre Apellido (@handle)" */
function parseCreator(creator: string): { displayName: string; username: string } {
  const match = creator.match(/^(.+?)\s*\(@([^)]+)\)\s*$/)
  if (match) return { displayName: match[1].trim(), username: match[2].trim() }
  const atOnly = creator.match(/^@?(\w+)$/)
  if (atOnly) return { displayName: creator, username: atOnly[1] }
  return { displayName: creator, username: 'usuario' }
}

const rssParser = new Parser({
  customFields: { item: ['dc:creator'] },
  timeout: 8000,
})

async function fetchNitterRSS(instance: string, query: string): Promise<ReturnType<Parser['parseURL']>> {
  const url = `https://${instance}/search/rss?q=${query}&f=tweets`
  // rss-parser usa fetch internamente, con timeout configurado arriba
  return rssParser.parseURL(url)
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) return NextResponse.json([])

  // Obtener el título del cluster para armar la búsqueda
  let clusterTitle = ''
  try {
    const [cluster] = await db
      .select({ title: newsClusters.title })
      .from(newsClusters)
      .where(eq(newsClusters.id, id))
    if (!cluster) return NextResponse.json([])
    clusterTitle = cluster.title
  } catch {
    return NextResponse.json([])
  }

  const query = buildSearchQuery(clusterTitle)
  const since = Date.now() - 24 * 60 * 60 * 1000 // últimas 24h

  // Intentar cada instancia de Nitter hasta obtener resultados
  let rawItems: Awaited<ReturnType<Parser['parseURL']>>['items'] = []
  for (const instance of NITTER_INSTANCES) {
    try {
      const feed = await fetchNitterRSS(instance, query)
      if (feed.items && feed.items.length > 0) {
        rawItems = feed.items
        console.log(`[nitter] ${instance} → ${feed.items.length} items`)
        break
      }
    } catch (err) {
      console.warn(`[nitter] ${instance} failed: ${err}`)
    }
  }

  if (rawItems.length === 0) {
    return NextResponse.json([])
  }

  // Filtrar por fecha (últimas 24h) y formatear
  const tweets = rawItems
    .filter(item => {
      if (!item.pubDate) return true
      return new Date(item.pubDate).getTime() > since
    })
    .slice(0, 8)
    .map(item => {
      const creator = (item as any)['dc:creator'] || item.creator || item.author || ''
      const { displayName, username } = parseCreator(creator)

      // El texto del tweet viene en contentSnippet (sin HTML) o en title
      let text = item.contentSnippet || item.title || ''
      // Nitter a veces incluye "Nombre (@handle): " al inicio del título
      text = text.replace(/^[\s\S]+?\(@[^)]+\):\s*/, '').trim()

      return {
        username,
        display_name:  displayName,
        text,
        tweet_url:     toTwitterUrl(item.link || ''),
        published_at:  item.pubDate || new Date().toISOString(),
      }
    })
    .filter(t => t.text.length > 15) // descartar tweets vacíos o muy cortos

  return NextResponse.json(tweets)
}
