import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Layers, BookOpen } from 'lucide-react'
import { getNewsDetail, getNews } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import CoverageBar from '@/components/CoverageBar'
import CommentsSection from '@/components/CommentsSection'

export const dynamic = 'force-dynamic'

interface Props {
  params: { id: string }
}

const CATEGORY_HERO: Record<string, string> = {
  'Política': 'from-blue-900 via-blue-800 to-blue-700',
  'Economía': 'from-emerald-900 via-emerald-800 to-emerald-700',
  'Sociedad': 'from-violet-900 via-violet-800 to-violet-700',
  'Seguridad': 'from-red-900 via-red-800 to-red-700',
  'Internacional': 'from-indigo-900 via-indigo-800 to-indigo-700',
  'Deportes': 'from-orange-900 via-orange-800 to-orange-700',
  'Cultura': 'from-pink-900 via-pink-800 to-pink-700',
  'Tecnología': 'from-cyan-900 via-cyan-800 to-cyan-700',
  'Ambiente': 'from-teal-900 via-teal-800 to-teal-700',
}

const CATEGORY_BADGE: Record<string, string> = {
  'Política': 'bg-blue-500',
  'Economía': 'bg-emerald-500',
  'Sociedad': 'bg-violet-500',
  'Seguridad': 'bg-red-500',
  'Internacional': 'bg-indigo-500',
  'Deportes': 'bg-orange-500',
  'Cultura': 'bg-pink-500',
  'Tecnología': 'bg-cyan-500',
  'Ambiente': 'bg-teal-500',
}

function estimateReadingTime(text: string | null): number {
  if (!text) return 1
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
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

  // Fetch related news for "Te puede interesar"
  let relatedClusters: Awaited<ReturnType<typeof getNews>> = []
  try {
    const allNews = await getNews(1)
    relatedClusters = allNews.filter(c => c.id !== cluster.id).slice(0, 3)
  } catch {
    // ignore
  }

  const heroGradient = CATEGORY_HERO[cluster.category ?? ''] ?? 'from-gray-900 via-gray-800 to-gray-700'
  const badgeColor = CATEGORY_BADGE[cluster.category ?? ''] ?? 'bg-gray-500'
  const readingTime = estimateReadingTime(cluster.synthesis)
  const paragraphs = cluster.synthesis ? cluster.synthesis.split(/\n\n+/) : []

  return (
    <div>
      {/* Back button */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <Link
          href="/noticias"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Volver a noticias
        </Link>
      </div>

      {/* Hero section */}
      {cluster.image_url ? (
        <section
          className="relative text-white mt-4 bg-cover bg-center"
          style={{ backgroundImage: `url(${cluster.image_url})` }}
        >
          <div className="absolute inset-0 bg-black/60" />
          <div className="relative max-w-6xl mx-auto px-4 py-12 md:py-16">
            <span className={`inline-block ${badgeColor} text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4`}>
              {cluster.category ?? 'General'}
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight max-w-4xl">
              {cluster.title}
            </h1>
          </div>
        </section>
      ) : (
        <section className={`bg-gradient-to-br ${heroGradient} text-white mt-4`}>
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <span className={`inline-block ${badgeColor} text-white text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full mb-4`}>
              {cluster.category ?? 'General'}
            </span>
            <h1 className="text-3xl md:text-5xl font-serif font-bold leading-tight max-w-4xl">
              {cluster.title}
            </h1>
          </div>
        </section>
      )}

      {/* Metadata bar */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{timeAgo(cluster.published_at)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BookOpen size={14} />
            <span>{readingTime} min de lectura</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Layers size={14} />
            <span>{cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}</span>
          </div>
        </div>
      </div>

      {/* Ad placeholder */}
      <div className="max-w-6xl mx-auto px-4 my-6">
        <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg h-20 flex items-center justify-center text-gray-400 text-xs font-semibold uppercase tracking-widest">
          PUBLICIDAD
        </div>
      </div>

      {/* Main content: two columns */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main column (70%) */}
          <main className="lg:w-[70%] min-w-0">

            {/* Synthesis as article paragraphs */}
            {paragraphs.length > 0 && (
              <article className="mb-10">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">IA</span>
                  </span>
                  <h2 className="font-semibold text-gray-500 text-xs uppercase tracking-wider">
                    Síntesis neutral
                  </h2>
                </div>
                <div className="prose prose-lg max-w-none">
                  {paragraphs.map((para, i) => (
                    <p
                      key={i}
                      className={`text-gray-800 leading-relaxed mb-5 ${i === 0 ? 'text-xl font-medium text-gray-900' : 'text-base'}`}
                    >
                      {para.trim()}
                    </p>
                  ))}
                </div>
              </article>
            )}

            {/* Per-source coverage */}
            {cluster.articles.length > 0 && (
              <section>
                <h2 className="font-serif font-bold text-2xl text-gray-900 mb-5 border-b border-gray-200 pb-3">
                  Cómo lo cubrió cada medio
                </h2>
                <div className="space-y-4">
                  {cluster.articles.map(article => (
                    <CoverageBar key={article.source_slug} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* Comments section */}
            {cluster.comments && cluster.comments.length > 0 && (
              <CommentsSection comments={cluster.comments} />
            )}
          </main>

          {/* Sidebar (30%) */}
          <aside className="lg:w-[30%]">
            <div className="sticky top-8 space-y-6">

              {/* Key facts card */}
              {cluster.key_facts && cluster.key_facts.length > 0 && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                  <h3 className="font-bold text-blue-900 text-sm uppercase tracking-wide mb-4">
                    Puntos clave
                  </h3>
                  <ul className="space-y-3">
                    {cluster.key_facts.map((fact, i) => (
                      <li key={i} className="flex items-start gap-3 text-sm text-blue-900 leading-snug">
                        <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ad placeholder sidebar */}
              <div className="bg-gray-100 border border-dashed border-gray-300 rounded-lg h-48 flex items-center justify-center text-gray-400 text-xs font-semibold uppercase tracking-widest">
                PUBLICIDAD
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Te puede interesar */}
      {relatedClusters.length > 0 && (
        <section className="bg-gray-50 border-t border-gray-200 py-12">
          <div className="max-w-6xl mx-auto px-4">
            <h2 className="font-serif font-bold text-2xl text-gray-900 mb-6">
              Te puede interesar
            </h2>
            <div className="grid md:grid-cols-3 gap-5">
              {relatedClusters.map(related => {
                const relatedBadge = CATEGORY_BADGE[related.category ?? ''] ?? 'bg-gray-500'
                return (
                  <Link
                    key={related.id}
                    href={`/noticias/${related.id}`}
                    className="group bg-white rounded-xl border border-gray-200 p-5 hover:border-brand-300 hover:shadow-sm transition-all flex flex-col gap-3"
                  >
                    <span className={`self-start ${relatedBadge} text-white text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full`}>
                      {related.category ?? 'General'}
                    </span>
                    <h3 className="font-serif font-bold text-gray-900 leading-snug group-hover:text-brand-600 transition-colors line-clamp-3">
                      {related.title}
                    </h3>
                    {related.synthesis && (
                      <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">
                        {related.synthesis}
                      </p>
                    )}
                    <span className="text-xs text-gray-400">
                      {related.source_count} {related.source_count === 1 ? 'medio' : 'medios'}
                    </span>
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
