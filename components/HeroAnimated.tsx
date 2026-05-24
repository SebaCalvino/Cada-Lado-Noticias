'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// Every phrase ends with CADA LADO. — accent color ONLY highlights the brand name.
// The longest phrase (last entry) acts as the invisible height spacer → zero CLS.
const PHRASES = [
  { pre: 'La misma noticia, desde',         em: 'CADA LADO.' },
  { pre: 'Entendé la noticia desde',         em: 'CADA LADO.' },
  { pre: 'Distintas versiones, desde',       em: 'CADA LADO.' },
  { pre: 'La noticia completa, desde',       em: 'CADA LADO.' },
  { pre: 'Mirá la historia desde',           em: 'CADA LADO.' },
  { pre: 'El mismo hecho, visto desde',      em: 'CADA LADO.' },
  { pre: 'Cada medio cuenta algo distinto.', em: 'CADA LADO.' }, // ← longest → spacer
]

// Strong editorial contrast: same fact, wildly different word choices
const DEMO_EVENTS = [
  {
    fact: 'El gobierno recorta un 15% el presupuesto de las universidades públicas',
    coverages: [
      { source: 'La Nación',  color: '#1A3A5C', headline: 'El Gobierno consolida el superávit con una reforma en el gasto universitario',       highlight: 'consolida el superávit' },
      { source: 'Infobae',    color: '#E30613', headline: 'Recorte universitario: el Gobierno optimiza la asignación del presupuesto educativo', highlight: 'optimiza' },
      { source: 'Página 12',  color: '#CC0000', headline: 'Milei destruye las universidades públicas: el mayor desfinanciamiento en décadas',    highlight: 'destruye' },
      { source: 'El Destape', color: '#e53e3e', headline: 'El ajuste de Milei hunde a 2 millones de estudiantes y a sus familias',              highlight: 'hunde' },
    ],
  },
  {
    fact: 'El peso se devalúa un 8% frente al dólar en una sola jornada',
    coverages: [
      { source: 'Ámbito',    color: '#FF6B00', headline: 'El tipo de cambio se mueve hacia su nuevo valor de equilibrio de mercado',   highlight: 'valor de equilibrio' },
      { source: 'La Nación', color: '#1A3A5C', headline: 'La corrección cambiaria era esperada: el Gobierno mantiene el rumbo',        highlight: 'corrección cambiaria' },
      { source: 'Página 12', color: '#CC0000', headline: 'Devaluación salvaje: los salarios argentinos pierden un 8% en un solo día',  highlight: 'Devaluación salvaje' },
      { source: 'Clarín',    color: '#004B87', headline: 'El dólar sube fuerte: qué dicen los economistas y qué puede pasar',          highlight: 'sube fuerte' },
    ],
  },
  {
    fact: 'Miles de docentes se movilizan frente al Ministerio de Educación',
    coverages: [
      { source: 'TN',         color: '#005BAC', headline: 'Paro docente: caos en el centro porteño y miles de alumnos sin clases',           highlight: 'caos' },
      { source: 'La Nación',  color: '#1A3A5C', headline: 'La huelga docente afectó el tránsito; el Gobierno llamó al diálogo',             highlight: 'afectó el tránsito' },
      { source: 'Página 12',  color: '#CC0000', headline: 'Histórica movilización: miles de docentes le dijeron basta al ajuste de Milei',   highlight: 'basta al ajuste' },
      { source: 'El Destape', color: '#e53e3e', headline: 'Docentes en la calle contra Milei: una lucha que el Gobierno no puede silenciar', highlight: 'no puede silenciar' },
    ],
  },
]

// Longest phrase defines the stable container height — prevents ANY CLS
const LONGEST_PHRASE = PHRASES[PHRASES.length - 1]

const H1_STYLE: React.CSSProperties = {
  fontFamily: 'var(--font-fraunces), Georgia, serif',
  fontSize: 'clamp(36px, 5vw, 74px)',
  fontWeight: 400,
  lineHeight: 1.07,
  letterSpacing: '-0.025em',
  color: 'var(--ink)',
  margin: 0,
}

