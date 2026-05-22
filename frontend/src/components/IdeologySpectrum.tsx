import type { Source } from '@/types'

export default function IdeologySpectrum({ sources }: { sources: Source[] }) {
  const sorted = [...sources].sort((a, b) => a.ideology_score - b.ideology_score)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h3 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">
        Espectro ideológico
      </h3>

      {/* Spectrum bar */}
      <div className="relative h-2 rounded-full mb-8" style={{
        background: 'linear-gradient(to right, #CC0000, #9B59B6, #3498DB, #95A5A6, #E67E22, #E74C3C)'
      }}>
        {sorted.map(source => {
          const pct = ((source.ideology_score + 1) / 2) * 100
          return (
            <div
              key={source.slug}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
              style={{ left: `${pct}%`, backgroundColor: source.color }}
              title={source.name}
            />
          )
        })}
      </div>

      <div className="flex justify-between text-xs text-gray-400 -mt-4 mb-4">
        <span>← Izquierda</span>
        <span>Centro</span>
        <span>Derecha →</span>
      </div>

      {/* Source list */}
      <div className="grid grid-cols-2 gap-2">
        {sorted.map(source => (
          <div key={source.slug} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: source.color }}
            />
            <span className="text-sm text-gray-700">{source.name}</span>
            <span className="text-xs text-gray-400 ml-auto">{source.ideology_label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
