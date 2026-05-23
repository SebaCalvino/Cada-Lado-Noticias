'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface User {
  email: string
  name: string
}

interface Notification {
  id: string
  text: string
  read: boolean
  createdAt: string
}

interface AuthContextValue {
  user: User | null
  notifications: Notification[]
  unreadCount: number
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  markAllRead: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])

  useEffect(() => {
    const stored = localStorage.getItem('cl_user')
    if (stored) {
      try { setUser(JSON.parse(stored)) } catch {}
    }
    const storedNotifs = localStorage.getItem('cl_notifs')
    if (storedNotifs) {
      try { setNotifications(JSON.parse(storedNotifs)) } catch {}
    }
  }, [])

  const saveNotifications = (notifs: Notification[]) => {
    setNotifications(notifs)
    localStorage.setItem('cl_notifs', JSON.stringify(notifs))
  }

  const login = useCallback(async (email: string, password: string) => {
    const stored = localStorage.getItem(`cl_account_${email}`)
    if (!stored) throw new Error('No existe una cuenta con ese email')
    const account = JSON.parse(stored)
    if (account.password !== password) throw new Error('Contraseña incorrecta')
    const u: User = { email, name: account.name }
    setUser(u)
    localStorage.setItem('cl_user', JSON.stringify(u))
    const welcome: Notification = {
      id: Date.now().toString(),
      text: `¡Bienvenido de nuevo, ${account.name}! Hay nuevas noticias para vos.`,
      read: false,
      createdAt: new Date().toISOString(),
    }
    saveNotifications([welcome])
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (localStorage.getItem(`cl_account_${email}`)) {
      throw new Error('Ya existe una cuenta con ese email')
    }
    localStorage.setItem(`cl_account_${email}`, JSON.stringify({ name, email, password }))
    const u: User = { email, name }
    setUser(u)
    localStorage.setItem('cl_user', JSON.stringify(u))
    const welcome: Notification = {
      id: Date.now().toString(),
      text: `¡Bienvenido a Cada Lado, ${name}! Tu cuenta fue creada exitosamente.`,
      read: false,
      createdAt: new Date().toISOString(),
    }
    saveNotifications([welcome])
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem('cl_user')
  }, [])

  const markAllRead = useCallback(() => {
    const updated = notifications.map(n => ({ ...n, read: true }))
    saveNotifications(updated)
  }, [notifications])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <AuthContext.Provider value={{ user, notifications, unreadCount, login, register, logout, markAllRead }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
