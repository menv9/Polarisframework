import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckSquare, Square, X } from 'lucide-react'
import { SCENARIO_LIBRARY, SCENARIO_SHOCKS, getScenarioSummary } from '../data/scenarioLibrary'

const ACTIVE_SCENARIO_KEY = 'polaris_active_scenario'

const severityColor = {
  5: 'text-[#ef4444]',
  4: 'text-[#f59e0b]',
  3: 'text-[#ecd987]',
  2: 'text-[#a3a3a3]',
  1: 'text-[#555]',
}

const severityBorder = {
  5: 'border-[#ef4444]',
  4: 'border-[#f59e0b]',
  3: 'border-[#ecd987]',
  2: 'border-[#444]',
  1: 'border-[#333]',
}

const severityBg = {
  5: 'bg-[#1a0202]',
  4: 'bg-[#1a0d00]',
  3: 'bg-[#1a1400]',
  2: 'bg-[#111]',
  1: 'bg-[#0a0a0a]',
}

// ── Module routes ────────────────────────────────────────────────────────────

const MODULE_ROUTES = {
  'World View':      '/world-view',
  'Risk':            '/risk/operativa',
  'Execution':       '/execution/operativa',
  'Circuit Breakers':'/tail-risk',
  'Endogenous':      '/endogenous',
  'Exogenous':       '/exogenous/operativa',
  'Timing':          '/timing/operativa',
  'Calendar':        '/data/economic-calendar',
  'Backtest':        '/backtest',
}

// ── Checklist generator ──────────────────────────────────────────────────────

function generateChecklist(scenario) {
  const items = []
  const isRiskOff = scenario.regime.toLowerCase().includes('risk-off')
    || ['credit', 'banking'].includes(scenario.shock)
  const isCritical = scenario.severity >= 5
  const isHigh = scenario.severity >= 4

  // 1. World View — always first
  items.push({
    module: 'World View',
    route: '/world-view',
    action: `Confirmar régimen activo: ${scenario.regime}. Sesgo FX: ${scenario.fxBias}`,
  })

  // 2. Tail Risk / G7 — whenever risk-off or severe
  if (isRiskOff || isHigh) {
    const riskAction = isCritical
      ? 'S5 CRÍTICO — activar protocolo cierre total (G7). VIX >50 posible. Sin nuevas entradas.'
      : isHigh
        ? `S${scenario.severity} ALTO — reducir sizing al 50% (G7). Revisar coberturas activas.`
        : 'Monitorizar VIX y DD portfolio. Tener protocolo de cobertura listo.'
    items.push({ module: 'G7 Tail Risk', route: '/tail-risk', action: riskAction })
  }

  // 3. Module-specific from scenario.moduleChecks
  const added = new Set(['World View', 'Circuit Breakers'])
  for (const mod of scenario.moduleChecks) {
    if (added.has(mod)) continue
    added.add(mod)
    const route = MODULE_ROUTES[mod] || '/dashboard'
    let action = ''
    if (mod === 'Execution') {
      action = `Revisar slippage y liquidez. ${scenario.betaRisk}`
    } else if (mod === 'Timing') {
      action = `Validar señal en régimen ${scenario.regime}. ${isHigh ? 'Reducir size si convicción baja.' : 'Monitorizar filtros.'}`
    } else if (mod === 'Endogenous') {
      action = `Verificar drivers endógenos: ${scenario.drivers.slice(0, 3).join(', ')}.`
    } else if (mod === 'Exogenous') {
      action = `Drivers externos: ${scenario.drivers.join(', ')}.`
    } else if (mod === 'Risk') {
      action = `Revisar exposición agregada y correlaciones. ${isHigh ? 'Reducir sizing.' : 'Monitorizar limites.'}`
    } else if (mod === 'Backtest') {
      action = `Verificar comportamiento histórico del sistema en régimen "${scenario.regime}".`
    } else if (mod === 'Calendar') {
      action = `Revisar próximos eventos de alto riesgo relacionados con shock "${scenario.shock}".`
    } else {
      action = `Validar comportamiento en régimen ${scenario.regime}.`
    }
    items.push({ module: mod, route, action })
  }

  // 4. Counterparty G8 for banking/credit shocks
  if (['banking', 'credit'].includes(scenario.shock)) {
    items.push({
      module: 'G8 Counterparty',
      route: '/counterparty-risk',
      action: 'Verificar exposición por broker. Riesgo de contraparte elevado en este tipo de crisis.',
    })
  }

  // 5. Macro Nowcasting for macro shocks
  if (['growth', 'inflation', 'cycle', 'rates', 'em'].includes(scenario.shock)) {
    items.push({
      module: 'G12 Nowcasting',
      route: '/macro-nowcasting',
      action: `Actualizar indicadores relevantes: ${scenario.drivers.slice(0, 3).join(', ')}.`,
    })
  }

  // 6. Beta note — always last
  items.push({
    module: 'Beta risk',
    route: null,
    action: scenario.betaRisk,
  })

  return items
}

