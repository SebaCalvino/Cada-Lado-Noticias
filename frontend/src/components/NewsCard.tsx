import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { NewsCluster } from '@/types'
import { timeAgo } from '@/lib/utils'
import CategoryBadge from './CategoryBadge'
import SourceDots from './SourceDots'

export default function NewsCard({ cluster }: { cluster: NewsCluster }) {
  return (
    <Link href={`/noticias/${cluster.id}`} className="block group">
      <article className="card p-5 h-full flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <CategoryBadge category={cluster.category} />
          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0">
            <Clock size={12} />
            {timeAgo(cluster.published_at)}
          </div>
        </div>

        <h2 className="font-serif font-bold text-lg text-gray-900 leading-snug group-hover:text-brand-600 transition-colors line-clamp-3">
          {cluster.title}
        </h2>

        {cluster.synthesis && (
          <p className="text-sm text-gray-600 leading-relaxed line-clamp-3 flex-1">
            {cluster.synthesis}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <SourceDots sources={cluster.sources} />
          <span className="text-xs text-gray-400 font-medium">
            {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
          </span>
        </div>
      </article>
    </Link>
  )
}
