'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',         label: 'INICIO' },
  { href: '/noticias', label: 'NOTICIAS' },
  { href: '/fuentes',  label: 'MEDIOS' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b-2 border-cada-dark sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo — isotipo en mobile, completo en desktop */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          {/* Mobile: solo isotipo circular */}
          <Image
            src="/CadaLadoLogoCL.png"
            alt="CL"
            width={32}
            height={32}
            className="sm:hidden object-contain"
            priority
          />
          {/* Desktop: logo horizontal completo */}
          <Image
            src="/CadaLadoLogoCompleto.png"
            alt="Cada Lado Noticias"
            width={180}
            height={44}
            className="hidden sm:block object-contain h-10 w-auto"
            priority
          />
        </Link>

        <nav className="flex items-center">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-4 text-[13px] font-semibold tracking-wide transition-colors border-b-2',
                pathname === href
                  ? 'text-cada-blue border-cada-blue'
                  : 'text-gray-500 border-transparent hover:text-cada-dark hover:border-gray-300'
              )}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
