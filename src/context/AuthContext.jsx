import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAppStore } from '../stores/appStore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true)
  const setUser = useAppStore((s) => s.setUser)
  const setSession = useAppStore((s) => s.setSession)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [setUser, setSession])

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <span className="text-[#888] text-sm tracking-widest uppercase">Cargando...</span>
      </div>
    )
  }

  return <AuthContext.Provider value={{}}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
