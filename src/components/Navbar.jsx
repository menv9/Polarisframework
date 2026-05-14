import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'

const GROUPS = [
  {
    label: 'Análisis',
    items: [
      { to: '/dashboard',           label: 'Hub',  desc: 'Dashboard' },
      { to: '/world-view/operativa',label: 'WV',   desc: 'World View' },
      { to: '/endogenous',          label: 'Endo', desc: 'Endogenous' },
      { to: '/exogenous/operativa', label: 'Exo',  desc: 'Exogenous' },
    ],
  },
  {
    label: 'Ejecución',
    items: [
      { to: '/timing/operativa',    label: 'Timing',    desc: 'Timing' },
      { to: '/risk/operativa',      label: 'Risk',      desc: 'Risk Mgmt' },
      { to: '/execution/operativa', label: 'Exec',      desc: 'Execution' },
    ],
  },
  {
    label: 'Aprendizaje',
    items: [
      { to: '/journal',     label: 'Journal', desc: 'Trade Journal' },
      { to: '/performance', label: 'Perf',    desc: 'Performance' },
      { to: '/data',        label: 'Data',    desc: 'Data Hub' },
    ],
  },
]

function NavDropdown({ group, location }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const isGroupActive = group.items.some(
    item => location.pathname.startsWith(item.to) && item.to !== '/'
  )

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-xs font-bold uppercase tracking-wider transition-colors ${
          isGroupActive ? 'text-[#ecd987]' : 'text-[#666] hover:text-[#ecd987]'
        }`}
      >
        {group.label}
        <span className={`text-[8px] transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-2 bg-black border border-[#333] min-w-[140px] z-50">
          {group.items.map(item => {
            const active = location.pathname.startsWith(item.to) && item.to !== '/'
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-bold uppercase tracking-wider border-b border-[#1a1a1a] last:border-0 transition-colors ${
                  active
                    ? 'text-[#ecd987] bg-[#111]'
                    : 'text-[#666] hover:text-[#ecd987] hover:bg-[#0a0a0a]'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] text-[#333] font-normal normal-case tracking-normal ml-3">{item.desc}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Navbar() {
  const scrolled = useAppStore((s) => s.scrolled)
  const user = useAppStore((s) => s.user)
  const location = useLocation()
  const navigate = useNavigate()
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

        <div className="hidden md:flex items-center gap-5">
          {GROUPS.map(group => (
            <NavDropdown key={group.label} group={group} location={location} />
          ))}

          {isAdmin && (
            <>
              <span className="text-[#222]">|</span>
              <Link
                to="/admin"
                className={`text-xs font-bold uppercase tracking-wider transition-colors ${
                  location.pathname === '/admin' ? 'text-white' : 'text-[#ecd987] hover:text-white'
                }`}
              >
                Admin
              </Link>
            </>
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
