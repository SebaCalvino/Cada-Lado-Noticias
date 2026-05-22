'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/', label: 'INICIO' },
  { href: '/noticias', label: 'NOTICIAS' },
  { href: '/fuentes', label: 'MEDIOS' },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="bg-white border-b-2 border-gray-900 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#0f172a] flex items-center justify-center">
            <span className="text-white font-bold text-xs tracking-tight">CL</span>
          </div>
          <span className="font-sans font-black text-base tracking-widest text-gray-900 uppercase hidden sm:block">
            CADA LADO
          </span>
        </Link>

        <nav className="flex items-center gap-0.5">
          {NAV.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[13px] font-semibold tracking-wide transition-colors',
                pathname === href
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
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
