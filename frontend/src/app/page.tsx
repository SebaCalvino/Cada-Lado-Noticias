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
      <section className="bg-[#0f172a] text-white relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '60px 60px'}} />
        <div className="relative max-w-6xl mx-auto px-4 py-20 md:py-32">
          <div className="max-w-4xl">
            <div className="flex items-center gap-2 text-sm text-green-400 font-medium mb-8 tracking-wide uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Monitoreo en tiempo real · 8 medios · Argentina
            </div>
            <h1 className="text-4xl md:text-6xl font-serif font-bold leading-[1.1] mb-6 text-white">
              ¿Demasiada desinformación?<br />
              <span className="text-gray-300">Mirá lo que dice cada lado.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 mb-10 leading-relaxed max-w-2xl">
              La misma noticia, analizada desde Clarín hasta La Izquierda Diario.
              Sintetizamos, comparamos y te mostramos qué enfatiza cada medio —y qué omite deliberadamente.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/noticias" className="bg-white text-gray-900 font-semibold px-7 py-3.5 rounded-lg flex items-center gap-2 hover:bg-gray-100 transition-colors text-sm">
                Ver las noticias de hoy <ArrowRight size={16} />
              </Link>
              <Link href="/fuentes" className="border border-white/20 text-gray-300 font-semibold px-7 py-3.5 rounded-lg hover:bg-white/5 transition-colors text-sm">
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
              El sistema monitorea los medios continuamente y procesa las noticias en cuanto aparecen.
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
