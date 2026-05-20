import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import {
  EM_CURRENCIES,
  EM_TIERS,
  EM_DEFAULT_PARAMS,
  EM_ACTIVATION,
  getDriversForCurrency,
  getOperableEMCurrencies,
  getCurrencyInfo,
} from '../data/emergingMarkets'
import {
  computeEMCurrencyScore,
  checkEMFilters,
  getEMConviction,
  computeEMPositionSize,
  checkEMActivation,
} from '../lib/scoring/emergingMarkets'

const HORIZON_OPTS = [
  { value: 'SHORT', label: 'Corto (3×ATR)' },
  { value: 'MEDIUM', label: 'Medio (3.5×ATR)' },
  { value: 'LONG', label: 'Largo (4×ATR)' },
]

const EM_PAIRS = [
  'USD/MXN', 'USD/BRL', 'USD/ZAR', 'USD/KRW', 'USD/TWD',
  'EUR/PLN', 'EUR/HUF', 'EUR/CZK', 'USD/ILS',
  'USD/CNH', 'USD/INR', 'USD/TRY', 'USD/IDR', 'USD/MYR', 'USD/PHP',
]

function fmtScore(v) {
  if (!Number.isFinite(v)) return '—'
  return (v >= 0 ? '+' : '') + v.toFixed(2)
}

function scoreColor(v) {
  if (!Number.isFinite(v)) return 'text-[#555]'
  return v > 0.15 ? 'text-[#4ade80]' : v < -0.15 ? 'text-[#ef4444]' : 'text-[#555]'
}

