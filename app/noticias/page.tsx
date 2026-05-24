import { getNewsClustersServer, getCategoriesServer } from '@/lib/queries'
import NewsCard from '@/components/NewsCard'
import Link    from 'next/link'
import { noticiaHref } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface Props {
  searchParams: { category?: string; page?: string }
}

const CATEGORY_COLOR: Record<string, string> = {
  'Política':      '#1e40af',
  'Economía':      '#065f46',
  'Sociedad':      '#6d28d9',
  'Seguridad':     '#991b1b',
  'Internacional': '#3730a3',
  'Deportes':      '#92400e',
  'Cultura':       '#9d174d',
  'Tecnología':    '#164e63',
  'Ambiente':      '#134e4a',
}

function formatDate(date: Date): string {
  const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  return `${days[date.getDay()]}, ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`
}

// ── Editorial hook computation ────────────────────────────────────────────────
// Derived entirely from the already-loaded clusters — zero extra DB round trips.

interface EditorialHook {
  label: string
  value: string
  href:  string
}

function computeEditorialHooks(
  clusters: Awaited<ReturnType<typeof getNewsClustersServer>>
): EditorialHook[] {
  if (clusters.length === 0) return []
  const hooks: EditorialHook[] = []

  // Most covered: highest source_count
  const mostCovered = [...clusters].sort((a, b) => b.source_count - a.source_count)[0]
  if (mostCovered && mostCovered.source_count >= 3) {
    hooks.push({
      label: 'La más cubierta hoy',
      value: `${mostCovered.source_count} medios`,
      href:  noticiaHref(mostCovered.id, mostCovered.title),
    })
  }

  // Most divided: source_count >= 4, prefer the one with most sources
  const mostDivided = clusters.find(c => c.source_count >= 4)
  if (mostDivided && mostDivided.id !== mostCovered?.id) {
    hooks.push({
      label: 'La más debatida',
      value: `${mostDivided.source_count} versiones distintas`,
      href:  noticiaHref(mostDivided.id, mostDivided.title),
    })
  }

  // Top category today (from the loaded results)
  const catCount: Record<string, number> = {}
  for (const c of clusters) {
    if (c.category) catCount[c.category] = (catCount[c.category] ?? 0) + 1
  }
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0]
  if (topCat && topCat[1] >= 2) {
    hooks.push({
      label: 'Tema más cubierto',
      value: `${topCat[0]} · ${topCat[1]} historias`,
      href:  `/noticias?category=${encodeURIComponent(topCat[0])}`,
    })
  }

  return hooks.slice(0, 3)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NoticiasPage({ searchParams }: Props) {
  const category = searchParams.category
  const page     = parseInt(searchParams.page || '1', 10)

  const [clusters, categories] = await Promise.all([
    getNewsClustersServer(page, 20, category),
    getCategoriesServer(),
  ])
  const today        = formatDate(new Date())
  const editorialHooks = !category && page === 1
    ? computeEditorialHooks(clusters)
    : []

  return (
    <div style={{ background: 'var(--bg)' }}>
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 16px 64px' }}>

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div
          style={{
            paddingTop:    28,
            paddingBottom: 20,
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
              marginBottom:  8,
            }}
          >
            {today}
          </p>
          <h1
            style={{
              fontFamily:   'var(--font-fraunces), Georgia, serif',
              fontSize:     'clamp(28px, 5vw, 42px)',
              fontWeight:   400,
              lineHeight:   1.15,
              color:        'var(--ink)',
              margin:       0,
            }}
          >
            {category ? category : 'Últimas noticias'}
          </h1>
        </div>

        {/* ── Category filters ────────────────────────────────────────── */}
        <div
          style={{
            display:    'flex',
            flexWrap:   'wrap',
            gap:        0,
            borderBottom: '1px solid var(--line)',
            marginBottom: 0,
          }}
        >
          <Link
            href="/noticias"
            style={{
              padding:       '10px 14px',
              fontSize:      12,
              fontFamily:    'var(--font-mono)',
              letterSpacing: '0.08em',
              textDecoration: 'none',
              borderBottom:  !category ? '3px solid var(--ink)' : '3px solid transparent',
              color:         !category ? 'var(--ink)' : 'var(--ink-mute)',
              fontWeight:    !category ? 700 : 500,
              marginBottom:  -1,
              transition:    'color 0.15s',
            }}
          >
            Todas
          </Link>
          {categories.map(cat => {
            const active = category === cat.category
            const color  = CATEGORY_COLOR[cat.category] ?? 'var(--ink)'
            return (
              <Link
                key={cat.category}
                href={`/noticias?category=${encodeURIComponent(cat.category)}`}
                style={{
                  padding:       '10px 14px',
                  fontSize:      12,
                  fontFamily:    'var(--font-mono)',
                  letterSpacing: '0.08em',
                  textDecoration: 'none',
                  borderBottom:  active ? `3px solid ${color}` : '3px solid transparent',
                  color:         active ? color : 'var(--ink-mute)',
                  fontWeight:    active ? 700 : 500,
                  marginBottom:  -1,
                  transition:    'color 0.15s',
                }}
              >
                {cat.category}
                <span style={{ marginLeft: 5, opacity: 0.5, fontSize: 10 }}>{cat.count}</span>
              </Link>
            )
          })}
        </div>

        {/* ── Editorial hooks strip ────────────────────────────────────── */}
        {/* Shown only on the all-stories view, page 1 — generated from real data */}
        {editorialHooks.length > 0 && (
          <div
            style={{
              display:    'flex',
              flexWrap:   'wrap',
              gap:        1,
              background: 'var(--line)',
              borderBottom: '1px solid var(--line)',
              marginBottom: 32,
            }}
          >
            {editorialHooks.map(hook => (
              <Link
                key={hook.label}
                href={hook.href}
                style={{
                  flex:          '1 1 200px',
                  background:    'var(--surface-2)',
                  padding:       '12px 16px',
                  textDecoration:'none',
                  display:       'block',
                  transition:    'background 0.15s',
                }}
                className="hover:bg-[var(--surface-3)] transition-colors"
              >
                <span
                  style={{
                    display:       'block',
                    fontSize:      10,
                    fontFamily:    'var(--font-mono)',
                    letterSpacing: '0.13em',
                    textTransform: 'uppercase',
                    color:         'var(--ink-mute)',
                    fontWeight:    500,
                    marginBottom:  4,
                  }}
                >
                  {hook.label}
                </span>
                <span
                  style={{
                    display:    'block',
                    fontSize:   13,
                    fontFamily: 'var(--font-fraunces), Georgia, serif',
                    color:      'var(--ink)',
                    lineHeight: 1.35,
                  }}
                >
                  {hook.value}
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Stories ─────────────────────────────────────────────────── */}
        {clusters.length === 0 ? (
          <div
            style={{
              border:   '1px solid var(--line)',
              background: 'var(--surface)',
              padding:  '64px 32px',
              textAlign: 'center',
              marginTop: 32,
            }}
          >
            <p
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize:   18,
                color:      'var(--ink-dim)',
                marginBottom: 8,
              }}
            >
              No hay noticias disponibles todavía.
            </p>
            <p style={{ fontSize: 13, color: 'var(--ink-mute)' }}>
              El sistema actualiza automáticamente cada hora.
            </p>
          </div>
        ) : (
          <>
            {/* Stories grouped in rows of 3, with thin dividers between groups */}
            {Array.from({ length: Math.ceil(clusters.length / 3) }, (_, groupIdx) => {
              const group = clusters.slice(groupIdx * 3, groupIdx * 3 + 3)
              return (
                <div key={groupIdx}>
                  {groupIdx > 0 && (
                    <div
                      style={{
                        display:    'flex',
                        alignItems: 'center',
                        gap:        16,
                        margin:     '28px 0',
                      }}
                    >
                      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                      <span
                        style={{
                          fontSize:   10,
                          fontFamily: 'var(--font-mono)',
                          color:      'var(--line-strong)',
                          letterSpacing: '0.2em',
                        }}
                      >
                        · · ·
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
                    </div>
                  )}
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {group.map(cluster => (
                      <NewsCard key={cluster.id} cluster={cluster} />
                    ))}
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            <div
              style={{
                display:       'flex',
                justifyContent:'center',
                gap:           12,
                marginTop:     48,
              }}
            >
              {page > 1 && (
                <Link
                  href={`/noticias?page=${page - 1}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                  style={{
                    padding:    '10px 20px',
                    border:     '1px solid var(--line-strong)',
                    background: 'var(--surface)',
                    fontSize:   13,
                    fontFamily: 'var(--font-mono)',
                    color:      'var(--ink-dim)',
                    textDecoration: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  className="hover:border-[var(--ink)] hover:text-[var(--ink)] transition-colors"
                >
                  ← Anterior
                </Link>
              )}
              {clusters.length === 20 && (
                <Link
                  href={`/noticias?page=${page + 1}${category ? `&category=${encodeURIComponent(category)}` : ''}`}
                  style={{
                    padding:    '10px 24px',
                    background: 'var(--ink)',
                    color:      'var(--bg)',
                    fontSize:   13,
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    letterSpacing: '0.06em',
                    transition: 'background 0.15s',
                  }}
                  className="hover:bg-[var(--ink-2)] transition-colors"
                >
                  Cargar más →
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
