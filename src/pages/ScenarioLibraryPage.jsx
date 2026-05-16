import { useMemo, useState } from 'react'
import { SCENARIO_LIBRARY, SCENARIO_SHOCKS, getScenarioSummary } from '../data/scenarioLibrary'

const severityColor = {
  5: 'text-[#ef4444]',
  4: 'text-[#f59e0b]',
  3: 'text-[#ecd987]',
  2: 'text-[#a3a3a3]',
  1: 'text-[#555]',
}

function Metric({ label, value, sub, color = 'text-[#e5e5e5]' }) {
  return (
    <div className="p-3 border-r border-b border-[#222]">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
      {sub && <div className="text-[10px] text-[#444] mt-0.5">{sub}</div>}
    </div>
  )
}

function ScenarioCard({ scenario }) {
  return (
    <div className="border-2 border-[#333] bg-black">
      <div className="px-3 py-2 bg-[#1a1a0d] border-b border-[#333] flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold uppercase tracking-wider text-[#e5e5e5]">{scenario.name}</div>
          <div className="text-[10px] text-[#555] font-mono mt-0.5">{scenario.period} · {scenario.regime}</div>
        </div>
        <div className={`text-lg font-mono font-bold ${severityColor[scenario.severity] ?? 'text-[#555]'}`}>
          S{scenario.severity}
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

export default function ScenarioLibraryPage() {
  const [shock, setShock] = useState('all')
  const [minSeverity, setMinSeverity] = useState(1)

  const scenarios = useMemo(() => SCENARIO_LIBRARY.filter(scenario => {
    const shockOk = shock === 'all' || scenario.shock === shock
    const severityOk = scenario.severity >= minSeverity
    return shockOk && severityOk
  }), [shock, minSeverity])

  const summary = useMemo(() => getScenarioSummary(scenarios), [scenarios])

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
          La validacion real consiste en comparar outputs del backtest y del dashboard point-in-time contra estos sesgos:
          si el sistema aumenta sizing en shocks S4/S5 o ignora safe havens, la beta queda bajo revision.
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {scenarios.map(scenario => (
            <ScenarioCard key={scenario.id} scenario={scenario} />
          ))}
        </div>
      </div>
    </div>
  )
}
