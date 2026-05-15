import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'

const AuthContext = createContext(null)
const AUTH_TIMEOUT_MS = 8000

function withTimeout(promise, timeoutMs) {
  let timeoutId
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Auth timeout')), timeoutMs)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
}

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const setUser = useAppStore((s) => s.setUser)
  const setSession = useAppStore((s) => s.setSession)

  useEffect(() => {
    let alive = true

    async function loadSession() {
      try {
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), AUTH_TIMEOUT_MS)
        if (!alive) return
        setSession(session)
        setUser(session?.user ?? null)
        setError(null)
      } catch (err) {
        if (!alive) return
        setSession(null)
        setUser(null)
        setError(err.message || 'Auth failed')
      } finally {
        if (alive) setLoading(false)
      }
    }

    loadSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => {
      alive = false
      subscription.unsubscribe()
    }
  }, [setUser, setSession])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-[#888] text-sm tracking-widest uppercase">Cargando...</span>
      </div>
    )
  }

  return <AuthContext.Provider value={{ error }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
