'use client'

import { useEffect, useRef, useState } from 'react'

const EXAMPLE = {
  event: 'El gobierno anuncia recorte del 15% en el presupuesto educativo',
  left: {
    source: 'Página 12',
    color: '#CC0000',
    headline: '"Milei destruye la educación pública: miles de docentes sin salario"',
    emphasis: 'Protestas, impacto social, familias afectadas, críticas sindicales',
    omits: 'El déficit fiscal que motivó el recorte y el contexto de la deuda',
  },
  right: {
    source: 'La Nación',
    color: '#1A3A5C',
    headline: '"El Gobierno avanza en el equilibrio fiscal con ajuste en gasto educativo"',
    emphasis: 'Necesidad del ajuste, metas del FMI, responsabilidad fiscal',
    omits: 'El impacto concreto en aulas, docentes y familias de bajos recursos',
  },
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, inView }
}

export default function BiasSection() {
  const { ref, inView } = useInView(0.15)

  return (
    <section
      ref={ref}
      className="overflow-hidden border-b"
      style={{ background: 'var(--surface-2)', borderColor: 'var(--line)' }}
    >
      <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">

        {/* Section header */}
        <div
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '0ms' }}
        >
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 500, marginBottom: 16 }}>
            El mismo hecho, dos versiones
          </p>
          <h2 className="text-3xl md:text-5xl font-serif leading-tight max-w-3xl mb-4" style={{ color: 'var(--ink)', fontWeight: 400 }}>
            La misma noticia.
            <br />
            <em className="italic" style={{ color: 'var(--ink-dim)' }}>Contada de formas muy distintas.</em>
          </h2>
          <p className="text-lg max-w-2xl leading-relaxed mb-16" style={{ color: 'var(--ink-dim)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
            Los medios no inventan la noticia — la cuentan desde su propio punto de vista.
            Ese enfoque forma tu opinión sin que lo notes.
          </p>
        </div>

        {/* The neutral fact */}
        <div
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '150ms' }}
        >
          <div className="px-6 py-4 mb-8 flex items-start gap-4" style={{ border: '1px solid var(--line)', background: 'var(--surface)' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, flexShrink: 0, paddingTop: 2 }}>
              El hecho
            </span>
            <p className="font-serif text-base md:text-lg leading-snug" style={{ color: 'var(--ink)' }}>
              {EXAMPLE.event}
            </p>
          </div>
        </div>

        {/* Split headline comparison */}
        <div
          className={`grid md:grid-cols-2 gap-0 transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '280ms' }}
        >
          {/* Left source */}
          <CoverageCard side={EXAMPLE.left} borderRight />

          {/* Right source */}
          <CoverageCard side={EXAMPLE.right} />
        </div>

        {/* Bottom callout */}
        <div
          className={`mt-10 transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '450ms' }}
        >
          <p className="text-sm text-center max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--ink-mute)' }}>
            Cada Lado reúne todas las versiones del mismo hecho para que puedas leerlas juntas
            y formar tu propia opinión.
          </p>
        </div>
      </div>
    </section>
  )
}

function CoverageCard({
  side,
  borderRight,
}: {
  side: typeof EXAMPLE.left
  borderRight?: boolean
}) {
  return (
    <div
      className="p-6 md:p-8 relative transition-colors"
      style={{
        border: '1px solid var(--line)',
        borderRight: borderRight ? undefined : '1px solid var(--line)',
        borderLeft: '1px solid var(--line)',
        ...(borderRight ? { borderRight: '0' } : {}),
        background: 'var(--surface)',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
    >
      {/* Left accent bar */}
      <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: side.color }} />

      <div className="pl-4">
        {/* Source name */}
        <div className="flex items-center gap-2 mb-5">
          <span
            className="text-sm font-bold"
            style={{ color: side.color }}
          >
            {side.source}
          </span>
        </div>

        {/* Headline */}
        <blockquote
          className="font-serif text-lg md:text-xl leading-snug mb-6 italic"
          style={{ color: 'var(--ink)' }}
        >
          {side.headline}
        </blockquote>

        <div className="space-y-3 text-sm">
          <div>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Lo que destaca
            </span>
            <p style={{ color: 'var(--ink-2)' }}>{side.emphasis}</p>
          </div>
          <div>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--right)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
              Lo que deja afuera
            </span>
            <p className="italic" style={{ color: 'var(--ink-mute)' }}>{side.omits}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
