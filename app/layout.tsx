import type { Metadata } from 'next'
import { Fraunces, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Titular editorial: Fraunces — serif variable con personalidad sin ser excesivo
const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK'],
  display: 'swap',
})

// UI y cuerpo: Inter — legibilidad digital
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans-body',
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
})

// Etiquetas y metadatos: JetBrains Mono — claridad técnica sin agresividad
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500', '600'],
  display: 'swap',
})

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://cada-lado-noticias.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Cada Lado Noticias — La misma noticia, todas las voces',
    template: '%s — Cada Lado',
  },
  description:
    'Compará cómo cada diario argentino cubre la misma noticia. Síntesis neutral + análisis de qué dice y qué omite cada medio.',
  icons: {
    icon: '/images/logo-cl.svg',
    apple: '/images/logo-cl.svg',
  },
  openGraph: {
    title:       'Cada Lado Noticias',
    description: 'La misma noticia, todas las voces. Sin que te vendan humo.',
    url:         SITE_URL,
    siteName:    'Cada Lado Noticias',
    locale:      'es_AR',
    type:        'website',
    images: [
      {
        url:    `${SITE_URL}/api/og`,
        width:  1200,
        height: 630,
        alt:    'Cada Lado Noticias',
      },
    ],
  },
  twitter: {
    card:        'summary_large_image',
    title:       'Cada Lado Noticias',
    description: 'La misma noticia, todas las voces.',
    images:      [`${SITE_URL}/api/og`],
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
