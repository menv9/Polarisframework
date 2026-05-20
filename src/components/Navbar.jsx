import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Menu, Search, X } from 'lucide-react'
import { useAppStore } from '../stores/appStore'
import { supabase } from '../lib/supabase'
import { briefExtensionModules } from '../data/modules'

function ThemeToggle() {
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="theme-toggle-btn"
      title="Switch to 1994 mainframe UI"
    >
      <span className="dot" />UI: MAINFRAME
    </button>
  )
}

function moduleItems(ids) {
  return ids
    .map((id) => briefExtensionModules.find((module) => module.id === id))
    .filter(Boolean)
    .map((module) => ({
      to: module.route,
      label: module.shortLabel,
      desc: module.name,
    }))
}

const ANALYSIS_EXTENSION_ITEMS = moduleItems(['macro-nowcasting'])
const EXECUTION_EXTENSION_ITEMS = moduleItems([
  'fiscal',
  'disaster-recovery',
  'tail-risk',
  'counterparty-risk',
  'multi-broker',
])
const LEARNING_EXTENSION_ITEMS = moduleItems([
  'behavioral-finance',
  'model-governance',
  'decision-log',
  'knowledge-transfer',
  'external-validation',
])

const GROUPS = [
  {
    label: 'Análisis',
    items: [
      { to: '/dashboard',           label: 'Hub',  desc: 'Dashboard' },
      { to: '/general',             label: 'General', desc: 'Country General' },
      { to: '/world-view',label: 'WV',   desc: 'World View' },
      { to: '/endogenous',          label: 'Endo', desc: 'Endogenous' },
      { to: '/exogenous/operativa', label: 'Exo',  desc: 'Exogenous' },
      { to: '/emerging-markets',    label: 'EM',   desc: 'Emerging Markets' },
      { to: '/trade',               label: 'Trade', desc: 'Global Trade Monitor' },
      { to: '/fx-trend-layer',       label: 'Trend',    desc: 'FX Trend Layer' },
      { to: '/equities-macro-layer', label: 'Equities', desc: 'Equities Macro' },
      ...ANALYSIS_EXTENSION_ITEMS,
    ],
  },
  {
    label: 'Ejecución',
    items: [
      { to: '/timing/operativa',    label: 'Timing',    desc: 'Timing' },
      { to: '/risk/operativa',      label: 'Risk',      desc: 'Risk Mgmt' },
      { to: '/execution/operativa', label: 'Exec',      desc: 'Execution' },
      ...EXECUTION_EXTENSION_ITEMS,
    ],
  },
  {
    label: 'Aprendizaje',
    items: [
      { to: '/journal',     label: 'Journal',   desc: 'Trade Journal' },
      { to: '/performance', label: 'Perf',      desc: 'Performance' },
      { to: '/backtest',    label: 'Backtest',  desc: 'Backtest' },
      { to: '/scenario-library', label: 'Scenarios', desc: 'Scenario Library' },
      { to: '/capital-allocation', label: 'Capital', desc: 'Capital Allocation' },
      ...LEARNING_EXTENSION_ITEMS,
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

const EXTRA_SEARCH_ITEMS = [
  { to: '/info', label: 'Info', desc: 'Mapa visual' },
  { to: '/settings', label: 'Settings', desc: 'Configuracion' },
  { to: '/data', label: 'Data', desc: 'Data Hub', adminOnly: true },
  { to: '/data/raw', label: 'Raw', desc: 'Raw Data', adminOnly: true },
  { to: '/data/coverage-matrix', label: 'Coverage', desc: 'Coverage Matrix', adminOnly: true },
  { to: '/data/history', label: 'History', desc: 'History', adminOnly: true },
  { to: '/data/economic-calendar', label: 'Calendar', desc: 'Economic Calendar', adminOnly: true },
  { to: '/data/notifications', label: 'Notifications', desc: 'Notifications', adminOnly: true },
  { to: '/admin', label: 'Admin', desc: 'Panel de administracion', adminOnly: true },
]

function buildSearchItems(isAdmin) {
  const items = [
    ...GROUPS.flatMap((group) => group.items.map((item) => ({ ...item, group: group.label }))),
    ...EXTRA_SEARCH_ITEMS.map((item) => ({ ...item, group: item.adminOnly ? 'Admin' : 'Sistema' })),
  ].filter((item) => !item.adminOnly || isAdmin)

  return [...new Map(items.map((item) => [item.to, item])).values()]
}

function NavbarSearch({ isAdmin }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const searchItems = buildSearchItems(isAdmin)
  const normalizedQuery = query.trim().toLowerCase()
  const results = normalizedQuery
    ? searchItems
        .filter((item) =>
          `${item.label} ${item.desc} ${item.to} ${item.group}`.toLowerCase().includes(normalizedQuery)
        )
        .slice(0, 8)
    : searchItems.slice(0, 6)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function goTo(item) {
    navigate(item.to)
    setQuery('')
    setOpen(false)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && results[0]) {
      e.preventDefault()
      goTo(results[0])
    }
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div ref={ref} className="relative w-[230px]">
      <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-[#555]" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Buscar paginas"
        className="h-8 w-full border border-[#333] bg-black pl-7 pr-2 text-xs font-bold uppercase tracking-wider text-[#ddd] outline-none placeholder:text-[#444] focus:border-[#ecd987]"
      />

      {open && (
        <div className="absolute right-0 top-full mt-2 max-h-[360px] w-[360px] overflow-auto border border-[#333] bg-black shadow-2xl">
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.to}
                type="button"
                onClick={() => goTo(item)}
                className="flex w-full items-center justify-between gap-3 border-b border-[#1a1a1a] px-3 py-2 text-left last:border-0 hover:bg-[#0a0a0a]"
              >
                <span>
                  <span className="block text-xs font-bold uppercase tracking-wider text-[#ddd]">
                    {item.desc}
                  </span>
                  <span className="block font-mono text-[10px] text-[#555]">{item.to}</span>
                </span>
                <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#777]">
                  {item.group}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-xs font-bold uppercase tracking-wider text-[#555]">
              Sin resultados
            </div>
          )}
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
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [location.pathname])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate('/login', { replace: true })
  }

  return (
    <nav data-app-navbar className={`fixed top-0 left-0 right-0 z-50 border-b-2 border-[#333] bg-black ${scrolled ? 'border-white' : ''}`}>
      <div className="w-full px-4 h-12 flex items-center relative">
        {/* Logo — izquierda */}
        <Link to="/" className="flex items-center flex-none">
          <span className="text-sm font-bold tracking-widest text-white">POLARIS</span>
        </Link>

        {/* Nav links — centrado sobre el ancho total del viewport */}
        <div className="hidden md:flex items-center gap-5 absolute left-1/2 -translate-x-1/2">
          {GROUPS.map(group => (
            <NavDropdown key={group.label} group={group} location={location} />
          ))}

          <span className="text-[#222]">|</span>

          <Link
            to="/info"
            className={`text-xs font-bold uppercase tracking-wider transition-colors ${
              location.pathname === '/info' ? 'text-[#ecd987]' : 'text-[#666] hover:text-[#ecd987]'
            }`}
          >
            Info
          </Link>

          <span className="text-[#222]">|</span>

          <Link
            to="/data"
            className={`text-xs font-bold uppercase tracking-wider transition-colors ${
              location.pathname.startsWith('/data') ? 'text-[#ecd987]' : 'text-[#666] hover:text-[#ecd987]'
            }`}
          >
            Data
          </Link>

          <span className="text-[#222]">|</span>

          <Link
            to="/settings"
            className={`text-xs font-bold uppercase tracking-wider transition-colors ${
              location.pathname === '/settings' ? 'text-[#ecd987]' : 'text-[#666] hover:text-[#ecd987]'
            }`}
          >
            Settings
          </Link>

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
        </div>

        {/* Derecha — email + salir + UI toggle, pegados al borde */}
        <div className="hidden md:flex items-center gap-3 flex-none ml-auto">
          <NavbarSearch isAdmin={isAdmin} />
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#555] max-w-[140px] truncate">{user.email}</span>
              <button
                onClick={handleLogout}
                className="text-xs text-[#555] hover:text-red-400 uppercase tracking-wider transition-colors"
              >
                Salir
              </button>
            </div>
          )}
          <div className="border-l border-[#333] pl-3">
            <ThemeToggle />
          </div>
        </div>

        {/* Mobile — hamburger */}
        <button
          className="md:hidden ml-auto text-[#555] hover:text-white"
          onClick={() => setMobileOpen(o => !o)}
          aria-label="Menú"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-black border-t border-[#222] pb-4">
          {GROUPS.map(group => (
            <div key={group.label}>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#444]">
                {group.label}
              </div>
              {group.items.map(item => {
                const active = location.pathname.startsWith(item.to) && item.to !== '/'
                return (
                  <Link key={item.to} to={item.to}
                    className={`flex items-center justify-between px-6 py-2.5 text-xs font-bold uppercase tracking-wider border-b border-[#111] ${
                      active ? 'text-[#ecd987] bg-[#0a0a0a]' : 'text-[#555]'
                    }`}
                  >
                    <span>{item.desc}</span>
                    {active && <span className="text-[8px]">▶</span>}
                  </Link>
                )
              })}
            </div>
          ))}
          <div className="px-4 py-2 border-t border-[#222] mt-2">
            <Link
              to="/info"
              className={`flex items-center justify-between px-2 py-2 text-xs font-bold uppercase tracking-wider ${
                location.pathname === '/info' ? 'text-[#ecd987]' : 'text-[#555]'
              }`}
            >
              <span>Info</span>
              {location.pathname === '/info' && <span className="text-[8px]">â–¶</span>}
            </Link>
            <Link
              to="/settings"
              className={`flex items-center justify-between px-2 py-2 text-xs font-bold uppercase tracking-wider ${
                location.pathname === '/settings' ? 'text-[#ecd987]' : 'text-[#555]'
              }`}
            >
              <span>Settings</span>
              {location.pathname === '/settings' && <span className="text-[8px]">▶</span>}
            </Link>
          </div>
          <div className="px-4 pt-1 border-t border-[#222] flex items-center justify-between">
            {user && (
              <button onClick={handleLogout}
                className="text-xs text-[#555] hover:text-red-400 uppercase tracking-wider">
                Salir
              </button>
            )}
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  )
}
