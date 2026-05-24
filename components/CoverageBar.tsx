'use client'

/**
 * CoverageBar — editorial per-source analysis card.
 *
 * Design principles:
 *  • Left border in source brand colour — instant visual identification.
 *  • No "Completo" / "Omite info" traffic-light badges — those felt like a
 *    judgment algorithm, not editorial analysis.
 *  • "Destaca" instead of "ÉNFASIS" — plain language.
 *  • Omissions in a soft amber wash — noticed but not alarming.
 *  • Typography and spacing consistent with the site's editorial palette.
 */

import type { ClusterArticle } from '@/lib/types'
import { ExternalLink } from 'lucide-react'

export default function CoverageBar({ article }: { article: ClusterArticle }) {
  const hasEmphasis   = article.emphasis   && article.emphasis.trim()   !== ''
  const hasOmissions  =
    article.omissions &&
    article.omissions !== 'Sin omisiones destacadas.' &&
    article.omissions.trim() !== ''

  return (
    <div
      style={{
        border:          '1px solid var(--line)',
        borderLeft:      `3px solid ${article.source_color}`,
        background:      'var(--surface)',
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div
        style={{
          padding:       '9px 14px 9px 12px',
          borderBottom:  '1px solid var(--line-soft)',
          background:    'var(--surface-2)',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
          gap:           8,
        }}
      >
        <span
          style={{
            fontSize:       10,
            fontFamily:     'var(--font-mono)',
            fontWeight:     700,
            letterSpacing:  '0.13em',
            textTransform:  'uppercase',
            color:          article.source_color,
          }}
        >
          {article.source_name}
        </span>
        <a
          href={article.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:opacity-80 transition-opacity"
          style={{
            display:     'flex',
            alignItems:  'center',
            gap:         4,
            fontSize:    11,
            fontFamily:  'var(--font-mono)',
            color:       'var(--ink-mute)',
            textDecoration: 'none',
            whiteSpace:  'nowrap',
          }}
          onClick={e => e.stopPropagation()}
        >
          Ver nota <ExternalLink size={10} />
        </a>
      </div>

      {/* ── Content ───────────────────────────────────────────────────── */}
      <div style={{ padding: '12px 14px 12px 12px' }}>

        {hasEmphasis && (
          <div style={{ marginBottom: hasOmissions ? 10 : 0 }}>
            <span
              style={{
                display:       'block',
                fontSize:      10,
                fontFamily:    'var(--font-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         'var(--ink-mute)',
                marginBottom:  4,
                fontWeight:    500,
              }}
            >
              Destaca
            </span>
            <p
              style={{
                fontSize:   13,
                color:      'var(--ink-2)',
                lineHeight: 1.7,
                margin:     0,
              }}
            >
              {article.emphasis}
            </p>
          </div>
        )}

        {hasOmissions && (
          <div
            style={{
              padding:    '10px 12px',
              background: '#fffbf0',
              border:     '1px solid #ede0be',
            }}
          >
            <span
              style={{
                display:       'block',
                fontSize:      10,
                fontFamily:    'var(--font-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color:         '#9a6f1a',
                marginBottom:  4,
                fontWeight:    500,
              }}
            >
              No menciona
            </span>
            <p
              style={{
                fontSize:   13,
                color:      '#5a3e08',
                lineHeight: 1.7,
                margin:     0,
              }}
            >
              {article.omissions}
            </p>
          </div>
        )}

        {/* Fallback: if no analysis yet, show nothing */}
        {!hasEmphasis && !hasOmissions && null}
      </div>
    </div>
  )
}
