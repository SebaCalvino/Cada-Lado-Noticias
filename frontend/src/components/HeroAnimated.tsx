'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const TICKER_ITEMS = [
  'Clarín destaca el impacto económico · La Nación focaliza en la reacción del mercado · Página 12 critica el ajuste',
  'Infobae prioriza la versión oficial · Perfil cuestiona los números · Ámbito analiza el impacto financiero',
  'La Izquierda Diario denuncia las consecuencias sociales · El Cronista monitorea las inversiones',
  'Clarín omite las protestas · La Nación destaca el apoyo empresarial · Página 12 da voz a los afectados',
]

export default function HeroAnimated() {
  const [visible, setVisible] = useState(false)
  const tickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Trigger entrance animation on mount
    const t = setTimeout(() => setVisible(true), 80)
    return () => clearTimeout(t)
  }, [])

  return (
    <section className="bg-[#0b1120] text-white relative overflow-hidden min-h-[88vh] flex flex-col">
      {/* Newspaper column grid lines — subtle */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.8) 0px, rgba(255,255,255,0.8) 1px, transparent 1px, transparent 120px)',
        }}
      />

      {/* Faint horizontal rule at top like a paper header */}
      <div className="w-full h-px bg-white/10 mt-0" />

      {/* Date + edition line */}
      <div className="relative max-w-6xl mx-auto px-4 w-full pt-5">
        <div className="flex items-center justify-between text-[11px] text-gray-500 font-mono uppercase tracking-widest border-b border-white/10 pb-3">
          <span>Buenos Aires, Argentina</span>
          <span className="text-gray-600">Síntesis con IA · 12 medios monitoreados</span>
        </div>
      </div>

      {/* Main hero content */}
      <div className="relative flex-1 flex flex-col justify-center max-w-6xl mx-auto px-4 py-16 md:py-24 w-full">
        {/* Live badge */}
        <div
          className={`flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-7 tracking-widest uppercase transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
          style={{ transitionDelay: '0ms' }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          Monitoreo en tiempo real · 12 medios · Argentina
        </div>

        {/* Headline */}
        <div
          className={`transition-all duration-800 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
          style={{ transitionDelay: '120ms', transitionDuration: '800ms' }}
        >
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[0.95] mb-0 text-white tracking-tight">
            ¿Demasiada
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[0.95] text-white tracking-tight">
            desinformación?
          </h1>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-serif font-bold leading-[0.95] mt-1">
            <span className="text-gray-400">Mirá lo que dice</span>
            <br />
            <span className="text-amber-400 font-black not-italic uppercase tracking-tight">CADA LADO.</span>
          </h1>
        </div>

        {/* Subheadline + CTA */}
        <div
          className={`mt-10 max-w-2xl transition-all duration-700 ease-out ${
            visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          }`}
          style={{ transitionDelay: '350ms', transitionDuration: '700ms' }}
        >
          <p className="text-lg md:text-xl text-gray-400 mb-9 leading-relaxed">
            La misma noticia, analizada desde Clarín hasta La Izquierda Diario.
            Sintetizamos, comparamos y te mostramos qué enfatiza cada medio —
            <span className="text-gray-300">y qué omite deliberadamente.</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/noticias"
              className="bg-white text-gray-900 font-bold px-7 py-3.5 flex items-center gap-2 hover:bg-gray-100 transition-colors text-sm tracking-wide uppercase"
            >
              Ver las noticias de hoy <ArrowRight size={15} />
            </Link>
            <Link
              href="/fuentes"
              className="border border-white/20 text-gray-300 font-semibold px-7 py-3.5 hover:bg-white/5 transition-colors text-sm"
            >
              Conocer los medios
            </Link>
          </div>
        </div>
      </div>

      {/* News ticker at bottom */}
      <div
        className={`relative border-t border-white/10 bg-white/[0.02] transition-all duration-700 ease-out ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ transitionDelay: '600ms', transitionDuration: '700ms' }}
      >
        <div className="flex items-stretch overflow-hidden">
          {/* Label */}
          <div className="shrink-0 bg-white text-gray-900 text-[10px] font-black uppercase tracking-widest px-3 flex items-center">
            LIVE
          </div>
          {/* Scrolling ticker */}
          <div className="overflow-hidden flex-1 py-2.5">
            <div ref={tickerRef} className="ticker-track whitespace-nowrap text-xs text-gray-400 font-mono">
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} className="inline-block mx-10">
                  <span className="text-gray-600 mr-2">·</span>
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
