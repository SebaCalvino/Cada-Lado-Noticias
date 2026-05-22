import type { Source } from '@/types'

export default function IdeologySpectrum({ sources }: { sources: Source[] }) {
  const sorted = [...sources].sort((a, b) => a.ideology_score - b.ideology_score)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="font-bold text-gray-900 text-xs uppercase tracking-widest mb-5 pb-4 border-b border-gray-100">
        Espectro ideológico de los medios
      </h3>

      {/* Axis labels */}
      <div className="flex justify-between text-xs text-gray-400 mb-2 font-medium">
        <span>← Izquierda</span>
        <span>Centro</span>
        <span>Derecha →</span>
      </div>

      {/* Spectrum bar with dots */}
      <div
        className="relative h-2 rounded-full mb-8"
        style={{ background: 'linear-gradient(to right, #2563eb 0%, #9ca3af 50%, #dc2626 100%)' }}
      >
        {/* Center marker */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-4 bg-white/60" />

        {sorted.map(source => {
          const pct = ((source.ideology_score + 1) / 2) * 100
          return (
            <div
              key={source.slug}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-md cursor-default"
              style={{ left: `${pct}%`, backgroundColor: source.color }}
              title={`${source.name}: ${source.ideology_label ?? ''}`}
            />
          )
        })}
      </div>

      {/* Source list */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
        {sorted.map(source => (
          <div key={source.slug} className="flex items-center gap-2 min-w-0">
            <div
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: source.color }}
            />
            <div className="min-w-0">
              <span className="text-sm text-gray-800 font-medium block truncate">{source.name}</span>
              {source.ideology_label && (
                <span className="text-xs text-gray-400 block">{source.ideology_label}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
