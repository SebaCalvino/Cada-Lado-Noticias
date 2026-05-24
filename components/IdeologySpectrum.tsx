/**
 * IdeologySpectrum — political positioning of the sources that covered a story.
 *
 * Shows only the outlets that appear in the current cluster, positioned on a
 * left-to-right ideological axis (−1 = Izquierda, 0 = Centro, +1 = Derecha).
 *
 * Only renders when:
 *  – the cluster is categorised as "Política"
 *  – at least 2 sources with different ideology positions covered the story
 *
 * Pure server component, zero runtime cost.
 */

import type { ClusterArticle } from '@/lib/types'

export default function IdeologySpectrum({
  articles,
}: {
  articles: ClusterArticle[]
}) {
  // Deduplicate by source (one entry per outlet)
  const unique = articles.filter(
    (a, i, arr) => arr.findIndex(b => b.source_slug === a.source_slug) === i
  )

  if (unique.length < 2) return null

  // Need at least 2 distinct ideology positions to be meaningful
  const scores = unique.map(a => a.ideology_score)
  const spread = Math.max(...scores) - Math.min(...scores)
  if (spread < 0.2) return null

  // Sort left → right
  const sorted = [...unique].sort((a, b) => a.ideology_score - b.ideology_score)

  return (
    <section style={{ marginBottom: 36 }}>
      {/* Section header */}
      <div
        style={{
          display:        'flex',
          alignItems:     'baseline',
          justifyContent: 'space-between',
          paddingBottom:  10,
          marginBottom:   0,
          borderBottom:   '2px solid var(--ink)',
        }}
      >
        <span
          style={{
            fontSize:      11,
            fontFamily:    'var(--font-mono)',
            fontWeight:    700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color:         'var(--ink)',
          }}
        >
          Espectro político de cobertura
        </span>
        <span
          style={{
            fontSize:   11,
            fontFamily: 'var(--font-mono)',
            color:      'var(--ink-mute)',
          }}
        >
          {sorted.length} {sorted.length === 1 ? 'medio' : 'medios'}
        </span>
      </div>

      {/* Spectrum container */}
      <div
        style={{
          border:     '1px solid var(--line)',
          borderTop:  'none',
          background: 'var(--surface)',
          padding:    '20px 20px 16px',
        }}
      >
        {/* Axis labels */}
        <div
          style={{
            display:        'flex',
            justifyContent: 'space-between',
            fontSize:       10,
            fontFamily:     'var(--font-mono)',
            color:          'var(--ink-mute)',
            letterSpacing:  '0.1em',
            marginBottom:   10,
          }}
        >
          <span>← Izquierda</span>
          <span>Centro</span>
          <span>Derecha →</span>
        </div>

        {/* Track */}
        <div style={{ position: 'relative', height: 4, marginBottom: 28 }}>
          {/* Gradient bar */}
          <div
            style={{
              position:   'absolute',
              inset:      0,
              background: 'linear-gradient(to right, #2563eb 0%, #9ca3af 50%, #dc2626 100%)',
            }}
          />
          {/* Centre tick */}
          <div
            style={{
              position:   'absolute',
              left:       '50%',
              top:        -4,
              width:      1,
              height:     12,
              background: 'var(--ink-mute)',
              transform:  'translateX(-50%)',
            }}
          />
          {/* Source dots */}
          {sorted.map(art => {
            const pct = ((art.ideology_score + 1) / 2) * 100
            return (
              <div
                key={art.source_slug}
                title={`${art.source_name}${art.ideology_label ? ` · ${art.ideology_label}` : ''}`}
                style={{
                  position:     'absolute',
                  left:         `${pct}%`,
                  top:          '50%',
                  transform:    'translate(-50%, -50%)',
                  width:        16,
                  height:       16,
                  borderRadius: '50%',
                  background:   art.source_color,
                  border:       '2px solid var(--bg)',
                  boxShadow:    '0 1px 3px rgba(0,0,0,0.18)',
                  cursor:       'default',
                }}
              />
            )
          })}
        </div>

        {/* Source list — 2-column grid */}
        <div
          style={{
            display:             'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap:                 '8px 16px',
          }}
        >
          {sorted.map(art => (
            <div
              key={art.source_slug}
              style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}
            >
              <span
                style={{
                  width:        8,
                  height:       8,
                  borderRadius: '50%',
                  background:   art.source_color,
                  flexShrink:   0,
                }}
              />
              <div style={{ minWidth: 0 }}>
                <span
                  style={{
                    display:    'block',
                    fontSize:   12,
                    fontWeight: 600,
                    color:      'var(--ink-2)',
                    overflow:   'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {art.source_name}
                </span>
                {art.ideology_label && (
                  <span
                    style={{
                      display:    'block',
                      fontSize:   10,
                      fontFamily: 'var(--font-mono)',
                      color:      'var(--ink-mute)',
                    }}
                  >
                    {art.ideology_label}
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
