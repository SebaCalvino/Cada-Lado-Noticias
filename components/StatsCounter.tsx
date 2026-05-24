'use client'

import { useEffect, useRef, useState } from 'react'
import type { ForwardRefExoticComponent, RefAttributes } from 'react'
import { Layers, Eye, BarChart2, type LucideProps } from 'lucide-react'

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
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} style={{ color: 'var(--cada-blue)', opacity: 0.7 }} />
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            fontWeight: 600,
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="font-serif tabular-nums"
        style={{ fontSize: 'clamp(36px, 4vw, 52px)', fontWeight: 700, color: 'var(--ink)', lineHeight: 1 }}
      >
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
      style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-0 text-center md:text-left"
          style={{ borderColor: 'var(--line)' }}
        >
          <div className="md:pr-12 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--line)' }}>
            <StatItem icon={Layers}    value={stats.total_clusters}  label="Noticias sintetizadas" started={started} />
          </div>
          <div className="md:px-12 border-b md:border-b-0 md:border-r" style={{ borderColor: 'var(--line)' }}>
            <StatItem icon={Eye}       value={stats.total_articles}  label="Artículos analizados"  started={started} />
          </div>
          <div className="md:pl-12">
            <StatItem icon={BarChart2} value={stats.sources_active}  label="Medios monitoreados"   started={started} />
          </div>
        </div>
      </div>
    </section>
  )
}
