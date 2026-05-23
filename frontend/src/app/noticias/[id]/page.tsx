import { Fragment } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Layers, BookOpen } from 'lucide-react'
import { getNewsDetail, getNews } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import CoverageBar from '@/components/CoverageBar'
import CommentsSection from '@/components/CommentsSection'
import XOpinions from '@/components/XOpinions'
import MediaStatsChart from '@/components/MediaStatsChart'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

const CATEGORY_ACCENT: Record<string, string> = {
  'Política':       '#1d4ed8',
  'Economía':       '#059669',
  'Sociedad':       '#7c3aed',
  'Seguridad':      '#dc2626',
  'Internacional':  '#4338ca',
  'Deportes':       '#d97706',
  'Cultura':        '#db2777',
  'Tecnología':     '#0891b2',
  'Ambiente':       '#0d9488',
}

const CATEGORY_BADGE: Record<string, string> = {
  'Política':       'bg-blue-500',
  'Economía':       'bg-emerald-500',
  'Sociedad':       'bg-violet-500',
  'Seguridad':      'bg-red-500',
  'Internacional':  'bg-indigo-500',
  'Deportes':       'bg-orange-500',
  'Cultura':        'bg-pink-500',
  'Tecnología':     'bg-cyan-500',
  'Ambiente':       'bg-teal-500',
}

function estimateReadingTime(text: string | null): number {
  if (!text) return 1
  return Math.max(1, Math.ceil(text.trim().split(/\s+/).length / 200))
}

