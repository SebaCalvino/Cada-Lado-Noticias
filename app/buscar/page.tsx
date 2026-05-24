/**
 * /buscar — News search page.
 *
 * A GET-form-based search that queries the local cluster corpus first.
 * When no internal comparison exists, it gracefully falls back to direct
 * search links on the major Argentine outlets — giving users a path forward
 * rather than a dead end.
 *
 * Server component. No client-side JS required for the search itself.
 * The header's inline search bar provides the enhanced UX on desktop.
 */

import Link       from 'next/link'
import { ArrowLeft, ExternalLink, Search } from 'lucide-react'
import { searchClustersServer } from '@/lib/queries'
import NewsCard   from '@/components/NewsCard'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { q?: string }
}

// ── Outlet fallback links ─────────────────────────────────────────────────────
// Used when we have no internal comparison for the query.
// Links open the outlet's own search — reliable, always relevant.

const OUTLETS = [
  { name: 'Clarín',       color: '#004B87', search: (q: string) => `https://www.clarin.com/busqueda-de-noticias/?q=${encodeURIComponent(q)}`    },
  { name: 'La Nación',    color: '#1A3A5C', search: (q: string) => `https://www.lanacion.com.ar/buscar/?q=${encodeURIComponent(q)}`              },
  { name: 'Infobae',      color: '#E30613', search: (q: string) => `https://www.infobae.com/buscar/${encodeURIComponent(q)}/`                    },
  { name: 'Página 12',    color: '#1A1A1A', search: (q: string) => `https://www.pagina12.com.ar/buscar?q=${encodeURIComponent(q)}`               },
  { name: 'Ámbito',       color: '#FF6B00', search: (q: string) => `https://www.ambito.com/busqueda?q=${encodeURIComponent(q)}`                  },
  { name: 'TN',           color: '#005BAC', search: (q: string) => `https://tn.com.ar/buscar/?q=${encodeURIComponent(q)}`                        },
  { name: 'Perfil',       color: '#8B0000', search: (q: string) => `https://www.perfil.com/busqueda?q=${encodeURIComponent(q)}`                  },
  { name: 'El Destape',   color: '#e53e3e', search: (q: string) => `https://eldestapeweb.com/?s=${encodeURIComponent(q)}`                        },
]

// ── Suggested searches (shown when no query) ──────────────────────────────────

