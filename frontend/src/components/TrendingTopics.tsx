'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { TrendingUp, Flame } from 'lucide-react'
import { getTrendingTopics } from '@/lib/api'

interface Topic {
  topic: string
  count: number
  category: boolean
}

export default function TrendingTopics() {
  const [topics, setTopics] = useState<Topic[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTrendingTopics()
      .then(data => setTopics(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="bg-[#0b1120] border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest shrink-0">
            <Flame size={12} />
            Temas de hoy
          </div>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-6 w-20 bg-white/5 rounded-full animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (topics.length === 0) return null

  return (
    <div className="bg-[#0b1120] border-b border-white/10">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center gap-4 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-widest shrink-0">
          <Flame size={12} className="text-orange-400" />
          Temas de hoy
        </div>
        <div className="flex items-center gap-2 flex-nowrap">
          {topics.map((t, i) => (
            <Link
              key={i}
              href={t.category ? `/noticias?categoria=${encodeURIComponent(t.topic)}` : `/noticias?q=${encodeURIComponent(t.topic)}`}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1 rounded-full text-[12px] font-medium whitespace-nowrap transition-colors"
              style={{
                background: t.category ? 'rgba(0,82,204,0.25)' : 'rgba(255,255,255,0.07)',
                color: t.category ? '#7baeff' : '#9ca3af',
                border: t.category ? '1px solid rgba(0,82,204,0.4)' : '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {t.category && <TrendingUp size={10} />}
              {t.topic}
              <span className="opacity-60 text-[10px]">{t.count}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
