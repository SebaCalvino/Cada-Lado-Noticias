import { getSources } from '@/lib/api'
import type { Source } from '@/types'
import IdeologySpectrum from '@/components/IdeologySpectrum'
import { ExternalLink } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function FuentesPage() {
  let sources: Source[] = []
  try {
    sources = await getSources()
  } catch {}

  const sorted = [...sources].sort((a, b) => a.ideology_score - b.ideology_score)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="font-sans font-black uppercase tracking-wider text-3xl text-gray-900 mb-2">MEDIOS MONITOREADOS</h1>
      <p className="text-gray-600 mb-8">
        Analizamos {sources.length} medios argentinos que representan todo el espectro ideológico.
      </p>

      {sources.length > 0 && (
        <div className="mb-10">
          <IdeologySpectrum sources={sources} />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {sorted.map(source => (
          <div key={source.slug} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: source.color }}
                  />
                  <h2 className="font-bold text-gray-900">{source.name}</h2>
                </div>
                {source.ideology_label && (
                  <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-full">
                    {source.ideology_label}
                  </span>
                )}
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors mt-1"
              >
                Visitar <ExternalLink size={11} />
              </a>
            </div>

            {/* Ideology meter */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Izquierda</span>
                <span>Derecha</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full relative">
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full border-2 border-white shadow-sm"
                  style={{
                    left: `${((source.ideology_score + 1) / 2) * 100}%`,
                    backgroundColor: source.color,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-gray-50 rounded-xl border border-gray-200 p-5 text-sm text-gray-600 border-l-4 border-l-gray-300 pl-4">
        <strong className="text-gray-900">Nota metodológica:</strong> La posición ideológica es una estimación basada en análisis
        de cobertura periodística y no representa una valoración positiva o negativa de ningún medio.
        Cada posicionamiento es discutible y puede cambiar con el tiempo.
      </div>
    </div>
  )
}
