import { Fragment } from 'react'
import { notFound }  from 'next/navigation'
import Link          from 'next/link'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { getNewsDetailServer, getNewsClustersServer } from '@/lib/queries'
import { timeAgo, noticiaHref } from '@/lib/utils'
import HeadlineComparison  from '@/components/HeadlineComparison'
import EvolutionTimeline   from '@/components/EvolutionTimeline'
import CoverageBar         from '@/components/CoverageBar'
import CommentsSection     from '@/components/CommentsSection'

export const dynamic = 'force-dynamic'

interface Props {
  params: { slug: string }
}

// ── Design tokens —————————————————————————————————————————————————————————————
// These live here (not in globals.css) so they stay co-located with the page
// and don't leak into the rest of the app.

const CATEGORY_COLOR: Record<string, string> = {
  'Política':      'var(--left)',
  'Economía':      '#059669',
  'Sociedad':      '#7c3aed',
  'Seguridad':     '#dc2626',
  'Internacional': '#4338ca',
  'Deportes':      '#d97706',
  'Cultura':       '#db2777',
  'Tecnología':    '#0891b2',
  'Ambiente':      '#0d9488',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Splits synthesis text into paragraphs.
 * Tries double-newline → single-newline → sentence-based auto-split.
 */
function splitIntoParagraphs(text: string): string[] {
  if (!text.trim()) return []
  let paras = text.split(/\n\n+/).map(p => p.trim()).filter(Boolean)
  if (paras.length > 1) return paras
  paras = text.split(/\n/).map(p => p.trim()).filter(Boolean)
  if (paras.length > 1) return paras
  // Auto-split long single-block texts into ~3-sentence paragraphs
  if (text.length > 400) {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text]
    const result: string[] = []
    for (let i = 0; i < sentences.length; i += 3) {
      result.push(sentences.slice(i, i + 3).join(' ').trim())
    }
    return result.filter(Boolean)
  }
  return [text.trim()]
}

