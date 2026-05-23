'use client'

import { useEffect, useRef, useState } from 'react'

const EXAMPLE = {
  event: 'El gobierno anuncia recorte del 15% en el presupuesto educativo',
  left: {
    source: 'Página 12',
    color: '#dc2626',
    ideologyLabel: 'Izquierda',
    headline: '"Milei destruye la educación pública: miles de docentes sin salario"',
    emphasis: 'Protestas, impacto social, familias afectadas, críticas sindicales',
    omits: 'El déficit fiscal que motivó el recorte',
  },
  right: {
    source: 'La Nación',
    color: '#1d4ed8',
    ideologyLabel: 'Derecha',
    headline: '"El Gobierno avanza en el equilibrio fiscal con ajuste en gasto educativo"',
    emphasis: 'Necesidad del ajuste, metas del FMI, responsabilidad fiscal',
    omits: 'El impacto concreto en aulas y docentes',
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
        {/* Section label */}
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
            Los medios no inventan la noticia — la encuadran y la amplifican de formas radicalmente distintas.
            Ese encuadre forma tu opinión sin que lo notes.
          </p>
        </div>

        {/* The same fact */}
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

        {/* Split headlines */}
        <div
          className={`grid md:grid-cols-2 gap-0 transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '280ms' }}
        >
          {/* Left side */}
          <div
            className="p-6 md:p-8 relative transition-colors border border-r-0"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: EXAMPLE.left.color }} />
            <div className="pl-4">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                  style={{ background: EXAMPLE.left.color + '18', color: EXAMPLE.left.color }}
                >
                  {EXAMPLE.left.ideologyLabel}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--ink-mute)' }}>
                  {EXAMPLE.left.source}
                </span>
              </div>
              <blockquote className="font-serif text-lg md:text-xl leading-snug mb-6 italic" style={{ color: 'var(--ink)' }}>
                {EXAMPLE.left.headline}
              </blockquote>
              <div className="space-y-3 text-sm">
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Lo que destaca
                  </span>
                  <p style={{ color: 'var(--ink-2)' }}>{EXAMPLE.left.emphasis}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--right)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Lo que omite
                  </span>
                  <p className="italic" style={{ color: 'var(--ink-mute)' }}>{EXAMPLE.left.omits}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right side */}
          <div
            className="p-6 md:p-8 relative transition-colors border border-t-0 md:border-t md:border-l-0"
            style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--surface)')}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: EXAMPLE.right.color }} />
            <div className="pl-4">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5"
                  style={{ background: EXAMPLE.right.color + '18', color: EXAMPLE.right.color }}
                >
                  {EXAMPLE.right.ideologyLabel}
                </span>
                <span className="text-xs font-semibold" style={{ color: 'var(--ink-mute)' }}>
                  {EXAMPLE.right.source}
                </span>
              </div>
              <blockquote className="font-serif text-lg md:text-xl leading-snug mb-6 italic" style={{ color: 'var(--ink)' }}>
                {EXAMPLE.right.headline}
              </blockquote>
              <div className="space-y-3 text-sm">
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Lo que destaca
                  </span>
                  <p style={{ color: 'var(--ink-2)' }}>{EXAMPLE.right.emphasis}</p>
                </div>
                <div>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--right)', fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    Lo que omite
                  </span>
                  <p className="italic" style={{ color: 'var(--ink-mute)' }}>{EXAMPLE.right.omits}</p>
                </div>
              </div>
            </div>
          </div>
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
