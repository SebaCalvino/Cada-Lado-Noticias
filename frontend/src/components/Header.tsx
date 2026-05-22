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
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo: isotipo circular CL + wordmark */}
        <Link href="/" className="flex items-center gap-3 shrink-0 group">
          <Image
            src="/images/logo-cl.svg"
            alt="Cada Lado"
            width={40}
            height={40}
            className="object-contain w-10 h-10"
            priority
          />
          <div className="hidden sm:flex flex-col leading-none">
            <span className="font-serif font-bold text-cada-dark text-xl tracking-tight">
              CADA LADO
            </span>
            <span className="text-cada-blue text-[9px] font-bold tracking-[0.34em] uppercase mt-0.5">
              Noticias
            </span>
          </div>
        </Link>

        <nav className="flex items-center">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3.5 py-5 text-[13px] font-semibold tracking-wide transition-colors border-b-[3px] -mb-[2px]',
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
