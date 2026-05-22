import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Clock, Layers } from 'lucide-react'
import { getNewsDetail } from '@/lib/api'
import { timeAgo } from '@/lib/utils'
import CategoryBadge from '@/components/CategoryBadge'
import CoverageBar from '@/components/CoverageBar'

export const revalidate = 600

interface Props {
  params: { id: string }
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

  const omitCount = cluster.articles.filter(
    a => a.omissions && a.omissions !== 'Sin omisiones destacadas.' && a.omissions.trim()
  ).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back */}
      <Link
        href="/noticias"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Volver a noticias
      </Link>

      {/* Header */}
      <article>
        <div className="flex items-center gap-3 mb-4">
          <CategoryBadge category={cluster.category} />
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} />
            {timeAgo(cluster.published_at)}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Layers size={12} />
            {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
          </div>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight mb-6">
          {cluster.title}
        </h1>

        {/* Alert banner if omissions found */}
        {omitCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-900 text-sm">
                {omitCount} {omitCount === 1 ? 'medio omite' : 'medios omiten'} información relevante
              </p>
              <p className="text-amber-700 text-sm mt-0.5">
                Encontramos diferencias en la cobertura. Revisá el análisis por medio más abajo.
              </p>
            </div>
          </div>
        )}

        {/* Synthesis */}
        {cluster.synthesis && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-brand-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold">IA</span>
              </span>
              <h2 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                Síntesis neutral
              </h2>
            </div>
            <p className="text-gray-800 leading-relaxed whitespace-pre-line">{cluster.synthesis}</p>
          </section>
        )}

        {/* Key facts */}
        {cluster.key_facts && cluster.key_facts.length > 0 && (
          <section className="bg-blue-50 rounded-xl border border-blue-100 p-6 mb-6">
            <h2 className="font-semibold text-blue-900 mb-3 text-sm uppercase tracking-wide">
              Puntos clave
            </h2>
            <ul className="space-y-2">
              {cluster.key_facts.map((fact, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-blue-900">
                  <span className="w-5 h-5 rounded-full bg-blue-200 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {fact}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Per-source analysis */}
        {cluster.articles.length > 0 && (
          <section>
            <h2 className="font-serif font-bold text-xl text-gray-900 mb-4">
              Cómo lo cubrió cada medio
            </h2>
            <div className="space-y-4">
              {cluster.articles.map(article => (
                <CoverageBar key={article.source_slug} article={article} />
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  )
}
