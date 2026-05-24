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

const DEMO_EVENTS = [
  {
    fact: 'El gobierno anuncia recorte del 15% en el presupuesto educativo',
    coverages: [
      { source: 'Clarín',    color: '#004B87', headline: 'El Gobierno ajusta gastos en educación para cumplir las metas fiscales' },
      { source: 'La Nación', color: '#1A3A5C', headline: 'Avance en el equilibrio fiscal con ajuste en el gasto educativo' },
      { source: 'Página 12', color: '#CC0000', headline: 'Milei destruye la educación pública: miles de docentes sin salario' },
      { source: 'Infobae',   color: '#E30613', headline: 'Reducción del déficit: el Gobierno recorta fondos a universidades' },
    ],
  },
  {
    fact: 'El dólar llega al nuevo máximo histórico',
    coverages: [
      { source: 'Ámbito',    color: '#FF6B00', headline: 'El dólar toca el máximo del año; el mercado reacciona con cautela' },
      { source: 'La Nación', color: '#1A3A5C', headline: 'El tipo de cambio se ajusta en línea con el acuerdo con el FMI' },
      { source: 'Página 12', color: '#CC0000', headline: 'El Gobierno destruye el salario real con una nueva devaluación' },
      { source: 'Clarín',    color: '#004B87', headline: 'El dólar escala y el Gobierno asegura que es parte del plan' },
    ],
  },
  {
    fact: 'Reforma al régimen jubilatorio: nueva fórmula de actualización',
    coverages: [
      { source: 'Infobae',     color: '#E30613', headline: 'El Gobierno moderniza el régimen previsional para hacerlo sostenible' },
      { source: 'El Destape',  color: '#e53e3e', headline: 'Otro golpe a los jubilados: congelan las pensiones en plena inflación' },
      { source: 'El Cronista', color: '#2C7BB6', headline: 'La reforma previsional reduce el gasto público en 2 puntos del PBI' },
      { source: 'Página 12',   color: '#CC0000', headline: 'Milei les roba a los jubilados con una reforma que los hunde aún más' },
    ],
  },
]

// The longest phrase — used as invisible spacer to define stable container height
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

export default function HeroAnimated() {
  const [visible, setVisible] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(true)

  // Demo cycling state — ref avoids stale closure in interval
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

  // Demo coverage highlight cycles through each coverage, then advances event
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
    }, 2600)
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
                An invisible copy of the longest phrase acts as a spacer and defines
                the container height. All real phrases are absolutely positioned on
                top of it, so the layout never shifts regardless of phrase length. */}
            <div style={{ position: 'relative' }}>
              {/* Invisible spacer (longest phrase) */}
              <h1
                aria-hidden="true"
                style={{ ...H1_STYLE, visibility: 'hidden', pointerEvents: 'none', userSelect: 'none' }}
              >
                {LONGEST_PHRASE.pre}{' '}
                <em style={{ fontStyle: 'italic' }}>{LONGEST_PHRASE.em}</em>
              </h1>

              {/* Actual rotating phrases — absolutely stacked */}
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
          El mismo hecho · {event.coverages.length} medios
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
          padding: '14px 16px',
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
            marginBottom: 6,
          }}
        >
          El hecho
        </span>
        <p
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: '14px',
            color: 'var(--ink)',
            lineHeight: 1.45,
            margin: 0,
            fontWeight: 400,
          }}
        >
          {event.fact}
        </p>
      </div>

      {/* Coverage rows */}
      {event.coverages.map((c, i) => (
        <div
          key={c.source}
          style={{
            padding: '12px 16px 12px 13px',
            borderBottom: i < event.coverages.length - 1 ? '1px solid var(--line-soft)' : 'none',
            borderLeft: `3px solid ${activeCoverage === i ? c.color : 'transparent'}`,
            background: activeCoverage === i ? 'var(--surface-2)' : 'var(--surface)',
            transition: 'background 0.5s ease, border-left-color 0.5s ease',
          }}
        >
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
              opacity: activeCoverage === i ? 1 : 0.7,
              transition: 'opacity 0.5s ease',
            }}
          >
            {c.source}
          </span>
          <p
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: '13px',
              lineHeight: 1.45,
              color: activeCoverage === i ? 'var(--ink)' : 'var(--ink-mute)',
              margin: 0,
              fontStyle: 'italic',
              transition: 'color 0.5s ease',
            }}
          >
            "{c.headline}"
          </p>
        </div>
      ))}

      {/* Panel footer */}
      <div
        style={{
          padding: '10px 16px',
          borderTop: '1px solid var(--line)',
          background: 'var(--surface-2)',
        }}
      >
        <p
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            color: 'var(--ink-mute)',
            margin: 0,
            letterSpacing: '0.04em',
          }}
        >
          Cada Lado analiza y compara automáticamente cada versión
        </p>
      </div>
    </div>
  )
}
