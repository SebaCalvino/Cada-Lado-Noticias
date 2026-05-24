'use client'

import { useEffect, useRef, useState } from 'react'

// Parts allow us to highlight individual words in the headline
type HeadlinePart = { text: string; highlight?: boolean }

const EXAMPLE = {
  event: 'El gobierno recorta un 15% el presupuesto de las universidades públicas',
  left: {
    source: 'Página 12',
    color: '#CC0000',
    bgTint: '#fff5f5',
    headline: [
      { text: 'Milei ' },
      { text: 'destruye', highlight: true },
      { text: ' las universidades públicas: el mayor ' },
      { text: 'desfinanciamiento', highlight: true },
      { text: ' en décadas' },
    ] as HeadlinePart[],
    emphasis: 'El impacto en docentes y familias, el deterioro histórico del sistema educativo, las protestas masivas',
    omits: 'El contexto fiscal que motivó el recorte, el déficit universitario previo y el acuerdo con el FMI',
  },
  right: {
    source: 'La Nación',
    color: '#1A3A5C',
    bgTint: '#f5f7fb',
    headline: [
      { text: 'El Gobierno ' },
      { text: 'consolida el superávit', highlight: true },
      { text: ' con una ' },
      { text: 'reforma', highlight: true },
      { text: ' en el gasto universitario' },
    ] as HeadlinePart[],
    emphasis: 'Las metas fiscales, el acuerdo con el FMI, la "responsabilidad presupuestaria" del Ejecutivo',
    omits: 'El impacto real en estudiantes, docentes y familias de bajos ingresos que dependen de la universidad pública',
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

function renderHeadline(parts: HeadlinePart[], color: string) {
  return parts.map((p, i) =>
    p.highlight
      ? <mark key={i} style={{ background: 'none', color, fontWeight: 700, fontStyle: 'inherit' }}>{p.text}</mark>
      : <span key={i}>{p.text}</span>
  )
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
            La misma noticia — distintas versiones
          </p>
          <h2 className="text-3xl md:text-5xl font-serif leading-tight max-w-3xl mb-4" style={{ color: 'var(--ink)', fontWeight: 400 }}>
            Lo que cambia no son los hechos.
            <br />
            <em className="italic" style={{ color: 'var(--ink-dim)' }}>Es cómo cada medio los cuenta.</em>
          </h2>
          <p className="text-base md:text-lg max-w-2xl leading-relaxed mb-16" style={{ color: 'var(--ink-dim)', fontFamily: 'var(--font-fraunces), Georgia, serif' }}>
            La misma noticia puede sonar a avance o a catástrofe según el diario que la publique.
            Esa diferencia forma tu opinión sin que lo notes.
          </p>
        </div>

        {/* The neutral fact */}
        <div
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionDelay: '150ms' }}
        >
          <div className="flex items-start gap-4 mb-0 px-5 py-4" style={{ border: '1px solid var(--line)', borderBottom: 'none', background: 'var(--surface)' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', fontWeight: 600, flexShrink: 0, paddingTop: 3 }}>
              El hecho
            </span>
            <p className="font-serif text-base md:text-lg leading-snug" style={{ color: 'var(--ink)', margin: 0 }}>
              {EXAMPLE.event}
            </p>
          </div>
        </div>

        {/* ── Comparison cards ── */}
        <div
          className={`transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
          style={{ transitionDelay: '280ms' }}
        >
          {/* Desktop: side-by-side with VS divider */}
          <div className="hidden md:grid md:grid-cols-[1fr_52px_1fr]">
            <ComparisonCard side={EXAMPLE.left} />

            {/* VS column */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--line)',
                borderLeft: 'none',
                borderRight: 'none',
                background: 'var(--surface)',
                position: 'relative',
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontFamily: 'var(--font-mono)',
                  fontWeight: 700,
                  letterSpacing: '0.14em',
                  color: 'var(--ink-mute)',
                  writingMode: 'vertical-rl',
                  textOrientation: 'mixed',
                  transform: 'rotate(180deg)',
                  userSelect: 'none',
                }}
              >
                vs
              </span>
            </div>

            <ComparisonCard side={EXAMPLE.right} />
          </div>

          {/* Mobile: stacked */}
          <div className="md:hidden flex flex-col">
            <ComparisonCard side={EXAMPLE.left} />
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                border: '1px solid var(--line)',
                borderTop: 'none',
                borderBottom: 'none',
                background: 'var(--surface)',
              }}
            >
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
              <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 700, letterSpacing: '0.14em', color: 'var(--ink-mute)' }}>vs</span>
              <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
            </div>
            <ComparisonCard side={EXAMPLE.right} />
          </div>
        </div>

        {/* Bottom callout */}
        <div
          className={`mt-10 transition-all duration-700 ease-out ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
          style={{ transitionDelay: '450ms' }}
        >
          <p className="text-sm text-center max-w-xl mx-auto leading-relaxed" style={{ color: 'var(--ink-mute)' }}>
            Cada Lado reúne la cobertura de 12 medios argentinos sobre el mismo hecho —
            para que veas la historia completa y formes tu propia opinión.
          </p>
        </div>
      </div>
    </section>
  )
}

function ComparisonCard({ side }: { side: typeof EXAMPLE.left }) {
  return (
    <div
      style={{
        border: '1px solid var(--line)',
        background: 'var(--surface)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Color bar — top (mobile) or left (desktop) */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          width: 4,
          background: side.color,
        }}
      />

      <div style={{ paddingLeft: 20, paddingRight: 24, paddingTop: 24, paddingBottom: 24 }}>

        {/* Source name */}
        <div style={{ marginBottom: 16 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: side.color,
            }}
          >
            {side.source}
          </span>
        </div>

        {/* Headline — large, italic, with highlighted words */}
        <blockquote
          style={{
            fontFamily: 'var(--font-fraunces), Georgia, serif',
            fontSize: 'clamp(17px, 2.2vw, 22px)',
            fontStyle: 'italic',
            lineHeight: 1.4,
            color: 'var(--ink)',
            margin: '0 0 20px 0',
            padding: 0,
          }}
        >
          "{renderHeadline(side.headline, side.color)}"
        </blockquote>

        {/* Metadata rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Lo que destaca
            </span>
            <p style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.55, margin: 0 }}>{side.emphasis}</p>
          </div>
          <div>
            <span
              style={{
                display: 'block',
                fontSize: 10,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                color: 'var(--ink-mute)',
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              Lo que deja afuera
            </span>
            <p style={{ fontSize: 13, color: 'var(--ink-mute)', lineHeight: 1.55, margin: 0, fontStyle: 'italic' }}>{side.omits}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