/** Bolds numbers, percentages, and monetary values in-line. */
function HighlightNumbers({ text }: { text: string }) {
  const parts = text.split(/((?:\$\s?)?\d[\d.,]*(?:\s*(?:%|millones?|mil millones?|bn\.?))?)/gi)
  return (
    <>
      {parts.map((part, i) =>
        /^[\d$]/.test(part) ? (
          <strong key={i} style={{ fontWeight: 600, color: 'var(--ink)', fontVariantNumeric: 'tabular-nums' }}>
            {part}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function NoticiaDetailPage({ params }: Props) {
  const lastPart = params.slug.split('-').pop() ?? ''
  const id = parseInt(lastPart, 10)
  if (isNaN(id)) notFound()

  const cluster = await getNewsDetailServer(id)
  if (!cluster) notFound()

  const relatedClusters = await getNewsClustersServer(1, 6)
    .then(list => list.filter(c => c.id !== cluster.id).slice(0, 4))
    .catch(() => [])

  const accentColor = CATEGORY_COLOR[cluster.category ?? ''] ?? 'var(--ink)'
  const paragraphs  = splitIntoParagraphs(cluster.synthesis ?? '')

  // One entry per source (the first appearance, highest similarity)
  const uniqueArticles = cluster.articles.filter(
    (a, i, arr) => arr.findIndex(b => b.source_slug === a.source_slug) === i
  )

  return (
    <div style={{ background: 'var(--bg)' }}>

      {/* ── Back navigation ───────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '12px 16px' }}>
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
            <ArrowLeft size={13} />
            Volver a noticias
          </Link>
        </div>
      </div>

      {/* ── Article header ────────────────────────────────────────────── */}
      <header
        style={{
          background:   'var(--surface)',
          borderBottom: '1px solid var(--line)',
          borderTop:    `3px solid ${accentColor}`,
        }}
      >
        {/* Optional contained image */}
        {cluster.image_url && (
          <div
            style={{
              width:      '100%',
              maxHeight:  260,
              overflow:   'hidden',
              lineHeight: 0,
            }}
          >
            <img
              src={cluster.image_url}
              alt=""
              style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
            />
          </div>
        )}

        <div style={{ maxWidth: 1024, margin: '0 auto', padding: '20px 16px 22px' }}>
          {/* Category · time · source count */}
          <div
            style={{
              display:    'flex',
              flexWrap:   'wrap',
              alignItems: 'center',
              gap:        '4px 16px',
              marginBottom: 12,
              fontSize:   11,
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
            }}
          >
            {cluster.category && (
              <span style={{ color: accentColor, fontWeight: 700 }}>
                {cluster.category}
              </span>
            )}
            <span style={{ color: 'var(--ink-mute)' }}>
              {timeAgo(cluster.published_at)}
            </span>
            <span style={{ color: 'var(--ink-mute)' }}>
              {cluster.source_count} {cluster.source_count === 1 ? 'medio' : 'medios'}
            </span>
          </div>

          {/* Title */}
          <h1
            style={{
              fontFamily:   'var(--font-fraunces), Georgia, serif',
              fontSize:     'clamp(22px, 4vw, 38px)',
              fontWeight:   400,
              lineHeight:   1.2,
              letterSpacing: '-0.015em',
              color:        'var(--ink)',
              margin:       0,
              maxWidth:     '34ch',
            }}
          >
            {cluster.title}
          </h1>
        </div>
      </header>

      {/* ── Main content ──────────────────────────────────────────────── */}
      <div style={{ maxWidth: 1024, margin: '0 auto', padding: '32px 16px 64px' }}>
        <div className="flex flex-col lg:flex-row gap-10 xl:gap-14">

          {/* ── Main column ─────────────────────────────────────────── */}
          <main className="lg:w-[62%] min-w-0">

            {/* 1. Headline comparison — THE signature feature */}
            {uniqueArticles.length >= 2 && (
              <HeadlineComparison articles={uniqueArticles} />
            )}

            {/* 2. Evolution timeline — how framing shifted over time */}
            {uniqueArticles.length >= 3 && (
              <EvolutionTimeline articles={uniqueArticles} />
            )}

            {/* 3. "En lo que coinciden" — what all outlets agree on */}
            {cluster.key_facts && cluster.key_facts.length > 0 && (
              <section style={{ marginBottom: 36 }}>
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
                    En lo que todos coinciden
                  </span>
                </div>
                <ul
                  style={{
                    margin:  0,
                    padding: 0,
                    listStyle: 'none',
                    borderLeft:   '1px solid var(--line)',
                    borderRight:  '1px solid var(--line)',
                    borderBottom: '1px solid var(--line)',
                  }}
                >
                  {cluster.key_facts.map((fact, i) => (
                    <li
                      key={i}
                      style={{
                        display:      'flex',
                        alignItems:   'flex-start',
                        gap:          12,
                        padding:      '11px 14px',
                        borderBottom: i < (cluster.key_facts?.length ?? 0) - 1
                          ? '1px solid var(--line-soft)'
                          : 'none',
                        background:   'var(--surface)',
                      }}
                    >
                      <span
                        style={{
                          width:        18,
                          height:       18,
                          borderRadius: '50%',
                          background:   'var(--surface-3)',
                          display:      'flex',
                          alignItems:   'center',
                          justifyContent: 'center',
                          fontSize:     10,
                          fontFamily:   'var(--font-mono)',
                          fontWeight:   700,
                          color:        'var(--ink-dim)',
                          flexShrink:   0,
                          marginTop:    1,
                        }}
                      >
                        {i + 1}
                      </span>
                      <span
                        style={{
                          fontSize:   14,
                          color:      'var(--ink-2)',
                          lineHeight: 1.6,
                        }}
                      >
                        {fact}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* 4. "La historia" — synthesis prose, no AI badge */}
            {paragraphs.length > 0 && (
              <section style={{ marginBottom: 40 }}>
                <div
                  style={{
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
                    La historia
                  </span>
                </div>
                <article style={{ paddingTop: 20 }}>
                  {paragraphs.map((para, i) => (
                    <p
                      key={i}
                      style={{
                        fontSize:   i === 0 ? 17 : 15,
                        fontFamily: i === 0
                          ? 'var(--font-fraunces), Georgia, serif'
                          : 'inherit',
                        fontWeight: i === 0 ? 500 : 400,
                        color:      'var(--ink-2)',
                        lineHeight: 1.85,
                        marginBottom: 20,
                        maxWidth:   '68ch',
                      }}
                    >
                      <HighlightNumbers text={para} />
                    </p>
                  ))}
                </article>
              </section>
            )}

            {/* 5. Per-source coverage */}
            {uniqueArticles.length > 0 && uniqueArticles.some(a => a.emphasis || a.omissions) && (
              <section style={{ marginBottom: 40 }}>
                <div
                  style={{
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
                    Lo que dijo cada medio
                  </span>
                </div>
                <div
                  style={{
                    display:       'flex',
                    flexDirection: 'column',
                    gap:           8,
                    paddingTop:    16,
                  }}
                >
                  {uniqueArticles.map(article => (
                    <CoverageBar key={article.source_slug} article={article} />
                  ))}
                </div>
              </section>
            )}

            {/* Comments */}
            {cluster.comments && cluster.comments.length > 0 && (
              <CommentsSection comments={cluster.comments} />
            )}
          </main>

          {/* ── Sidebar ─────────────────────────────────────────────── */}
          <aside className="lg:w-[38%]">
            <div className="sticky top-8 space-y-4">

              {/* Source list — who covered this */}
              {uniqueArticles.length > 0 && (
                <div
                  style={{
                    border:     '1px solid var(--line)',
                    background: 'var(--surface)',
                  }}
                >
                  <div
                    style={{
                      padding:      '10px 14px',
                      borderBottom: '1px solid var(--line)',
                      background:   'var(--surface-2)',
                    }}
                  >
                    <span
                      style={{
                        fontSize:      10,
                        fontFamily:    'var(--font-mono)',
                        fontWeight:    700,
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color:         'var(--ink-dim)',
                      }}
                    >
                      Medios que cubrieron esta noticia
                    </span>
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {uniqueArticles.map((art, i) => (
                      <li
                        key={art.source_slug}
                        style={{
                          display:      'flex',
                          alignItems:   'center',
                          justifyContent: 'space-between',
                          padding:      '9px 14px',
                          borderBottom: i < uniqueArticles.length - 1
                            ? '1px solid var(--line-soft)'
                            : 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            style={{
                              width:        8,
                              height:       8,
                              borderRadius: '50%',
                              background:   art.source_color,
                              flexShrink:   0,
                            }}
                          />
                          <span
                            style={{
                              fontSize:   13,
                              fontWeight: 600,
                              color:      'var(--ink-2)',
                            }}
                          >
                            {art.source_name}
                          </span>
                        </div>
                        <a
                          href={art.article_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:opacity-70 transition-opacity"
                          style={{ color: 'var(--ink-mute)', lineHeight: 0 }}
                          title="Ver nota original"
                        >
                          <ExternalLink size={11} />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Confidence indicator — based on source count */}
              {cluster.source_count >= 2 && (
                <div
                  style={{
                    border:     '1px solid var(--line)',
                    background: 'var(--surface)',
                    padding:    '12px 14px',
                  }}
                >
                  <div
                    style={{
                      display:       'flex',
                      alignItems:    'center',
                      justifyContent:'space-between',
                      marginBottom:  8,
                    }}
                  >
                    <span
                      style={{
                        fontSize:      10,
                        fontFamily:    'var(--font-mono)',
                        fontWeight:    700,
                        letterSpacing: '0.12em',
                        textTransform: 'uppercase',
                        color:         'var(--ink-mute)',
                      }}
                    >
                      Cobertura
                    </span>
                    <span
                      style={{
                        fontSize:   10,
                        fontFamily: 'var(--font-mono)',
                        color:      cluster.source_count >= 4
                          ? '#15803d'
                          : cluster.source_count >= 3
                            ? '#0369a1'
                            : 'var(--ink-mute)',
                        fontWeight: 700,
                      }}
                    >
                      {cluster.source_count >= 4
                        ? 'Alta'
                        : cluster.source_count === 3
                          ? 'Media'
                          : 'Básica'}
                    </span>
                  </div>
                  {/* Source dots bar */}
                  <div style={{ display: 'flex', gap: 4 }}>
                    {uniqueArticles.map(art => (
                      <span
                        key={art.source_slug}
                        title={art.source_name}
                        style={{
                          flex:         1,
                          height:       4,
                          background:   art.source_color,
                          borderRadius: 2,
                        }}
                      />
                    ))}
                  </div>
                  <p
                    style={{
                      fontSize:   11,
                      fontFamily: 'var(--font-mono)',
                      color:      'var(--ink-mute)',
                      marginTop:  8,
                      marginBottom: 0,
                    }}
                  >
                    {cluster.source_count}{' '}
                    {cluster.source_count === 1 ? 'fuente' : 'fuentes'}{' '}
                    independientes verificadas
                  </p>
                </div>
              )}

            </div>
          </aside>
        </div>
      </div>

      {/* ── Related stories ───────────────────────────────────────────── */}
      {relatedClusters.length > 0 && (
        <section
          style={{
            borderTop:  '1px solid var(--line)',
            background: 'var(--surface-2)',
            padding:    '40px 0 56px',
          }}
        >
          <div style={{ maxWidth: 1024, margin: '0 auto', padding: '0 16px' }}>
            {/* Section header */}
            <div
              style={{
                paddingBottom:  10,
                marginBottom:   24,
                borderBottom:   '2px solid var(--ink)',
                display:        'flex',
                justifyContent: 'space-between',
                alignItems:     'baseline',
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
                Más noticias
              </span>
              <Link
                href="/noticias"
                style={{
                  fontSize:   11,
                  fontFamily: 'var(--font-mono)',
                  color:      'var(--ink-mute)',
                  textDecoration: 'none',
                }}
                className="hover:text-[var(--ink)] transition-colors"
              >
                Ver todas →
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedClusters.map(related => {
                const relatedColor =
                  CATEGORY_COLOR[related.category ?? ''] ?? 'var(--ink-mute)'
                return (
                  <Link
                    key={related.id}
                    href={noticiaHref(related.id, related.title)}
                    style={{ textDecoration: 'none' }}
                    className="group"
                  >
                    <article
                      style={{
                        border:      '1px solid var(--line)',
                        background:  'var(--surface)',
                        borderTop:   `2px solid ${relatedColor}`,
                        padding:     '14px',
                        height:      '100%',
                        display:     'flex',
                        flexDirection: 'column',
                        gap:         8,
                        transition:  'border-color 0.2s',
                      }}
                      className="hover:border-[var(--line-strong)] transition-colors"
                    >
                      {related.category && (
                        <span
                          style={{
                            fontSize:      10,
                            fontFamily:    'var(--font-mono)',
                            fontWeight:    700,
                            letterSpacing: '0.13em',
                            textTransform: 'uppercase',
                            color:         relatedColor,
                          }}
                        >
                          {related.category}
                        </span>
                      )}
                      <h3
                        style={{
                          fontFamily:  'var(--font-fraunces), Georgia, serif',
                          fontSize:    15,
                          fontWeight:  400,
                          lineHeight:  1.4,
                          color:       'var(--ink)',
                          margin:      0,
                          flex:        1,
                        }}
                        className="group-hover:text-[var(--cada-blue)] transition-colors line-clamp-3"
                      >
                        {related.title}
                      </h3>
                      <span
                        style={{
                          fontSize:   11,
                          fontFamily: 'var(--font-mono)',
                          color:      'var(--ink-mute)',
                        }}
                      >
                        {related.source_count}{' '}
                        {related.source_count === 1 ? 'medio' : 'medios'}
                      </span>
                    </article>
                  </Link>
                )
              })}
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
