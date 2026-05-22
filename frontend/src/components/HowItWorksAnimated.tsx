'use client'

import { useEffect, useRef, useState } from 'react'

const STEPS = [
  {
    step: '01',
    title: 'Escaneamos el espectro completo',
    desc: 'Cada hora, nuestros scrapers recorren Clarín, La Nación, Infobae, Página 12, Ámbito, El Cronista, Perfil y La Izquierda Diario. De la derecha a la izquierda, sin excluir ninguna voz.',
    detail: '8 medios · actualización cada hora',
  },
  {
    step: '02',
    title: 'La IA detecta el mismo hecho',
    desc: 'Un modelo de lenguaje agrupa los artículos que hablan del mismo evento aunque los títulos sean completamente distintos. Clarín lo llama "crisis", Página 12 lo llama "saqueo"—nuestra IA los une.',
    detail: 'Clustering semántico con embeddings',
  },
  {
    step: '03',
    title: 'Síntesis imparcial y análisis de sesgo',
    desc: 'Claude AI redacta una síntesis neutra basada en los hechos verificables. Luego analiza qué enfatiza cada medio, qué datos aporta y—lo más revelador—qué omite deliberadamente.',
    detail: 'Síntesis + análisis editorial por fuente',
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
        <p className="text-xs uppercase tracking-widest text-gray-400 font-semibold mb-3">
          El proceso
        </p>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-gray-900 leading-tight">
          ¿Cómo funciona?
        </h2>
        <div className="mt-4 h-px bg-gray-200 w-16" />
      </div>

      {/* Steps */}
      <div className="grid md:grid-cols-3 gap-0 md:gap-12">
        {STEPS.map((item, i) => (
          <div
            key={item.step}
            className={`relative transition-all duration-700 ease-out ${
              inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
            }`}
            style={{ transitionDelay: `${i * 160 + 100}ms`, transitionDuration: '700ms' }}
          >
            {/* Connector line between steps (desktop) */}
            {i < STEPS.length - 1 && (
              <div className="hidden md:block absolute top-6 left-full w-12 h-px bg-gray-200 z-0" style={{ left: 'calc(100% + 1px)' }} />
            )}

            {/* Step number */}
            <div className="flex items-center gap-4 mb-6">
              <span className="text-5xl font-serif font-bold text-gray-100 select-none leading-none">
                {item.step}
              </span>
              <div className="h-px flex-1 bg-gray-100 md:hidden" />
            </div>

            {/* Content */}
            <h3 className="text-lg font-bold text-gray-900 mb-3 leading-snug">
              {item.title}
            </h3>
            <p className="text-sm text-gray-500 leading-relaxed mb-4">
              {item.desc}
            </p>
            <span className="inline-block text-[10px] uppercase tracking-widest text-brand-600 font-bold border border-brand-100 bg-brand-50 px-2 py-1">
              {item.detail}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
