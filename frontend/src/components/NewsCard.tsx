import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { NewsCluster } from '@/types'
import { timeAgo } from '@/lib/utils'
import SourceDots from './SourceDots'

const CATEGORY_COLOR: Record<string, string> = {
  'Política':      '#1e40af',
  'Economía':      '#065f46',
  'Sociedad':      '#6d28d9',
  'Seguridad':     '#991b1b',
  'Internacional': '#3730a3',
  'Deportes':      '#92400e',
  'Cultura':       '#9d174d',
  'Tecnología':    '#164e63',
  'Ambiente':      '#134e4a',
}

interface Props {
  cluster: NewsCluster
  featured?: boolean
}

export default function NewsCard({ cluster, featured = false }: Props) {
  const categoryColor = CATEGORY_COLOR[cluster.category ?? ''] ?? '#6b7280'
  const hasImage = !!cluster.image_url

  return (
    <Link href={`/noticias/${cluster.id}`} className="block group">
      <article
        className={`bg-white rounded-xl border border-gray-200 h-full flex flex-col overflow-hidden shadow-sm
          hover:shadow-xl hover:border-brand-300 active:scale-[0.99]
          transition-all duration-200 ease-out
          group-hover:scale-[1.01]`}
      >

        {/* Image or thin category accent line */}
        {hasImage ? (
          <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
            <img
              src={cluster.image_url!}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement
                el.style.display = 'none'
                const parent = el.parentElement
                if (parent) {
                  parent.style.height = '4px'
                  parent.style.backgroundColor = categoryColor
                }
              }}
            />
            {/* Subtle dark overlay on hover */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />
          </div>
        ) : (
          <div className="h-1 w-full" style={{ backgroundColor: categoryColor }} />
        )}

        {/* Featured label */}
        {featured && (
          <div className={`px-5 pt-4`}>
            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-amber-400 text-gray-900 px-2 py-0.5 rounded-sm">
              PRINCIPAL
            </span>
          </div>
        )}

        {/* Category + time */}
        <div className={`px-5 ${featured ? 'pt-3' : 'pt-4'} flex items-start justify-between gap-3`}>
          {cluster.category && (
            <span
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: categoryColor }}
            >
              {cluster.category}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 ml-auto">
            <Clock size={12} />
            {timeAgo(cluster.published_at)}
          </div>
        </div>

        {/* Title */}
        <div className={`px-5 pt-2 ${featured ? 'pb-2' : ''}`}>
          <h2
            className={`font-serif font-bold text-gray-900 leading-snug group-hover:text-brand-600 transition-colors duration-200 ${
              featured ? 'text-2xl md:text-3xl line-clamp-4' : 'text-lg line-clamp-3'
            }`}
          >
            {cluster.title}
          </h2>
        </div>

        {/* Excerpt */}
        {cluster.synthesis && (
          <div className="px-5 pt-2 flex-1">
            <p
              className={`text-sm text-gray-500 leading-relaxed ${
                featured ? 'line-clamp-5' : 'line-clamp-3'
              }`}
            >
              {cluster.synthesis}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex items-center justify-between border-t border-gray-100 mt-auto">
          <SourceDots sources={cluster.sources} />
          <div className="flex items-center gap-3 shrink-0 ml-2">
            <span className="text-xs text-gray-400 font-medium">
              {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
            </span>
            {/* Animated arrow */}
            <span
              className="text-brand-500 font-bold text-sm translate-x-0 group-hover:translate-x-1 transition-transform duration-200"
              aria-hidden="true"
            >
              →
            </span>
          </div>
        </div>
      </article>
    </Link>
  )
}
