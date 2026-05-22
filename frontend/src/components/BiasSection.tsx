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
    <section ref={ref} className="bg-[#0b1120] text-white overflow-hidden">
      {/* Top border rule */}
      <div className="h-px w-full bg-white/10" />

      <div className="max-w-6xl mx-auto px-4 py-20 md:py-28">
        {/* Section label */}
        <div
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '0ms' }}
        >
          <p className="text-xs uppercase tracking-widest text-gray-500 font-semibold mb-4">
            El problema
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight max-w-3xl mb-4">
            El mismo hecho.
            <br />
            <span className="text-gray-400 italic">Dos realidades paralelas.</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl leading-relaxed mb-16">
            Los medios no inventan la noticia — la eligen, la encuadran y la amplifican de formas radicalmente distintas.
            Ese encuadre forma tu opinión sin que lo notes.
          </p>
        </div>

        {/* The same fact */}
        <div
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '150ms' }}
        >
          <div className="border border-white/10 bg-white/[0.03] rounded-sm px-6 py-4 mb-8 flex items-start gap-4">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold shrink-0 pt-0.5">
              El hecho
            </span>
            <p className="text-white/90 font-serif text-base md:text-lg leading-snug">
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
          <div className="border border-white/10 border-r-0 md:border-r-0 p-6 md:p-8 relative group hover:bg-white/[0.03] transition-colors">
            {/* Ideology accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: EXAMPLE.left.color }}
            />
            <div className="pl-4">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5"
                  style={{ backgroundColor: EXAMPLE.left.color + '20', color: EXAMPLE.left.color }}
                >
                  {EXAMPLE.left.ideologyLabel}
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  {EXAMPLE.left.source}
                </span>
              </div>
              <blockquote className="font-serif text-lg md:text-xl text-white leading-snug mb-6 italic">
                {EXAMPLE.left.headline}
              </blockquote>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
                    Énfasis
                  </span>
                  <p className="text-gray-300">{EXAMPLE.left.emphasis}</p>
                </div>
                <div>
                  <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
                    Omite
                  </span>
                  <p className="text-gray-500 italic">{EXAMPLE.left.omits}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Divider with VS */}
          <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
            {/* this is handled by the border below on mobile */}
          </div>

          {/* Right side */}
          <div className="border border-white/10 border-t-0 md:border-t md:border-l-0 p-6 md:p-8 relative group hover:bg-white/[0.03] transition-colors">
            <div
              className="absolute left-0 top-0 bottom-0 w-1"
              style={{ backgroundColor: EXAMPLE.right.color }}
            />
            <div className="pl-4">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5"
                  style={{ backgroundColor: EXAMPLE.right.color + '20', color: EXAMPLE.right.color }}
                >
                  {EXAMPLE.right.ideologyLabel}
                </span>
                <span className="text-xs text-gray-500 font-semibold">
                  {EXAMPLE.right.source}
                </span>
              </div>
              <blockquote className="font-serif text-lg md:text-xl text-white leading-snug mb-6 italic">
                {EXAMPLE.right.headline}
              </blockquote>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
                    Énfasis
                  </span>
                  <p className="text-gray-300">{EXAMPLE.right.emphasis}</p>
                </div>
                <div>
                  <span className="text-gray-500 uppercase tracking-wider text-[10px] font-bold block mb-1">
                    Omite
                  </span>
                  <p className="text-gray-500 italic">{EXAMPLE.right.omits}</p>
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
          <p className="text-gray-500 text-sm text-center max-w-xl mx-auto leading-relaxed">
            Cada Lado reúne todas las versiones del mismo hecho para que puedas leerlas juntas
            y formar tu propia opinión.
          </p>
        </div>
      </div>

      <div className="h-px w-full bg-white/10" />
    </section>
  )
}