function HighlightedHeadline({
  headline, highlight, color, active,
}: {
  headline: string; highlight: string; color: string; active: boolean
}) {
  if (!active || !highlight) return <>{headline}</>
  const lower   = headline.toLowerCase()
  const hLower  = highlight.toLowerCase()
  const idx     = lower.indexOf(hLower)
  if (idx === -1) return <>{headline}</>
  return (
    <>
      {headline.slice(0, idx)}
      <span style={{ color, fontWeight: 700 }}>{headline.slice(idx, idx + highlight.length)}</span>
      {headline.slice(idx + highlight.length)}
    </>
  )
}

export default function HeroAnimated() {
  const [visible,       setVisible]       = useState(false)
  const [phraseIdx,     setPhraseIdx]     = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(true)

  const eventIdxRef = useRef(0)
  const [demoEventIdx, setDemoEventIdx] = useState(0)
  const [coverageIdx,  setCoverageIdx]  = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Phrase rotation: pure opacity — zero layout shift
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseVisible(false)
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % PHRASES.length)
        setPhraseVisible(true)
      }, 360)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  // Demo: cycle through coverages within each event, then move to next event
  useEffect(() => {
    const id = setInterval(() => {
      const current = DEMO_EVENTS[eventIdxRef.current]
      setCoverageIdx(prev => {
        const next = prev + 1
        if (next >= current.coverages.length) {
          const nextEv = (eventIdxRef.current + 1) % DEMO_EVENTS.length
          eventIdxRef.current = nextEv
          setDemoEventIdx(nextEv)
          return 0
        }
        return next
      })
    }, 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <section
      className="relative overflow-hidden border-b"
      style={{ background: 'var(--bg)', borderColor: 'var(--line)' }}
    >
      {/* Edition dateline */}
      <div className="max-w-6xl mx-auto px-4 w-full pt-5">
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            borderColor: 'var(--line)',
          }}
        >
          <span>Argentina · cobertura en tiempo real</span>
          <span className="hidden sm:inline">12 medios · análisis narrativo continuo</span>
        </div>
      </div>

      {/* Split hero */}
      <div
        className={`max-w-6xl mx-auto px-4 py-12 md:py-20 w-full transition-all duration-700 ease-out ${
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
        style={{ transitionDelay: '80ms' }}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* ─── LEFT: Headline + CTA ─── */}
          <div>
            {/* Live indicator */}
            <div
              className="flex items-center gap-2 mb-7"
              style={{
                fontSize: 11,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full inline-block shrink-0"
                style={{ background: '#16a34a', animation: 'pulse 2.2s ease-in-out infinite' }}
              />
              Análisis narrativo en tiempo real
            </div>

            {/* ── STABLE ROTATING HEADLINE ──
                Invisible copy of the longest phrase defines height.
                All other phrases are absolute on top → zero CLS ever. */}
            <div style={{ position: 'relative' }}>
              {/* Invisible spacer — sets height, never shown */}
              <h1
                aria-hidden="true"
                style={{ ...H1_STYLE, visibility: 'hidden', pointerEvents: 'none', userSelect: 'none' }}
              >
                {LONGEST_PHRASE.pre}{' '}
                <em style={{ fontStyle: 'italic' }}>{LONGEST_PHRASE.em}</em>
              </h1>

              {/* Rotating phrases — absolutely stacked, opacity-only transitions */}
              {PHRASES.map((p, i) => (
                <h1
                  key={i}
                  aria-hidden={phraseIdx !== i}
                  style={{
                    ...H1_STYLE,
                    position:      'absolute',
                    top:           0,
                    left:          0,
                    right:         0,
                    opacity:       phraseIdx === i ? (phraseVisible ? 1 : 0) : 0,
                    transition:    'opacity 0.36s ease',
                    pointerEvents: 'none',
                  }}
                >
                  {p.pre}{' '}
                  <em style={{ fontStyle: 'italic', color: 'var(--cada-blue)' }}>{p.em}</em>
                </h1>
              ))}
            </div>

            {/* CTAs — fixed margin so they never jump */}
            <div className="flex flex-wrap gap-3 mt-8">
              <Link
                href="/noticias"
                className="flex items-center gap-2 transition-colors text-sm font-medium"
                style={{ background: 'var(--ink)', color: 'var(--bg)', padding: '12px 24px' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--ink-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--ink)')}
              >
                Ver las noticias de hoy <ArrowRight size={15} />
              </Link>
              <Link
                href="/fuentes"
                className="transition-colors text-sm font-medium"
                style={{
                  border:     '1px solid var(--line-strong)',
                  color:      'var(--ink-2)',
                  padding:    '12px 24px',
                  background: 'var(--surface)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
              >
                Los medios que monitoreamos
              </Link>
            </div>
          </div>

          {/* ─── RIGHT: Live comparison demo ─── */}
          <div
            className={`transition-all duration-700 ease-out ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
            }`}
            style={{ transitionDelay: '300ms', transitionDuration: '850ms' }}
          >
            <LiveComparisonDemo
              event={DEMO_EVENTS[demoEventIdx]}
              activeCoverage={coverageIdx}
            />
          </div>

        </div>
      </div>

    </section>
  )
}

// ── Live Comparison Demo Panel ───────────────────────────────────────────────
function LiveComparisonDemo({
  event,
  activeCoverage,
}: {
  event: (typeof DEMO_EVENTS)[0]
  activeCoverage: number
}) {
  const active = event.coverages[activeCoverage]

  return (
    <div style={{ border: '1px solid var(--line)', background: 'var(--surface)', overflow: 'hidden' }}>

      {/* Header */}
      <div
        style={{
          padding:       '11px 16px',
          borderBottom:  '1px solid var(--line)',
          background:    'var(--surface-2)',
          display:       'flex',
          alignItems:    'center',
          justifyContent:'space-between',
        }}
      >
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600 }}>
          El mismo hecho · {event.coverages.length} versiones
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', animation: 'pulse 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>en vivo</span>
        </span>
      </div>

      {/* The neutral fact */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
        <span style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, marginBottom: 5 }}>
          El hecho
        </span>
        <p style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.45, margin: 0 }}>
          {event.fact}
        </p>
      </div>

      {/* Coverage rows */}
      {event.coverages.map((c, i) => {
        const isActive = activeCoverage === i
        return (
          <div
            key={c.source}
            style={{
              padding:      '11px 16px 11px 13px',
              borderBottom: i < event.coverages.length - 1 ? '1px solid var(--line-soft)' : 'none',
              borderLeft:   `3px solid ${isActive ? c.color : 'transparent'}`,
              background:   isActive ? 'var(--surface-2)' : 'var(--surface)',
              transition:   'background 0.45s ease, border-left-color 0.45s ease',
            }}
          >
            <span style={{ display: 'block', fontSize: 10, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: c.color, marginBottom: 4, opacity: isActive ? 1 : 0.45, transition: 'opacity 0.45s ease' }}>
              {c.source}
            </span>
            <p style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: '13px', lineHeight: 1.5, color: isActive ? 'var(--ink)' : 'var(--ink-faint)', margin: 0, fontStyle: 'italic', transition: 'color 0.45s ease' }}>
              &ldquo;<HighlightedHeadline headline={c.headline} highlight={c.highlight} color={c.color} active={isActive} />&rdquo;
            </p>
          </div>
        )
      })}

      {/* Active outlet's key framing word — makes the contrast undeniable */}
      <div
        style={{
          padding:      '10px 16px',
          borderTop:    '1px solid var(--line)',
          background:   'var(--surface-2)',
          minHeight:    38,
          display:      'flex',
          alignItems:   'center',
          gap:          8,
        }}
      >
        <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.06em' }}>
          {active?.source} lo llama:{' '}
          <strong style={{ color: active?.color, fontWeight: 700 }}>
            &ldquo;{active?.highlight}&rdquo;
          </strong>
        </span>
      </div>
    </div>
  )
}