// ── Active Scenario Panel ────────────────────────────────────────────────────

function ActiveScenarioPanel({ scenario, checkedItems, onToggle, onDeactivate }) {
  const checklist = useMemo(() => generateChecklist(scenario), [scenario])
  const doneCount = checkedItems.size
  const totalCount = checklist.length

  return (
    <div className={`mb-4 border-2 ${severityBorder[scenario.severity]} ${severityBg[scenario.severity]}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#333] px-4 py-3">
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 font-mono text-2xl font-black leading-none ${severityColor[scenario.severity]}`}>
            S{scenario.severity}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-[#555]">Escenario activo</span>
              <span className={`font-mono text-[10px] font-bold uppercase ${severityColor[scenario.severity]}`}>
                {scenario.regime}
              </span>
            </div>
            <div className="mt-0.5 text-base font-bold uppercase tracking-widest text-white">
              {scenario.name}
            </div>
            <div className="mt-0.5 font-mono text-[10px] text-[#555]">{scenario.period}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <span className="text-[10px] text-[#555]">
            {doneCount}/{totalCount} completados
          </span>
          <button
            type="button"
            onClick={onDeactivate}
            className="flex items-center gap-1 border border-[#444] px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#555] hover:border-[#f87171] hover:text-[#f87171]"
          >
            <X size={11} /> Desactivar
          </button>
        </div>
      </div>

      {/* Checklist */}
      <div className="px-4 py-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">
          Checklist del framework
        </div>
        <div className="space-y-1.5">
          {checklist.map((item, i) => {
            const checked = checkedItems.has(i)
            return (
              <div
                key={i}
                className={`flex items-start gap-3 border border-[#222] px-3 py-2 ${checked ? 'opacity-50' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => onToggle(i)}
                  className={`mt-0.5 shrink-0 ${checked ? 'text-[#4ade80]' : 'text-[#444] hover:text-[#ecd987]'}`}
                >
                  {checked ? <CheckSquare size={14} /> : <Square size={14} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${checked ? 'text-[#555]' : 'text-[#ecd987]'}`}>
                      {item.module}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs leading-relaxed ${checked ? 'text-[#444] line-through' : 'text-[#aaa]'}`}>
                    {item.action}
                  </p>
                </div>
                {item.route && !checked && (
                  <Link
                    to={item.route}
                    className="mt-1 shrink-0 text-[#555] hover:text-[#ecd987]"
                    title={`Ir a ${item.module}`}
                  >
                    <ArrowRight size={13} />
                  </Link>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Metric ───────────────────────────────────────────────────────────────────

function Metric({ label, value, sub, color = 'text-[#e5e5e5]' }) {
  return (
    <div className="p-3 border-r border-b border-[#222]">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#444] mt-0.5">{sub}</div>}
    </div>
  )
}

// ── Scenario Card ────────────────────────────────────────────────────────────

function ScenarioCard({ scenario, isActive, onApply }) {
  return (
    <div className={`border-2 bg-black ${isActive ? severityBorder[scenario.severity] : 'border-[#333]'}`}>
      <div className={`px-3 py-2 border-b border-[#333] flex items-start justify-between gap-3 ${isActive ? severityBg[scenario.severity] : 'bg-[#1a1a0d]'}`}>
        <div>
          <div className="text-sm font-bold uppercase tracking-wider text-[#e5e5e5]">{scenario.name}</div>
          <div className="text-[10px] text-[#555] font-mono mt-0.5">{scenario.period} · {scenario.regime}</div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`text-lg font-mono font-bold ${severityColor[scenario.severity] ?? 'text-[#555]'}`}>
            S{scenario.severity}
          </div>
          <button
            type="button"
            onClick={() => onApply(scenario)}
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 border transition-colors ${
              isActive
                ? `${severityBorder[scenario.severity]} ${severityColor[scenario.severity]} opacity-60 cursor-default`
                : 'border-[#333] text-[#555] hover:border-[#ecd987] hover:text-[#ecd987]'
            }`}
            disabled={isActive}
          >
            {isActive ? 'Activo' : 'Aplicar'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-3 border-r border-b border-[#222]">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">FX esperado</div>
          <div className="text-xs text-[#a3a3a3] leading-relaxed">{scenario.fxBias}</div>
        </div>
        <div className="p-3 border-b border-[#222]">
          <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Riesgo de beta</div>
          <div className="text-xs text-[#a3a3a3] leading-relaxed">{scenario.betaRisk}</div>
        </div>
      </div>

      <div className="p-3 border-b border-[#222]">
        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Drivers a validar</div>
        <div className="flex flex-wrap gap-1.5">
          {scenario.drivers.map(driver => (
            <span key={driver} className="border border-[#333] px-1.5 py-0.5 text-[10px] text-[#777] uppercase tracking-wider">
              {driver}
            </span>
          ))}
        </div>
      </div>

      <div className="p-3">
        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Modulos bajo prueba</div>
        <div className="flex flex-wrap gap-1.5">
          {scenario.moduleChecks.map(module => (
            <span key={module} className="border border-[#ecd987]/40 text-[#ecd987] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
              {module}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ScenarioLibraryPage() {
  const [shock, setShock] = useState('all')
  const [minSeverity, setMinSeverity] = useState(1)
  const [activeScenario, setActiveScenario] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SCENARIO_KEY)
      return saved ? JSON.parse(saved) : null
    } catch { return null }
  })
  const [checkedItems, setCheckedItems] = useState(() => {
    try {
      const saved = localStorage.getItem(ACTIVE_SCENARIO_KEY + '_checks')
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

  const scenarios = useMemo(() => SCENARIO_LIBRARY.filter(scenario => {
    const shockOk = shock === 'all' || scenario.shock === shock
    const severityOk = scenario.severity >= minSeverity
    return shockOk && severityOk
  }), [shock, minSeverity])

  const summary = useMemo(() => getScenarioSummary(scenarios), [scenarios])

  function applyScenario(scenario) {
    setActiveScenario(scenario)
    setCheckedItems(new Set())
    localStorage.setItem(ACTIVE_SCENARIO_KEY, JSON.stringify(scenario))
    localStorage.removeItem(ACTIVE_SCENARIO_KEY + '_checks')
    // scroll to top to show the active panel
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function deactivateScenario() {
    setActiveScenario(null)
    setCheckedItems(new Set())
    localStorage.removeItem(ACTIVE_SCENARIO_KEY)
    localStorage.removeItem(ACTIVE_SCENARIO_KEY + '_checks')
  }

  function toggleChecked(index) {
    setCheckedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      localStorage.setItem(ACTIVE_SCENARIO_KEY + '_checks', JSON.stringify([...next]))
      return next
    })
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Scenario Library</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">
              Validacion historica de betas, regimenes, circuit breakers y comportamiento FX
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={shock}
              onChange={e => setShock(e.target.value)}
              className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs font-bold uppercase tracking-wider px-2 py-1.5 focus:outline-none focus:border-[#ecd987]"
            >
              {SCENARIO_SHOCKS.map(item => (
                <option key={item} value={item}>{item === 'all' ? 'Todos los shocks' : item}</option>
              ))}
            </select>
            <select
              value={minSeverity}
              onChange={e => setMinSeverity(Number(e.target.value))}
              className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs font-bold uppercase tracking-wider px-2 py-1.5 focus:outline-none focus:border-[#ecd987]"
            >
              {[1, 2, 3, 4, 5].map(level => (
                <option key={level} value={level}>Severidad &gt;= {level}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active scenario panel */}
        {activeScenario && (
          <ActiveScenarioPanel
            scenario={activeScenario}
            checkedItems={checkedItems}
            onToggle={toggleChecked}
            onDeactivate={deactivateScenario}
          />
        )}

        {/* Coverage stats */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Cobertura historica</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4">
            <Metric label="Escenarios" value={summary.count} sub="filtrados" color="text-[#ecd987]" />
            <Metric label="Criticos" value={summary.critical} sub="severidad 4-5" color={summary.critical ? 'text-[#f59e0b]' : 'text-[#555]'} />
            <Metric label="Severidad media" value={summary.avgSeverity.toFixed(1)} sub="escala 1-5" />
            <Metric label="Modulos cubiertos" value={summary.modulesCovered} sub="checks distintos" color="text-[#4ade80]" />
          </div>
        </div>

        <div className="border border-[#333] p-3 mb-3 text-[10px] text-[#555] leading-relaxed">
          Cada escenario define el comportamiento esperado del framework en un regimen historico dificil.
          Aplica un escenario para generar el checklist de acciones por modulo y navegar directamente a cada pantalla.
          El estado del escenario activo persiste en esta sesion del navegador.
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {scenarios.map(scenario => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              isActive={activeScenario?.id === scenario.id}
              onApply={applyScenario}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
