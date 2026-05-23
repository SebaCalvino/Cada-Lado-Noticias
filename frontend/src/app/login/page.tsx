'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex">

      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0b1120] flex-col justify-between p-12 relative overflow-hidden">
        {/* Grid lines */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.8) 0,rgba(255,255,255,0.8) 1px,transparent 1px,transparent 100px)',
          }}
        />
        <div className="relative z-10">
          <Image src="/images/logo-full.svg" alt="Cada Lado" width={180} height={48} className="object-contain h-10 w-auto" />
        </div>
        <div className="relative z-10">
          <blockquote className="text-3xl font-serif font-bold text-white leading-tight mb-5">
            "La misma noticia,<br />todas las voces."
          </blockquote>
          <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
            12 medios argentinos analizados con IA — sin que ningún relato te manipule.
          </p>
        </div>
        <div className="relative z-10 flex gap-2">
          {['Clarín', 'La Nación', 'Infobae', 'Página 12', 'TN'].map(m => (
            <span key={m} className="text-[10px] text-gray-600 bg-white/5 border border-white/10 px-2 py-1 font-mono">
              {m}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 bg-gray-50">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Image src="/images/logo-full.svg" alt="Cada Lado" width={160} height={44} className="h-9 w-auto" />
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Top accent bar */}
            <div className="h-1 bg-gradient-to-r from-cada-blue via-cada-blue-bright to-[#7C3AED]" />

            <div className="p-8 sm:p-10">
              <div className="mb-8">
                <h1 className="font-serif font-bold text-2xl text-gray-900 mb-1">
                  Bienvenido de nuevo
                </h1>
                <p className="text-sm text-gray-400">
                  Iniciá sesión para acceder a tu cuenta
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">!</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="w-full border-2 border-gray-100 focus:border-cada-blue rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                    placeholder="tu@email.com"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                    Contraseña
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border-2 border-gray-100 focus:border-cada-blue rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                      placeholder="Tu contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-cada-blue text-white font-bold py-3.5 rounded-xl hover:bg-cada-blue-bright transition-colors disabled:opacity-60 mt-2 text-sm tracking-wide"
                >
                  {loading ? 'Ingresando...' : (
                    <>Ingresar <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-400">
                  ¿No tenés cuenta?{' '}
                  <Link href="/registro" className="text-cada-blue font-semibold hover:underline">
                    Registrate gratis
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
