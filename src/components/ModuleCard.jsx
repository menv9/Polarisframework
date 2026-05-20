import { Link } from 'react-router-dom'
import { useAppStore } from '../stores/appStore'

const badgeColors = {
  cyan: 'text-[#60a5fa] border-[#60a5fa]',
  blue: 'text-[#60a5fa] border-[#60a5fa]',
  indigo: 'text-[#a3a3a3] border-[#a3a3a3]',
  amber: 'text-[#f59e0b] border-[#f59e0b]',
  rose: 'text-[#ef4444] border-[#ef4444]',
  violet: 'text-white border-white',
  emerald: 'text-[#4ade80] border-[#4ade80]',
}

const moduleRoutes = {
  worldview: '/world-view',
  endogenous: '/endogenous',
  exogenous: '/exogenous/operativa',
  timing: '/timing/operativa',
  risk: '/risk/operativa',
  execution: '/execution/operativa',
  selfawareness: '/journal',
  'fx-trend-layer': '/fx-trend-layer',
  'equities-macro-layer': '/equities-macro-layer',
}

export default function ModuleCard({ module }) {
  const activeModule = useAppStore((s) => s.activeModule)
  const isActive = activeModule === module.id
  const route = moduleRoutes[module.id]
  const hasPage = Boolean(route)

  const card = (
    <article
      id={`card-${module.id}`}
      className={`group border-r-2 border-b-2 border-[#333] p-4 flex flex-col bg-black ${
        module.highlight ? 'border-white' : ''
      } ${isActive ? 'border-[#ecd987]' : ''}`}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`inline-block px-2 py-0.5 text-sm font-bold tracking-widest uppercase border ${
            badgeColors[module.color] || badgeColors.cyan
          }`}
        >
          {module.part}
        </span>
        {hasPage && (
          <span className="text-sm text-[#777] font-mono">[EXT]</span>
        )}
        {!hasPage && module.roadmap && (
          <span className="text-sm text-[#777] font-mono">[ROADMAP]</span>
        )}
      </div>

      <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">{module.name}</h3>
      <p className="text-sm text-[#888] leading-snug mb-3">{module.tagline}</p>

      <div className="space-y-2 mb-3 p-3 border border-[#333]">
        <div>
          <span className="block text-sm font-bold text-[#777] tracking-widest uppercase mb-1">
            INPUT
          </span>
          <p className="text-sm text-[#888] leading-snug">{module.input}</p>
        </div>
        <div className="border-t border-[#333] pt-2">
          <span className="block text-sm font-bold text-[#777] tracking-widest uppercase mb-1">
            OUTPUT
          </span>
          <p className="text-sm text-[#888] leading-snug">{module.output}</p>
        </div>
      </div>

      <ul className="space-y-1 mb-3 flex-1">
        {module.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2 text-sm text-[#888]">
            <span className="mt-1 w-1 h-1 bg-[#ecd987] shrink-0" />
            {feat}
          </li>
        ))}
      </ul>

      <div className="pt-2 border-t-2 border-[#333]">
        <span className="inline-flex items-center gap-1.5 font-mono text-sm text-[#777]">
          {'->'} {module.downstream}
        </span>
      </div>
    </article>
  )

  if (hasPage) {
    return (
      <Link to={route} className="block">
        {card}
      </Link>
    )
  }

  return card
}