const SUGGESTIONS = [
  'Milei', 'dólar', 'inflación', 'Congreso',
  'elecciones', 'corte suprema', 'YPF', 'Mercosur',
]

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function BuscarPage({ searchParams }: Props) {
  const query   = (searchParams.q ?? '').trim()
  const results = query ? await searchClustersServer(query, 15) : []

  const hasResults = results.length > 0
  const showFallback = query && !hasResults

  return (
    <div style={{ background: 'var(--bg)', minHeight: '80vh' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 16px 64px' }}>

        {/* ── Back nav ──────────────────────────────────────────────────── */}
        <div
          style={{
            borderBottom: '1px solid var(--line)',
            paddingTop:   12,
            paddingBottom: 12,
            marginBottom:  0,
          }}
        >
          <Link
            href="/noticias"
            style={{
              display:     'inline-flex',
              alignItems:  'center',
              gap:         6,
              fontSize:    12,
              fontFamily:  'var(--font-mono)',
              color:       'var(--ink-mute)',
              letterSpacing: '0.06em',
              textDecoration: 'none',
            }}
            className="hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft size={12} />
            Volver a noticias
          </Link>
        </div>

        {/* ── Search form ───────────────────────────────────────────────── */}
        <div
          style={{
            paddingTop:    28,
            paddingBottom: 28,
            borderBottom:  '2px solid var(--ink)',
            marginBottom:  0,
          }}
        >
          <p
            style={{
              fontSize:      11,
              fontFamily:    'var(--font-mono)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color:         'var(--ink-mute)',
              marginBottom:  16,
            }}
          >
            Buscar en Cada Lado
          </p>

          <form action="/buscar" method="GET">
            <div style={{ display: 'flex', gap: 0, maxWidth: 560 }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <Search
                  size={14}
                  style={{
                    position:  'absolute',
                    left:      12,
                    top:       '50%',
                    transform: 'translateY(-50%)',
                    color:     'var(--ink-mute)',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  name="q"
                  type="search"
                  defaultValue={query}
                  autoComplete="off"
                  placeholder="Tema, persona o evento…"
                  style={{
                    width:         '100%',
                    height:        46,
                    paddingLeft:   36,
                    paddingRight:  14,
                    fontSize:      15,
                    fontFamily:    'var(--font-fraunces), Georgia, serif',
                    border:        '1.5px solid var(--ink)',
                    borderRight:   'none',
                    background:    'var(--surface)',
                    color:         'var(--ink)',
                    outline:       'none',
                    borderRadius:  0,
                  }}
                />
              </div>
              <button
                type="submit"
                style={{
                  height:        46,
                  padding:       '0 20px',
                  fontSize:      12,
                  fontFamily:    'var(--font-mono)',
                  fontWeight:    700,
                  letterSpacing: '0.1em',
                  background:    'var(--ink)',
                  color:         'var(--bg)',
                  border:        'none',
                  cursor:        'pointer',
                  whiteSpace:    'nowrap',
                }}
              >
                Buscar
              </button>
            </div>
          </form>
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        {hasResults && (
          <>
            <div
              style={{
                display:       'flex',
                alignItems:    'baseline',
                justifyContent:'space-between',
                padding:       '20px 0 18px',
                borderBottom:  '1px solid var(--line)',
                marginBottom:  24,
              }}
            >
              <span
                style={{
                  fontSize:   13,
                  fontFamily: 'var(--font-mono)',
                  color:      'var(--ink-dim)',
                }}
              >
                <strong style={{ color: 'var(--ink)', fontWeight: 700 }}>
                  {results.length}
                </strong>{' '}
                {results.length === 1 ? 'comparación' : 'comparaciones'} para{' '}
                <em style={{ fontStyle: 'normal', color: 'var(--ink)' }}>
                  "{query}"
                </em>
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map(cluster => (
                <NewsCard key={cluster.id} cluster={cluster} />
              ))}
            </div>
          </>
        )}

        {/* ── Fallback: no internal results ─────────────────────────────── */}
        {showFallback && (
          <div style={{ paddingTop: 40 }}>
            <p
              style={{
                fontFamily:   'var(--font-fraunces), Georgia, serif',
                fontSize:     18,
                color:        'var(--ink)',
                marginBottom: 6,
                fontWeight:   400,
              }}
            >
              No tenemos una comparación para{' '}
              <em style={{ fontStyle: 'italic' }}>"{query}"</em> todavía.
            </p>
            <p
              style={{
                fontSize:     13,
                fontFamily:   'var(--font-mono)',
                color:        'var(--ink-mute)',
                marginBottom: 32,
              }}
            >
              Podés buscarla directamente en los medios:
            </p>

            <div
              style={{
                display:   'flex',
                flexWrap:  'wrap',
                gap:       8,
              }}
            >
              {OUTLETS.map(outlet => (
                <a
                  key={outlet.name}
                  href={outlet.search(query)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display:      'inline-flex',
                    alignItems:   'center',
                    gap:          6,
                    padding:      '8px 14px',
                    border:       `1.5px solid ${outlet.color}`,
                    fontSize:     12,
                    fontFamily:   'var(--font-mono)',
                    fontWeight:   600,
                    color:        outlet.color,
                    textDecoration: 'none',
                    letterSpacing: '0.05em',
                    transition:   'background 0.15s, color 0.15s',
                  }}
                  className="hover:bg-[var(--surface-2)] transition-colors"
                >
                  {outlet.name}
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>

            <p
              style={{
                fontSize:   11,
                fontFamily: 'var(--font-mono)',
                color:      'var(--ink-mute)',
                marginTop:  28,
                borderTop:  '1px solid var(--line)',
                paddingTop: 16,
              }}
            >
              Las comparaciones se generan automáticamente cuando múltiples medios cubren la misma historia.
              Si el tema es reciente, puede que aún no esté disponible.
            </p>
          </div>
        )}

        {/* ── Empty state (no query yet) ─────────────────────────────────── */}
        {!query && (
          <div style={{ paddingTop: 40 }}>
            <p
              style={{
                fontSize:     11,
                fontFamily:   'var(--font-mono)',
                letterSpacing:'0.1em',
                textTransform:'uppercase',
                color:        'var(--ink-mute)',
                marginBottom: 16,
              }}
            >
              Búsquedas frecuentes
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {SUGGESTIONS.map(s => (
                <a
                  key={s}
                  href={`/buscar?q=${encodeURIComponent(s)}`}
                  style={{
                    padding:      '7px 14px',
                    border:       '1px solid var(--line-strong)',
                    fontSize:     13,
                    fontFamily:   'var(--font-mono)',
                    color:        'var(--ink-dim)',
                    textDecoration: 'none',
                    background:   'var(--surface)',
                    transition:   'border-color 0.15s',
                  }}
                  className="hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
                >
                  {s}
                </a>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
