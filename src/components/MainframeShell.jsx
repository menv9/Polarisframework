import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'

const TABS = [
  { key: '1', label: 'DASHBOARD',   to: '/dashboard' },
  { key: '2', label: 'ANÁLISIS',    to: '/world-view/operativa' },
  { key: '3', label: 'EJECUCIÓN',   to: '/execution/operativa' },
  { key: '4', label: 'APRENDIZAJE', to: '/world-view' },
  { key: '5', label: 'DATA',        to: '/data' },
  { key: '6', label: 'ADMIN',       to: '/admin' },
  { key: '7', label: 'FRAMEWORK',   to: '/world-view' },
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
  '/world-view/operativa': [
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

export default function MainframeShell() {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const location = useLocation()
  const [now, setNow] = useState(() => new Date())

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
  const user = 'ERIS'
  const fkeys = getFkeys(location.pathname)

  return (
    <div className="mf-chrome">
      <div className="mf-topbar" role="banner">
        <span className="mf-led" aria-hidden />
        <span className="mf-topbar__title">POLARIS FINANCIAL SYSTEM</span>
        <span className="mf-topbar__version">v4.7.2</span>
        <span className="mf-topbar__spacer" />
        <span className="mf-topbar__cell">{stamp}<span className="mf-blink">_</span></span>
        <span className="mf-topbar__cell">TERM:<strong>{termId}</strong></span>
        <span className="mf-topbar__cell">USER:<strong>{user}</strong></span>
        <button className="mf-topbar__logout" onClick={toggleTheme} title="Return to default UI">
          LOGOUT
        </button>
      </div>

      <nav className="mf-tabs" aria-label="primary">
        {TABS.map((t) => {
          const active =
            (t.to === '/' && location.pathname === '/') ||
            (t.to !== '/' && location.pathname.startsWith(t.to))
          return (
            <Link key={t.key} to={t.to} className={active ? 'is-active' : ''}>
              <span className="mf-tab-key">[{t.key}]</span>
              {t.label}
            </Link>
          )
        })}
        <span className="mf-tabs__spacer" />
        <button className="mf-tabs__toggle" onClick={toggleTheme} title="Switch UI">
          UI: MAINFRAME &nbsp;//&nbsp; SWITCH
        </button>
      </nav>

      <footer className="mf-footer" role="contentinfo">
        {fkeys.map(([k, label]) => (
          <span key={k}><b>{k}=</b>{label}</span>
        ))}
      </footer>
    </div>
  )
}
