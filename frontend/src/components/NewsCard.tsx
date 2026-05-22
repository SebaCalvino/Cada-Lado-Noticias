import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { NewsCluster } from '@/types'
import { timeAgo } from '@/lib/utils'
import SourceDots from './SourceDots'

const CATEGORY_COLOR: Record<string, string> = {
  'Política': '#1e40af',
  'Economía': '#065f46',
  'Sociedad': '#6d28d9',
  'Seguridad': '#991b1b',
  'Internacional': '#3730a3',
  'Deportes': '#92400e',
  'Cultura': '#9d174d',
  'Tecnología': '#164e63',
  'Ambiente': '#134e4a',
}

interface Props {
  cluster: NewsCluster
  featured?: boolean
}

export default function NewsCard({ cluster, featured = false }: Props) {
  const borderColor = CATEGORY_COLOR[cluster.category ?? ''] ?? '#6b7280'

  return (
    <Link href={`/noticias/${cluster.id}`} className="block group">
      <article
        className="bg-white rounded-xl border border-gray-200 h-full flex flex-col gap-3 overflow-hidden hover:border-gray-300 hover:shadow-md transition-all"
        style={cluster.image_url ? undefined : { borderLeftColor: borderColor, borderLeftWidth: '4px' }}
      >
        {cluster.image_url && (
          <img
            src={cluster.image_url}
            alt=""
            className="w-full h-40 object-cover rounded-t-xl"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        )}
        <div className={`px-5 ${featured ? 'pt-6' : 'pt-5'} flex items-start justify-between gap-3`}>
          {cluster.category && (
            <span
              className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded text-white shrink-0"
              style={{ backgroundColor: borderColor }}
            >
              {cluster.category}
            </span>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 ml-auto">
            <Clock size={12} />
            {timeAgo(cluster.published_at)}
          </div>
        </div>

        <div className={`px-5 ${featured ? 'pb-2' : ''}`}>
          <h2
            className={`font-serif font-bold text-gray-900 leading-snug group-hover:text-brand-600 transition-colors ${
              featured ? 'text-2xl md:text-3xl line-clamp-4' : 'text-lg line-clamp-3'
            }`}
          >
            {cluster.title}
          </h2>
        </div>

        {cluster.synthesis && (
          <div className="px-5 flex-1">
            <p
              className={`text-sm text-gray-600 leading-relaxed ${
                featured ? 'line-clamp-6' : 'line-clamp-3'
              }`}
            >
              {cluster.synthesis}
            </p>
          </div>
        )}

        <div className="px-5 pb-5 flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
          <SourceDots sources={cluster.sources} />
          <span className="text-xs text-gray-500 font-medium shrink-0 ml-2">
            {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
          </span>
        </div>
      </article>
    </Link>
  )
}
