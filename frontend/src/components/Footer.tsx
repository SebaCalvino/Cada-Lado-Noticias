import Link from 'next/link'
import { Instagram, Facebook, Twitter, Youtube, Send } from 'lucide-react'
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
    <footer className="bg-[#0d1b2a] text-gray-300">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">

          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[#0f172a] border border-white/20 flex items-center justify-center">
                <span className="text-white font-bold text-sm">CL</span>
              </div>
              <span className="text-white font-black text-base tracking-widest uppercase">CADA LADO</span>
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
              ].map(({ Icon, href, label }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
                  <Icon size={14} />
                </a>
              ))}
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
