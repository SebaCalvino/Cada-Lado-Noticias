'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, Check, ArrowRight } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function RegisterPage() {
  const { register } = useAuth()
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const passwordStrong = password.length >= 6

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return }
    if (!passwordStrong) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Error al registrarse')
    } finally {
      setLoading(false)
    }
  }

  const PERKS = [
    'Síntesis neutral de 12 medios argentinos',
    'Alertas de noticias relevantes',
    'Análisis de sesgo por fuente',
    'Acceso total, sin cargo',
  ]

  return (
    <div className="min-h-[calc(100vh-64px)] flex">

      {/* Left panel — brand */}
      <div className="hidden lg:flex lg:w-[45%] bg-[#0b1120] flex-col justify-between p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'repeating-linear-gradient(90deg,rgba(255,255,255,0.8) 0,rgba(255,255,255,0.8) 1px,transparent 1px,transparent 100px)',
          }}
        />
        <div className="relative z-10">
          <Image src="/images/logo-full.svg" alt="Cada Lado" width={180} height={48} className="object-contain h-10 w-auto" />
        </div>
        <div className="relative z-10 space-y-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-cada-blue-bright">
            ¿Por qué unirte?
          </p>
          <ul className="space-y-3">
            {PERKS.map((perk, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-cada-blue/20 border border-cada-blue/40 flex items-center justify-center">
                  <Check size={11} className="text-cada-blue-bright" />
                </span>
                {perk}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative z-10 text-xs text-gray-600 font-mono">
          Gratis · Sin publicidad · Sin algoritmos
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
            <div className="h-1 bg-gradient-to-r from-cada-blue via-cada-blue-bright to-[#7C3AED]" />

            <div className="p-8 sm:p-10">
              <div className="mb-8">
                <h1 className="font-serif font-bold text-2xl text-gray-900 mb-1">
                  Crear cuenta
                </h1>
                <p className="text-sm text-gray-400">
                  Únite a Cada Lado — es gratis
                </p>
              </div>

              {error && (
                <div className="mb-6 flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
                  <span className="shrink-0 mt-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">!</span>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Nombre</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full border-2 border-gray-100 focus:border-cada-blue rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Email</label>
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
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      className="w-full border-2 border-gray-100 focus:border-cada-blue rounded-xl px-4 py-3 pr-11 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {password && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div className={`h-1 flex-1 rounded-full transition-colors ${passwordStrong ? 'bg-emerald-400' : 'bg-red-300'}`} />
                      <span className={`text-[10px] font-semibold ${passwordStrong ? 'text-emerald-500' : 'text-red-400'}`}>
                        {passwordStrong ? 'OK' : 'Muy corta'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Confirmar contraseña</label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className={`w-full border-2 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors placeholder:text-gray-300 ${
                      confirm && confirm !== password ? 'border-red-300' : 'border-gray-100 focus:border-cada-blue'
                    }`}
                    placeholder="Repetí tu contraseña"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-cada-blue text-white font-bold py-3.5 rounded-xl hover:bg-cada-blue-bright transition-colors disabled:opacity-60 text-sm tracking-wide mt-2"
                >
                  {loading ? 'Creando cuenta...' : (
                    <>Crear cuenta <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                <p className="text-sm text-gray-400">
                  ¿Ya tenés cuenta?{' '}
                  <Link href="/login" className="text-cada-blue font-semibold hover:underline">
                    Iniciá sesión
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
