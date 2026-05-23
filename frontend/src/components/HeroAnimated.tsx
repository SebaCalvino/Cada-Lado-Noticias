'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/* ─── Rotating brand phrases ─────────────────────────────────────── */
const PHRASES = [
  { pre: 'Una noticia.',                          em: 'CADA LADO.' },
  { pre: 'La misma noticia, desde',               em: 'CADA LADO.' },
  { pre: 'Cómo cambia una noticia según',         em: 'CADA LADO.' },
  { pre: 'Entendé la noticia desde',              em: 'CADA LADO.' },
  { pre: 'Distintas versiones.',                  em: 'CADA LADO.' },
  { pre: 'Cada medio cuenta su historia. Mirá',   em: 'CADA LADO.' },
]

/* ─── Demo data: inflación marzo 2026, 4 fuentes ─────────────────── */
type WordKind = 'normal' | 'shared' | 'contrast'

const DEMO = [
  {
    source: 'Clarín',
    color: '#b91c1c',
    label: 'Centro-derecha',
    words: [
      { t: 'La inflación ',              k: 'normal'   as WordKind },
      { t: 'cedió',                      k: 'contrast' as WordKind },
      { t: ' al ',                       k: 'normal'   as WordKind },
      { t: '2,4%',                       k: 'shared'   as WordKind },
      { t: ' y se acerca al objetivo',   k: 'normal'   as WordKind },
    ],
  },
  {
    source: 'Página 12',
    color: '#1d4ed8',
    label: 'Izquierda',
    words: [
      { t: 'La inflación ',              k: 'normal'   as WordKind },
      { t: 'apenas baja',                k: 'contrast' as WordKind },
      { t: ' al ',                       k: 'normal'   as WordKind },
      { t: '2,4%',                       k: 'shared'   as WordKind },
      { t: ': el salario real ',         k: 'normal'   as WordKind },
      { t: 'sigue cayendo',              k: 'contrast' as WordKind },
    ],
  },
  {
    source: 'La Nación',
    color: '#c2410c',
    label: 'Centro-derecha',
    words: [
      { t: 'Inflación de marzo: ',       k: 'normal'   as WordKind },
      { t: '2,4%',                       k: 'shared'   as WordKind },
      { t: ', el ',                      k: 'normal'   as WordKind },
      { t: 'menor registro desde 2021',  k: 'contrast' as WordKind },
    ],
  },
  {
    source: 'Infobae',
    color: '#7c3aed',
    label: 'Centro',
    words: [
      { t: 'INDEC: IPC ',                k: 'normal'   as WordKind },
      { t: '2,4%',                       k: 'shared'   as WordKind },
      { t: ' en marzo, ',                k: 'normal'   as WordKind },
      { t: 'debajo de lo esperado',      k: 'contrast' as WordKind },
    ],
  },
]

const SYNTHESIS =
  'El INDEC confirmó una inflación de 2,4% en marzo. ' +
  'Los medios coinciden en el dato pero difieren profundamente: ' +
  'unos celebran la desaceleración, otros señalan el costo social del ajuste.'

/* ─── Phase timing ────────────────────────────────────────────────
 *  0 → blank           (600ms)
 *  1 → show titular 1  (750ms)
 *  2 → show titular 2  (750ms)
 *  3 → show titular 3  (750ms)
 *  4 → show titular 4  (1 100ms)
 *  5 → resaltar palabras (1 500ms)
 *  6 → mostrar síntesis  (4 500ms)
 *  → vuelve a 0
 * ────────────────────────────────────────────────────────────────── */
const PHASE_DURATION = [600, 750, 750, 750, 1100, 1500, 4500]

const TICKER_ITEMS = [
  'Clarín destaca el impacto económico · La Nación focaliza en la reacción del mercado · Página 12 critica el ajuste',
  'Infobae prioriza la versión oficial · Perfil cuestiona los números · Ámbito analiza el impacto financiero',
  'La Izquierda Diario denuncia las consecuencias sociales · El Cronista monitorea las inversiones',
  'Clarín omite las protestas · La Nación destaca el apoyo empresarial · Página 12 da voz a los afectados',
]

