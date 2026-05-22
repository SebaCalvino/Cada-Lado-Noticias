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
      <article className="bg-white rounded-xl border border-gray-200 h-full flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">

        {/* Image or thin category accent line */}
        {hasImage ? (
          <div className={`relative overflow-hidden ${featured ? 'h-56' : 'h-44'}`}>
            <img
              src={cluster.image_url!}
              alt=""
              className="w-full h-full object-cover"
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
          </div>
        ) : (
          <div className="h-1 w-full" style={{ backgroundColor: categoryColor }} />
        )}

        {/* Category + time */}
        <div className={`px-5 ${featured ? 'pt-5' : 'pt-4'} flex items-start justify-between gap-3`}>
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
            className={`font-serif font-bold text-gray-900 leading-snug group-hover:text-gray-600 transition-colors ${
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
          <span className="text-xs text-gray-400 font-medium shrink-0 ml-2">
            {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
          </span>
        </div>
      </article>
    </Link>
  )
}
