import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { INDICATORS, loadBetas, computeBetaTotal } from '../lib/endogenousBetas'
import { computePositionSize, PIP_VALUES, CONVICTION_MULTIPLIER, REGIME_VOL_MULTIPLIER } from '../lib/risk/sizing'
import { getRegimeMultiplier, getConviction } from '../lib/scoring/regime'
import { DRAWDOWN_LEVELS, getDrawdownLevel, getRampupStage, computeCircuitBreakers, computePortfolioExposure } from '../lib/risk/drawdown'

const PAIRS = Object.keys(PIP_VALUES)

const COUNTRIES = [
  { label: 'USD', prefix: 'usa', cyclical: false },
  { label: 'EUR', prefix: 'eur', cyclical: true  },
  { label: 'JPY', prefix: 'jpn', cyclical: false },
  { label: 'GBP', prefix: 'gbr', cyclical: true  },
  { label: 'CHF', prefix: 'che', cyclical: false },
  { label: 'CAD', prefix: 'can', cyclical: true  },
  { label: 'AUD', prefix: 'aus', cyclical: true  },
  { label: 'NZD', prefix: 'nzl', cyclical: true  },
  { label: 'SEK', prefix: 'swe', cyclical: true  },
  { label: 'NOK', prefix: 'nor', cyclical: true  },
]

const PAIR_TO_COUNTRIES = {
  'EUR/USD': ['eur', 'usa'], 'USD/JPY': ['usa', 'jpn'], 'GBP/USD': ['gbr', 'usa'],
  'USD/CHF': ['usa', 'che'], 'AUD/USD': ['aus', 'usa'], 'USD/CAD': ['usa', 'can'],
  'NZD/USD': ['nzl', 'usa'], 'USD/NOK': ['usa', 'nor'], 'USD/SEK': ['usa', 'swe'],
}

function computeCountryScore(prefix, cyclical, regime, zScores, betas) {
  const rm = getRegimeMultiplier(regime, cyclical)
  const betaTotal = computeBetaTotal(betas)
  let short = 0, medium = 0, longScore = 0
  for (const ind of INDICATORS) {
    const beta    = betas[ind.key] ?? ind.betaDoc
    const z       = zScores[`${prefix}_${ind.key}`] ?? 0
    const contrib = (beta / betaTotal) * z * ind.sign * rm
    if (ind.horizon === 'SHORT')  short     += contrib
    if (ind.horizon === 'MEDIUM') medium    += contrib
    if (ind.horizon === 'LONG')   longScore += contrib
  }
  return 0.20 * short + 0.50 * medium + 0.30 * longScore
}

function fmtLots(v) {
  if (!v || v === 0) return '0.000'
  return v.toFixed(3)
}

