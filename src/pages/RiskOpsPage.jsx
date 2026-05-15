import { useState, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { INDICATORS, loadBetas, computeBetaTotal } from '../lib/endogenousBetas'
import { computePositionSize, PIP_VALUES, CONVICTION_MULTIPLIER, REGIME_VOL_MULTIPLIER } from '../lib/risk/sizing'

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

function getRegimeMultiplier(regime, cyclical) {
  if (regime === 'RISK-ON')  return cyclical ? 1.0 : 0.5
  if (regime === 'RISK-OFF') return cyclical ? 0.5 : 1.0
  return 0.75
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

function getConviction(signal) {
  const a = Math.abs(signal)
  return a > 0.6 ? 'FULL' : a > 0.4 ? 'HALF' : 'FLAT'
}

function fmtLots(v) {
  if (!v || v === 0) return '0.000'
  return v.toFixed(3)
}

export default function RiskOpsPage() {
  const { worldview: wv, zscores: zScores } = useModelStore()
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

  const regimeOn  = wv.vix < 30 && wv.hyOas < 30 && wv.sp200dma === 1 && wv.embi < 40
  const regimeOff = wv.vix > 70 || wv.hyOas > 70 || wv.sp200dma === 0 || wv.embi > 70
  const regime    = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'

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
    return getConviction(scoreBase - scoreQuote)
  }, [pair, regime, zScores, betas])

  const result = useMemo(() => computePositionSize({
    capital, riskPct, stopPips, pair, conviction, regimeVol, horizon,
    winRate, avgWinLoss, kellyFraction: kellyFrac, volTargetPct: volTarget,
    annualVolPct: annualVol, atrPips,
  }), [capital, riskPct, stopPips, pair, conviction, regimeVol, horizon, winRate, avgWinLoss, kellyFrac, volTarget, annualVol, atrPips])

  // Circuit breaker thresholds (doc §6)
  const ddLevel1 = capital * 0.10
  const ddLevel2 = capital * 0.20
  const ddLevel3 = capital * 0.25

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
              options={[{value:'LOW',label:'Low (×1.2)'},{value:'NORMAL',label:'Normal (×1.0)'},{value:'HIGH',label:'High (×0.6)'}]} />
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
              { label: 'Lotes ajustados (conv+régimen)', value: `${fmtLots(result.lotsAdjusted)} lotes` },
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

        {/* Circuit Breakers */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Circuit Breakers (§19)</span>
          </div>
          <div className="grid grid-cols-3">
            {[
              { label: 'Nivel 1 — Reduce 50%', value: `-$${ddLevel1.toLocaleString()}`, pct: '−10%', color: 'text-[#f59e0b]' },
              { label: 'Nivel 2 — Pause 1 mes', value: `-$${ddLevel2.toLocaleString()}`, pct: '−20%', color: 'text-[#ef4444]' },
              { label: 'Nivel 3 — Stop total',  value: `-$${ddLevel3.toLocaleString()}`, pct: '−25%', color: 'text-[#ef4444]' },
            ].map(item => (
              <div key={item.label} className="p-3 border-r border-[#222]">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-lg font-mono font-bold ${item.color}`}>{item.value}</div>
                <div className="text-[10px] text-[#444] mt-0.5">{item.pct} del capital</div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-[#222] text-[10px] text-[#444]">
            Max exposición bruta: 5× capital (${ (capital * 5).toLocaleString() }) · Exposición neta por divisa: 2× (${ (capital * 2).toLocaleString() })
          </div>
        </div>

      </div>
    </div>
  )
}
