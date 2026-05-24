import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { getNewsClustersServer, getStatsServer } from '@/lib/queries'
import HeroAnimated from '@/components/HeroAnimated'
import StatsCounter from '@/components/StatsCounter'
import BiasSection from '@/components/BiasSection'
import HowItWorksAnimated from '@/components/HowItWorksAnimated'
import AnimatedNewsGrid from '@/components/AnimatedNewsGrid'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [clusters, statsData] = await Promise.all([
    getNewsClustersServer(1, 6),
    getStatsServer(),
  ])

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
      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)' }}>
        <HowItWorksAnimated />
      </div>

      {/* Latest news */}
      <section className="max-w-6xl mx-auto px-4 py-16">
        <div className="flex items-end justify-between mb-10 pb-4" style={{ borderBottom: '1px solid var(--ink)' }}>
          <div>
            <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 500, marginBottom: 8 }}>
              Hoy en los medios
            </p>
            <h2 className="text-2xl md:text-3xl font-serif" style={{ color: 'var(--ink)', fontWeight: 400 }}>
              Últimas noticias
            </h2>
          </div>
          <Link
            href="/noticias"
            className="text-sm font-semibold flex items-center gap-1 pb-1 transition-colors"
            style={{ color: 'var(--ink-dim)', borderBottom: '1px solid var(--line-strong)' }}
          >
            Ver todas <ArrowRight size={13} />
          </Link>
        </div>

        <AnimatedNewsGrid featured={featuredCluster} rest={restClusters} />
      </section>
    </div>
  )
}
