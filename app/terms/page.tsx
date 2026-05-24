/**
 * /terms — Condiciones de uso y descargo de responsabilidad.
 */

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Términos de uso — Cada Lado Noticias',
  description: 'Condiciones de uso del sistema automatizado de análisis de cobertura informativa Cada Lado.',
}

export default function TermsPage() {
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
            Términos de uso
          </p>
          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, lineHeight: 1.2, color: 'var(--ink)', margin: 0 }}>
            Sistema automatizado de análisis de cobertura
          </h1>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink-2)' }}>

          <Section title="Naturaleza del servicio">
            <p>
              Cada Lado es un sistema <strong>completamente automatizado</strong>. El contenido publicado en este
              sitio —títulares, síntesis, análisis de énfasis y omisiones— es generado por algoritmos de procesamiento
              de lenguaje natural (TF-IDF, IA generativa vía Groq) sin intervención editorial humana.
            </p>
            <p>
              No somos un medio de comunicación, una agencia de noticias ni una publicación periodística. Somos
              una herramienta de análisis que procesa y compara información disponible públicamente.
            </p>
          </Section>

          <Section title="Descargo de responsabilidad">
            <p>
              El contenido de este sitio tiene carácter informativo y analítico. No garantizamos la exactitud,
              completitud o actualidad de la información procesada. Los análisis generados por IA pueden contener
              errores, simplificaciones o interpretaciones incorrectas.
            </p>
            <p>
              Los titulares originales reproducidos pertenecen a sus respectivos medios. Las síntesis y análisis
              son transformaciones automatizadas de ese contenido y no representan la posición editorial de ningún
              medio ni de los autores del sistema.
            </p>
          </Section>

          <Section title="Uso de los títulares originales">
            <p>
              Este sitio reproduce títulares y fragmentos de artículos periodísticos en el marco del análisis
              comparativo. Entendemos este uso como una referencia transformativa orientada a la crítica mediática
              y al interés público. No almacenamos artículos completos ni reemplazamos el acceso a las fuentes originales.
            </p>
            <p>
              Si sos representante de un medio y tenés objeciones sobre el uso de tu contenido, podés contactarnos
              para resolver la situación.
            </p>
          </Section>

          <Section title="Limitación de responsabilidad">
            <p>
              El uso de este sitio es bajo tu propia responsabilidad. No somos responsables por decisiones tomadas
              en base al contenido aquí publicado. La información debe ser verificada en las fuentes originales.
            </p>
          </Section>

          <Section title="Modificaciones">
            <p>
              Estos términos pueden actualizarse sin previo aviso. El uso continuado del sitio implica la aceptación
              de los términos vigentes.
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
