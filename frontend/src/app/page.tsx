import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getNews, getStats, getSources } from '@/lib/api'
import IdeologySpectrum from '@/components/IdeologySpectrum'
import HeroAnimated from '@/components/HeroAnimated'
import StatsCounter from '@/components/StatsCounter'
import BiasSection from '@/components/BiasSection'
import HowItWorksAnimated from '@/components/HowItWorksAnimated'
import AnimatedNewsGrid from '@/components/AnimatedNewsGrid'

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
      {/* Hero — animated client component */}
      <HeroAnimated />

      {/* Stats strip — animated counter on scroll */}
      {statsData && <StatsCounter stats={statsData} />}

      {/* "El problema" — bias explainer section */}
      <BiasSection />

      {/* How it works — stagger on scroll */}
      <div className="bg-gray-50 border-b border-gray-100">
        <HowItWorksAnimated />
      </div>

      {/* Latest news */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-10 border-b border-gray-200 pb-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-1">
              Hoy en los medios
            </p>
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">
              Últimas noticias
            </h2>
          </div>
          <Link
            href="/noticias"
            className="text-sm font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-1 pb-1 border-b border-gray-400 hover:border-gray-900 transition-colors"
          >
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>

        <AnimatedNewsGrid featured={featuredCluster} rest={restClusters} />
      </section>

      {/* Ideology spectrum */}
      {sourcesData.length > 0 && (
        <section className="bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 py-16">
            <div className="max-w-lg">
              <IdeologySpectrum sources={sourcesData} />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
