'use client'

import { useEffect, useRef, useState } from 'react'
import type { NewsCluster } from '@/types'
import NewsCard from './NewsCard'

interface Props {
  featured: NewsCluster | null
  rest: NewsCluster[]
}

function useInView(threshold = 0.05) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

export default function AnimatedNewsGrid({ featured, rest }: Props) {
  const { ref, inView } = useInView(0.05)

  if (!featured && rest.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="text-gray-500 text-lg mb-2">Todavía no hay noticias</p>
        <p className="text-gray-400 text-sm">
          El sistema monitorea los medios continuamente y procesa las noticias en cuanto aparecen.
        </p>
      </div>
    )
  }

  return (
    <div ref={ref} className="space-y-5">
      {/* Featured article */}
      {featured && (
        <div
          className={`w-full transition-all duration-700 ease-out ${
            inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '0ms' }}
        >
          <NewsCard cluster={featured} featured={true} />
        </div>
      )}

      {/* Rest in 2-column grid with stagger */}
      {rest.length > 0 && (
        <div className="grid md:grid-cols-2 gap-5">
          {rest.map((cluster, i) => (
            <div
              key={cluster.id}
              className={`transition-all duration-600 ease-out ${
                inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
              }`}
              style={{
                transitionDelay: `${(i + 1) * 90}ms`,
                transitionDuration: '600ms',
              }}
            >
              <NewsCard cluster={cluster} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
