/**
 * /privacy — Política de privacidad y datos.
 */

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const metadata = {
  title: 'Privacidad — Cada Lado Noticias',
  description: 'Política de privacidad de Cada Lado: qué datos recopilamos, cómo los usamos y cómo los protegemos.',
}

export default function PrivacyPage() {
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
            Privacidad
          </p>
          <h1 style={{ fontFamily: 'var(--font-fraunces), Georgia, serif', fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 400, lineHeight: 1.2, color: 'var(--ink)', margin: 0 }}>
            Cómo manejamos los datos
          </h1>
        </div>

        <div style={{ fontSize: 16, lineHeight: 1.8, color: 'var(--ink-2)' }}>

          <Section title="Datos que recopilamos">
            <p>
              <strong>Datos de los medios (scraped content):</strong> Obtenemos títulares, resúmenes y URLs de los
              RSS feeds públicos de los medios monitoreados. No almacenamos artículos completos.
            </p>
            <p>
              <strong>Datos de uso:</strong> Como toda aplicación web, el servidor registra automáticamente
              direcciones IP, URLs solicitadas y tiempos de respuesta en los logs estándar de Vercel. Estos logs
              se usan exclusivamente para diagnóstico y no son compartidos con terceros.
            </p>
            <p>
              <strong>No usamos cookies de tracking ni analytics de terceros</strong> (sin Google Analytics,
              sin Meta Pixel, sin ningún sistema de rastreo conductual).
            </p>
          </Section>

          <Section title="Scrapers y feeds RSS">
            <p>
              El sistema accede a los RSS feeds públicos de los medios argentinos monitoreados cada 30 minutos.
              Los feeds RSS son mecanismos de distribución estándar diseñados para ser consumidos por terceros.
              No realizamos scraping agresivo ni accedemos a contenido detrás de paywalls.
            </p>
          </Section>

          <Section title="APIs de terceros">
            <p>
              Para la generación de síntesis y análisis utilizamos la API de <strong>Groq</strong>
              (proveedor de inferencia de LLMs). Los artículos procesados son enviados a Groq para análisis.
              Consultá la{' '}
              <a href="https://groq.com/privacy-policy/" target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--cada-blue)', textDecoration: 'none' }}
                className="hover:underline">
                política de privacidad de Groq
              </a>{' '}
              para más información.
            </p>
            <p>
              La base de datos está alojada en <strong>Neon (PostgreSQL)</strong>. El hosting es provisto por
              <strong> Vercel</strong>. Ambos servicios tienen sus propias políticas de privacidad y seguridad.
            </p>
          </Section>

          <Section title="Retención de datos">
            <p>
              Los artículos scrapeados y los clusters generados se conservan indefinidamente para mantener el
              historial de cobertura. No existe actualmente un mecanismo de borrado automático por antigüedad.
            </p>
          </Section>

          <Section title="Tus derechos">
            <p>
              Este sitio no recopila datos personales de usuarios. No hay cuentas, no hay formularios de registro,
              no hay historial de navegación guardado. No tenemos datos personales tuyos que eliminar o entregar.
            </p>
          </Section>

          <Section title="Contacto">
            <p>
              Si tenés preguntas o preocupaciones sobre privacidad, podés contactarnos a través del repositorio
              de GitHub del proyecto.
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
