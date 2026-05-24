import Link from 'next/link'
import { Clock } from 'lucide-react'
import type { NewsCluster } from '@/lib/types'
import { timeAgo, noticiaHref } from '@/lib/utils'
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
    <Link href={noticiaHref(cluster.id, cluster.title)} className="block group h-full">
      <article
        className="h-full flex flex-col overflow-hidden transition-colors duration-200"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--line)',
          borderRadius: 0,
        }}
        // CSS :hover isn't possible inline — the group-hover classes handle hover state
      >
        {/* Image or category accent bar */}
        {hasImage ? (
          <div className={`relative overflow-hidden ${featured ? 'h-64' : 'h-48'}`}>
            <img
              src={cluster.image_url!}
              alt=""
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              onError={(e) => {
                const el = e.currentTarget as HTMLImageElement
                el.style.display = 'none'
                const parent = el.parentElement
                if (parent) {
                  parent.style.height = '3px'
                  parent.style.backgroundColor = categoryColor
                }
              }}
            />
          </div>
        ) : (
          <div className="w-full" style={{ height: 3, backgroundColor: categoryColor }} />
        )}

        {/* Featured label */}
        {featured && (
          <div className="px-5 pt-4">
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                background: 'var(--ink)',
                color: 'var(--bg)',
                padding: '3px 10px',
              }}
            >
              Principal
            </span>
          </div>
        )}

        {/* Category + time */}
        <div className={`px-5 ${featured ? 'pt-3' : 'pt-4'} flex items-start justify-between gap-3`}>
          {cluster.category && (
            <span
              style={{
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: categoryColor,
              }}
            >
              {cluster.category}
            </span>
          )}
          <div
            className="flex items-center gap-1 shrink-0 ml-auto"
            style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)' }}
          >
            <Clock size={10} />
            {timeAgo(cluster.published_at)}
          </div>
        </div>

        {/* Title */}
        <div className={`px-5 pt-2 ${featured ? 'pb-2' : ''}`}>
          <h2
            className={`font-serif leading-snug transition-colors duration-150 ${
              featured ? 'text-2xl md:text-3xl line-clamp-4' : 'text-[17px] line-clamp-3'
            }`}
            style={{ color: 'var(--ink)', fontWeight: 600 }}
          >
            {/* Title underline on hover — done via CSS in globals */}
            <span className="group-hover:text-[var(--cada-blue)] transition-colors duration-150">
              {cluster.title}
            </span>
          </h2>
        </div>

        {/* Excerpt */}
        {cluster.synthesis && (
          <div className="px-5 pt-2 flex-1">
            <p
              className={`leading-relaxed ${featured ? 'line-clamp-4' : 'line-clamp-2'}`}
              style={{ fontSize: 13, color: 'var(--ink-dim)' }}
            >
              {cluster.synthesis}
            </p>
          </div>
        )}

        {/* Footer */}
        <div
          className="px-5 pb-4 pt-3 flex items-center justify-between mt-auto"
          style={{ borderTop: '1px solid var(--line-soft)' }}
        >
          <SourceDots sources={cluster.sources} />
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span style={{ fontSize: 11, color: 'var(--ink-mute)', fontFamily: 'var(--font-mono)' }}>
              {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
            </span>
            <span
              className="translate-x-0 group-hover:translate-x-1.5 transition-transform duration-150"
              style={{ color: 'var(--cada-blue)', fontWeight: 700, fontSize: 14 }}
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
