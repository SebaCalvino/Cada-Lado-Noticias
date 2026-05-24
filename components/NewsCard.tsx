import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { NewsCluster } from '@/lib/types'
import { timeAgo } from '@/lib/utils'
import SourceDots from './SourceDots'

const CATEGORY_COLOR: Record<string, string> = {
  'Política':      '#0052CC',
  'Economía':      '#065f46',
  'Sociedad':      '#6d28d9',
  'Seguridad':     '#991b1b',
  'Internacional': '#1e3a5f',
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
  const categoryColor = CATEGORY_COLOR[cluster.category ?? ''] ?? '#0052CC'
  const hasImage = !!cluster.image_url

  return (
    <Link href={`/noticias/${cluster.id}`} className="block group h-full">
      <article
        className="bg-white border border-gray-200 h-full flex flex-col overflow-hidden
          hover:border-cada-blue hover:shadow-xl hover:scale-[1.01] active:scale-[0.99]
          transition-all duration-200 ease-out"
        style={{ borderRadius: '2px' }}
      >
        {/* Image or category accent bar */}
        {hasImage ? (
          <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
            <img
              src={cluster.image_url!}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]"
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
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/15 transition-colors duration-200" />
          </div>
        ) : (
          <div className="h-1 w-full" style={{ backgroundColor: categoryColor }} />
        )}

        {/* Featured label */}
        {featured && (
          <div className="px-5 pt-4">
            <span className="inline-block text-[10px] font-black uppercase tracking-widest bg-cada-blue text-white px-2.5 py-1">
              PRINCIPAL
            </span>
          </div>
        )}

        {/* Category + time */}
        <div className={`px-5 ${featured ? 'pt-3' : 'pt-4'} flex items-start justify-between gap-3`}>
          {cluster.category && (
            <span
              className="text-[11px] font-bold uppercase tracking-widest"
              style={{ color: categoryColor }}
            >
              {cluster.category}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 ml-auto">
            <Clock size={11} />
            {timeAgo(cluster.published_at)}
          </div>
        </div>

        {/* Title */}
        <div className={`px-5 pt-2 ${featured ? 'pb-2' : ''}`}>
          <h2
            className={`font-serif font-bold text-cada-dark leading-snug group-hover:text-cada-blue transition-colors duration-150 ${
              featured ? 'text-2xl md:text-3xl line-clamp-4' : 'text-[17px] line-clamp-3'
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
                featured ? 'line-clamp-4' : 'line-clamp-2'
              }`}
            >
              {cluster.synthesis}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-4 pt-3 flex items-center justify-between border-t border-gray-100 mt-auto">
          <SourceDots sources={cluster.sources} />
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="text-xs text-gray-400 font-medium">
              {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
            </span>
            <span
              className="text-cada-blue font-bold text-sm translate-x-0 group-hover:translate-x-1.5 transition-transform duration-150"
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
