import { useAppStore } from '../stores/appStore'

const THEMES = [
  {
    id: 'default',
    name: 'Default Dark',
    desc: 'Negro puro, Exo 2, UI densa de Polaris.',
    previewClass: 'bg-black',
  },
  {
    id: 'dark-veil',
    name: 'Dark Veil',
    desc: 'Default Dark con fondo WebGL animado y scanlines suaves.',
    previewClass: 'dark-veil-preview',
  },
]

function ThemeCard({ item, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`w-full border-2 p-0 text-left transition-colors ${
        active ? 'border-[#ecd987]' : 'border-[#333] hover:border-[#777]'
      }`}
    >
      <div className={`h-24 overflow-hidden border-b border-[#222] ${item.previewClass}`}>
        <div className="grid h-full grid-cols-3 gap-px p-3">
          <div className="bg-black/80 border border-[#333]" />
          <div className="bg-[#080808]/80 border border-[#333]" />
          <div className="bg-black/80 border border-[#333]" />
          <div className="col-span-3 border border-[#333] bg-[#050505]/80 p-2">
            <div className="mb-2 h-2 w-24 bg-[#ecd987]" />
            <div className="h-1.5 w-32 bg-[#333]" />
          </div>
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#e5e5e5]">
            {item.name}
          </span>
          {active && (
            <span className="border border-[#ecd987] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-[#ecd987]">
              Active
            </span>
          )}
        </div>
        <p className="mt-1 text-[11px] leading-snug text-[#666]">{item.desc}</p>
      </div>
    </button>
  )
}

export default function SettingsPage() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)

  return (
    <div className="pt-12 min-h-screen bg-black text-white">
      <div className="border-b-2 border-[#333] px-4 py-3">
        <span className="text-sm font-bold tracking-widest text-white">SETTINGS</span>
      </div>

      <div className="px-4 py-6 max-w-3xl">
        <div className="mb-1">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] border-b border-[#1a1a1a] pb-2 mb-5">
            Display Theme
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {THEMES.map((item) => (
              <ThemeCard
                key={item.id}
                item={item}
                active={theme === item.id}
                onSelect={setTheme}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
