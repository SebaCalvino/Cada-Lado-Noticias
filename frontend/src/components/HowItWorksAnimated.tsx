'use client'

import { useEffect, useRef, useState } from 'react'
import { ScanSearch, BrainCircuit, Newspaper } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: ScanSearch,
    title: 'Monitoreamos todos los medios',
    desc: 'Cada hora recorremos Clarín, La Nación, Infobae, Página 12, Ámbito, El Cronista, Perfil, TN, La Izquierda Diario y más. De la derecha a la izquierda, sin excluir ninguna voz.',
    tag: '12 medios · cada hora',
    accent: '#3D85FF',
  },
  {
    step: '02',
    icon: BrainCircuit,
    title: 'Detectamos la misma noticia',
    desc: 'Agrupamos automáticamente los artículos que cubren el mismo hecho aunque los títulos sean completamente distintos. Clarín lo llama "crisis", Página 12 lo llama "saqueo" — nosotros los unimos.',
    tag: 'Detección automática',
    accent: '#7C3AED',
  },
  {
    step: '03',
    icon: Newspaper,
    title: 'Síntesis imparcial y comparación',
    desc: 'Generamos una síntesis neutra basada en hechos verificables. Luego comparamos qué destaca cada medio, qué datos aporta y — lo más revelador — qué omite deliberadamente.',
    tag: 'Síntesis neutral + cobertura comparada',
    accent: '#059669',
  },
]

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect() } },
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
    <section
      ref={ref}
      className="py-20 md:py-28 overflow-hidden"
      style={{ background: 'var(--surface-2, #f4f1ea)', borderTop: '1px solid var(--line, #e6e1d4)', borderBottom: '1px solid var(--line, #e6e1d4)' }}
    >
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div
          className={`mb-14 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <p
            className="font-bold uppercase mb-4"
            style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.28em', color: '#0052CC' }}
          >
            El proceso
          </p>
          <h2
            className="font-serif leading-tight max-w-xl"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 700, color: 'var(--ink, #1a1a1c)' }}
          >
            ¿Cómo funciona?
          </h2>
          <div className="mt-4 w-10 h-[2px]" style={{ background: '#0052CC' }} />
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-6 xl:gap-10">
          {STEPS.map((item, i) => {
            const Icon = item.icon
            return (
              <div
                key={item.step}
                className={`relative group transition-all duration-700 ${
                  inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
                }`}
                style={{ transitionDelay: `${i * 180 + 100}ms` }}
              >
                <div
                  className="h-full p-7 bg-white border border-gray-200 hover:border-gray-300 transition-colors"
                  style={{ borderTop: `3px solid ${item.accent}` }}
                >
                  <div className="flex items-center justify-between mb-7">
                    <span
                      className="font-serif font-black leading-none select-none"
                      style={{ fontSize: 56, color: item.accent, opacity: 0.12 }}
                    >
                      {item.step}
                    </span>
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${item.accent}14` }}
                    >
                      <Icon size={20} style={{ color: item.accent }} />
                    </div>
                  </div>
                  <h3
                    className="font-bold mb-2.5 leading-snug"
                    style={{ fontSize: 16, color: 'var(--ink, #1a1a1c)' }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="leading-relaxed mb-5"
                    style={{ fontSize: 13, color: 'var(--ink-dim, #5c5a55)' }}
                  >
                    {item.desc}
                  </p>
                  <span
                    className="inline-block font-bold uppercase"
                    style={{
                      fontSize: 9,
                      fontFamily: 'var(--font-mono)',
                      letterSpacing: '0.18em',
                      color: item.accent,
                      backgroundColor: `${item.accent}10`,
                      border: `1px solid ${item.accent}30`,
                      padding: '4px 10px',
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-5 -translate-y-1/2 items-center z-10">
                    <svg width="10" height="18" viewBox="0 0 10 18" fill="none">
                      <path d="M1 1l8 8-8 8" stroke="var(--line, #e6e1d4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}