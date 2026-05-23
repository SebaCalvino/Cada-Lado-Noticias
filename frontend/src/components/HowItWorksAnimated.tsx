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
    <section ref={ref} className="bg-[#070e1c] text-white py-24 md:py-32 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4">

        {/* Header */}
        <div
          className={`mb-16 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] mb-4" style={{ color: '#3D85FF' }}>
            El proceso
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight max-w-xl">
            ¿Cómo funciona?
          </h2>
          <div className="mt-5 w-12 h-[3px]" style={{ background: '#3D85FF' }} />
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 xl:gap-12">
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
                  className="h-full p-8 border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  style={{ borderTop: `3px solid ${item.accent}` }}
                >
                  <div className="flex items-center justify-between mb-8">
                    <span
                      className="text-6xl font-serif font-black leading-none select-none"
                      style={{ color: item.accent, opacity: 0.18 }}
                    >
                      {item.step}
                    </span>
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${item.accent}22` }}
                    >
                      <Icon size={22} style={{ color: item.accent }} />
                    </div>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-3 leading-snug">{item.title}</h3>
                  <p className="text-[14px] text-gray-400 leading-relaxed mb-6">{item.desc}</p>
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full"
                    style={{
                      color: item.accent,
                      backgroundColor: `${item.accent}18`,
                      border: `1px solid ${item.accent}40`,
                    }}
                  >
                    {item.tag}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden md:flex absolute top-1/2 -right-6 -translate-y-1/2 items-center z-10">
                    <svg width="12" height="20" viewBox="0 0 12 20" fill="none">
                      <path d="M1 1l10 9-10 9" stroke="rgba(255,255,255,0.15)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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