import type { Metadata } from 'next'
import { Inter, Playfair_Display } from 'next/font/google'
import './globals.css'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair' })

export const metadata: Metadata = {
  title: 'Cada Lado Noticias - La misma noticia, todas las voces',
  description:
    'Compará cómo cada diario argentino cubre la misma noticia. Síntesis neutral + análisis de qué dice y qué omite cada medio.',
  openGraph: {
    title: 'Cada Lado Noticias',
    description: 'La misma noticia, todas las voces. Sin que te vendan humo.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
