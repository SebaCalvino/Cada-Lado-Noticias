'use client'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/',         label: 'INICIO' },
  { href: '/noticias', label: 'NOTICIAS' },
  { href: '/fuentes',  label: 'MEDIOS' },
]

export default function Header() {
  const pathname  = usePathname()
  const router    = useRouter()
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setOpen(false)
    setQuery('')
    router.push(`/buscar?q=${encodeURIComponent(q)}`)
  }

  return (
    <header className="bg-white border-b-2 border-cada-dark sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo — isotipo en mobile, completo en desktop */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0">
          <Image
            src="/images/logo-cl.svg"
            alt="CL"
            width={32}
            height={32}
            className="sm:hidden object-contain"
            priority
          />
          <Image
            src="/images/logo-full.svg"
            alt="Cada Lado Noticias"
            width={200}
            height={48}
            className="hidden sm:block object-contain h-10 w-auto"
            priority
          />
        </Link>

        {/* Center: inline search bar (desktop, shown when open) */}
        {open && (
          <form
            onSubmit={handleSubmit}
            className="hidden sm:flex flex-1 mx-6 items-center gap-2"
          >
            <input
              autoFocus
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscá un tema, persona o evento…"
              style={{
                flex:        1,
                height:      34,
                padding:     '0 12px',
                fontSize:    13,
                fontFamily:  'var(--font-mono)',
                border:      '1.5px solid var(--ink)',
                background:  'var(--bg)',
                color:       'var(--ink)',
                outline:     'none',
                borderRadius: 0,
              }}
            />
            <button
              type="submit"
              style={{
                height:      34,
                padding:     '0 14px',
                fontSize:    12,
                fontFamily:  'var(--font-mono)',
                fontWeight:  700,
                letterSpacing: '0.08em',
                background:  'var(--ink)',
                color:       'var(--bg)',
                border:      'none',
                cursor:      'pointer',
              }}
            >
              Buscar
            </button>
          </form>
        )}

        <nav className={cn('flex items-center', open && 'sm:hidden')}>
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

        {/* Search toggle — desktop: expand inline / mobile: go to /buscar */}
        <div className="flex items-center">
          {/* Mobile: direct link to search page */}
          <Link
            href="/buscar"
            className="sm:hidden p-2 text-gray-500 hover:text-cada-dark transition-colors"
            aria-label="Buscar"
          >
            <Search size={18} />
          </Link>

          {/* Desktop: toggle inline search bar */}
          <button
            onClick={() => { setOpen(v => !v); setQuery('') }}
            className="hidden sm:flex p-2 text-gray-500 hover:text-cada-dark transition-colors"
            aria-label={open ? 'Cerrar búsqueda' : 'Buscar'}
          >
            {open ? <X size={18} /> : <Search size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
