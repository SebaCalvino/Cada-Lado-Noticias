/**
 * EvolutionTimeline — how media framing shifted over time.
 *
 * Shows the cluster's articles in chronological order (by publishedAt).
 * Words that appear in a later article but NOT in the earliest one are
 * highlighted in that outlet's brand colour — making framing shifts
 * instantly visible without any reading required.
 *
 * Example:
 *   10:32  ● INFOBAE   Protesta en el Congreso: manifestantes rodean el edificio
 *   12:15  ● CLARÍN    [Incidentes] en la marcha: hay [heridos] y [detenidos]
 *   19:47  ● TN        [Violencia] en la protesta: confirman 10 [detenidos]
 *
 * Only renders when:
 *   – 3 or more articles carry a valid publishedAt timestamp
 *   – The time spread between first and last article is ≥ 30 minutes
 *   – At least one later article introduces vocabulary absent from the first
 *
 * Pure server component, zero runtime cost.
 */

import type { ClusterArticle } from '@/lib/types'

// ── Tokeniser (same stop-words / normaliser as HeadlineComparison) ────────────

const STOP = new Set([
  'el','la','los','las','un','una','de','del','al','en','y','a','con','por',
  'que','se','su','sus','es','son','fue','ha','han','lo','le','les','no','si',
  'para','como','pero','ya','o','este','esta','ese','esa','hacia','sobre',
  'ante','tras','desde','hasta','entre','muy','más','mas','tan','tanto',
  'donde','cuando','aunque','sino','ni','porque','como','cual','cuya',
])

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w]/g, '')
}

function tokenize(title: string): string[] {
  return title
    .split(/\s+/)
    .map(norm)
    .filter(t => t.length > 3 && !STOP.has(t))
}

// ── New-vocabulary detection ──────────────────────────────────────────────────

/**
 * For each article at index i (in time-sorted order) returns the set of
 * tokens that appear in that article but NOT in the earliest article (index 0).
 * Index 0 always returns an empty set — it IS the baseline.
 */
function computeNewVocab(sorted: ClusterArticle[]): Map<number, Set<string>> {
  const result = new Map<number, Set<string>>()
  if (sorted.length < 2) return result

  const baseTokens = new Set(tokenize(sorted[0].article_title))

  result.set(0, new Set())
  for (let i = 1; i < sorted.length; i++) {
    const newWords = new Set<string>()
    for (const tok of tokenize(sorted[i].article_title)) {
      if (!baseTokens.has(tok)) newWords.add(tok)
    }
    result.set(i, newWords)
  }
  return result
}

// ── Time formatting ───────────────────────────────────────────────────────────

/** Returns "HH:MM" in Argentine time (UTC-3, no DST). */
function formatArgTime(iso: string): string {
  try {
    const d = new Date(iso)
    // Argentina is UTC-3 and does not observe DST
    const argMs   = d.getTime() - 3 * 60 * 60 * 1000
    const argDate = new Date(argMs)
    const hh = argDate.getUTCHours().toString().padStart(2, '0')
    const mm = argDate.getUTCMinutes().toString().padStart(2, '0')
    return `${hh}:${mm}`
  } catch {
    return ''
  }
}

// ── Inline headline renderer ──────────────────────────────────────────────────

function HeadlineWithNewVocab({
  title,
  newVocab,
  color,
}: {
  title: string
  newVocab: Set<string>
  color: string
}) {
  const chunks = title.split(/(\s+)/)
  return (
    <>
      {chunks.map((chunk, i) => {
        const n = norm(chunk)
        if (n.length > 3 && !STOP.has(n) && newVocab.has(n)) {
          return (
            <mark
              key={i}
              style={{
                color,
                fontWeight:  700,
                background:  'none',
                padding:     0,
              }}
            >
              {chunk}
            </mark>
          )
        }
        return <span key={i}>{chunk}</span>
      })}
    </>
  )
}

// ── Public component ──────────────────────────────────────────────────────────

