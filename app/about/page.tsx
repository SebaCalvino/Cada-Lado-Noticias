/**
 * /about — Qué es Cada Lado y cómo funciona.
 */

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Acerca de — Cada Lado Noticias',
  description: 'Cómo Cada Lado detecta y analiza múltiples versiones de la misma noticia en los medios argentinos.',
}

export default function AboutPage() {
  return (
    <div style={{ background: 'var(--bg)', minHeight: '80vh' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 80px' }}>

        {/* Back nav */}
        <div style={{ borderBottom: '1px solid var(--line)', paddingTop: 12, paddingBottom: 12, marginBottom: 0 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontFamily: 'var(--font-mono)',
              color: 'var(--ink-mute)', letterSpacing: '0.06em', textDecoration: 'none',
            }}
            className="hover:text-[var(--ink)] transition-colors"
          >
            <ArrowLeft size={12} />
            Inicio
          </Link>
        </div>

        {/* Header */}
        <div style={{ paddingTop: 36, paddingBottom: 24, borderBottom: '2px solid var(--ink)', marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-mute)', marginBottom: 12 }}>
            Acerca de
          </p>
          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 'clamp(28px, 5vw, 44px)', fontWeight: 400, lineHeight: 1.15, letterSpacing: '-0.02em', color: 'var(--ink)', margin: 0 }}>
            No mostramos noticias.<br />
            Mostramos versiones de la realidad.
          </h1>
        </div>

        {/* Body */}
        <div style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink-2)' }}>

          <Section title="¿Qué es Cada Lado?">
            <p>
              Cada Lado es un sistema automatizado que monitorea los principales medios argentinos en tiempo real,
              identifica cuándo distintos diarios están cubriendo <em>el mismo hecho</em>, y construye una comparación
              que muestra cómo cada uno lo cuenta.
            </p>
            <p>
              No somos un medio de comunicación. No producimos periodismo. Producimos <strong>análisis de la cobertura periodística</strong>:
              qué eligió destacar cada medio, qué omitió, qué palabras usó y desde qué perspectiva lo enmarcó.
            </p>
          </Section>

          <Section title="El problema que resolvemos">
            <p>
              Cuando ocurre un hecho relevante en Argentina, la misma noticia puede aparecer titulada de docenas de
              formas distintas según el medio. Un recorte presupuestario puede ser &ldquo;ajuste necesario&rdquo; o
              &ldquo;desfinanciamiento deliberado&rdquo;. Una manifestación puede ser &ldquo;protestas violentas&rdquo;
              o &ldquo;movilización histórica&rdquo;.
            </p>
            <p>
              Cada elección editorial —qué palabras usar, qué fuentes citar, qué datos incluir— construye una versión
              diferente de los hechos. Cada Lado hace esa diferencia visible, sin tomar partido.
            </p>
          </Section>

          <Section title="Cómo funciona">
            <p>
              El sistema opera en cuatro etapas automáticas que se ejecutan cada 30 minutos:
            </p>
            <ol style={{ paddingLeft: 20, marginTop: 12 }}>
              {[
                ['Scraping', 'Obtenemos los titulares y resúmenes de los RSS feeds de 12+ medios argentinos.'],
                ['Clustering', 'Agrupamos artículos que tratan el mismo hecho usando análisis TF-IDF + validación con IA (Groq).'],
                ['Síntesis', 'Una IA genera una síntesis neutral del hecho y analiza qué enfatiza y qué omite cada medio.'],
                ['Publicación', 'Solo los clusters con síntesis completa y validada son visibles en el sitio.'],
              ].map(([step, desc]) => (
                <li key={step} style={{ marginBottom: 12 }}>
                  <strong style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.06em' }}>
                    {step}
                  </strong>
                  <span style={{ color: 'var(--ink-2)' }}> — {desc}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Qué mostramos por noticia">
            <p>Por cada hecho cubierto por múltiples medios, el sitio muestra:</p>
            <ul style={{ paddingLeft: 20, marginTop: 12 }}>
              {[
                'Los titulares de cada medio, lado a lado',
                'Cómo evolucionó el relato a lo largo del día (cuando hay datos de tiempo)',
                'El espectro político de los medios que cubrieron la historia (en noticias de política)',
                'Lo que todos los medios coinciden en reportar',
                'Una síntesis neutral del hecho',
                'Qué enfatizó y qué omitió cada medio',
              ].map((item) => (
                <li key={item} style={{ marginBottom: 8, color: 'var(--ink-2)' }}>{item}</li>
              ))}
            </ul>
          </Section>

          <Section title="Lo que no somos">
            <p>
              Cada Lado <strong>no es</strong> un fact-checker ni arbitra quién tiene razón. No editamos ni
              modificamos los titulares originales. No tenemos periodistas. No tomamos posición política.
            </p>
            <p>
              Los análisis de énfasis y omisiones son generados por IA a partir de los textos originales y deben
              tomarse como aproximaciones, no como juicios editoriales definitivos.
            </p>
          </Section>

          <Section title="Medios monitoreados">
            <p>
              Actualmente monitoreamos: Clarín, La Nación, Infobae, Página 12, Ámbito, El Cronista, Perfil,
              La Izquierda Diario, TN, El Destape, MDZ Online y Minuto Uno.
            </p>
            <p>
              <Link href="/fuentes" style={{ color: 'var(--cada-blue)', textDecoration: 'none' }}
                className="hover:underline">
                Ver perfil completo de cada fuente →
              </Link>
            </p>
          </Section>

        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{
        fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)',
        marginBottom: 16, paddingBottom: 10, borderBottom: '1px solid var(--line)',
      }}>
        {title}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  )
}
