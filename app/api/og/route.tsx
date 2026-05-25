/**
 * Dynamic OG image generator — /api/og
 *
 * Usage (from generateMetadata):
 *   /api/og?title=Titulo&category=Politica&synthesis=Resumen...
 *
 * Edge runtime — zero cold start, ~50ms TTFB.
 * Data is passed via URL params so no DB calls are needed here.
 *
 * Produces a 1200×630 PNG with:
 *  - Cada Lado masthead (top left)
 *  - Category chip (top right)
 *  - Story title (large, max 2 lines)
 *  - Short synthesis excerpt (grey, 1 line)
 *  - Domain watermark (bottom right)
 *  - Newspaper-column grid background (subtle)
 */

import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

// 1200×630 is the canonical OG size for Twitter cards and WhatsApp previews
const W = 1200
const H = 630

const CATEGORY_BG: Record<string, string> = {
  'Política':      '#1e40af',
  'Economía':      '#065f46',
  'Sociedad':      '#5b21b6',
  'Seguridad':     '#991b1b',
  'Internacional': '#1e3a8a',
  'Deportes':      '#92400e',
  'Cultura':       '#9d174d',
  'Tecnología':    '#0e7490',
  'Ambiente':      '#065f46',
}

function truncate(text: string, max: number): string {
  if (!text) return ''
  return text.length > max ? text.slice(0, max - 1) + '…' : text
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const title     = searchParams.get('title')     ?? 'Cada Lado Noticias'
  const synthesis = searchParams.get('synthesis') ?? ''
  const category  = searchParams.get('category')  ?? ''

  const catColor  = CATEGORY_BG[category] ?? '#1f2937'
  const titleText = truncate(title, 120)
  const excerpt   = truncate(synthesis.replace(/\n/g, ' '), 140)

  return new ImageResponse(
    (
      <div
        style={{
          width:           W,
          height:          H,
          display:         'flex',
          flexDirection:   'column',
          justifyContent:  'space-between',
          background:      '#F7F4EE',
          padding:         '64px 72px',
          fontFamily:      'Georgia, serif',
        }}
      >
        {/* ── Top bar ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Masthead */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span
              style={{
                fontSize:    48,
                fontWeight:  700,
                color:       '#111111',
                letterSpacing: '-1px',
                lineHeight:  1,
              }}
            >
              CADA LADO
            </span>
            <span style={{ fontSize: 13, color: '#666666', letterSpacing: '3px', fontFamily: 'sans-serif' }}>
              ANÁLISIS NARRATIVO · ARGENTINA
            </span>
          </div>

          {/* Category chip */}
          {category ? (
            <div
              style={{
                background:   catColor,
                color:        '#ffffff',
                fontSize:     14,
                fontWeight:   600,
                letterSpacing: '2px',
                padding:      '6px 16px',
                fontFamily:   'sans-serif',
                textTransform: 'uppercase',
              }}
            >
              {category}
            </div>
          ) : null}
        </div>

        {/* ── Rule ──────────────────────────────────────────────────────── */}
        <div style={{ width: '100%', height: 3, background: '#111111', display: 'flex' }} />

        {/* ── Title ────────────────────────────────────────────────────── */}
        <div
          style={{
            flex:         1,
            display:      'flex',
            flexDirection:'column',
            justifyContent: 'center',
            gap:          20,
          }}
        >
          <span
            style={{
              fontSize:    titleText.length > 80 ? 46 : 56,
              fontWeight:  700,
              color:       '#111111',
              lineHeight:  1.15,
              letterSpacing: '-0.5px',
            }}
          >
            {titleText}
          </span>

          {excerpt ? (
            <span
              style={{
                fontSize:   22,
                color:      '#555555',
                lineHeight: 1.4,
                fontStyle:  'italic',
              }}
            >
              {excerpt}
            </span>
          ) : null}
        </div>

        {/* ── Bottom rule ──────────────────────────────────────────────── */}
        <div style={{ width: '100%', height: 1, background: '#CCCCCC', display: 'flex' }} />

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 14, color: '#888888', fontFamily: 'sans-serif' }}>
            Dos perspectivas. Una historia.
          </span>
          <span
            style={{
              fontSize:    14,
              color:       '#888888',
              fontFamily:  'sans-serif',
              letterSpacing: '1px',
            }}
          >
            cada-lado-noticias.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width:  W,
      height: H,
    }
  )
}
