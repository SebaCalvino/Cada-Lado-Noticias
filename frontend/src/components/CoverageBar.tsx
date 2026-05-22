import type { ClusterArticle } from '@/types'
import { ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react'

export default function CoverageBar({ article }: { article: ClusterArticle }) {
  const hasOmissions =
    article.omissions &&
    article.omissions !== 'Sin omisiones destacadas.' &&
    article.omissions.trim() !== ''

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: article.source_color + '15', borderLeft: `4px solid ${article.source_color}` }}
      >
        <div className="flex items-center gap-2">
          <span
            className="font-bold text-sm text-white px-2 py-0.5 rounded"
            style={{ backgroundColor: article.source_color }}
          >
            {article.source_name}
          </span>
          {hasOmissions ? (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
              <AlertTriangle size={11} />
              Omite información
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
              <CheckCircle size={11} />
              Cobertura completa
            </span>
          )}
        </div>
        <a
          href={article.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-brand-600 transition-colors"
          onClick={e => e.stopPropagation()}
        >
          Ver nota <ExternalLink size={11} />
        </a>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2 bg-white">
        <p className="text-sm font-medium text-gray-800 line-clamp-2">
          {article.article_title}
        </p>

        {article.emphasis && (
          <div>
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Énfasis</span>
            <p className="text-sm text-gray-700 mt-0.5">{article.emphasis}</p>
          </div>
        )}

        {hasOmissions && (
          <div className="bg-amber-50 rounded-lg p-2.5">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Omite</span>
            <p className="text-sm text-amber-900 mt-0.5">{article.omissions}</p>
          </div>
        )}
      </div>
    </div>
  )
}
