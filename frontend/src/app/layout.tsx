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

export const metadata: Metadata = {
  title: 'Cada Lado Noticias - La misma noticia, todas las voces',
  description:
    'Compará cómo cada diario argentino cubre la misma noticia. Síntesis neutral + análisis de qué dice y qué omite cada medio.',
  icons: {
    icon: '/CadaLadoLogoCL.svg',
    apple: '/CadaLadoLogoCL.svg',
  },
  openGraph: {
    title: 'Cada Lado Noticias',
    description: 'La misma noticia, todas las voces. Sin que te vendan humo.',
    type: 'website',
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