export default function HeroAnimated() {
  /* ── phrase rotation ── */
  const [phraseIdx, setPhraseIdx]   = useState(0)
  const [phraseVisible, setPhraseVisible] = useState(true)
  const [mounted, setMounted]       = useState(false)

  /* ── demo animation ── */
  const [phase, setPhase] = useState(0)

  const visibleCount = Math.min(Math.max(phase - 1, 0), 4)  // 0-4 headlines shown
  const highlighted  = phase >= 5
  const showSynth    = phase >= 6

  /* mount fade-in */
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 60)
    return () => clearTimeout(t)
  }, [])

  /* phrase loop */
  useEffect(() => {
    const id = setInterval(() => {
      setPhraseVisible(false)
      setTimeout(() => {
        setPhraseIdx(i => (i + 1) % PHRASES.length)
        setPhraseVisible(true)
      }, 350)
    }, 4500)
    return () => clearInterval(id)
  }, [])

  /* demo phase loop */
  useEffect(() => {
    const next  = phase >= PHASE_DURATION.length ? 0 : phase + 1
    const delay = PHASE_DURATION[phase] ?? 600
    const t = setTimeout(() => setPhase(next >= PHASE_DURATION.length + 1 ? 0 : next), delay)
    return () => clearTimeout(t)
  }, [phase])

  const phrase = PHRASES[phraseIdx]

  return (
    <section
      className="relative overflow-hidden border-b flex flex-col"
      style={{ background: 'var(--bg, #faf8f3)', borderColor: 'var(--line, #e6e1d4)' }}
    >
      {/* ── Editorial top bar ─────────────────────────────────── */}
      <div className="max-w-6xl mx-auto px-4 w-full pt-5">
        <div
          className="flex items-center justify-between pb-3 border-b"
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute, #8e8a82)',
            borderColor: 'var(--line, #e6e1d4)',
          }}
        >
          <span>Buenos Aires, Argentina</span>
          <span>12 medios monitoreados · actualizado hoy</span>
        </div>
      </div>

      {/* ── Main two-column grid ───────────────────────────────── */}
      <div
        className={`flex-1 max-w-6xl mx-auto px-4 w-full grid md:grid-cols-[52%_1fr] gap-10 xl:gap-16 items-center py-12 md:py-16 transition-all duration-700 ease-out ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {/* ── LEFT: Brand + phrase ────────────────────────────── */}
        <div className="flex flex-col">
          {/* Live badge */}
          <div
            className="flex items-center gap-2 mb-7"
            style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#0052CC' }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block bg-blue-600" style={{ animation: 'pulse 2.2s ease-in-out infinite' }} />
            Monitoreo en tiempo real · 12 medios · Argentina
          </div>

          {/* Rotating headline */}
          <h1
            style={{
              fontFamily: 'var(--font-fraunces, Georgia, serif)',
              fontSize: 'clamp(44px, 5.5vw, 80px)',
              fontWeight: 400,
              lineHeight: 1.05,
              letterSpacing: '-0.025em',
              color: 'var(--ink, #1a1a1c)',
              minHeight: '2.2em',
              opacity: phraseVisible ? 1 : 0,
              transform: phraseVisible ? 'translateY(0)' : 'translateY(5px)',
              transition: 'opacity 350ms ease, transform 350ms ease',
              marginBottom: '1.5rem',
            }}
          >
            {phrase.pre}{' '}
            <em style={{ fontStyle: 'italic', color: '#0052CC' }}>{phrase.em}</em>
          </h1>

          <p
            className="leading-relaxed mb-8 max-w-sm"
            style={{ fontFamily: 'var(--font-fraunces, Georgia, serif)', fontSize: 17, color: 'var(--ink-dim, #5c5a55)' }}
          >
            La misma noticia contada de forma diferente según cada medio.
            Comparamos titulares, énfasis y omisiones para que veas la historia completa.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/noticias"
              className="flex items-center gap-2 text-sm font-semibold transition-opacity hover:opacity-80"
              style={{ background: '#0052CC', color: '#fff', padding: '11px 22px' }}
            >
              Ver las noticias de hoy <ArrowRight size={14} />
            </Link>
            <Link
              href="/fuentes"
              className="text-sm font-medium transition-colors hover:border-gray-400"
              style={{
                border: '1px solid var(--line, #e6e1d4)',
                color: 'var(--ink-dim, #5c5a55)',
                padding: '11px 22px',
                background: 'var(--surface, #fff)',
              }}
            >
              Conocer los medios
            </Link>
          </div>
        </div>

        {/* ── RIGHT: Live synthesis demo ───────────────────────── */}
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            background: '#fff',
            borderColor: 'var(--line, #e6e1d4)',
            boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
          }}
        >
          {/* Demo header */}
          <div
            className="px-4 py-3 border-b flex items-center justify-between"
            style={{ borderColor: 'var(--line, #e6e1d4)', background: 'var(--bg, #faf8f3)' }}
          >
            <span
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--ink-mute, #8e8a82)' }}
            >
              Demo · inflación marzo 2026
            </span>
            <span className="flex items-center gap-1.5" style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#059669' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" style={{ animation: 'pulse 2s ease-in-out infinite' }} />
              En vivo
            </span>
          </div>

          {/* Headlines list */}
          <div className="px-4 pt-4 pb-2 space-y-3">
            {DEMO.map((item, i) => (
              <div
                key={item.source}
                className="flex items-start gap-3"
                style={{
                  opacity: visibleCount > i ? 1 : 0,
                  transform: visibleCount > i ? 'translateY(0)' : 'translateY(7px)',
                  transition: 'opacity 500ms ease, transform 500ms ease',
                }}
              >
                {/* Source */}
                <div className="flex items-center gap-1.5 pt-0.5 shrink-0" style={{ width: 76 }}>
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--ink-mute, #8e8a82)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'var(--font-mono)' }}>
                    {item.source}
                  </span>
                </div>

                {/* Headline with inline highlights */}
                <p style={{ fontSize: 13, color: 'var(--ink, #1a1a1c)', lineHeight: 1.45, flex: 1 }}>
                  {item.words.map((word, wi) => {
                    if (word.k === 'shared' && highlighted) {
                      return (
                        <span
                          key={wi}
                          style={{ color: '#0052CC', fontWeight: 700, transition: 'color 600ms, font-weight 300ms' }}
                        >
                          {word.t}
                        </span>
                      )
                    }
                    if (word.k === 'contrast' && highlighted) {
                      return (
                        <mark
                          key={wi}
                          style={{ backgroundColor: '#fef9c3', color: '#92400e', borderRadius: 2, padding: '0 2px', transition: 'background-color 600ms' }}
                        >
                          {word.t}
                        </mark>
                      )
                    }
                    return <span key={wi}>{word.t}</span>
                  })}
                </p>
              </div>
            ))}
          </div>

          {/* Legend — appears with highlighting */}
          <div
            className="px-4 pb-3 flex items-center gap-5"
            style={{ opacity: highlighted ? 1 : 0, transition: 'opacity 600ms ease' }}
          >
            <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--ink-mute, #8e8a82)', fontFamily: 'var(--font-mono)' }}>
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: '#0052CC', opacity: 0.3 }} />
              Dato compartido
            </span>
            <span className="flex items-center gap-1.5" style={{ fontSize: 10, color: 'var(--ink-mute, #8e8a82)', fontFamily: 'var(--font-mono)' }}>
              <span className="inline-block w-2.5 h-2.5 rounded" style={{ background: '#fef9c3', border: '1px solid #d97706', opacity: 0.7 }} />
              Encuadre distinto
            </span>
            <span style={{ fontSize: 10, color: 'var(--ink-mute, #8e8a82)', fontFamily: 'var(--font-mono)' }}>
              4 medios · 4 versiones
            </span>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--line, #e6e1d4)', margin: '0 16px' }} />

          {/* Synthesis — last phase */}
          <div
            className="px-4 py-4"
            style={{
              opacity: showSynth ? 1 : 0,
              transform: showSynth ? 'translateY(0)' : 'translateY(5px)',
              transition: 'opacity 700ms ease, transform 700ms ease',
              borderLeft: '2px solid #0052CC',
              marginLeft: 16,
              marginRight: 16,
              marginBottom: 4,
              paddingLeft: 12,
            }}
          >
            <p
              style={{ fontSize: 9, fontFamily: 'var(--font-mono)', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#0052CC', marginBottom: 6 }}
            >
              Síntesis CADA LADO
            </p>
            <p style={{ fontSize: 12, color: 'var(--ink-dim, #5c5a55)', lineHeight: 1.6 }}>
              {SYNTHESIS}
            </p>
          </div>
          {showSynth && <div style={{ height: 8 }} />}
        </div>
      </div>

      {/* ── Ticker ────────────────────────────────────────────── */}
      <div
        className="border-t"
        style={{ borderColor: 'var(--line, #e6e1d4)', opacity: mounted ? 1 : 0, transition: 'opacity 700ms ease 600ms' }}
      >
        <div className="flex items-stretch overflow-hidden">
          <div
            className="shrink-0 flex items-center px-4 py-2.5"
            style={{
              background: 'var(--ink, #1a1a1c)',
              color: 'var(--bg, #faf8f3)',
              fontSize: 9,
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
              style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-dim, #5c5a55)' }}
            >
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-block mx-10">
                  <span style={{ color: 'var(--ink-mute, #8e8a82)', marginRight: 8 }}>·</span>
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
