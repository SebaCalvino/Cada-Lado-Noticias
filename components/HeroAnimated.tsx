'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const PHRASES = [
  { pre: 'Una noticia.',                         em: 'CADA LADO.' },
  { pre: 'La misma noticia, desde',              em: 'CADA LADO.' },
  { pre: 'Cómo cambia una noticia según',        em: 'CADA LADO.' },
  { pre: 'Entendé la noticia desde',             em: 'CADA LADO.' },
  { pre: 'Distintas versiones.',                 em: 'CADA LADO.' },
  { pre: 'Cada medio cuenta una historia. Mirá', em: 'CADA LADO.' },
]

const TICKER_ITEMS = [
  'Clarín destaca el impacto económico · La Nación focaliza en la reacción del mercado · Página 12 critica el ajuste',
  'Infobae prioriza la versión oficial · Perfil cuestiona los números · Ámbito analiza el impacto financiero',
  'La Izquierda Diario denuncia las consecuencias sociales · El Cronista monitorea las inversiones',
  'Clarín omite las protestas · La Nación destaca el apoyo empresarial · Página 12 da voz a los afectados',
]

// Demo data: each coverage has a "highlight" — the key word that makes this outlet different
const DEMO_EVENTS = [
  {
    fact: 'El gobierno anuncia recorte del 15% en el presupuesto educativo',
    coverages: [
      { source: 'Clarín',    color: '#004B87', headline: 'El Gobierno ajusta gastos en educación para cumplir las metas fiscales',            highlight: 'ajusta gastos' },
      { source: 'La Nación', color: '#1A3A5C', headline: 'Avance en el equilibrio fiscal con ajuste en el gasto educativo',                    highlight: 'Avance en el equilibrio fiscal' },
      { source: 'Página 12', color: '#CC0000', headline: 'Milei destruye la educación pública: miles de docentes sin salario',                 highlight: 'destruye' },
      { source: 'Infobae',   color: '#E30613', headline: 'Reducción del déficit: el Gobierno recorta fondos a universidades',                  highlight: 'Reducción del déficit' },
    ],
  },
  {
    fact: 'El dólar llega al nuevo máximo histórico',
    coverages: [
      { source: 'Ámbito',    color: '#FF6B00', headline: 'El dólar toca el máximo del año; el mercado reacciona con cautela',                  highlight: 'con cautela' },
      { source: 'La Nación', color: '#1A3A5C', headline: 'El tipo de cambio se ajusta en línea con el acuerdo con el FMI',                    highlight: 'en línea con el acuerdo' },
      { source: 'Página 12', color: '#CC0000', headline: 'El Gobierno destruye el salario real con una nueva devaluación',                    highlight: 'destruye el salario real' },
      { source: 'Clarín',    color: '#004B87', headline: 'El dólar escala y el Gobierno asegura que es parte del plan',                       highlight: 'parte del plan' },
    ],
  },
  {
    fact: 'Reforma al régimen jubilatorio: nueva fórmula de actualización',
    coverages: [
      { source: 'Infobae',     color: '#E30613', headline: 'El Gobierno moderniza el régimen previsional para hacerlo sostenible',             highlight: 'moderniza' },
      { source: 'El Destape',  color: '#e53e3e', headline: 'Otro golpe a los jubilados: congelan las pensiones en plena inflación',            highlight: 'golpe a los jubilados' },
      { source: 'El Cronista', color: '#2C7BB6', headline: 'La reforma previsional reduce el gasto público en 2 puntos del PBI',               highlight: 'reduce el gasto' },
      { source: 'Página 12',   color: '#CC0000', headline: 'Milei les roba a los jubilados con una reforma que los hunde aún más',            highlight: 'roba' },
    ],
  },
]

// The longest phrase — invisible spacer for zero-CLS layout
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

