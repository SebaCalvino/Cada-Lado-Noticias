/* CADA LADO — Source metadata (ported from backend pipeline.SOURCES_METADATA) */

export interface SourceMeta {
  slug:           string
  name:           string
  url:            string
  rssUrl:         string
  color:          string
  ideologyScore:  number   // -1 izq, 0 centro, +1 der
  ideologyLabel:  string
}

export const SOURCES: SourceMeta[] = [
  { slug: 'clarin',      name: 'Clarín',              url: 'https://www.clarin.com',              rssUrl: 'https://www.clarin.com/rss/lo-ultimo/',                 color: '#004B87', ideologyScore:  0.3, ideologyLabel: 'Centro-derecha' },
  { slug: 'lanacion',    name: 'La Nación',            url: 'https://www.lanacion.com.ar',         rssUrl: 'https://www.lanacion.com.ar/arc/outboundfeeds/rss/',    color: '#1A3A5C', ideologyScore:  0.6, ideologyLabel: 'Centro-derecha' },
  { slug: 'infobae',     name: 'Infobae',              url: 'https://www.infobae.com',             rssUrl: 'https://www.infobae.com/arc/outboundfeeds/rss/',        color: '#E30613', ideologyScore:  0.2, ideologyLabel: 'Centro' },
  { slug: 'pagina12',    name: 'Página 12',            url: 'https://www.pagina12.com.ar',         rssUrl: 'https://www.pagina12.com.ar/rss/secciones/el-pais',     color: '#1A1A1A', ideologyScore: -0.7, ideologyLabel: 'Izquierda' },
  { slug: 'ambito',      name: 'Ámbito',               url: 'https://www.ambito.com',              rssUrl: 'https://www.ambito.com/rss/pages/home.xml',             color: '#FF6B00', ideologyScore:  0.1, ideologyLabel: 'Centro' },
  { slug: 'cronista',    name: 'El Cronista',          url: 'https://www.cronista.com',            rssUrl: 'https://www.cronista.com/feed/',                        color: '#2C7BB6', ideologyScore:  0.2, ideologyLabel: 'Centro' },
  { slug: 'perfil',      name: 'Perfil',               url: 'https://www.perfil.com',              rssUrl: 'https://www.perfil.com/?feed=rss2',                     color: '#8B0000', ideologyScore: -0.1, ideologyLabel: 'Centro' },
  { slug: 'laizquierda', name: 'La Izquierda Diario',  url: 'https://www.laizquierdadiario.com',   rssUrl: 'https://www.laizquierdadiario.com/spip.php?page=backend', color: '#CC0000', ideologyScore: -0.8, ideologyLabel: 'Izquierda' },
  { slug: 'tn',          name: 'TN',                   url: 'https://tn.com.ar',                   rssUrl: 'https://tn.com.ar/rss.xml',                             color: '#005BAC', ideologyScore:  0.2, ideologyLabel: 'Centro' },
  { slug: 'eldestape',   name: 'El Destape',           url: 'https://www.eldestapeweb.com',        rssUrl: 'https://www.eldestapeweb.com/feed',                     color: '#e53e3e', ideologyScore: -0.5, ideologyLabel: 'Centro-izquierda' },
  { slug: 'mdzol',       name: 'MDZ Online',           url: 'https://www.mdzol.com',               rssUrl: 'https://www.mdzol.com/rss/noticias.xml',                color: '#0077b6', ideologyScore:  0.0, ideologyLabel: 'Centro' },
  { slug: 'minutouno',   name: 'Minuto Uno',           url: 'https://www.minutouno.com',           rssUrl: 'https://www.minutouno.com/rss.xml',                     color: '#e67e22', ideologyScore: -0.2, ideologyLabel: 'Centro' },
]

export const SOURCES_BY_SLUG: Record<string, SourceMeta> = Object.fromEntries(
  SOURCES.map(s => [s.slug, s])
)
