'use client'

import { useState, useEffect } from 'react'
import { ExternalLink } from 'lucide-react'
import type { Tweet } from '@/types'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const AVATAR_COLORS: Record<string, string> = {
  JMilei:            '#7c3aed',
  CFKArgentina:      '#1d4ed8',
  AxelKicillof:      '#0891b2',
  mauriciomacri:     '#059669',
  PatoBullrich:      '#dc2626',
  SergioMassa:       '#d97706',
  MartinLousteau:    '#4338ca',
  VickyVillarruel:   '#be185d',
  horaciolarreta:    '#0d9488',
  madorni:           '#374151',
}

export default function XOpinions({ clusterId }: { clusterId: number }) {
  const [tweets, setTweets] = useState<Tweet[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_URL}/api/news/${clusterId}/tweets`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setTweets(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [clusterId])

  if (!loading && tweets.length === 0) return null

  return (
    <section className="mt-10 border-t border-gray-100 pt-8">
      <div className="flex items-center gap-2.5 mb-5">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="text-gray-900 shrink-0">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.26 5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        <h2 className="font-serif font-bold text-2xl text-gray-900">Voces en X</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          Figuras públicas
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="border border-gray-100 rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-200 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-3.5 bg-gray-200 rounded w-28" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {tweets.map((tweet, i) => {
            const avatarColor = AVATAR_COLORS[tweet.username] ?? '#374151'
            const initial = tweet.display_name[0]?.toUpperCase() ?? '?'
            return (
              <div
                key={i}
                className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors bg-white"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: avatarColor }}
                    >
                      {initial}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-gray-900 truncate">
                        {tweet.display_name}
                      </div>
                      <div className="text-xs text-gray-400">@{tweet.username}</div>
                    </div>
                  </div>
                  {tweet.tweet_url && (
                    <a
                      href={tweet.tweet_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-300 hover:text-gray-500 transition-colors shrink-0 mt-1"
                      title="Ver en X"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{tweet.text}</p>
              </div>
            )
          })}
        </div>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Tweets recientes de figuras públicas relacionados con esta noticia.
      </p>
    </section>
  )
}