// Bold numbers, quoted phrases, and key terms inline
function HighlightText({ text }: { text: string }) {
  // Split on: numbers/currencies, quoted text (with Spanish quotes too)
  const parts = text.split(/((?:\$\s?)?\d[\d.,]*(?:\s*(?:%|millones?|mil millones?|trillones?|bn\.?))?|"[^"]{5,80}"|«[^»]{5,80}»)/gi)
  return (
    <>
      {parts.map((part, i) => {
        if (/^[\d$]/.test(part)) {
          return <strong key={i} className="font-semibold text-gray-900 tabular-nums">{part}</strong>
        }
        if (/^["«]/.test(part)) {
          return <strong key={i} className="font-semibold text-gray-800">{part}</strong>
        }
        return <Fragment key={i}>{part}</Fragment>
      })}
    </>
  )
}

export default async function NoticiaDetailPage({ params }: Props) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) notFound()

  let cluster
  try {
    cluster = await getNewsDetail(id)
  } catch {
    notFound()
  }

  let relatedClusters: Awaited<ReturnType<typeof getNews>> = []
  try {
    const allNews = await getNews(1)
    relatedClusters = allNews.filter(c => c.id !== cluster.id).slice(0, 3)
  } catch {
    // ignore
  }

  const accentColor = CATEGORY_ACCENT[cluster.category ?? ''] ?? '#374151'
  const badgeColor  = CATEGORY_BADGE[cluster.category ?? '']  ?? 'bg-gray-500'
  const readingTime = estimateReadingTime(cluster.synthesis)
  const paragraphs  = cluster.synthesis ? cluster.synthesis.split(/\n\n+/).filter(p => p.trim()) : []

  // Pick a pull-quote: first key fact that's long enough to be interesting
  const pullQuote = cluster.key_facts?.find(f => f.length > 60) ?? null

  // Collect unique article images from source articles (excluding the hero)
  const extraImages: string[] = []
  const seenImgs = new Set<string>(cluster.image_url ? [cluster.image_url] : [])
  for (const art of cluster.articles) {
    const img = art.article_image_url
    if (img && !seenImgs.has(img)) {
      seenImgs.add(img)
      extraImages.push(img)
    }
  }

  return (
    <div>
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 pt-5">
        <Link
          href="/noticias"
          className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-700 transition-colors font-medium"
        >
          <ArrowLeft size={15} /> Volver a noticias
        </Link>
      </div>

      {/* Hero section */}
      {cluster.image_url ? (
        <section
          className="relative text-white mt-4 bg-cover bg-center"
          style={{ backgroundImage: `url(${cluster.image_url})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20" />
          <div className="relative max-w-6xl mx-auto px-4 py-14 md:py-20">
            <span className={`inline-block ${badgeColor} text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5`}>
              {cluster.category ?? 'General'}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold leading-tight max-w-4xl drop-shadow-sm">
              {cluster.title}
            </h1>
          </div>
        </section>
      ) : (
        <section
          className="bg-[#0f172a] text-white mt-4"
          style={{ borderTop: `4px solid ${accentColor}` }}
        >
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <span className={`inline-block ${badgeColor} text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-5`}>
              {cluster.category ?? 'General'}
            </span>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-serif font-bold leading-tight max-w-4xl">
              {cluster.title}
            </h1>
          </div>
        </section>
      )}

      {/* Metadata bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock size={13} />
            <span>{timeAgo(cluster.published_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen size={13} />
            <span>{readingTime} min de lectura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers size={13} />
            <span>{cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}</span>
          </div>
        </div>
      </div>

      {/* Ad placeholder */}
      <div className="max-w-6xl mx-auto px-4 my-5">
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg h-16 flex items-center justify-center text-gray-300 text-xs font-semibold uppercase tracking-widest">
          Publicidad
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">

          {/* Main column */}
          <main className="lg:w-[65%] min-w-0">

            {/* Synthesis article */}
            {paragraphs.length > 0 && (
              <article className="mb-10">
                {/* Section label */}
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
                  <span className="w-5 h-5 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-[10px] font-bold leading-none">IA</span>
                  </span>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
                    Síntesis neutral · generada por IA
                  </span>
                </div>

                {/* Paragraphs with hooks */}
                <div>
                  {paragraphs.map((para, i) => {
                    const trimmed = para.trim()
                    const showPullQuote = i === 2 && pullQuote
                    // Insert an image every 2 paragraphs starting at paragraph 1
                    // imgIdx: which extra image to show (0, 1, 2...)
                    const imgSlot = i >= 1 && i % 2 === 1 ? Math.floor((i - 1) / 2) : -1
                    const inlineImg = imgSlot >= 0 ? extraImages[imgSlot] ?? null : null
                    return (
                      <Fragment key={i}>
                        {/* Inline image — TN / La Nación style, between paragraphs */}
                        {inlineImg && (
                          <figure className="my-7 clear-both">
                            <img
                              src={inlineImg}
                              alt={cluster.title}
                              className="w-full object-cover rounded max-h-80"
                            />
                            <figcaption className="text-xs text-gray-400 mt-2 text-center italic">
                              {cluster.title}
                            </figcaption>
                          </figure>
                        )}
                        {/* Pull quote after 3rd paragraph */}
                        {showPullQuote && (
                          <blockquote className="my-7 pl-5 border-l-4 border-brand-500 clear-both">
                            <p className="text-lg md:text-xl font-serif italic text-gray-600 leading-snug">
                              "{pullQuote}"
                            </p>
                          </blockquote>
                        )}
                        <p
                          className={
                            i === 0
                              ? 'text-xl md:text-2xl font-serif font-medium text-gray-900 leading-relaxed mb-6 first-letter:text-[4.5rem] first-letter:font-serif first-letter:font-bold first-letter:float-left first-letter:leading-[0.8] first-letter:mr-2 first-letter:mt-1'
                              : 'text-[16px] md:text-[17px] text-gray-700 leading-[1.9] mb-7 indent-6 max-w-[70ch]'
                          }
                        >
                          <HighlightText text={trimmed} />
                        </p>
                        {i === 0 && <hr className="my-6 border-gray-100" />}
                      </Fragment>
                    )
                  })}
                </div>
              </article>
            )}

            {/* Stats charts — neutral, all cards on the table */}
            {cluster.articles.length > 0 && (
              <MediaStatsChart articles={cluster.articles} />
            )}

            {/* X opinions - client component, loads asynchronously */}
            <XOpinions clusterId={cluster.id} />

            {/* Per-source coverage */}
            {cluster.articles.length > 0 && (
              <section className="mt-10 pt-6 border-t-2 border-gray-900">
                <h2 className="font-serif font-bold text-2xl text-gray-900 mb-2">
                  Lo que dijo cada medio
                </h2>
                <p className="text-sm text-gray-500 mb-5">Qué enfatizó cada diario y qué omitió deliberadamente</p>
                <div className="space-y-4">
                  {cluster.articles.map(article => (
                    <CoverageBar key={article.source_slug} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* Reader comments */}
            {cluster.comments && cluster.comments.length > 0 && (
              <CommentsSection comments={cluster.comments} />
            )}
          </main>

          {/* Sidebar */}
          <aside className="lg:w-[35%]">
            <div className="sticky top-8 space-y-8">

              {/* Key facts — TN-style numbered list */}
              {cluster.key_facts && cluster.key_facts.length > 0 && (
                <div>
                  <div className="flex items-center gap-2.5 mb-5 pb-3 border-b-2 border-gray-900">
                    <span className="w-3 h-3 bg-cada-blue shrink-0" />
                    <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest">
                      Puntos clave
                    </h3>
                  </div>
                  <ol className="divide-y divide-gray-100">
                    {cluster.key_facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-4 py-4 first:pt-0">
                        <span className="shrink-0 text-2xl font-black text-cada-blue leading-none w-7 text-right tabular-nums">
                          {i + 1}
                        </span>
                        <p className="text-[14px] text-gray-700 leading-snug font-medium pt-0.5">
                          {fact}
                        </p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Ideology spectrum */}
              {cluster.articles.length > 0 && (() => {
                const IDEOLOGY: Record<string, { score: number; label: string }> = {
                  clarin:       { score:  0.3, label: 'Centro-derecha' },
                  lanacion:     { score:  0.6, label: 'Centro-derecha' },
                  infobae:      { score:  0.2, label: 'Centro' },
                  pagina12:     { score: -0.7, label: 'Izquierda' },
                  ambito:       { score:  0.1, label: 'Centro' },
                  cronista:     { score:  0.2, label: 'Centro' },
                  perfil:       { score: -0.1, label: 'Centro' },
                  laizquierda:  { score: -0.8, label: 'Izquierda' },
                  tn:           { score:  0.2, label: 'Centro' },
                  eldestape:    { score: -0.5, label: 'Centro-izquierda' },
                  mdzol:        { score:  0.0, label: 'Centro' },
                  minutouno:    { score: -0.2, label: 'Centro' },
                }
                const sorted = [...cluster.articles]
                  .map(a => ({
                    slug: a.source_slug,
                    name: a.source_name,
                    score: IDEOLOGY[a.source_slug]?.score ?? 0,
                    label: IDEOLOGY[a.source_slug]?.label ?? 'Centro',
                  }))
                  .sort((a, b) => a.score - b.score)
                const n = sorted.length
                const withColor = sorted.map((s, i) => ({
                  ...s,
                  dotColor: n === 1
                    ? 'hsl(135,80%,42%)'
                    : `hsl(${240 - (i / (n - 1)) * 210},85%,48%)`,
                }))
                return (
                  <div>
                    <div className="flex items-center gap-2.5 mb-5 pb-3 border-b-2 border-gray-900">
                      <span className="w-3 h-3 bg-cada-blue shrink-0" />
                      <h3 className="font-bold text-gray-900 text-sm uppercase tracking-widest">
                        Espectro ideológico
                      </h3>
                    </div>
                    <div className="relative mb-5">
                      <div className="flex justify-between text-[11px] text-gray-400 mb-2 font-mono">
                        <span>← Izq.</span>
                        <span>Der. →</span>
                      </div>
                      <div
                        className="h-2.5 rounded-full"
                        style={{ background: 'linear-gradient(to right, #2563eb, #9ca3af, #dc2626)' }}
                      />
                      {withColor.map(s => (
                        <div
                          key={s.slug}
                          title={`${s.name} · ${s.label}`}
                          className="absolute top-[22px] -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md cursor-default"
                          style={{ left: `${((s.score + 1) / 2) * 100}%`, backgroundColor: s.dotColor }}
                        />
                      ))}
                    </div>
                    <ul className="mt-7 divide-y divide-gray-100">
                      {withColor.map(s => (
                        <li key={s.slug} className="flex items-center justify-between py-2.5 first:pt-0">
                          <span className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.dotColor }} />
                            <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                          </span>
                          <span className="text-xs text-gray-400">{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })()}

              {/* Sidebar ad */}
              <div className="border border-dashed border-gray-200 h-32 flex items-center justify-center text-gray-300 text-[10px] font-semibold uppercase tracking-widest">
                Espacio publicitario
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Te puede interesar — TN-style horizontal cards */}
      {relatedClusters.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-200 py-10">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-serif font-bold text-xl text-gray-900 mb-5 uppercase tracking-wide">
              Te puede interesar
            </h2>
            <div className="space-y-4">
              {relatedClusters.map(related => {
                const relatedBadge = CATEGORY_BADGE[related.category ?? ''] ?? 'bg-gray-500'
                return (
                  <Link
                    key={related.id}
                    href={`/noticias/${related.id}`}
                    className="group flex items-stretch gap-5 bg-white border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all overflow-hidden"
                  >
                    {/* Thumbnail — large like TN */}
                    <div className="shrink-0 w-44 sm:w-72 md:w-80 h-32 sm:h-44 bg-gray-100 overflow-hidden">
                      {related.image_url ? (
                        <img
                          src={related.image_url}
                          alt={related.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                          <span className={`w-12 h-12 rounded-full ${relatedBadge} opacity-40`} />
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 py-4 sm:py-5 pr-4 min-w-0 flex flex-col justify-center">
                      <span className={`self-start ${relatedBadge} text-white text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full mb-2`}>
                        {related.category ?? 'General'}
                      </span>
                      <h3 className="font-serif font-bold text-gray-900 leading-snug group-hover:text-cada-blue transition-colors line-clamp-3 text-lg sm:text-xl">
                        {related.title}
                      </h3>
                      {related.synthesis && (
                        <p className="hidden sm:block text-sm text-gray-500 leading-relaxed line-clamp-2 mt-1.5">
                          {related.synthesis}
                        </p>
                      )}
                      <span className="text-xs text-gray-400 mt-2 block">
                        {related.source_count} {related.source_count === 1 ? 'medio' : 'medios'}
                      </span>
                    </div>
                    {/* Arrow indicator */}
                    <div className="shrink-0 self-center pr-5 text-gray-300 group-hover:text-cada-blue transition-colors text-xl">
                      →
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
