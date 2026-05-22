'use client'

import type { ClusterArticle } from '@/types'
import { ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react'

// Local ideology map — keep in this client component
const IDEOLOGY: Record<string, { score: number; label: string }> = {
  'clarin':       { score:  0.3, label: 'Centro-derecha' },
  'lanacion':     { score:  0.6, label: 'Centro-derecha' },
  'infobae':      { score:  0.2, label: 'Centro' },
  'pagina12':     { score: -0.7, label: 'Izquierda' },
  'ambito':       { score:  0.1, label: 'Centro' },
  'cronista':     { score:  0.2, label: 'Centro' },
  'perfil':       { score: -0.1, label: 'Centro' },
  'laizquierda':  { score: -0.8, label: 'Izquierda' },
}

export default function CoverageBar({ article }: { article: ClusterArticle }) {
  const hasOmissions =
    article.omissions &&
    article.omissions !== 'Sin omisiones destacadas.' &&
    article.omissions.trim() !== ''

  const ideologyLabel = IDEOLOGY[article.source_slug]?.label ?? null

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Color accent line at top */}
      <div className="h-0.5 w-full" style={{ backgroundColor: article.source_color }} />

      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 flex items-center justify-between">
        <div className="flex items-start gap-2.5">
          {/* Source dot */}
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1"
            style={{ backgroundColor: article.source_color }}
          />
          <div>
            <span className="font-bold text-sm text-gray-900">
              {article.source_name}
            </span>
            {ideologyLabel && (
              <span className="block text-xs text-gray-400 mt-0.5">{ideologyLabel}</span>
            )}
          </div>
          {hasOmissions ? (
            <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full font-medium ml-1 mt-0.5">
              <AlertTriangle size={10} />
              Omite info
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-medium ml-1 mt-0.5">
              <CheckCircle size={10} />
              Completo
            </span>
          )}
        </div>
        <a
          href={article.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors shrink-0"
          onClick={e => e.stopPropagation()}
        >
          Ver nota <ExternalLink size={11} />
        </a>
      </div>

      {/* Content */}
      <div className="px-4 py-3 space-y-2.5 bg-white">
        <p className="text-sm font-medium text-gray-800 line-clamp-2">
          {article.article_title}
        </p>

        {article.emphasis && (
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Énfasis</span>
            <p className="text-sm text-gray-600 mt-1 leading-relaxed">{article.emphasis}</p>
          </div>
        )}

        {hasOmissions && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Omite</span>
            <p className="text-sm text-amber-900 mt-1 leading-relaxed">{article.omissions}</p>
          </div>
        )}
      </div>
    </div>
  )
}
