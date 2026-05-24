/**
 * HeadlineComparison — the signature feature.
 *
 * Shows every outlet's headline for the same story side-by-side.
 * Words that appear in only one outlet (or ≤ 40 % of outlets) are
 * highlighted in that outlet's brand colour + bold — making the framing
 * differences instantly visible without any reading required.
 *
 * Pure server component, zero runtime cost.
 */

import type { ClusterArticle } from '@/lib/types'

// ── Tokeniser ─────────────────────────────────────────────────────────────────

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

// ── Distinctive word detection ────────────────────────────────────────────────

/**
 * Returns a Map<sourceSlug, Set<normalizedToken>> where each set contains
 * the tokens that are DISTINCTIVE to that outlet — i.e. they appear in
 * ≤ 40 % of all headlines in this cluster.
 *
 * With 2 outlets: tokens shared by both are common; solo tokens are distinctive.
 * With 4 outlets: tokens in ≤ 1-2 outlets are distinctive.
 */
function computeDistinctive(
  articles: ClusterArticle[]
): Map<string, Set<string>> {
  const n = articles.length
  if (n < 2) return new Map()

  const freq = new Map<string, number>()
  for (const art of articles) {
    const seen = new Set(tokenize(art.article_title))
    for (const t of seen) freq.set(t, (freq.get(t) ?? 0) + 1)
  }

  // Token is "distinctive" if it appears in at most floor(n × 0.4) articles.
  // floor(2×0.4)=0 → always 1; floor(3×0.4)=1; floor(4×0.4)=1; floor(5×0.4)=2
  const threshold = Math.max(1, Math.floor(n * 0.4))

  const result = new Map<string, Set<string>>()
  for (const art of articles) {
    const distinctive = new Set<string>()
    for (const t of tokenize(art.article_title)) {
      if ((freq.get(t) ?? 0) <= threshold) distinctive.add(t)
    }
    result.set(art.source_slug, distinctive)
  }
  return result
}

// ── Rendering ─────────────────────────────────────────────────────────────────

/**
 * Splits a title into words+spaces and renders each word either as
 * highlighted (distinctive, in source colour) or plain.
 */
function HeadlineWithHighlights({
  title,
  distinctive,
  color,
}: {
  title: string
  distinctive: Set<string>
  color: string
}) {
  // Split on whitespace, preserving the spaces so the text flows naturally
  const chunks = title.split(/(\s+)/)
  return (
    <>
      {chunks.map((chunk, i) => {
        const n = norm(chunk)
        if (n.length > 3 && !STOP.has(n) && distinctive.has(n)) {
          return (
            <mark
              key={i}
              style={{
                color,
                fontWeight: 700,
                background: 'none',
                padding: 0,
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

export default function HeadlineComparison({
  articles,
}: {
  articles: ClusterArticle[]
}) {
  if (articles.length < 2) return null

  const distinctive = computeDistinctive(articles)

  // Count how many headlines have at least one distinctive word — this tells
  // us whether the comparison is meaningful or if all headlines are very similar.
  const framesWithDistinctive = articles.filter(
    a => (distinctive.get(a.source_slug)?.size ?? 0) > 0
  ).length
  const hasContrast = framesWithDistinctive >= 2

  return (
    <section style={{ marginBottom: 36 }}>

      {/* Section header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          paddingBottom: 10,
          marginBottom: 0,
          borderBottom: '2px solid var(--ink)',
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink)',
          }}
        >
          Cómo lo titularon
        </span>
        <span
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-mute)',
          }}
        >
          {articles.length} {articles.length === 1 ? 'medio' : 'medios'}
        </span>
      </div>

      {/* Headline rows */}
      <div style={{ border: '1px solid var(--line)', borderTop: 'none' }}>
        {articles.map((art, i) => (
          <a
            key={art.source_slug}
            href={art.article_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group"
            style={{
              display: 'block',
              padding: '13px 16px 13px 13px',
              borderLeft: `3px solid ${art.source_color}`,
              borderBottom:
                i < articles.length - 1 ? '1px solid var(--line-soft)' : 'none',
              background: 'var(--surface)',
              textDecoration: 'none',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e =>
              ((e.currentTarget as HTMLElement).style.background =
                'var(--surface-2)')
            }
            onMouseLeave={e =>
              ((e.currentTarget as HTMLElement).style.background =
                'var(--surface)')
            }
          >
            {/* Source label */}
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.13em',
                textTransform: 'uppercase',
                color: art.source_color,
                marginBottom: 5,
              }}
            >
              {art.source_name}
            </span>

            {/* Headline with distinctive-word highlighting */}
            <span
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '15px',
                lineHeight: 1.5,
                color: 'var(--ink)',
              }}
            >
              <HeadlineWithHighlights
                title={art.article_title}
                distinctive={distinctive.get(art.source_slug) ?? new Set()}
                color={art.source_color}
              />
            </span>
          </a>
        ))}
      </div>

      {/* Contrast legend / hint */}
      {hasContrast && (
        <p
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-mute)',
            marginTop: 8,
            letterSpacing: '0.03em',
          }}
        >
          Las palabras{' '}
          <span style={{ color: 'var(--ink-dim)', fontWeight: 600 }}>en color</span>{' '}
          aparecen solo en ese medio.
        </p>
      )}
    </section>
  )
}
