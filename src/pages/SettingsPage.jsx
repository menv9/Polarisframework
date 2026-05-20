import { useAppStore } from '../stores/appStore'

const THEMES = [
  {
    id: 'default',
    name: 'Default Dark',
    desc: 'Modern dark — pure black, Exo 2',
    preview: {
      bg: '#000000',
      panel: '#111111',
      border: '#333333',
      text: '#e5e5e5',
      textDim: '#555555',
      accent: '#ecd987',
      positive: '#4ade80',
      negative: '#ef4444',
      info: '#60a5fa',
      font: 'Exo 2, sans-serif',
    },
  },
  {
    id: 'mainframe',
    name: 'Mainframe 1994',
    desc: 'Deep navy · phosphor cyan · IBM Plex Mono',
    preview: {
      bg: '#060a14',
      panel: '#0a1020',
      border: '#1a2a44',
      text: '#8ab4c8',
      textDim: '#4a5a6a',
      accent: '#7db8e8',
      positive: '#5fd38a',
      negative: '#e06c5c',
      info: '#6a9ec8',
      font: 'IBM Plex Mono, monospace',
    },
  },
  {
    id: 'terminal',
    name: 'Terminal',
    desc: 'Warm black · purple accent · JetBrains Mono',
    preview: {
      bg: '#030303',
      panel: '#050505',
      border: '#343434',
      text: '#e8e2d6',
      textDim: '#777777',
      accent: '#b779ff',
      positive: '#42e66f',
      negative: '#ff4545',
      info: '#54a7ff',
      font: 'JetBrains Mono, monospace',
    },
  },
]

function ThemeCard({ theme, active, onSelect }) {
  const p = theme.preview
  return (
    <button
      onClick={() => onSelect(theme.id)}
      style={{
        background: 'transparent',
        border: 'none',
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
      }}
    >
      {/* Preview box — always uses hardcoded colors, ignores current theme */}
      <div style={{
        background: p.bg,
        border: `2px solid ${active ? p.accent : p.border}`,
        padding: '12px',
        fontFamily: p.font,
        transition: 'border-color 120ms',
        boxShadow: active ? `0 0 0 1px ${p.accent}40` : 'none',
      }}>
        {/* Mock navbar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${p.border}`, paddingBottom: '6px', marginBottom: '8px',
        }}>
          <span style={{ color: p.accent, fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em' }}>
            POLARIS
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            {['ANÁLISIS', 'DATA', 'SETTINGS'].map(label => (
              <span key={label} style={{ color: p.textDim, fontSize: '9px', letterSpacing: '0.1em' }}>
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Mock metric row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1px', marginBottom: '8px' }}>
          {[
            { label: 'EURUSD', val: '+0.84', col: p.positive },
            { label: 'USDJPY', val: '-1.20', col: p.negative },
            { label: 'BDI', val: '+2.3%', col: p.info },
          ].map(m => (
            <div key={m.label} style={{
              background: p.panel, border: `1px solid ${p.border}`,
              padding: '5px 7px',
            }}>
              <div style={{ color: p.textDim, fontSize: '8px', letterSpacing: '0.1em', marginBottom: '2px' }}>
                {m.label}
              </div>
              <div style={{ color: m.col, fontSize: '11px', fontWeight: 700 }}>{m.val}</div>
            </div>
          ))}
        </div>

        {/* Mock chart placeholder */}
        <div style={{
          background: p.panel, border: `1px solid ${p.border}`,
          height: '28px', display: 'flex', alignItems: 'center', padding: '0 7px',
        }}>
          <svg width="100%" height="16" style={{ overflow: 'visible' }}>
            <polyline
              points="0,12 15,9 30,10 45,5 60,7 75,4 90,6 105,3 120,5"
              fill="none"
              stroke={p.info}
              strokeWidth="1.5"
            />
          </svg>
        </div>
      </div>

      {/* Label */}
      <div className="mt-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#e5e5e5]">
            {theme.name}
          </span>
          {active && (
            <span style={{
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em',
              color: p.accent, border: `1px solid ${p.accent}`,
              padding: '0 4px', lineHeight: '14px',
            }}>
              ACTIVE
            </span>
          )}
        </div>
        <div className="text-[11px] text-[#555] mt-0.5">{theme.desc}</div>
      </div>
    </button>
  )
}

export default function SettingsPage() {
  const theme = useAppStore(s => s.theme)
  const setTheme = useAppStore(s => s.setTheme)

  return (
    <div className="pt-12 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-[#333] px-4 py-3">
        <span className="text-sm font-bold tracking-widest text-white">SETTINGS</span>
      </div>

      <div className="px-4 py-6 max-w-3xl">
        {/* Section */}
        <div className="mb-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] border-b border-[#1a1a1a] pb-2 mb-5">
            Display Theme
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {THEMES.map(t => (
              <ThemeCard
                key={t.id}
                theme={t}
                active={theme === t.id}
                onSelect={setTheme}
              />
            ))}
          </div>
        </div>

        <div className="mt-8 border-t border-[#1a1a1a] pt-4">
          <p className="text-[11px] text-[#444] font-mono">
            El tema se guarda en localStorage y se aplica al cargar la app.
          </p>
        </div>
      </div>
    </div>
  )
}
