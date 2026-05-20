import { useEffect, useState, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'

const TAB_GROUPS = [
  {
    key: '1', label: 'DASHBOARD', to: '/dashboard',
  },
  {
    key: '2', label: 'ANÁLISIS', to: '/world-view',
    items: [
      { to: '/dashboard',           label: 'HUB',        desc: 'Dashboard' },
      { to: '/general',             label: 'GENERAL',    desc: 'Country snapshot' },
      { to: '/world-view',label: 'WORLD VIEW', desc: 'World View' },
      { to: '/endogenous',          label: 'ENDOGENOUS', desc: 'Endogenous' },
      { to: '/exogenous/operativa', label: 'EXOGENOUS',  desc: 'Exogenous' },
      { to: '/fx-trend-layer',       label: 'G10 TREND',  desc: 'FX Trend Layer' },
      { to: '/equities-macro-layer', label: 'G11 EQ',     desc: 'Equities Macro' },
    ],
  },
  {
    key: '3', label: 'EJECUCIÓN', to: '/execution/operativa',
    items: [
      { to: '/timing/operativa',    label: 'TIMING',    desc: 'Timing' },
      { to: '/risk/operativa',      label: 'RISK',      desc: 'Risk Mgmt' },
      { to: '/execution/operativa', label: 'EXECUTION', desc: 'Execution' },
    ],
  },
  {
    key: '4', label: 'APRENDIZAJE', to: '/journal',
    items: [
      { to: '/journal',     label: 'JOURNAL',    desc: 'Trade Journal' },
      { to: '/performance', label: 'PERFORMANCE',desc: 'Performance' },
    ],
  },
  {
    key: '5', label: 'DATA', to: '/data',
    items: [
      { to: '/data',                      label: 'HUB',           desc: 'Data Hub' },
      { to: '/data/raw',                  label: 'RAW',           desc: 'Raw Data' },
      { to: '/data/coverage-matrix',      label: 'COVERAGE',      desc: 'Coverage Matrix' },
      { to: '/data/history',              label: 'HISTORY',       desc: 'History' },
      { to: '/data/economic-calendar',    label: 'CALENDAR',      desc: 'Economic Calendar' },
      { to: '/data/notifications',        label: 'NOTIFICATIONS', desc: 'Notifications' },
    ],
  },
  {
    key: '6', label: 'ADMIN', to: '/admin', adminOnly: true,
  },
]

const DEFAULT_FKEYS = [
  ['F1',  'HELP'],
  ['F2',  'MENU'],
  ['F3',  'BUSCAR'],
  ['F4',  'ATRAS'],
  ['F5',  'REFRESH'],
  ['F6',  'ALERTAS'],
  ['F7',  'PORTFOLIO'],
  ['F8',  'NOTICIAS'],
  ['F9',  'MENSAJES'],
  ['F10', 'EXPORT'],
  ['F12', 'MAIN'],
]

const PAGE_FKEYS = {
  '/world-view': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','ATRAS'],
    ['F5','ACTUALIZAR'], ['F6','EXPORTAR'], ['F7','DATA'], ['F8','NOTIFICAS'],
    ['F9','MENSAJES'], ['F10','LOG'], ['F12','MAIN'],
  ],
  '/exogenous/operativa': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','ATRAS'],
    ['F5','ACTUALIZAR'], ['F6','EXPORTAR'], ['F7','DATA'], ['F8','NOTIFICAS'],
    ['F9','MENSAJES'], ['F10','LOG'], ['F12','MAIN'],
  ],
  '/endogenous': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','ATRAS'],
    ['F5','ACTUALIZAR'], ['F6','EXPORTAR'], ['F7','DATA'], ['F8','NOTIFICAS'],
    ['F9','MENSAJES'], ['F10','LOG'], ['F12','MAIN'],
  ],
  '/timing/operativa': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','ATRAS'],
    ['F5','ACTUALIZAR'], ['F6','EXPORTAR'], ['F7','DATA'], ['F8','NOTIFICAS'],
    ['F9','MENSAJES'], ['F10','LOG'], ['F12','MAIN'],
  ],
  '/risk/operativa': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','ATRAS'],
    ['F5','ACTUALIZAR'], ['F6','EXPORTAR'], ['F7','DATA'], ['F8','NOTIFICAS'],
    ['F9','MENSAJES'], ['F10','LOG'], ['F12','MAIN'],
  ],
  '/execution/operativa': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','ATRAS'],
    ['F5','ACTUALIZAR'], ['F6','EXPORTAR'], ['F7','DATA'], ['F8','NOTIFICAS'],
    ['F9','MENSAJES'], ['F10','LOG'], ['F12','MAIN'],
  ],
  '/data': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','FILTROS'],
    ['F5','REFRESH'], ['F6','DETALLE'], ['F7','ENDPOINT'], ['F8','LOGS'],
    ['F9','MENSAJES'], ['F10','EXPORT'], ['F11','INGEST ALL'], ['F12','DATA'],
  ],
  '/data/raw': [
    ['F1','HELP'], ['F2','MENU'], ['F3','BUSCAR'], ['F4','FILTROS'],
    ['F5','REFRESH'], ['F6','DETALLE'], ['F7','ENDPOINT'], ['F8','LOGS'],
    ['F9','MENSAJES'], ['F10','EXPORT'], ['F11','INGEST ALL'], ['F12','DATA'],
  ],
}

