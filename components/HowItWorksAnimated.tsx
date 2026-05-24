'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = [
  {
    step: '01',
    title: 'Monitoreamos todos los medios',
    desc: 'Cada hora recorremos Clarín, La Nación, Infobae, Página 12, Ámbito, El Cronista, Perfil y La Izquierda Diario. De la derecha a la izquierda, sin excluir ninguna voz.',
    detail: '12 medios · actualización cada hora',
  },
  {
    step: '02',
    title: 'Detectamos la misma noticia',
    desc: 'Agrupamos automáticamente los artículos que cubren el mismo hecho aunque los títulos sean completamente distintos. Clarín lo llama "crisis", Página 12 lo llama "saqueo" — nosotros los unimos.',
    detail: 'Detección automática del mismo hecho',
  },
  {
    step: '03',
    title: 'Síntesis imparcial + comparación',
    desc: 'Generamos una síntesis neutra basada en los hechos verificables. Luego comparamos qué destaca cada medio, qué datos aporta y — lo más revelador — qué deja afuera deliberadamente.',
    detail: 'Síntesis neutral + cobertura comparada por fuente',
  },
]

function useInView(threshold = 0.15) {
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

export default function HowItWorksAnimated() {
  const { ref, inView } = useInView(0.1)

  return (
    <section ref={ref} className="max-w-6xl mx-auto px-4 py-20 md:py-28">

      {/* Section header */}
      <div
        className={`mb-16 transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        style={{ transitionDelay: '0ms' }}
      >
        <p
          style={{
            fontSize: 11,
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'var(--ink-mute)',
            fontWeight: 500,
            marginBottom: 12,
          }}
        >
          El proceso
        </p>
        <h2
          className="font-serif leading-tight"
          style={{ fontSize: 'clamp(26px, 4vw, 38px)', color: 'var(--ink)', fontWeight: 400 }}
        >
          ¿Cómo funciona?
        </h2>
        <div className="mt-4 h-px w-12" style={{ background: 'var(--line-strong)' }} />
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-12 md:gap-14">
        {STEPS.map((item, i) => (
          <div
            key={item.step}
            className={`transition-all duration-700 ease-out ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: `${i * 160 + 100}ms`, transitionDuration: '700ms' }}
          >
            {/* Step number */}
            <div className="flex items-center gap-4 mb-6">
              <span
                className="font-serif select-none leading-none"
                style={{ fontSize: 52, fontWeight: 700, color: 'var(--surface-3)' }}
              >
                {item.step}
              </span>
              <div className="h-px flex-1 md:hidden" style={{ background: 'var(--line)' }} />
            </div>

            {/* Content */}
            <h3
              className="font-serif leading-snug mb-3"
              style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}
            >
              {item.title}
            </h3>
            <p
              className="leading-relaxed mb-5"
              style={{ fontSize: 14, color: 'var(--ink-dim)' }}
            >
              {item.desc}
            </p>

            {/* Detail badge */}
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: 'var(--cada-blue)',
                border: '1px solid var(--left-bg)',
                background: 'var(--left-bg)',
                padding: '4px 10px',
              }}
            >
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
