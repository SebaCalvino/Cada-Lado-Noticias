'use client'

import { useEffect, useRef, useState } from 'react'
import { Layers, Eye, BarChart2, type LucideProps } from 'lucide-react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'

type LucideIcon = ForwardRefExoticComponent<Omit<LucideProps, 'ref'> & RefAttributes<SVGSVGElement>>

interface StatsData {
  total_clusters: number
  total_articles: number
  sources_active: number
}

function useCountUp(target: number, duration = 1800, started: boolean) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!started || target === 0) return
    setCount(0)
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setCount(Math.round(eased * target))
      if (progress < 1) requestAnimationFrame(tick)
    }

    requestAnimationFrame(tick)
  }, [started, target, duration])

  return count
}

function StatItem({
  icon: Icon,
  value,
  label,
  started,
}: {
  icon: LucideIcon
  value: number
  label: string
  started: boolean
}) {
  const count = useCountUp(value, 1600, started)

  return (
    <div className="flex flex-col items-center md:items-start gap-1 py-6 md:py-0">
      <div className="flex items-center gap-2 text-gray-400 mb-1">
        <Icon size={15} className="text-brand-500" />
        <span className="text-xs uppercase tracking-widest font-semibold">{label}</span>
      </div>
      <span className="text-4xl md:text-5xl font-serif font-bold text-gray-900 tabular-nums">
        {count.toLocaleString('es-AR')}
      </span>
    </div>
  )
}

export default function StatsCounter({ stats }: { stats: StatsData }) {
  const [started, setStarted] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true)
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <section
      ref={ref}
      className="bg-white border-y border-gray-200"
    >
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 text-center md:text-left">
          <div className="md:pr-12">
            <StatItem
              icon={Layers}
              value={stats.total_clusters}
              label="Noticias sintetizadas"
              started={started}
            />
          </div>
          <div className="md:px-12">
            <StatItem
              icon={Eye}
              value={stats.total_articles}
              label="Artículos analizados"
              started={started}
            />
          </div>
          <div className="md:pl-12">
            <StatItem
              icon={BarChart2}
              value={stats.sources_active}
              label="Medios monitoreados"
              started={started}
            />
          </div>
        </div>
      </div>
    </section>
  )
}
