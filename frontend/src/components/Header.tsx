'use client'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, User, LogOut, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/AuthContext'

const NAV = [
  { href: '/',         label: 'INICIO' },
  { href: '/noticias', label: 'NOTICIAS' },
  { href: '/fuentes',  label: 'MEDIOS' },
]

export default function Header() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, notifications, unreadCount, logout, markAllRead } = useAuth()
  const [bellOpen, setBellOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const userRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setBellOpen(false)
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleBellClick = () => {
    setBellOpen(v => !v)
    if (!bellOpen && unreadCount > 0) {
      setTimeout(markAllRead, 2000)
    }
  }

  return (
    <header className="bg-white border-b-2 border-cada-dark sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
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

        {/* Nav */}
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

        {/* Right side: bell + auth */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Bell */}
          <div ref={bellRef} className="relative">
            <button
              onClick={handleBellClick}
              className="relative p-2 rounded-full text-gray-500 hover:text-cada-dark hover:bg-gray-100 transition-colors"
              aria-label="Notificaciones"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center leading-none">
                  {unreadCount}
                </span>
              )}
            </button>

            {bellOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-900">Notificaciones</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-cada-blue hover:underline">
                      Marcar todas como leídas
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No tenés notificaciones todavía
                  </div>
                ) : (
                  <ul className="max-h-72 overflow-y-auto divide-y divide-gray-50">
                    {notifications.map(n => (
                      <li key={n.id} className={cn('px-4 py-3 text-sm', n.read ? 'text-gray-500' : 'text-gray-800 bg-blue-50/40 font-medium')}>
                        <div className="flex items-start gap-2">
                          {!n.read && <span className="mt-1.5 w-2 h-2 rounded-full bg-cada-blue shrink-0" />}
                          <span className={n.read ? 'ml-4' : ''}>{n.text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Auth area */}
          {user ? (
            <div ref={userRef} className="relative">
              <button
                onClick={() => setUserOpen(v => !v)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 hover:border-gray-300 text-sm font-medium text-gray-700 transition-colors"
              >
                <User size={15} />
                <span className="hidden sm:inline max-w-[120px] truncate">{user.name}</span>
                <ChevronDown size={13} />
              </button>
              {userOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-xs text-gray-400">Sesión iniciada como</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { logout(); setUserOpen(false) }}
                    className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={14} />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-[13px] font-semibold text-gray-600 hover:text-cada-dark transition-colors px-3 py-1.5"
              >
                Iniciar sesión
              </Link>
              <Link
                href="/registro"
                className="text-[13px] font-bold bg-cada-blue text-white px-4 py-1.5 hover:bg-cada-blue-bright transition-colors"
              >
                Registrarse
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