function tierBadge(tierKey) {
  const tier = EM_TIERS[tierKey]
  if (!tier) return <span className="text-[#555]">—</span>
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${tier.color} border-current`}>
      {tier.id.replace('TIER_', 'T')}
    </span>
  )
}

function ZBar({ z }) {
  if (!Number.isFinite(z)) return <span className="text-[#333]">—</span>
  const clamped = Math.max(-4, Math.min(4, z))
  const pct = Math.abs(clamped) / 4 * 100
  const positive = clamped >= 0
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-xs font-mono font-bold w-12 text-right ${z === 0 ? 'text-[#333]' : z > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
        {z >= 0 ? '+' : ''}{z.toFixed(2)}
      </span>
      <div className="w-12 h-1 bg-[#1a1a1a] relative flex-shrink-0">
        {positive
          ? <div className="absolute left-1/2 top-0 h-full bg-[#4ade80]" style={{ width: `${pct / 2}%` }} />
          : <div className="absolute right-1/2 top-0 h-full bg-[#ef4444]" style={{ width: `${pct / 2}%` }} />
        }
        <div className="absolute left-1/2 top-0 w-px h-full bg-[#333]" />
      </div>
    </div>
  )
}

function NumInput({ label, value, onChange, min, max, step, suffix }) {
  return (
    <div className="p-3 border-r border-b border-[#222]">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]"
        />
        {suffix && <span className="text-[10px] text-[#555]">{suffix}</span>}
      </div>
    </div>
  )
}

export default function EmergingMarketsOpsPage() {
  const { features, history, worldview } = useModelStore()
  const vixRaw = worldview?.vixRaw ?? worldview?.vix ?? 20
  const dxy = worldview?.dxy ?? 100

  // Activation inputs
  const [g10Months, setG10Months] = useState(24)
  const [sharpe12m, setSharpe12m] = useState(0.8)
  const [capitalActivation, setCapitalActivation] = useState(75000)
  const [hasNDFBroker, setHasNDFBroker] = useState(false)

  // Sizing inputs
  const [capital, setCapital] = useState(100000)
  const [pair, setPair] = useState('USD/MXN')
  const [stopPips, setStopPips] = useState(120)
  const [atrPips, setAtrPips] = useState(0)
  const [horizon, setHorizon] = useState('MEDIUM')
  const [convictionOverride, setConvictionOverride] = useState('AUTO')
  const [ddPct, setDdPct] = useState(0)
  const [emExposurePct, setEmExposurePct] = useState(0)
  const [hasEventNearby, setHasEventNearby] = useState(false)
  const [dxy6mChange, setDxy6mChange] = useState(2)

  // Active currency tab
  const operable = getOperableEMCurrencies()
  const [activeCcy, setActiveCcy] = useState(operable[0]?.ccy ?? 'MXN')

  // Computed
  const activation = checkEMActivation({ g10Months, sharpe12m, capital: capitalActivation, hasNDFBroker })

  const alerts = useMemo(() =>
    checkEMFilters(worldview, { dxy6mChange, hasEventNearby }),
    [worldview, dxy6mChange, hasEventNearby]
  )

  const emScores = useMemo(() => {
    const scores = {}
    for (const c of operable) {
      scores[c.ccy] = computeEMCurrencyScore(c.ccy, features.valuesBySourceId, history)
    }
    return scores
  }, [operable, features.valuesBySourceId, history])

  const activeScore = emScores[activeCcy]
  const activeConviction = convictionOverride === 'AUTO'
    ? getEMConviction(activeScore?.score ?? 0)
    : convictionOverride

  const sizing = useMemo(() => computeEMPositionSize({
    capital, stopPips, pair, conviction: activeConviction,
    atrPips, horizon, ddPct, emExposurePct,
  }), [capital, stopPips, pair, activeConviction, atrPips, horizon, ddPct, emExposurePct])

  const sortedCurrencies = [...operable].sort((a, b) =>
    (emScores[b.ccy]?.score ?? 0) - (emScores[a.ccy]?.score ?? 0)
  )

  const maxAbsScore = Math.max(...operable.map(c => Math.abs(emScores[c.ccy]?.score ?? 0)), 0.001)

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">EMERGING MARKETS</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Extensión EM — Tiers · Drivers · Filtros · Sizing</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/data/raw?module=EM"
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white transition-colors">
              Actualizar →
            </Link>
          </div>
        </div>

        {/* ── ACTIVATION PREREQUISITES ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Activación del Módulo EM</span>
            <span className="text-[10px] text-[#555]">Prerrequisitos mínimos</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
            <NumInput label="G10 operativo (meses)" value={g10Months} onChange={setG10Months} min={0} step={1} />
            <NumInput label="Sharpe G10 12m" value={sharpe12m} onChange={setSharpe12m} min={-2} max={5} step={0.1} />
            <NumInput label="Capital (USD)" value={capitalActivation} onChange={setCapitalActivation} min={0} step={5000} />
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Broker NDF</div>
              <div className="flex gap-2">
                {[
                  { label: 'Sí', val: true },
                  { label: 'No', val: false },
                ].map(o => (
                  <button key={String(o.val)}
                    onClick={() => setHasNDFBroker(o.val)}
                    className={`px-3 py-0.5 text-xs font-bold uppercase tracking-wider border ${hasNDFBroker === o.val ? 'border-[#ecd987] text-[#ecd987]' : 'border-[#333] text-[#444] hover:border-[#555]'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="px-3 py-2 flex items-center gap-3">
            <span className={`text-xs font-bold uppercase tracking-wider ${activation.allPass ? 'text-[#4ade80]' : 'text-[#f59e0b]'}`}>
              {activation.allPass ? '✓ TODOS LOS PREREQUISITOS CUMPLIDOS' : '⚠ FALTAN PREREQUISITOS'}
            </span>
            <span className="text-[10px] text-[#555]">
              {activation.checks.filter(c => c.pass).length}/{activation.checks.length} checks pass
            </span>
          </div>
          {!activation.allPass && (
            <div className="px-3 pb-2">
              {activation.checks.filter(c => !c.pass).map(c => (
                <div key={c.label} className="text-[10px] text-[#f59e0b] mb-0.5">
                  ✗ {c.label}
                </div>
              ))}
            </div>
          )}
          {/* Ramp-up plan */}
          {activation.allPass && (
            <div className="px-3 py-2 border-t border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1.5">Plan de Ramp-up EM</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {EM_ACTIVATION.rampUp.map(r => (
                  <div key={r.months} className="border border-[#222] p-2">
                    <div className="text-[10px] text-[#ecd987] font-bold uppercase">{r.months}</div>
                    <div className="text-[10px] text-[#aaa]">{r.currencies.join(', ')}</div>
                    {r.note && <div className="text-[9px] text-[#555] mt-0.5">{r.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── EM FILTERS / ALERTS ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Filtros EM Específicos</span>
            <span className="text-[10px] text-[#555]">VIX · DXY · Eventos</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">VIX actual</div>
              <div className={`text-lg font-mono font-bold ${vixRaw > 25 ? 'text-[#ef4444]' : vixRaw > 20 ? 'text-[#f59e0b]' : 'text-[#4ade80]'}`}>
                {vixRaw.toFixed(1)}
              </div>
              <div className="text-[9px] text-[#444]">Veto si &gt; 25</div>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">DXY actual</div>
              <div className="text-lg font-mono font-bold text-[#a3a3a3]">{dxy.toFixed(1)}</div>
              <div className="text-[9px] text-[#444]">Veto si +5% en 6m</div>
            </div>
            <NumInput label="DXY Δ 6m (%)" value={dxy6mChange} onChange={setDxy6mChange} min={-10} max={20} step={0.1} suffix="%" />
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Evento EM próximo</div>
              <div className="flex gap-2">
                {[
                  { label: 'Sí', val: true },
                  { label: 'No', val: false },
                ].map(o => (
                  <button key={String(o.val)}
                    onClick={() => setHasEventNearby(o.val)}
                    className={`px-3 py-0.5 text-xs font-bold uppercase tracking-wider border ${hasEventNearby === o.val ? 'border-[#ef4444] text-[#ef4444]' : 'border-[#333] text-[#444] hover:border-[#555]'}`}>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {alerts.length === 0 ? (
            <div className="px-3 py-2 text-[10px] text-[#4ade80] font-bold uppercase tracking-widest">
              ✓ Sin filtros activos — condiciones favorables para EM
            </div>
          ) : (
            <div>
              {alerts.map((alert, i) => (
                <div key={i}
                  className={`px-3 py-2 border-b border-[#222] flex items-start gap-3 ${alert.severity === 'CRITICAL' ? 'bg-[#1a0a0a]' : 'bg-[#1a1200]'}`}>
                  <span className={`text-xs font-bold font-mono mt-0.5 ${alert.severity === 'CRITICAL' ? 'text-[#ef4444]' : 'text-[#f59e0b]'}`}>
                    {alert.type}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#e5e5e5]">{alert.label}</div>
                    <div className="text-[10px] text-[#777] mt-0.5">{alert.message}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── TIER CLASSIFICATION ── */}
        <div className="border-2 border-[#333] mb-3 overflow-hidden">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Universo EM — Clasificación por Tier</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#222] text-left text-[#444]">
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[8%]">Tier</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[8%]">Ccy</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[14%]">Nombre</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[10%]">Regimen</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[10%]">Retail</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[12%]">Instrumento</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[10%]">Spread</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[28%]">Notas</th>
                </tr>
              </thead>
              <tbody>
                {EM_CURRENCIES.map(c => (
                  <tr key={c.ccy}
                    className={`border-b border-[#111] hover:bg-[#0a0a0a] transition-colors ${!EM_TIERS[c.tier]?.operable ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2">{tierBadge(c.tier)}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-bold text-[#e5e5e5]">{c.ccy}</span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[#aaa]">{c.name}</td>
                    <td className="px-3 py-2 text-[10px] text-[#777]">{c.regime}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-bold ${c.retailOperable ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                        {c.retailOperable ? 'Sí' : 'No'}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[10px] text-[#777]">{c.instrument}</td>
                    <td className="px-3 py-2 text-[10px] font-mono text-[#777]">{c.spreadPips}</td>
                    <td className="px-3 py-2 text-[10px] text-[#555]">{c.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── EM SCORING DASHBOARD ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Scoring EM — Drivers por Divisa</span>
            <span className="text-[10px] text-[#555]">Ponderado por relevancia · z-score o raw proxy</span>
          </div>

          {/* Currency ranking */}
          <div className="grid grid-cols-3 sm:grid-cols-5 border-b border-[#222]">
            {sortedCurrencies.map((c, i) => {
              const s = emScores[c.ccy]
              const barPct = maxAbsScore > 0 ? Math.abs(s?.score ?? 0) / maxAbsScore * 100 : 0
              const isActive = activeCcy === c.ccy
              return (
                <button key={c.ccy}
                  onClick={() => setActiveCcy(c.ccy)}
                  className={`p-2.5 border-r border-b border-[#1a1a1a] text-center transition-colors ${isActive ? 'bg-[#111] border-b-2 border-b-[#ecd987]' : 'hover:bg-[#0a0a0a]'}`}>
                  <div className="text-[9px] text-[#444] uppercase mb-0.5">#{i + 1}</div>
                  <div className={`text-xs font-bold uppercase mb-1 ${isActive ? 'text-[#ecd987]' : 'text-[#a3a3a3]'}`}>{c.ccy}</div>
                  <div className={`text-base font-mono font-bold ${scoreColor(s?.score ?? 0)}`}>
                    {fmtScore(s?.score ?? 0)}
                  </div>
                  <div className="mt-1.5 h-1 bg-[#1a1a1a] overflow-hidden">
                    <div className={`h-full ${(s?.score ?? 0) > 0 ? 'bg-[#4ade80]' : (s?.score ?? 0) < 0 ? 'bg-[#ef4444]' : 'bg-[#333]'}`}
                      style={{ width: `${barPct}%` }} />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Active currency detail */}
          {activeScore && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xl font-bold text-[#ecd987] uppercase">{activeCcy}</span>
                  <span className="text-sm font-mono font-bold">Score: {fmtScore(activeScore.score)}</span>
                  <span className={`text-xs font-bold uppercase px-2 py-0.5 border ${activeConviction === 'FULL' ? 'border-[#4ade80] text-[#4ade80]' : activeConviction === 'HALF' ? 'border-[#f59e0b] text-[#f59e0b]' : 'border-[#555] text-[#555]'}`}>
                    {activeConviction}
                  </span>
                </div>
                <span className="text-[10px] text-[#555]">
                  {activeScore.n > 0 ? `${activeScore.details.length} drivers activos` : 'Sin datos'}
                </span>
              </div>

              {activeScore.details.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[500px]">
                    <thead>
                      <tr className="bg-[#0a0a0a] border-b border-[#222] text-[#444] text-left">
                        <th className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest w-[35%]">Driver</th>
                        <th className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest w-[15%]">Categoría</th>
                        <th className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest w-[10%]">Peso</th>
                        <th className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest w-[20%]">z-score</th>
                        <th className="px-2 py-1 text-[10px] font-bold uppercase tracking-widest w-[20%]">Contribución</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeScore.details.map((d, i) => (
                        <tr key={i} className="border-b border-[#111] hover:bg-[#0a0a0a]">
                          <td className="px-2 py-1.5">
                            <span className="text-xs font-bold text-[#e5e5e5]">{d.label}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-[#777]">{d.driver.split('_').pop()}</span>
                          </td>
                          <td className="px-2 py-1.5 text-[10px] font-mono text-[#aaa]">{d.weight}</td>
                          <td className="px-2 py-1.5"><ZBar z={d.z} /></td>
                          <td className="px-2 py-1.5">
                            <span className={`text-xs font-mono font-bold ${d.contrib > 0 ? 'text-[#4ade80]' : d.contrib < 0 ? 'text-[#ef4444]' : 'text-[#555]'}`}>
                              {fmtScore(d.contrib)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-[10px] text-[#555] py-2">
                  Sin datos de drivers. Importa valores en Data Hub usando los IDs em_&lt;ccy&gt;_&lt;driver&gt;.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── EM POSITION SIZING ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Sizing EM — Calculadora</span>
            <span className="text-[10px] text-[#555]">0.5% RPT · ATR×3–4 · Max 30% EM</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Par</div>
              <select value={pair} onChange={e => setPair(e.target.value)}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]">
                {EM_PAIRS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <NumInput label="Capital (USD)" value={capital} onChange={setCapital} min={1000} step={1000} />
            <NumInput label="Stop distance (pips)" value={stopPips} onChange={setStopPips} min={0} step={5} />
            <NumInput label="ATR del par (pips)" value={atrPips} onChange={setAtrPips} min={0} step={1} />
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Horizonte</div>
              <select value={horizon} onChange={e => setHorizon(e.target.value)}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]">
                {HORIZON_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Convicción</div>
              <div className="flex gap-1 flex-wrap">
                {['AUTO', 'FULL', 'HALF', 'FLAT'].map(c => (
                  <button key={c} onClick={() => setConvictionOverride(c)}
                    className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${convictionOverride === c ? 'border-[#ecd987] text-[#ecd987]' : 'border-[#333] text-[#444] hover:border-[#555]'}`}>
                    {c}
                  </button>
                ))}
              </div>
              {convictionOverride === 'AUTO' && (
                <div className="text-[9px] text-[#555] mt-1">Auto: {activeConviction} (|score|≥{EM_DEFAULT_PARAMS.convictionMinEntry}σ)</div>
              )}
            </div>
            <NumInput label="DD actual (%)" value={ddPct} onChange={setDdPct} min={0} max={100} step={0.5} suffix="%" />
            <NumInput label="Exposición EM actual (%)" value={emExposurePct} onChange={setEmExposurePct} min={0} max={100} step={1} suffix="%" />
          </div>

          {/* Results */}
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Lotes ajustados', value: `${sizing.lots.toFixed(3)}`, highlight: true },
              { label: 'Lotes raw (sin DD)', value: `${sizing.rawLots?.toFixed(3) ?? '—'}` },
              { label: 'Riesgo en USD', value: `$${(sizing.riskUsd ?? 0).toLocaleString()}` },
              { label: 'Stop / TP', value: `${sizing.stopPips ?? '—'} / ${sizing.tpPips ?? '—'} pips` },
            ].map(item => (
              <div key={item.label} className={`p-3 border-r border-b border-[#222] ${item.highlight ? 'bg-[#1a1a0d]' : ''}`}>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-lg font-mono font-bold ${item.highlight ? 'text-[#ecd987]' : 'text-[#e5e5e5]'}`}>{item.value}</div>
              </div>
            ))}
          </div>

          {/* Verdict */}
          <div className={`p-4 border-t border-[#333] flex items-center justify-between ${sizing.verdict === 'OPERAR' ? 'bg-[#0a1a0a]' : 'bg-[#1a0a0a]'}`}>
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Veredicto</div>
              <div className={`text-2xl font-mono font-bold ${sizing.verdict === 'OPERAR' ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                {sizing.verdict}
              </div>
              {sizing.notes?.length > 0 && (
                <div className="text-[10px] text-[#f59e0b] mt-1">
                  {sizing.notes.join(' · ')}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Parámetros EM</div>
              <div className="text-[10px] text-[#777]">
                RPT {EM_DEFAULT_PARAMS.riskPerTrade}% · ATR×{sizing.atrMult ?? '—'} · Max EM {EM_DEFAULT_PARAMS.maxNotionalTotalEM}%
              </div>
            </div>
          </div>
        </div>

        {/* ── PARAMETERS COMPARISON ── */}
        <div className="border-2 border-[#333] mb-3 overflow-hidden">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Parámetros Default — EM vs G10</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[500px]">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#222] text-[#444] text-left">
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[35%]">Parámetro</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[20%]">EM</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[20%]">G10</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[25%]">Razón</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { param: 'Risk per trade', em: '0.5%', g10: '1.0%', reason: 'Mayor vol idiosincrática + gap risk' },
                  { param: 'Kelly fraction', em: '1/6', g10: '1/4 – 1/8', reason: 'Más conservador' },
                  { param: 'Vol target anual', em: '8%', g10: '12%', reason: 'Menor vol objetivo' },
                  { param: 'ATR multiplier stop', em: '3.0–4.0', g10: '2.0–3.0', reason: 'Ruido + gap risk mayor' },
                  { param: 'Convicción mínima', em: '1.8σ', g10: '1.0σ', reason: 'Edge requerido mayor por costes' },
                  { param: 'Stop temporal', em: '70–80% horiz.', g10: '80–100%', reason: 'Tesis EM expira más rápido' },
                  { param: 'Max trades simultáneos', em: '2', g10: '3', reason: 'Limitar concentración' },
                  { param: 'Notional total EM', em: '≤ 30%', g10: '—', reason: 'EM correlacionan en crisis' },
                  { param: 'Notional por divisa EM', em: '≤ 8%', g10: '—', reason: 'Limitar concentración' },
                  { param: 'Notional TIER 2–3', em: '≤ 10%', g10: '—', reason: 'Mayor fricción' },
                  { param: 'w_exo promedio', em: '0.65', g10: '0.40', reason: 'Drivers externos dominan en EM' },
                  { param: 'Ventana z-score', em: '5Y o 10Y', g10: '10Y', reason: 'Según estabilidad estructural' },
                ].map((row, i) => (
                  <tr key={i} className="border-b border-[#111] hover:bg-[#0a0a0a]">
                    <td className="px-3 py-2 text-xs font-bold text-[#e5e5e5]">{row.param}</td>
                    <td className="px-3 py-2 text-xs font-mono font-bold text-[#ecd987]">{row.em}</td>
                    <td className="px-3 py-2 text-xs font-mono text-[#aaa]">{row.g10}</td>
                    <td className="px-3 py-2 text-[10px] text-[#555]">{row.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── NDF / EXECUTION NOTES ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Operativa NDF y Costes EM</span>
          </div>
          <div className="p-3 space-y-2 text-[11px] text-[#aaa] leading-relaxed">
            <p>
              <span className="text-[#ecd987] font-bold">NDF (Non-Deliverable Forward):</span> Para TIER 2 (KRW, INR, IDR, MYR, PHP, TWD) el spot no es deliverable offshore. La operativa estándar es NDF: settlement en USD diferencial, sin entrega física de la divisa subyacente.
            </p>
            <p>
              <span className="text-[#ecd987] font-bold">Costes EM:</span> Spreads 3–10× mayores que G10. Swap points pueden ser desfavorables (especialmente TRY, ARS). Slippage en noticias soberanas es elevado. Añade 0.5–1.0 pips de “EM tax” a tu modelo de costes.
            </p>
            <p>
              <span className="text-[#ecd987] font-bold">TIER 3–4:</span> No operar direccionalmente con framework macro. HKD/AED/SAR/DKK son pegs — solo optionality en break. ARS/VES/TRY-hiper son fuera de scope para v1.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