function pad(n) { return n < 10 ? `0${n}` : `${n}` }

function formatStamp(d) {
  return (
    `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}` +
    `  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

function getFkeys(pathname) {
  for (const [prefix, keys] of Object.entries(PAGE_FKEYS)) {
    if (pathname.startsWith(prefix)) return keys
  }
  return DEFAULT_FKEYS
}

function TabDropdown({ group, location }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const isGroupActive = group.items.some(
    item => location.pathname.startsWith(item.to) && item.to !== '/'
  ) || location.pathname === group.to

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="mf-tab-dropdown">
      <button
        onClick={() => setOpen(o => !o)}
        className={`mf-tab-btn ${isGroupActive ? 'is-active' : ''}`}
      >
        {group.label}
        <span className={`mf-tab-arrow ${open ? 'open' : ''}`}>▼</span>
      </button>

      {open && (
        <div className="mf-tab-menu">
          {group.items.map(item => {
            const active = location.pathname === item.to || (item.to !== '/' && location.pathname.startsWith(item.to))
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                className={`mf-tab-menu-item ${active ? 'is-active' : ''}`}
              >
                <span>{item.label}</span>
                <span className="mf-tab-menu-desc">{item.desc}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function MainframeShell() {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const user = useAppStore((s) => s.user)
  const location = useLocation()
  const [now, setNow] = useState(() => new Date())

  const isAdmin = user?.app_metadata?.role === 'admin'

  useEffect(() => {
    if (theme !== 'mainframe') return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [theme])

  useEffect(() => {
    if (theme !== 'mainframe') return
    const handler = (e) => {
      if (e.key === 'F12') { e.preventDefault(); window.location.assign('/dashboard') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [theme])

  if (theme !== 'mainframe') return null

  const stamp = formatStamp(now)
  const termId = '3278-2'
  const userLabel = user?.email ? user.email.split('@')[0].toUpperCase() : 'ERIS'
  const fkeys = getFkeys(location.pathname)

  return (
    <div className="mf-chrome">
      <div className="mf-topbar" role="banner">
        <div className="mf-topbar__left">
          <span className="mf-led" aria-hidden />
          <span className="mf-topbar__title">POLARIS FINANCIAL SYSTEM</span>
          <span className="mf-topbar__version">v4.7.2</span>
        </div>

        <nav className="mf-topbar__nav" aria-label="primary">
          {TAB_GROUPS.map((t) => {
            if (t.adminOnly && !isAdmin) return null

            if (t.items) {
              return <TabDropdown key={t.key} group={t} location={location} />
            }

            const active =
              (t.to === '/' && location.pathname === '/') ||
              (t.to !== '/' && location.pathname.startsWith(t.to))
            return (
              <Link key={t.key} to={t.to} className={`mf-tab-btn ${active ? 'is-active' : ''}`}>
                {t.label}
              </Link>
            )
          })}
        </nav>

        <div className="mf-topbar__right">
          <span className="mf-topbar__cell">{stamp}<span className="mf-blink">_</span></span>
          <span className="mf-topbar__cell">USER:<strong>{userLabel}</strong></span>
          <button className="mf-tabs__toggle" onClick={toggleTheme} title="Switch UI">
            UI: MAINFRAME &nbsp;//&nbsp; SWITCH
          </button>
          <button className="mf-topbar__logout" onClick={toggleTheme} title="Return to default UI">
            LOGOUT
          </button>
        </div>
      </div>

      <footer className="mf-footer" role="contentinfo">
        {fkeys.map(([k, label]) => (
          <span key={k}><b>{k}=</b>{label}</span>
        ))}
      </footer>
    </div>
  )
}
