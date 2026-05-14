import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname || '/'

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate(from, { replace: true })
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <span className="text-xl font-bold tracking-widest text-white">POLARIS</span>
          <p className="text-[#555] text-xs tracking-wider uppercase mt-1">Framework</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[#666] uppercase tracking-wider mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white text-sm px-3 py-2 focus:outline-none focus:border-[#ecd987] transition-colors"
              placeholder="usuario@ejemplo.com"
            />
          </div>

          <div>
            <label className="block text-xs text-[#666] uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-[#0a0a0a] border border-[#333] text-white text-sm px-3 py-2 focus:outline-none focus:border-[#ecd987] transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs border border-red-900 bg-red-950/30 px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#ecd987] text-black text-xs font-bold uppercase tracking-widest py-2.5 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p className="text-center text-[#444] text-xs mt-8">
          Acceso restringido — contactá al administrador para obtener acceso.
        </p>
      </div>
    </div>
  )
}
