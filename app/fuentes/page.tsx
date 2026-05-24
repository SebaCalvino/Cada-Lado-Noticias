/**
 * /fuentes — Medios monitoreados.
 *
 * Shows all monitored sources with their ideological positioning on a
 * left-to-right spectrum.  Editorial style — no rounded Tailwind cards.
 */

import { ExternalLink } from 'lucide-react'
import { getSourcesServer } from '@/lib/queries'
import type { Source } from '@/lib/types'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Medios monitoreados — Cada Lado Noticias',
  description: 'Los medios argentinos que analizamos continuamente para detectar múltiples narrativas sobre los mismos hechos.',
}

// ── Inline spectrum (all monitored sources) ───────────────────────────────────

function AllSourcesSpectrum({ sources }: { sources: Source[] }) {
  const sorted = [...sources].sort((a, b) => a.ideology_score - b.ideology_score)

  return (
    <section style={{ marginBottom: 40 }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        paddingBottom: 10, marginBottom: 0, borderBottom: '2px solid var(--ink)',
      }}>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink)' }}>
          Espectro político
        </span>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}>
          {sources.length} fuentes
        </span>
      </div>

      <div style={{ border: '1px solid var(--line)', borderTop: 'none', background: 'var(--surface)', padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.1em', marginBottom: 10 }}>
          <span>← Izquierda</span>
          <span>Centro</span>
          <span>Derecha →</span>
        </div>

        <div style={{ position: 'relative', height: 4, marginBottom: 28 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right, #2563eb 0%, #9ca3af 50%, #dc2626 100%)' }} />
          <div style={{ position: 'absolute', left: '50%', top: -4, width: 1, height: 12, background: 'var(--ink-mute)', transform: 'translateX(-50%)' }} />
          {sorted.map(source => {
            const pct = ((source.ideology_score + 1) / 2) * 100
            return (
              <div
                key={source.slug}
                title={`${source.name}${source.ideology_label ? ` · ${source.ideology_label}` : ''}`}
                style={{
                  position: 'absolute', left: `${pct}%`, top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 16, height: 16, borderRadius: '50%',
                  background: source.color, border: '2px solid var(--bg)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.18)', cursor: 'default',
                }}
              />
            )
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px 16px' }}>
          {sorted.map(source => (
            <div key={source.slug} style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: source.color, flexShrink: 0 }} />
              <div style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-2)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                  {source.name}
                </span>
                {source.ideology_label && (
                  <span style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)' }}>
                    {source.ideology_label}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function FuentesPage() {
  const sources = await getSourcesServer()
  const sorted  = [...sources].sort((a, b) => a.ideology_score - b.ideology_score)

  return (
    <div style={{ background: 'var(--bg)', minHeight: '80vh' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 16px 64px' }}>

        {/* Page header */}
        <div style={{ paddingTop: 32, paddingBottom: 24, borderBottom: '2px solid var(--ink)', marginBottom: 36 }}>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 10 }}>
            Fuentes
          </p>
          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 400, lineHeight: 1.2, color: 'var(--ink)', margin: 0 }}>
            Medios monitoreados
          </h1>
          <p style={{ fontSize: 15, color: 'var(--ink-2)', marginTop: 12, maxWidth: '56ch', lineHeight: 1.65 }}>
            Analizamos {sources.length} medios argentinos en tiempo real para reconstruir las múltiples
            narrativas que construyen sobre los mismos hechos.
          </p>
        </div>

        {/* Spectrum */}
        {sources.length > 0 && <AllSourcesSpectrum sources={sources} />}

        {/* Source grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {sorted.map(source => (
            <article
              key={source.slug}
              style={{
                border:       '1px solid var(--line)',
                borderLeft:   `3px solid ${source.color}`,
                background:   'var(--surface)',
                padding:      '16px 16px 14px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 12 }}>
                <div>
                  <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
                    {source.name}
                  </h2>
                  {source.ideology_label && (
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: source.color, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      {source.ideology_label}
                    </span>
                  )}
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--ink-mute)', lineHeight: 0, flexShrink: 0, marginTop: 2 }}
                  className="hover:opacity-60 transition-opacity"
                  title={`Visitar ${source.name}`}
                >
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Ideology mini-meter */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.08em', marginBottom: 5 }}>
                  <span>IZQUIERDA</span>
                  <span>DERECHA</span>
                </div>
                <div style={{ height: 3, background: 'var(--line)', position: 'relative' }}>
                  <div
                    style={{
                      position:  'absolute',
                      left:      `${((source.ideology_score + 1) / 2) * 100}%`,
                      top:       '50%',
                      transform: 'translate(-50%, -50%)',
                      width:     10, height: 10,
                      borderRadius: '50%',
                      background: source.color,
                      border:    '1.5px solid var(--bg)',
                    }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Methodology note */}
        <p style={{
          fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)',
          marginTop: 32, paddingTop: 20, borderTop: '1px solid var(--line)',
          lineHeight: 1.6, letterSpacing: '0.02em',
        }}>
          <strong style={{ color: 'var(--ink-dim)' }}>Nota metodológica:</strong>{' '}
          El posicionamiento ideológico es una estimación basada en análisis de cobertura periodística y
          no es una valoración positiva o negativa de ningún medio. Cada posicionamiento es discutible
          y puede cambiar con el tiempo.
        </p>

      </div>
    </div>
  )
}
