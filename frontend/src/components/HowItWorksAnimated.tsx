'use client'

import { useEffect, useRef, useState } from 'react'
import { ScanSearch, BrainCircuit, Newspaper } from 'lucide-react'

const STEPS = [
  {
    step: '01',
    icon: ScanSearch,
    title: 'Escaneamos el espectro completo',
    desc: 'Cada 30 minutos, nuestros scrapers recorren 12 medios argentinos — de Clarín a La Izquierda Diario. Sin excluir ninguna voz del debate.',
    tag: '12 medios · cada 30 min',
    accent: '#3D85FF',
  },
  {
    step: '02',
    icon: BrainCircuit,
    title: 'La IA detecta el mismo hecho',
    desc: 'Un modelo semántico agrupa artículos que hablan del mismo evento aunque tengan títulos distintos. Clarín dice "crisis", Página 12 dice "saqueo" — nuestra IA los une.',
    tag: 'Clustering semántico',
    accent: '#7C3AED',
  },
  {
    step: '03',
    icon: Newspaper,
    title: 'Síntesis neutra + análisis de sesgo',
    desc: 'Groq AI redacta una síntesis imparcial basada en hechos verificables y revela qué enfatiza cada medio y — lo más revelador — qué omite deliberadamente.',
    tag: 'Síntesis + análisis editorial',
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
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#3D85FF] mb-4">
            El proceso
          </p>
          <h2 className="text-3xl md:text-5xl font-serif font-bold text-white leading-tight max-w-xl">
            ¿Cómo funciona?
          </h2>
          <div className="mt-5 w-12 h-[3px] bg-[#3D85FF]" />
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
                {/* Card */}
                <div
                  className="h-full p-8 border border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.06] transition-colors"
                  style={{ borderTop: `3px solid ${item.accent}` }}
                >
                  {/* Step + Icon row */}
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

                  {/* Content */}
                  <h3 className="text-lg font-bold text-white mb-3 leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-[14px] text-gray-400 leading-relaxed mb-6">
                    {item.desc}
                  </p>

                  {/* Tag */}
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

                {/* Connector arrow (desktop) */}
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