export default function RiskOpsPage() {
  const { regime, zscores: zScores, signalHistory } = useModelStore()
  const [betas] = useState(loadBetas)
  const [searchParams] = useSearchParams()

  // Config — initialize from URL params if present (passed from Dashboard/Timing flow)
  const [capital,      setCapital]      = useState(100000)
  const [riskPct,      setRiskPct]      = useState(1.0)
  const [pair,         setPair]         = useState(() => {
    const p = searchParams.get('pair')
    return p && PAIRS.includes(p) ? p : 'EUR/USD'
  })
  const [stopPips,     setStopPips]     = useState(80)
  const [atrPips,      setAtrPips]      = useState(0)
  const [horizon,      setHorizon]      = useState('MEDIUM')
  const [conviction,   setConviction]   = useState(() => {
    const c = searchParams.get('conviction')
    return ['FULL', 'HALF', 'FLAT'].includes(c) ? c : 'FULL'
  })
  const [regimeVol,    setRegimeVol]    = useState('NORMAL')
  const [winRate,      setWinRate]      = useState(0.50)
  const [avgWinLoss,   setAvgWinLoss]   = useState(1.5)
  const [kellyFrac,    setKellyFrac]    = useState(0.25)
  const [volTarget,    setVolTarget]    = useState(12)
  const [annualVol,    setAnnualVol]    = useState(8)

  // Drawdown & circuit breaker inputs
  const [peakCapital,        setPeakCapital]        = useState(100000)
  const [currentCapital,     setCurrentCapital]     = useState(100000)
  const [maxDDCapital,       setMaxDDCapital]        = useState(100000)
  const [intradayPnlPct,     setIntradayPnlPct]     = useState(0)
  const [weeklyPnlPct,       setWeeklyPnlPct]       = useState(0)
  const [consecutiveLosers,  setConsecutiveLosers]  = useState(0)

  // Open positions for portfolio exposure
  const [openPositions, setOpenPositions] = useState([
    { pair: 'EUR/USD', lots: 0, direction: 'LONG' },
  ])

  // Auto-populate conviction from endogenous signal
  const autoConviction = useMemo(() => {
    const ccys = PAIR_TO_COUNTRIES[pair]
    if (!ccys) return 'HALF'
    const byPrefix = new Map(COUNTRIES.map(c => [c.prefix, c]))
    const base  = byPrefix.get(ccys[0])
    const quote = byPrefix.get(ccys[1])
    if (!base || !quote) return 'HALF'
    const scoreBase  = computeCountryScore(base.prefix,  base.cyclical,  regime, zScores, betas)
    const scoreQuote = computeCountryScore(quote.prefix, quote.cyclical, regime, zScores, betas)
    return getConviction(scoreBase - scoreQuote, signalHistory[pair])
  }, [pair, regime, zScores, betas, signalHistory])

  const ddPct = peakCapital > 0
    ? Math.max(0, (peakCapital - currentCapital) / peakCapital * 100)
    : 0

  const result = useMemo(() => computePositionSize({
    capital, riskPct, stopPips, pair, conviction, regimeVol, horizon,
    winRate, avgWinLoss, kellyFraction: kellyFrac, volTargetPct: volTarget,
    annualVolPct: annualVol, atrPips, ddPct,
  }), [capital, riskPct, stopPips, pair, conviction, regimeVol, horizon, winRate, avgWinLoss, kellyFrac, volTarget, annualVol, atrPips, ddPct])

  const activeDDLevel  = getDrawdownLevel(ddPct)
  const rampup         = getRampupStage(peakCapital, maxDDCapital, currentCapital)
  const circuitBreakers = computeCircuitBreakers({ intradayPnlPct, weeklyPnlPct, ddPct, consecutiveLosers })
  const portfolio      = useMemo(() => computePortfolioExposure(openPositions), [openPositions])

  const verdictColor = result.verdict === 'OPERAR' ? 'text-[#4ade80]' : 'text-[#ef4444]'

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

  function SelectInput({ label, value, onChange, options }) {
    return (
      <div className="p-3 border-r border-b border-[#222]">
        <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]"
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    )
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">RISK MANAGEMENT</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Módulo VI — Sizing · Stops · Circuit Breakers</p>
          </div>
          <div className="flex gap-3 text-[10px]">
            <Link to="/timing/operativa" className="font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">← TIMING</Link>
            <Link to="/execution/operativa" className="font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">EXECUTION →</Link>
          </div>
        </div>

        {/* Inputs */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Inputs del Trade</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {/* Par */}
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Par</div>
              <select value={pair} onChange={e => setPair(e.target.value)}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]">
                {PAIRS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <NumInput label="Capital (USD)" value={capital} onChange={setCapital} min={1000} step={1000} />
            <NumInput label="Risk % por trade" value={riskPct} onChange={setRiskPct} min={0.1} max={5} step={0.1} suffix="%" />
            <NumInput label="Stop distance (pips)" value={stopPips} onChange={setStopPips} min={0} step={5} />
            <NumInput label="ATR del par (pips)" value={atrPips} onChange={setAtrPips} min={0} step={1} />
            <SelectInput label="Horizonte" value={horizon} onChange={setHorizon}
              options={[{value:'SHORT',label:'Corto (2×ATR)'},{value:'MEDIUM',label:'Medio (2.5×ATR)'},{value:'LONG',label:'Largo (3×ATR)'}]} />
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Convicción</div>
              <div className="flex gap-1 flex-wrap">
                {['FULL','HALF','FLAT'].map(c => (
                  <button key={c} onClick={() => setConviction(c)}
                    className={`px-2 py-0.5 text-xs font-bold uppercase tracking-wider border ${conviction===c ? 'border-[#ecd987] text-[#ecd987]' : 'border-[#333] text-[#444] hover:border-[#555]'}`}>
                    {c}
                  </button>
                ))}
                <button onClick={() => setConviction(autoConviction)}
                  className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:border-[#ecd987] hover:text-[#ecd987]">
                  Auto ({autoConviction})
                </button>
              </div>
            </div>
            <SelectInput label="Régimen Volat." value={regimeVol} onChange={setRegimeVol}
              options={[{value:'LOW',label:'Low (×1.0)'},{value:'NORMAL',label:'Normal (×1.0)'},{value:'HIGH',label:'High (×0.7)'},{value:'EXTREME',label:'Extreme (×0.4)'}]} />
          </div>

          {/* Kelly / Vol-target params (collapsible) */}
          <details className="border-t border-[#222]">
            <summary className="px-3 py-2 text-[10px] text-[#555] uppercase tracking-wider cursor-pointer hover:text-[#a3a3a3]">
              Kelly & Vol-Target params ▾
            </summary>
            <div className="grid grid-cols-2 sm:grid-cols-5 border-t border-[#222]">
              <NumInput label="Win Rate" value={winRate} onChange={setWinRate} min={0} max={1} step={0.01} />
              <NumInput label="Avg Win/Loss" value={avgWinLoss} onChange={setAvgWinLoss} min={0.1} step={0.1} />
              <NumInput label="Kelly Fraction" value={kellyFrac} onChange={setKellyFrac} min={0.05} max={1} step={0.05} />
              <NumInput label="Vol Target %" value={volTarget} onChange={setVolTarget} min={1} max={30} step={1} suffix="%" />
              <NumInput label="Vol Anual Par %" value={annualVol} onChange={setAnnualVol} min={1} max={50} step={0.5} suffix="%" />
            </div>
          </details>
        </div>

        {/* Resultados */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Resultado del Sizing</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4">
            {[
              { label: 'Método 1 — Risk/Trade', value: `${fmtLots(result.lots1)} lotes`, sub: `${riskPct}% de capital` },
              { label: 'Método 2 — ¼ Kelly',     value: `${fmtLots(result.lots2)} lotes`, sub: `p=${winRate} b=${avgWinLoss}` },
              { label: 'Método 3 — Vol-Target',  value: `${fmtLots(result.lots3)} lotes`, sub: `${volTarget}% objetivo` },
              { label: 'MIN de los 3',           value: `${fmtLots(result.lotsMin)} lotes`, sub: 'binding constraint', highlight: true },
            ].map(item => (
              <div key={item.label} className={`p-3 border-r border-b border-[#222] ${item.highlight ? 'bg-[#1a1a0d]' : ''}`}>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-lg font-mono font-bold ${item.highlight ? 'text-[#ecd987]' : 'text-[#e5e5e5]'}`}>{item.value}</div>
                <div className="text-[10px] text-[#444] mt-0.5">{item.sub}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#222]">
            {[
              { label: `Lotes ajustados (conv+régimen+DD ×${result.ddMult?.toFixed(2) ?? '1.00'})`, value: `${fmtLots(result.lotsAdjusted)} lotes` },
              { label: 'Riesgo en USD',                 value: `$${result.riskUsd?.toFixed(0) ?? '—'}` },
              { label: `Stop loss (${result.stopPips} pips)`, value: `${result.stopPips ?? '—'} pips` },
              { label: `Take profit min 1.5R (${result.tpPips} pips)`, value: `${result.tpPips ?? '—'} pips` },
            ].map(item => (
              <div key={item.label} className="p-3 border-r border-b border-[#222]">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                <div className="text-lg font-mono font-bold text-[#a3a3a3]">{item.value}</div>
              </div>
            ))}
          </div>
          <div className={`p-4 border-t border-[#333] flex items-center justify-between ${result.verdict === 'OPERAR' ? 'bg-[#0a1a0a]' : 'bg-[#1a0a0a]'}`}>
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Veredicto</div>
              <div className={`text-2xl font-mono font-bold ${verdictColor}`}>{result.verdict}</div>
              {result.verdict === 'NO OPERAR' && (
                <div className="text-xs text-[#555] mt-0.5">Convicción FLAT — señal insuficiente</div>
              )}
            </div>
            {result.verdict === 'OPERAR' && (
              <Link to="/execution/operativa"
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#4ade80] text-black hover:bg-[#22c55e] transition-colors">
                → Execution
              </Link>
            )}
          </div>
        </div>

        {/* ── DRAWDOWN STATUS ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Drawdown Protocol (§19)</span>
            <span className="text-[10px] text-[#555]">Peak · Current · Worst equity</span>
          </div>
          {/* Equity inputs */}
          <div className="grid grid-cols-3 border-b border-[#222]">
            <NumInput label="Peak Equity ($)" value={peakCapital}    onChange={setPeakCapital}    min={0} step={1000} />
            <NumInput label="Current Equity ($)" value={currentCapital} onChange={setCurrentCapital} min={0} step={1000} />
            <NumInput label="Worst Equity ($)" value={maxDDCapital}   onChange={setMaxDDCapital}   min={0} step={1000} />
          </div>
          {/* 6-level table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#222] text-[#444]">
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[15%]">Estado</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[15%]">DD desde peak</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[12%]">Sizing</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[40%]">Acción</th>
                  <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest w-[18%]">Trigger ($)</th>
                </tr>
              </thead>
              <tbody>
                {DRAWDOWN_LEVELS.map(level => {
                  const isActive = activeDDLevel.id === level.id
                  return (
                    <tr key={level.id}
                      className={`border-b border-[#111] ${isActive ? 'bg-[#1a1200]' : ''}`}>
                      <td className="px-3 py-2">
                        <span className="font-bold font-mono" style={{ color: isActive ? level.color : '#555' }}>
                          {isActive ? '▶ ' : ''}{level.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[#777]">
                        {level.minPct}%{level.maxPct < 999 ? `–${level.maxPct}%` : '+'}
                      </td>
                      <td className="px-3 py-2 font-mono font-bold" style={{ color: level.color }}>
                        ×{level.mult.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-[#666]">{level.action}</td>
                      <td className="px-3 py-2 text-right font-mono text-[#555]">
                        {level.minPct > 0
                          ? `−$${(peakCapital * level.minPct / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Ramp-up */}
          {rampup && rampup.stage !== null && (
            <div className="px-3 py-2 border-t border-[#222] bg-[#0d1520]">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#60a5fa]">Ramp-up — </span>
              <span className="text-[10px] text-[#60a5fa]">{rampup.label}</span>
            </div>
          )}
        </div>

        {/* ── CIRCUIT BREAKERS ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Circuit Breakers Automáticos</span>
          </div>
          <div className="grid grid-cols-3 border-b border-[#222]">
            <NumInput label="P&L intradía %" value={intradayPnlPct}    onChange={setIntradayPnlPct}    min={-20} max={20} step={0.1} suffix="%" />
            <NumInput label="P&L semanal %"  value={weeklyPnlPct}      onChange={setWeeklyPnlPct}      min={-30} max={30} step={0.1} suffix="%" />
            <NumInput label="Losers consec."  value={consecutiveLosers} onChange={v => setConsecutiveLosers(Math.round(v))} min={0} max={20} step={1} />
          </div>
          {circuitBreakers.length === 0 ? (
            <div className="px-3 py-3 text-[10px] text-[#4ade80] font-bold uppercase tracking-widest">
              ✓ Sin circuit breakers activos
            </div>
          ) : (
            <div>
              {circuitBreakers.map(cb => (
                <div key={cb.id}
                  className={`px-3 py-2 border-b border-[#222] flex items-start gap-3 ${cb.severity === 'HALT' ? 'bg-[#1f0d0d]' : 'bg-[#1a1400]'}`}>
                  <span className={`text-xs font-bold font-mono mt-0.5 ${cb.severity === 'HALT' ? 'text-[#ef4444]' : cb.severity === 'REDUCE' ? 'text-[#f59e0b]' : 'text-[#f97316]'}`}>
                    {cb.severity}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-[#e5e5e5]">{cb.label}</div>
                    <div className="text-[10px] text-[#777] mt-0.5">{cb.action}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="px-3 py-1.5 border-t border-[#222] text-[10px] text-[#444]">
            Triggers: intradía &gt;3% · semanal &gt;6% · 5 losers consecutivos · DD≥20%
          </div>
        </div>

        {/* ── PORTFOLIO EXPOSURE ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Portfolio Exposure (§18)</span>
            <button onClick={() => setOpenPositions(p => [...p, { pair: 'EUR/USD', lots: 0, direction: 'LONG' }])}
              className="text-[10px] font-bold text-[#555] hover:text-[#ecd987] border border-[#333] px-2 py-0.5 hover:border-[#ecd987]">
              + Posición
            </button>
          </div>
          {/* Positions table */}
          <table className="w-full text-xs table-fixed border-b border-[#222]">
            <thead>
              <tr className="bg-[#0a0a0a] border-b border-[#222] text-[#444]">
                <th className="px-2 py-1.5 text-left font-bold uppercase tracking-widest w-[30%]">Par</th>
                <th className="px-2 py-1.5 text-left font-bold uppercase tracking-widest w-[20%]">Lotes</th>
                <th className="px-2 py-1.5 text-left font-bold uppercase tracking-widest w-[25%]">Dir.</th>
                <th className="px-2 py-1.5 text-right font-bold uppercase tracking-widest w-[25%]">✕</th>
              </tr>
            </thead>
            <tbody>
              {openPositions.map((pos, i) => (
                <tr key={i} className="border-b border-[#111]">
                  <td className="px-2 py-1">
                    <select value={pos.pair}
                      onChange={e => setOpenPositions(p => p.map((x, j) => j === i ? { ...x, pair: e.target.value } : x))}
                      className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-xs px-1 py-0.5 w-full focus:outline-none">
                      {Object.keys(PIP_VALUES).map(p => <option key={p}>{p}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" value={pos.lots} min={0} step={0.01}
                      onChange={e => setOpenPositions(p => p.map((x, j) => j === i ? { ...x, lots: parseFloat(e.target.value) || 0 } : x))}
                      className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-xs px-1 py-0.5 w-full focus:outline-none" />
                  </td>
                  <td className="px-2 py-1">
                    <button onClick={() => setOpenPositions(p => p.map((x, j) => j === i ? { ...x, direction: x.direction === 'LONG' ? 'SHORT' : 'LONG' } : x))}
                      className={`text-xs font-bold px-2 py-0.5 border ${pos.direction === 'LONG' ? 'border-[#4ade80] text-[#4ade80]' : 'border-[#ef4444] text-[#ef4444]'}`}>
                      {pos.direction}
                    </button>
                  </td>
                  <td className="px-2 py-1 text-right">
                    <button onClick={() => setOpenPositions(p => p.filter((_, j) => j !== i))}
                      className="text-[10px] text-[#555] hover:text-[#ef4444]">✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Exposure summary */}
          <div className="grid grid-cols-2 border-b border-[#222]">
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Notional bruto</div>
              <div className={`text-lg font-mono font-bold ${portfolio.grossNotional > capital * 5 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'}`}>
                ${portfolio.grossNotional.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-[#444] mt-0.5">
                Límite: 5× capital = ${(capital * 5).toLocaleString()}
                {portfolio.grossNotional > capital * 5 && <span className="text-[#ef4444] ml-2">⚠ EXCEDIDO</span>}
              </div>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Apalancamiento bruto</div>
              <div className={`text-lg font-mono font-bold ${portfolio.grossNotional / capital > 5 ? 'text-[#ef4444]' : 'text-[#4ade80]'}`}>
                {capital > 0 ? (portfolio.grossNotional / capital).toFixed(1) : '—'}×
              </div>
              <div className="text-[10px] text-[#444] mt-0.5">Límite: 5×</div>
            </div>
          </div>
          {/* Per-currency net exposure */}
          {Object.keys(portfolio.netByCurrency).length > 0 && (
            <div className="p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Exposición neta por divisa (USD equiv.)</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(portfolio.netByCurrency)
                  .filter(([, v]) => Math.abs(v) > 0)
                  .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
                  .map(([ccy, net]) => {
                    const exceeded = Math.abs(net) > capital * 2
                    return (
                      <div key={ccy} className={`px-2 py-1 border text-xs font-mono ${exceeded ? 'border-[#ef4444] bg-[#1f0d0d]' : 'border-[#333]'}`}>
                        <span className="text-[#777]">{ccy}</span>
                        <span className={`ml-2 font-bold ${net > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                          {net > 0 ? '+' : ''}{(net / 1000).toFixed(0)}K
                        </span>
                        {exceeded && <span className="ml-1 text-[#ef4444]">⚠</span>}
                      </div>
                    )
                  })}
              </div>
              <div className="text-[10px] text-[#444] mt-2">Límite por divisa: 2× capital = ${(capital * 2).toLocaleString()}</div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
