import { useState, useEffect } from 'react'
import { useAppStore } from '../stores/appStore'

export default function AdminPage() {
  const user = useAppStore((s) => s.user)
  const session = useAppStore((s) => s.session)

  const [email, setEmail] = useState('')
  const [status, setStatus] = useState(null) // { type: 'success' | 'error', message: string }
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoadingUsers(true)
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (res.ok) setUsers(data.users || [])
    } catch {
      // silently ignore
    } finally {
      setLoadingUsers(false)
    }
  }

  async function handleInvite(e) {
    e.preventDefault()
    setStatus(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus({ type: 'error', message: data.error || 'Error al invitar usuario' })
      } else {
        setStatus({ type: 'success', message: `Invitación enviada a ${email}` })
        setEmail('')
        fetchUsers()
      }
    } catch {
      setStatus({ type: 'error', message: 'Error de conexión con el servidor' })
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteUser(userId) {
    if (!confirm('¿Eliminar este usuario?')) return

    try {
      const res = await fetch(`/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId))
      } else {
        const data = await res.json()
        alert(data.error || 'Error al eliminar usuario')
      }
    } catch {
      alert('Error de conexión con el servidor')
    }
  }

  return (
    <div className="min-h-screen bg-black pt-20 px-4">
      <div className="max-w-2xl mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-white text-lg font-bold tracking-widest uppercase">Panel de Admin</h1>
          <p className="text-[#555] text-xs mt-1">Sesión: {user?.email}</p>
        </div>

        {/* Invite form */}
        <div className="border border-[#222] p-6 mb-8">
          <h2 className="text-[#888] text-xs uppercase tracking-wider mb-4">Invitar nuevo usuario</h2>
          <form onSubmit={handleInvite} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="email@ejemplo.com"
              className="flex-1 bg-[#0a0a0a] border border-[#333] text-white text-sm px-3 py-2 focus:outline-none focus:border-[#ecd987] transition-colors"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[#ecd987] text-black text-xs font-bold uppercase tracking-widest px-5 py-2 hover:bg-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? 'Enviando...' : 'Invitar'}
            </button>
          </form>

          {status && (
            <p
              className={`text-xs mt-3 px-3 py-2 border ${
                status.type === 'success'
                  ? 'text-green-400 border-green-900 bg-green-950/30'
                  : 'text-red-400 border-red-900 bg-red-950/30'
              }`}
            >
              {status.message}
            </p>
          )}
        </div>

        {/* User list */}
        <div className="border border-[#222] p-6">
          <h2 className="text-[#888] text-xs uppercase tracking-wider mb-4">Usuarios registrados</h2>

          {loadingUsers ? (
            <p className="text-[#444] text-xs">Cargando...</p>
          ) : users.length === 0 ? (
            <p className="text-[#444] text-xs">No hay usuarios.</p>
          ) : (
            <div className="space-y-2">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0"
                >
                  <div>
                    <p className="text-white text-sm">{u.email}</p>
                    <p className="text-[#555] text-xs">
                      {u.app_metadata?.role === 'admin' ? 'Admin' : 'Usuario'} ·{' '}
                      {u.email_confirmed_at ? 'Confirmado' : 'Pendiente'}
                    </p>
                  </div>
                  {u.id !== user?.id && (
                    <button
                      onClick={() => handleDeleteUser(u.id)}
                      className="text-[#555] hover:text-red-400 text-xs uppercase tracking-wider transition-colors"
                    >
                      Eliminar
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
