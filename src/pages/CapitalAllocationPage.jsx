import { useEffect, useMemo, useState } from 'react'
import {
  CAPITAL_ALLOCATION_STORAGE_KEY,
  DEFAULT_CAPITAL_ALLOCATION,
  RAMP_STAGES,
  computeLayerAllocation,
} from '../data/capitalAllocation'

function loadInputs() {
  try {
    const saved = localStorage.getItem(CAPITAL_ALLOCATION_STORAGE_KEY)
    return saved ? { ...DEFAULT_CAPITAL_ALLOCATION, ...JSON.parse(saved) } : DEFAULT_CAPITAL_ALLOCATION
  } catch {
    return DEFAULT_CAPITAL_ALLOCATION
  }
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function NumInput({ label, value, onChange, min = 0, step = 1, suffix = '' }) {
  return (
    <label className="block p-3 border-r border-b border-[#222]">
      <span className="block text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</span>
      <span className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          step={step}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]"
        />
        {suffix && <span className="text-xs text-[#555]">{suffix}</span>}
      </span>
    </label>
  )
}

function Toggle({ label, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`p-3 border-r border-b border-[#222] text-left transition-colors ${
        checked ? 'bg-[#0a1a0a] text-[#4ade80]' : 'text-[#555] hover:text-[#a3a3a3]'
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xs font-bold uppercase">{checked ? 'SI' : 'NO'}</div>
    </button>
  )
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

export default function CapitalAllocationPage() {
  const [inputs, setInputs] = useState(loadInputs)
  const allocation = useMemo(() => computeLayerAllocation(inputs), [inputs])
  const { ramp, weights, rows } = allocation
  const verdict = ramp.regression.length
    ? 'RETIRAR / BAJAR TRAMO'
    : ramp.blockers.length
      ? 'NO ESCALAR'
      : ramp.canAddCapital
        ? 'PUEDE ESCALAR'
        : 'MANTENER'
  const verdictColor = verdict === 'PUEDE ESCALAR'
    ? 'text-[#4ade80]'
    : verdict === 'MANTENER'
      ? 'text-[#ecd987]'
      : 'text-[#ef4444]'

  useEffect(() => {
    localStorage.setItem(CAPITAL_ALLOCATION_STORAGE_KEY, JSON.stringify(inputs))
  }, [inputs])

  function update(key, value) {
    setInputs(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-3 mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Capital Allocation</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">
              Ramp-up, retirada de capital y reparto entre capas del framework
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInputs(DEFAULT_CAPITAL_ALLOCATION)}
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white hover:border-white"
          >
            Reset
          </button>
        </div>

        <div className={`border-2 ${verdict === 'PUEDE ESCALAR' ? 'border-[#4ade80]' : verdict === 'MANTENER' ? 'border-[#ecd987]' : 'border-[#ef4444]'} mb-3`}>
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Decision estrategica</span>
            <span className={`text-sm font-mono font-bold ${verdictColor}`}>{verdict}</span>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-5">
            <Metric label="Tramo recomendado" value={ramp.stage.label} sub={ramp.stage.desc} color="text-[#ecd987]" />
            <Metric label="Capital activo" value={money(ramp.activeCapital)} sub={`${ramp.stage.activePct}% del total`} color="text-[#4ade80]" />
            <Metric label="Reserva tactica" value={money(ramp.reserveCapital)} sub={`${ramp.stage.cashPct}% en cash/MMF/T-bills`} />
            <Metric label="Risk/trade" value={`${ramp.stage.riskPct.toFixed(2)}%`} sub="sobre capital activo" />
            <Metric label="Capas" value={`${weights.layer1}/${weights.layer2}/${weights.layer3}`} sub="C1 / C2 / C3" />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr] gap-3 mb-3">
          <div className="border-2 border-[#333]">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Inputs de decision</span>
            </div>
            <div className="grid grid-cols-2">
              <NumInput label="Capital total" value={inputs.totalCapital} onChange={v => update('totalCapital', v)} min={1000} step={1000} />
              <NumInput label="Meses live" value={inputs.monthsLive} onChange={v => update('monthsLive', v)} />
              <NumInput label="Trades cerrados" value={inputs.closedTrades} onChange={v => update('closedTrades', v)} />
              <NumInput label="Sharpe 6m" value={inputs.sharpe6m} onChange={v => update('sharpe6m', v)} step={0.1} />
              <NumInput label="Sharpe 12m" value={inputs.sharpe12m} onChange={v => update('sharpe12m', v)} step={0.1} />
              <NumInput label="Profit factor" value={inputs.profitFactor} onChange={v => update('profitFactor', v)} step={0.1} />
              <NumInput label="Max DD" value={inputs.maxDrawdownPct} onChange={v => update('maxDrawdownPct', v)} step={0.5} suffix="%" />
              <NumInput label="Hit rate 6m" value={inputs.hitRate6m} onChange={v => update('hitRate6m', v)} step={1} suffix="%" />
              <NumInput label="IC 6m" value={inputs.realizedIc6m} onChange={v => update('realizedIc6m', v)} step={0.01} />
              <NumInput label="Costes vs estimado" value={inputs.costsVsEstimatePct} onChange={v => update('costsVsEstimatePct', v)} step={5} suffix="%" />
              <NumInput label="Errores impl." value={inputs.implementationErrors} onChange={v => update('implementationErrors', v)} />
              <NumInput label="Overrides 6m" value={inputs.discretionaryOverrides6m} onChange={v => update('discretionaryOverrides6m', v)} />
              <Toggle label="Slippage OK" checked={inputs.slippageOk} onChange={v => update('slippageOk', v)} />
              <Toggle label="Capa 2 preparada" checked={inputs.layer2Ready} onChange={v => update('layer2Ready', v)} />
              <Toggle label="Capa 3 preparada" checked={inputs.layer3Ready} onChange={v => update('layer3Ready', v)} />
            </div>
          </div>

          <div className="border-2 border-[#333]">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Gates de capital</span>
            </div>
            <div className="p-3 border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Bloqueos para anadir capital</div>
              {ramp.blockers.length ? (
                <div className="space-y-1">
                  {ramp.blockers.map(item => (
                    <div key={item} className="text-xs text-[#ef4444] font-mono">[BLOCK] {item}</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#4ade80] font-mono">[OK] Sin bloqueos duros</div>
              )}
            </div>
            <div className="p-3 border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Triggers de retirada / bajada</div>
              {ramp.regression.length ? (
                <div className="space-y-1">
                  {ramp.regression.map(item => (
                    <div key={item} className="text-xs text-[#ef4444] font-mono">[CUT] {item}</div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-[#4ade80] font-mono">[OK] Sin triggers defensivos</div>
              )}
            </div>
            <div className="p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Tramos del framework</div>
              <div className="space-y-2">
                {RAMP_STAGES.map(stage => (
                  <div key={stage.id} className={`border px-2 py-1.5 ${ramp.stage.id === stage.id ? 'border-[#ecd987] bg-[#1a1a0d]' : 'border-[#222]'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">{stage.label}</span>
                      <span className="text-[10px] font-mono text-[#777]">{stage.activePct}% activo · {stage.riskPct}% RPT</span>
                    </div>
                    <div className="text-[10px] text-[#555] mt-0.5">{stage.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Allocation por capa</span>
          </div>
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-[#0a0a0a] border-b border-[#222] text-[#444]">
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-widest w-[38%]">Bloque</th>
                <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-widest w-[18%]">Peso</th>
                <th className="px-3 py-1.5 text-right text-[10px] uppercase tracking-widest w-[22%]">Capital</th>
                <th className="px-3 py-1.5 text-left text-[10px] uppercase tracking-widest w-[22%]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} className="border-b border-[#111]">
                  <td className="px-3 py-2 font-bold text-[#a3a3a3]">{row.label}</td>
                  <td className="px-3 py-2 text-right font-mono">{row.weight == null ? '-' : `${row.weight}%`}</td>
                  <td className="px-3 py-2 text-right font-mono text-[#e5e5e5]">{money(row.capital)}</td>
                  <td className={`px-3 py-2 text-xs font-bold uppercase tracking-wider ${row.status.includes('BLOQUEADA') ? 'text-[#555]' : row.status.includes('RESERVA') ? 'text-[#ecd987]' : 'text-[#4ade80]'}`}>
                    {row.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="border border-[#222] p-3 text-[10px] text-[#444] leading-relaxed">
          Regla base: no subir de tramo automaticamente. La pagina calcula elegibilidad cuantitativa,
          pero cada aumento de capital exige revision escrita. El capital no activo debe quedar fuera
          del broker FX siempre que sea posible, en instrumento conservador o cuenta remunerada.
        </div>
      </div>
    </div>
  )
}
