'use client'

import type { ClusterArticle } from '@/types'

interface Props {
  articles: ClusterArticle[]
}

function CoverageRow({ article, max }: { article: ClusterArticle; max: number }) {
  const pct = Math.round(article.coverage_percentage ?? 0)
  const barWidth = max > 0 ? (pct / max) * 100 : 0

  return (
    <div className="flex items-center gap-3 group">
      {/* Source name */}
      <div className="w-28 shrink-0 text-right">
        <span className="text-xs font-medium text-gray-600 leading-none">
          {article.source_name}
        </span>
      </div>

      {/* Bar track */}
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${barWidth}%`,
            backgroundColor: article.source_color,
            opacity: 0.85,
          }}
        />
      </div>

      {/* Percentage label */}
      <div className="w-10 shrink-0">
        <span className="text-xs font-mono text-gray-400">{pct}%</span>
      </div>
    </div>
  )
}

function SimilarityRow({ article, max }: { article: ClusterArticle; max: number }) {
  const score = Math.round((article.similarity_score ?? 0) * 100)
  const barWidth = max > 0 ? (score / max) * 100 : 0

  return (
    <div className="flex items-center gap-3">
      <div className="w-28 shrink-0 text-right">
        <span className="text-xs font-medium text-gray-600">{article.source_name}</span>
      </div>
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out bg-gray-400"
          style={{ width: `${barWidth}%` }}
        />
      </div>
      <div className="w-10 shrink-0">
        <span className="text-xs font-mono text-gray-400">{score}%</span>
      </div>
    </div>
  )
}

export default function MediaStatsChart({ articles }: Props) {
  if (!articles || articles.length === 0) return null

  // Coverage: sorted descending
  const byCoverage = [...articles].sort(
    (a, b) => (b.coverage_percentage ?? 0) - (a.coverage_percentage ?? 0)
  )
  const maxCoverage = byCoverage[0]?.coverage_percentage ?? 100

  // Similarity: sorted descending
  const bySimilarity = [...articles].sort(
    (a, b) => (b.similarity_score ?? 0) - (a.similarity_score ?? 0)
  )
  const maxSimilarity = (bySimilarity[0]?.similarity_score ?? 1) * 100

  return (
    <section className="mt-10 pt-6 border-t border-gray-100">
      <h2 className="font-serif font-bold text-xl text-gray-900 mb-1">
        Los números, sin editoriales
      </h2>
      <p className="text-sm text-gray-400 mb-7">
        Datos objetivos sobre cómo cubrió cada medio esta noticia. Sin interpretación.
      </p>

      {/* Coverage chart */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Extensión de cobertura
          </span>
          <span className="text-[10px] text-gray-300 font-medium">
            · cuánto espacio dedicó cada medio a este tema
          </span>
        </div>
        <div className="space-y-3.5">
          {byCoverage.map(article => (
            <CoverageRow key={article.source_slug} article={article} max={maxCoverage} />
          ))}
        </div>
      </div>

      {/* Similarity chart */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Cercanía al relato central
          </span>
          <span className="text-[10px] text-gray-300 font-medium">
            · qué tan cerca estuvo cada medio de los hechos verificados
          </span>
        </div>
        <div className="space-y-3.5">
          {bySimilarity.map(article => (
            <SimilarityRow key={article.source_slug} article={article} max={maxSimilarity} />
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-6 text-[11px] text-gray-300 leading-relaxed">
        La extensión de cobertura mide el porcentaje del hecho cubierto por ese medio.
        La cercanía al relato central indica la similitud semántica con la síntesis de hechos verificados.
        Ningún indicador implica sesgo ni valoración editorial.
      </p>
    </section>
  )
}