// Splits a headline string and highlights one phrase in the source's color
function HighlightedHeadline({
  headline,
  highlight,
  color,
  active,
}: {
  headline: string
  highlight: string
  color: string
  active: boolean
}) {
  if (!active || !highlight) {
    return <>{headline}</>
  }
  const lower = headline.toLowerCase()
  const hLower = highlight.toLowerCase()
  const idx = lower.indexOf(hLower)
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
  const [visible, setVisible] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(true)

  const eventIdxRef = useRef(0)
  const [demoEventIdx, setDemoEventIdx] = useState(0)
  const [coverageIdx, setCoverageIdx] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  // Phrase rotation: fade out → swap → fade in
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

  // Demo: cycle through coverages, then advance event
  useEffect(() => {
    const id = setInterval(() => {
      const currentEvent = DEMO_EVENTS[eventIdxRef.current]
      setCoverageIdx(prev => {
        const next = prev + 1
        if (next >= currentEvent.coverages.length) {
          const nextEventIdx = (eventIdxRef.current + 1) % DEMO_EVENTS.length
          eventIdxRef.current = nextEventIdx
          setDemoEventIdx(nextEventIdx)
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
          <span>Buenos Aires, Argentina</span>
          <span className="hidden sm:inline">12 medios monitoreados · actualizado hoy</span>
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
              Monitoreo en tiempo real
            </div>

            {/* ── STABLE-HEIGHT ROTATING HEADLINE ──
                Invisible copy of the longest phrase defines container height.
                All actual phrases are absolutely positioned on top.
                Layout NEVER shifts regardless of phrase length. */}
            <div style={{ position: 'relative' }}>
              {/* Invisible spacer */}
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
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    opacity: phraseIdx === i ? (phraseVisible ? 1 : 0) : 0,
                    transition: 'opacity 0.36s ease',
                    pointerEvents: 'none',
                  }}
                >
                  {p.pre}{' '}
                  <em style={{ fontStyle: 'italic', color: 'var(--cada-blue)' }}>{p.em}</em>
                </h1>
              ))}
            </div>

            {/* Subtitle + CTAs */}
            <div className="mt-3 md:mt-8">
              <p
                className="mb-8 leading-relaxed"
                style={{
                  fontFamily: 'var(--font-fraunces), Georgia, serif',
                  fontSize: '17px',
                  color: 'var(--ink-dim)',
                  maxWidth: '460px',
                }}
              >
                La misma noticia contada de forma diferente según cada medio.
                Comparamos titulares, énfasis y omisiones para que veas la historia completa.
              </p>
              <div className="flex flex-wrap gap-3">
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
                    border: '1px solid var(--line-strong)',
                    color: 'var(--ink-2)',
                    padding: '12px 24px',
                    background: 'var(--surface)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
                >
                  Los medios que monitoreamos
                </Link>
              </div>
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

      {/* News ticker */}
      <div
        className={`border-t transition-all duration-700 ease-out ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ borderColor: 'var(--line)', transitionDelay: '600ms' }}
      >
        <div className="flex items-stretch overflow-hidden">
          <div
            className="shrink-0 flex items-center px-4 py-2.5"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}
          >
            Última hora
          </div>
          <div className="overflow-hidden flex-1 py-2.5">
            <div
              className="ticker-track whitespace-nowrap"
              style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-dim)' }}
            >
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-block mx-10">
                  <span style={{ color: 'var(--ink-faint)', marginRight: 8 }}>·</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Live Comparison Demo Panel ──────────────────────────────────────────────
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
          padding: '11px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            fontWeight: 600,
          }}
        >
          El mismo hecho · {event.coverages.length} versiones
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: '#16a34a',
              display: 'inline-block',
              animation: 'pulse 2s ease-in-out infinite',
            }}
          />
          <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--ink-mute)', letterSpacing: '0.1em' }}>
            en vivo
          </span>
        </span>
      </div>

      {/* The fact */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--line)',
          background: 'var(--surface)',
        }}
      >
        <span
          style={{
            display: 'block',
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            fontWeight: 600,
            marginBottom: 5,
          }}
        >
          El hecho
        </span>
        <p
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '13px',
            color: 'var(--ink)',
            lineHeight: 1.45,
            margin: 0,
          }}
        >
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
              padding: '11px 16px 11px 13px',
              borderBottom: i < event.coverages.length - 1 ? '1px solid var(--line-soft)' : 'none',
              borderLeft: `3px solid ${isActive ? c.color : 'transparent'}`,
              background: isActive ? 'var(--surface-2)' : 'var(--surface)',
              transition: 'background 0.45s ease, border-left-color 0.45s ease',
            }}
          >
            {/* Source name */}
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: c.color,
                marginBottom: 4,
                opacity: isActive ? 1 : 0.5,
                transition: 'opacity 0.45s ease',
              }}
            >
              {c.source}
            </span>
            {/* Headline with highlighted key word */}
            <p
              style={{
                fontFamily: 'var(--font-fraunces), Georgia, serif',
                fontSize: '13px',
                lineHeight: 1.5,
                color: isActive ? 'var(--ink)' : 'var(--ink-faint)',
                margin: 0,
                fontStyle: 'italic',
                transition: 'color 0.45s ease',
              }}
            >
              "<HighlightedHeadline
                headline={c.headline}
                highlight={c.highlight}
                color={c.color}
                active={isActive}
              />"
            </p>
          </div>
        )
      })}

      {/* Contrast indicator — shows the active outlet's key framing word */}
      <div
        style={{
          padding: '9px 16px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface-2)',
          minHeight: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-mute)',
            letterSpacing: '0.06em',
          }}
        >
          {active?.source} elige llamarlo:{' '}
          <span style={{ color: active?.color, fontWeight: 700 }}>
            "{active?.highlight}"
          </span>
        </span>
      </div>
    </div>
  )
}
