import Link from 'next/link'
import { ArrowRight, Layers, Eye, BarChart2 } from 'lucide-react'
import { getNews, getStats, getSources } from '@/lib/api'
import NewsCard from '@/components/NewsCard'
import IdeologySpectrum from '@/components/IdeologySpectrum'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [news, stats, sources] = await Promise.allSettled([
    getNews(1),
    getStats(),
    getSources(),
  ])

  const clusters = news.status === 'fulfilled' ? news.value.slice(0, 6) : []
  const statsData = stats.status === 'fulfilled' ? stats.value : null
  const sourcesData = sources.status === 'fulfilled' ? sources.value : []

  const featuredCluster = clusters[0] ?? null
  const restClusters = clusters.slice(1)

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 to-brand-700 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-3 py-1 text-sm mb-6">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Actualizado 3 veces por día
            </div>
            <h1 className="text-4xl md:text-5xl font-serif font-bold leading-tight mb-4">
              La misma noticia,<br />todas las voces.
            </h1>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Cada medio argentino cuenta la realidad a su manera. Nosotros analizamos 8 diarios,
              sintetizamos la información y te mostramos qué dice cada uno —y qué omite deliberadamente.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/noticias" className="bg-white text-brand-700 font-semibold px-6 py-3 rounded-xl flex items-center gap-2 hover:bg-blue-50 transition-colors">
                Ver las noticias de hoy <ArrowRight size={18} />
              </Link>
              <Link href="/fuentes" className="border border-white/30 text-white font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors">
                Conocer los medios
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      {statsData && (
        <section className="bg-white border-b border-gray-200">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap gap-6 justify-center md:justify-start text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Layers size={16} className="text-brand-500" />
              <strong className="text-gray-900">{statsData.total_clusters}</strong> noticias sintetizadas
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <Eye size={16} className="text-brand-500" />
              <strong className="text-gray-900">{statsData.total_articles}</strong> artículos analizados
            </div>
            <div className="flex items-center gap-2 text-gray-600">
              <BarChart2 size={16} className="text-brand-500" />
              <strong className="text-gray-900">{statsData.sources_active}</strong> medios monitoreados
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-serif font-bold text-gray-900 mb-8 text-center">¿Cómo funciona?</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              step: '1',
              title: 'Scrapeamos 8 medios',
              desc: 'Clarín, La Nación, Infobae, Página 12, Ámbito, El Cronista, Perfil y La Izquierda Diario. Todo el espectro ideológico.',
              color: 'bg-blue-50 text-blue-600',
            },
            {
              step: '2',
              title: 'IA agrupa las notas',
              desc: 'Detectamos qué medios están hablando del mismo hecho y los agrupamos aunque usen títulos completamente distintos.',
              color: 'bg-purple-50 text-purple-600',
            },
            {
              step: '3',
              title: 'Síntesis neutral + análisis',
              desc: 'Claude AI escribe una síntesis imparcial y analiza qué enfatiza cada medio, qué omite y qué datos aporta cada uno.',
              color: 'bg-green-50 text-green-600',
            },
          ].map(item => (
            <div key={item.step} className="card p-6">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg mb-4 ${item.color}`}>
                {item.step}
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Latest news */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-bold text-gray-900">Últimas noticias</h2>
          <Link href="/noticias" className="text-sm font-medium text-brand-600 hover:text-brand-700 flex items-center gap-1">
            Ver todas <ArrowRight size={14} />
          </Link>
        </div>

        {clusters.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 text-lg mb-2">Todavía no hay noticias</p>
            <p className="text-gray-400 text-sm">
              El sistema scrapeará automáticamente a las 7am, 1pm y 7pm (hora Argentina).
              También podés activar el scraping manual desde el panel.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Featured article */}
            {featuredCluster && (
              <div className="w-full">
                <NewsCard cluster={featuredCluster} featured={true} />
              </div>
            )}

            {/* Rest in 2-column grid */}
            {restClusters.length > 0 && (
              <div className="grid md:grid-cols-2 gap-5">
                {restClusters.map(cluster => (
                  <NewsCard key={cluster.id} cluster={cluster} />
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Ideology spectrum */}
      {sourcesData.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 pb-16">
          <div className="max-w-lg">
            <IdeologySpectrum sources={sourcesData} />
          </div>
        </section>
      )}
    </div>
  )
}