export default function EvolutionTimeline({
  articles,
}: {
  articles: ClusterArticle[]
}) {
  // Filter to articles with a valid timestamp, sort oldest-first
  const timed = articles
    .filter(a => !!a.published_at)
    .sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime())

  // Need at least 3 data points for a meaningful timeline
  if (timed.length < 3) return null

  const firstMs = new Date(timed[0].published_at!).getTime()
  const lastMs  = new Date(timed[timed.length - 1].published_at!).getTime()
  const spanMin = (lastMs - firstMs) / 60_000

  // Require at least 30-minute spread — otherwise it's not a "timeline"
  if (spanMin < 30) return null

  const newVocab = computeNewVocab(timed)

  // Only show if at least one later article actually introduces new words
  const hasShift = Array.from(newVocab.values()).some(s => s.size > 0)
  if (!hasShift) return null

  return (
    <section style={{ marginBottom: 36 }}>

      {/* Section header */}
      <div
        style={{
          display:       'flex',
          alignItems:    'baseline',
          justifyContent:'space-between',
          paddingBottom: 10,
          marginBottom:  0,
          borderBottom:  '2px solid var(--ink)',
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
          Cómo evolucionó el relato
        </span>
        <span
          style={{
            fontSize:   11,
            fontFamily: 'var(--font-mono)',
            color:      'var(--ink-mute)',
          }}
        >
          {Math.round(spanMin / 60) > 0
            ? `${Math.round(spanMin / 60)}h de evolución`
            : `${Math.round(spanMin)}min de evolución`}
        </span>
      </div>

      {/* Timeline rows */}
      <div style={{ border: '1px solid var(--line)', borderTop: 'none' }}>
        {timed.map((art, i) => {
          const vocab = newVocab.get(i) ?? new Set<string>()
          const isFirst = i === 0

          return (
            <a
              key={`${art.source_slug}-${i}`}
              href={art.article_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:bg-[var(--surface-2)] transition-colors duration-150"
              style={{
                display:      'grid',
                gridTemplateColumns: '42px 1fr',
                gap:          '0 12px',
                padding:      '12px 14px 12px 0',
                borderLeft:   `3px solid ${art.source_color}`,
                borderBottom: i < timed.length - 1 ? '1px solid var(--line-soft)' : 'none',
                background:   'var(--surface)',
                textDecoration: 'none',
                alignItems:   'start',
              }}
            >
              {/* Time column */}
              <div
                style={{
                  textAlign:  'right',
                  paddingLeft: 10,
                  paddingTop:  2,
                }}
              >
                <span
                  style={{
                    fontSize:   10,
                    fontFamily: 'var(--font-mono)',
                    color:      isFirst ? 'var(--ink-dim)' : 'var(--ink-mute)',
                    fontWeight: isFirst ? 600 : 400,
                    lineHeight: 1,
                    display:    'block',
                  }}
                >
                  {formatArgTime(art.published_at!)}
                </span>
              </div>

              {/* Headline column */}
              <div style={{ paddingRight: 14 }}>
                {/* Source label */}
                <span
                  style={{
                    display:       'block',
                    fontSize:      10,
                    fontFamily:    'var(--font-mono)',
                    fontWeight:    700,
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color:         art.source_color,
                    marginBottom:  4,
                  }}
                >
                  {art.source_name}
                  {isFirst && (
                    <span
                      style={{
                        marginLeft:    6,
                        fontWeight:    400,
                        color:         'var(--ink-mute)',
                        letterSpacing: '0.06em',
                      }}
                    >
                      · primera versión
                    </span>
                  )}
                </span>

                {/* Headline */}
                <span
                  style={{
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    fontSize:   '14px',
                    lineHeight: 1.5,
                    color:      'var(--ink)',
                  }}
                >
                  <HeadlineWithNewVocab
                    title={art.article_title}
                    newVocab={vocab}
                    color={art.source_color}
                  />
                </span>
              </div>
            </a>
          )
        })}
      </div>

      {/* Legend */}
      <p
        style={{
          fontSize:   11,
          fontFamily: 'var(--font-mono)',
          color:      'var(--ink-mute)',
          marginTop:  8,
          letterSpacing: '0.03em',
        }}
      >
        Las palabras{' '}
        <span style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>en color</span>{' '}
        no aparecían en la primera versión de esta noticia.
      </p>
    </section>
  )
}
