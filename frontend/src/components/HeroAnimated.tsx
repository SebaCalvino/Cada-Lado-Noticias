'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const PHRASES = [
  { pre: 'Una noticia.',                        em: 'CADA LADO.' },
  { pre: 'La misma noticia, desde',             em: 'CADA LADO.' },
  { pre: 'Cómo cambia una noticia según',       em: 'CADA LADO.' },
  { pre: 'Entendé la noticia desde',            em: 'CADA LADO.' },
  { pre: 'Distintas versiones.',                em: 'CADA LADO.' },
  { pre: 'Cada medio cuenta una historia. Mirá', em: 'CADA LADO.' },
]

const TICKER_ITEMS = [
  'Clarín destaca el impacto económico · La Nación focaliza en la reacción del mercado · Página 12 critica el ajuste',
  'Infobae prioriza la versión oficial · Perfil cuestiona los números · Ámbito analiza el impacto financiero',
  'La Izquierda Diario denuncia las consecuencias sociales · El Cronista monitorea las inversiones',
  'Clarín omite las protestas · La Nación destaca el apoyo empresarial · Página 12 da voz a los afectados',
]

export default function HeroAnimated() {
  const [visible, setVisible] = useState(false)
  const [phraseIdx, setPhraseIdx] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % PHRASES.length)
        setFade(true)
      }, 350)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  const phrase = PHRASES[phraseIdx]

  return (
    <section
      className="relative overflow-hidden flex flex-col border-b"
      style={{ minHeight: '85vh', background: 'var(--bg)', borderColor: 'var(--line)' }}
    >
      {/* Date + edition line */}
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
          <span>12 medios monitoreados · actualizado hoy</span>
        </div>
      </div>

      {/* Main hero content */}
      <div className="flex-1 flex flex-col justify-center max-w-6xl mx-auto px-4 py-16 md:py-24 w-full">

        {/* Live badge — azul */}
        <div
          className={`flex items-center gap-2 mb-8 transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{
            transitionDelay: '0ms',
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: '#3D85FF',
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full inline-block"
            style={{ background: '#3D85FF', animation: 'pulse 2.2s ease-in-out infinite' }}
          />
          Monitoreo en tiempo real · 12 medios · Argentina
        </div>

        {/* Rotating headline */}
        <div
          className={`transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '120ms', transitionDuration: '800ms' }}
        >
          <h1
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: 'clamp(52px, 7vw, 96px)',
              fontWeight: 400,
              lineHeight: 1.0,
              letterSpacing: '-0.025em',
              color: 'var(--ink)',
              margin: 0,
              opacity: fade ? 1 : 0,
              transition: 'opacity 0.35s ease',
              minHeight: '2.1em',
            }}
          >
            {phrase.pre}{' '}
            <em style={{ fontStyle: 'italic', color: '#0052CC' }}>{phrase.em}</em>
          </h1>
        </div>

        {/* Subheadline + CTA */}
        <div
          className={`mt-10 max-w-2xl transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '350ms', transitionDuration: '700ms' }}
        >
          <p
            className="mb-9 leading-relaxed"
            style={{
              fontFamily: 'var(--font-fraunces), Georgia, serif',
              fontSize: '18px',
              color: 'var(--ink-dim)',
            }}
          >
            La misma noticia contada de forma diferente según cada medio.
            Comparamos titulares, énfasis y omisiones para que veas la historia completa.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/noticias"
              className="flex items-center gap-2 transition-colors text-sm font-semibold"
              style={{ background: '#0052CC', color: '#fff', padding: '12px 24px' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#3D85FF')}
              onMouseLeave={e => (e.currentTarget.style.background = '#0052CC')}
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
              Conocer los medios
            </Link>
          </div>
        </div>
      </div>

      {/* News ticker at bottom */}
      <div
        className={`border-t transition-all duration-700 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ borderColor: 'var(--line)', transitionDelay: '600ms', transitionDuration: '700ms' }}
      >
        <div className="flex items-stretch overflow-hidden">
          <div
            className="shrink-0 flex items-center px-4"
            style={{
              background: 'var(--ink)',
              color: 'var(--bg)',
              fontSize: 10,
              fontFamily: 'var(--font-mono)',
              fontWeight: 600,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
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