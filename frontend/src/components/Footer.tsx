import Link from 'next/link'
import Image from 'next/image'
import { Instagram, Facebook, Twitter, Youtube, Send, Github, Linkedin } from 'lucide-react'
import { getNews } from '@/lib/api'

export default async function Footer() {
  let latestNews: { id: number; title: string }[] = []
  try {
    const news = await getNews(1)
    latestNews = news.slice(0, 4).map(n => ({ id: n.id, title: n.title }))
  } catch {}

  const sections = [
    { label: 'Inicio', href: '/' },
    { label: 'Noticias', href: '/noticias' },
    { label: 'Política', href: '/noticias?category=Política' },
    { label: 'Economía', href: '/noticias?category=Economía' },
    { label: 'Sociedad', href: '/noticias?category=Sociedad' },
    { label: 'Deportes', href: '/noticias?category=Deportes' },
    { label: 'Internacional', href: '/noticias?category=Internacional' },
    { label: 'Medios', href: '/fuentes' },
  ]

  const medios = [
    { name: 'Clarín', url: 'https://www.clarin.com' },
    { name: 'La Nación', url: 'https://www.lanacion.com.ar' },
    { name: 'Infobae', url: 'https://www.infobae.com' },
    { name: 'Página 12', url: 'https://www.pagina12.com.ar' },
    { name: 'Ámbito', url: 'https://www.ambito.com' },
    { name: 'El Cronista', url: 'https://www.cronista.com' },
    { name: 'Perfil', url: 'https://www.perfil.com' },
    { name: 'La Izq. Diario', url: 'https://www.laizquierdadiario.com' },
  ]

  return (
    <footer className="bg-cada-dark text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-3 mb-5">
              <div className="bg-white rounded-full p-0.5">
                <Image
                  src="/images/logo-cl.svg"
                  alt="Cada Lado"
                  width={44}
                  height={44}
                  className="object-contain w-11 h-11"
                />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif font-bold text-white text-xl tracking-tight">
                  CADA LADO
                </span>
                <span className="text-gray-400 text-[9px] font-bold tracking-[0.34em] uppercase mt-0.5">
                  Noticias
                </span>
              </div>
            </Link>
            <p className="text-sm text-gray-400 leading-relaxed mb-6">
              La misma noticia, todas las voces. Sin que te vendan humo.
            </p>
            {/* Social icons */}
            <div className="flex gap-3 mb-6">
              {[
                { Icon: Instagram, href: '#', label: 'Instagram' },
                { Icon: Facebook, href: '#', label: 'Facebook' },
                { Icon: Twitter, href: '#', label: 'X/Twitter' },
                { Icon: Youtube, href: '#', label: 'YouTube' },
                { Icon: Send, href: '#', label: 'Telegram' },
                { Icon: Github, href: 'https://github.com/Arkhram-Organization/Cada-Lado-Noticias', label: 'GitHub' },
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} target={href.startsWith('http') ? '_blank' : undefined}
                  rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                  aria-label={label}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <Icon size={14} />
                </a>
              ))}
            </div>

            {/* Equipo */}
            <div>
              <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-2.5 font-semibold">Equipo</p>
              <div className="space-y-2">
                {[
                  { name: 'Theo Trosman', href: 'https://www.linkedin.com/in/theotrosman/' },
                  { name: 'Sebastián Calviño', href: 'https://www.linkedin.com/in/sebasti%C3%A1n-calvi%C3%B1o-99073b302/' },
                ].map(({ name, href }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors">
                    <Linkedin size={13} className="shrink-0 opacity-60" />
                    {name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Últimas noticias */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 pb-2 border-b border-white/10">
              Últimas noticias
            </h3>
            <ul className="space-y-3">
              {latestNews.length > 0 ? latestNews.map(n => (
                <li key={n.id}>
                  <Link href={`/noticias/${n.id}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors leading-snug line-clamp-2 block">
                    {n.title}
                  </Link>
                </li>
              )) : (
                <li><span className="text-sm text-gray-500">Sin noticias aún</span></li>
              )}
            </ul>
          </div>

          {/* Secciones - two column mini-grid */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 pb-2 border-b border-white/10">
              Secciones
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {sections.map(s => (
                <Link key={s.href} href={s.href}
                  className="text-sm text-gray-400 hover:text-white transition-colors">
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Medios monitoreados */}
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4 pb-2 border-b border-white/10">
              Medios monitoreados
            </h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {medios.map(m => (
                <a key={m.name} href={m.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-gray-400 hover:text-white transition-colors">
                  {m.name}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <span>© {new Date().getFullYear()} CADA LADO Noticias · Síntesis generada con IA · Argentina</span>
          <div className="flex gap-4">
            <Link href="#" className="hover:text-gray-300 transition-colors">Acerca de</Link>
            <Link href="#" className="hover:text-gray-300 transition-colors">Términos y Condiciones</Link>
            <Link href="#" className="hover:text-gray-300 transition-colors">Política de privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
