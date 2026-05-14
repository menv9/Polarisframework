import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'

export default function Navbar() {
  const scrolled = useAppStore((s) => s.scrolled)
  const user = useAppStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
  const isHome = location.pathname === '/'
  const isAdmin = user?.app_metadata?.role === 'admin'

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b-2 border-[#333] bg-black ${scrolled ? 'border-white' : ''}`}>
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-sm font-bold tracking-widest text-white">POLARIS</span>
          <span className="text-sm text-[#777] border-l-2 border-[#333] pl-3 uppercase tracking-wider">Framework</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {[
            { to: '/dashboard',           label: 'Dashboard'  },
            { to: '/world-view/operativa',label: 'World View' },
            { to: '/endogenous',          label: 'Endogenous' },
            { to: '/exogenous/operativa', label: 'Exogenous'  },
            { to: '/data',                label: 'Data'       },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={`text-sm font-medium uppercase tracking-wider transition-colors ${
                location.pathname.startsWith(to) && to !== '/'
                  ? 'text-[#ecd987]'
                  : 'text-[#888] hover:text-[#ecd987]'
              }`}
            >
              {label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              to="/admin"
              className={`text-sm font-medium uppercase tracking-wider transition-colors ${
                location.pathname === '/admin' ? 'text-white' : 'text-[#ecd987] hover:text-white'
              }`}
            >
              Admin
            </Link>
          )}

          {user && (
            <div className="flex items-center gap-3 border-l border-[#333] pl-4 ml-1">
              <span className="text-xs text-[#555] max-w-[140px] truncate">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-[#555] hover:text-red-400 uppercase tracking-wider transition-colors"
              >
                Salir
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
