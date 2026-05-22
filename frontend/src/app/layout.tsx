import type { Metadata } from 'next'
import { Roboto_Slab, Inter } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

// Titular serif: Roboto Slab — peso, autoridad editorial
const robotoSlab = Roboto_Slab({
  subsets: ['latin'],
  variable: '--font-serif-heading',
  weight: ['600', '700'],
  display: 'swap',
})

// UI y cuerpo: Inter — legibilidad digital
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans-body',
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Cada Lado Noticias - La misma noticia, todas las voces',
  description:
    'Compará cómo cada diario argentino cubre la misma noticia. Síntesis neutral + análisis de qué dice y qué omite cada medio.',
  icons: {
    icon: '/CadaLadoLogoCL.png',
    apple: '/CadaLadoLogoCL.png',
  },
  openGraph: {
    title: 'Cada Lado Noticias',
    description: 'La misma noticia, todas las voces. Sin que te vendan humo.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${robotoSlab.variable} ${inter.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
