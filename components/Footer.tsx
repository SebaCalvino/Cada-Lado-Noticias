import Link from 'next/link'
import Image from 'next/image'
import { Github, Linkedin } from 'lucide-react'
import { getNewsClustersServer } from '@/lib/queries'

export default async function Footer() {
  let latestNews: { id: number; title: string }[] = []
  try {
    const clusters = await getNewsClustersServer(1, 4)
    latestNews = clusters.map(c => ({ id: c.id, title: c.title }))
  } catch {}

  const sections = [
    { label: 'Inicio',        href: '/' },
    { label: 'Noticias',      href: '/noticias' },
    { label: 'Política',      href: '/noticias?category=Política' },
    { label: 'Economía',      href: '/noticias?category=Economía' },
    { label: 'Sociedad',      href: '/noticias?category=Sociedad' },
    { label: 'Deportes',      href: '/noticias?category=Deportes' },
    { label: 'Internacional', href: '/noticias?category=Internacional' },
    { label: 'Medios',        href: '/fuentes' },
  ]

  const medios = [
    { name: 'Clarín',         url: 'https://www.clarin.com' },
    { name: 'La Nación',      url: 'https://www.lanacion.com.ar' },
    { name: 'Infobae',        url: 'https://www.infobae.com' },
    { name: 'Página 12',      url: 'https://www.pagina12.com.ar' },
    { name: 'Ámbito',         url: 'https://www.ambito.com' },
    { name: 'El Cronista',    url: 'https://www.cronista.com' },
    { name: 'Perfil',         url: 'https://www.perfil.com' },
    { name: 'La Izq. Diario', url: 'https://www.laizquierdadiario.com' },
  ]

  return (
    <footer className="bg-cada-dark">
      <style>{`
        .footer-link { font-size: 13px; color: #8a8580; transition: color 0.15s; }
        .footer-link:hover { color: #fff; }
        .footer-icon-btn { width:34px; height:34px; display:flex; align-items:center; justify-content:center; border:1px solid rgba(255,255,255,0.12); color:#8a8580; transition: border-color 0.15s, color 0.15s; }
        .footer-icon-btn:hover { border-color: rgba(255,255,255,0.32); color: #fff; }
        .footer-bottom-link { font-size: 12px; color: #5a5652; transition: color 0.15s; }
        .footer-bottom-link:hover { color: #d1cdc7; }
      `}</style>

      {/* Main footer grid */}
      <div className="max-w-6xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand column */}
          <div className="md:col-span-1">
            <Link href="/" className="inline-block mb-5">
              <Image
                src="/images/logo-full.svg"
                alt="Cada Lado Noticias"
                width={160}
                height={40}
                className="object-contain h-8 w-auto opacity-80 hover:opacity-100 transition-opacity brightness-0 invert"
              />
            </Link>
            <p style={{ fontSize: 14, color: '#8a8580', lineHeight: 1.65, marginBottom: 20 }}>
              La misma noticia, todas las voces.
              Sin que te vendan humo.
            </p>

            {/* GitHub + LinkedIn */}
            <div className="flex gap-2">
              <a
                href="https://github.com/Arkhram-Organization/Cada-Lado-Noticias"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="footer-icon-btn"
              >
                <Github size={15} />
              </a>
              <a
                href="https://www.linkedin.com/in/theotrosman"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="footer-icon-btn"
              >
                <Linkedin size={15} />
              </a>
            </div>
          </div>

          {/* Últimas noticias */}
          <div>
            <FooterHeading>Últimas noticias</FooterHeading>
            <ul className="space-y-3">
              {latestNews.length > 0 ? latestNews.map(n => (
                <li key={n.id}>
                  <Link href={`/noticias/${n.id}`} className="footer-link block leading-snug line-clamp-2">
                    {n.title}
                  </Link>
                </li>
              )) : (
                <li><span style={{ fontSize: 13, color: '#5a5652' }}>Sin noticias aún</span></li>
              )}
            </ul>
          </div>

          {/* Secciones */}
          <div>
            <FooterHeading>Secciones</FooterHeading>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {sections.map(s => (
                <Link key={s.href} href={s.href} className="footer-link">
                  {s.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Medios monitoreados */}
          <div>
            <FooterHeading>Medios monitoreados</FooterHeading>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
              {medios.map(m => (
                <a key={m.name} href={m.url} target="_blank" rel="noopener noreferrer" className="footer-link">
                  {m.name}
                </a>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* Bottom bar */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span style={{ fontSize: 12, color: '#5a5652' }}>
            © {new Date().getFullYear()} CADA LADO Noticias · Síntesis generada con IA · Argentina
          </span>
          <div className="flex gap-5">
            <Link href="#" className="footer-bottom-link">Acerca de</Link>
            <Link href="#" className="footer-bottom-link">Términos</Link>
            <Link href="#" className="footer-bottom-link">Privacidad</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: '#fff',
        fontWeight: 600,
        marginBottom: 16,
        paddingBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {children}
    </h3>
  )
}
