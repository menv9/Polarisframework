import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { INDICATORS, loadBetas, computeBetaTotal } from '../lib/endogenousBetas'

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

function scoreColor(v) {
  return v > 0 ? 'text-[#4ade80]' : v < 0 ? 'text-[#ef4444]' : 'text-[#555]'
}

function fmtScore(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(3)
}

export default function DashboardPage() {
  const { worldview: wv, dataSources: sources, zscores: zScores } = useModelStore()
  const [betas] = useState(loadBetas)

  // ── World View derivations ────────────────────────────────────────────────
  const scoreGDP  = wv.gdpUsa * 0.25 + wv.gdpEur * 0.18 + wv.gdpChn * 0.18 + wv.gdpJpn * 0.05 + wv.gdpResto * 0.34
  const regimeOn  = wv.vix < 30 && wv.hyOas < 30 && wv.sp200dma === 1 && wv.embi < 40
  const regimeOff = wv.vix > 70 || wv.hyOas > 70 || wv.sp200dma === 0 || wv.embi > 70
  const regime    = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'
  const wocScore  = 0.7 * wv.smartZ - 0.3 * wv.retailZ
  const usdBias   = wv.dxyRising === 1 && wv.dxy > 100 ? 'BULLISH' : wv.dxyRising === 0 && wv.dxy < 95 ? 'BEARISH' : 'NEUTRAL'
  const inflation = wv.cpiG7 > 3.0 || wv.breakevens > 2.5 ? 'INFLACIONARIO' : wv.cpiG7 < 2.0 && wv.breakevens < 2.0 ? 'DESINFLACIONARIO' : 'ESTABLE'

  // ── Scores G10 ───────────────────────────────────────────────────────────
  const countryScores = useMemo(() =>
    COUNTRIES.map(c => ({
      ...c,
      score: computeCountryScore(c.prefix, c.cyclical, regime, zScores, betas),
    })),
    [regime, zScores, betas]
  )

  const hasZscores = useMemo(() =>
    Object.keys(zScores).length > 0,
    [zScores]
  )

  // ── Top pares (siempre top 5, sin filtro de conviction) ──────────────────
  const topPairs = useMemo(() => {
    const pairs = []
    for (let i = 0; i < COUNTRIES.length; i++) {
      for (let j = i + 1; j < COUNTRIES.length; j++) {
        const a = countryScores[i]
        const b = countryScores[j]
        const signal = a.score - b.score
        pairs.push({ a, b, signal, conv: getConviction(signal) })
      }
    }
    return pairs.sort((x, y) => Math.abs(y.signal) - Math.abs(x.signal)).slice(0, 6)
  }, [countryScores])

  // ── Ranking G10 ──────────────────────────────────────────────────────────
  const ranked = useMemo(() =>
    [...countryScores].sort((a, b) => b.score - a.score),
    [countryScores]
  )

  const maxAbs = useMemo(() =>
    Math.max(...countryScores.map(c => Math.abs(c.score)), 0.01),
    [countryScores]
  )

  const convColor = (conv) =>
    conv === 'FULL' ? 'text-[#4ade80]' : conv === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'

  const regimeColor = regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]'

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <h1 className="text-2xl font-bold uppercase tracking-widest">DASHBOARD</h1>
          <div className="text-xs text-[#777] uppercase tracking-wider">
            {new Date().toLocaleDateString('en-GB')} · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* ===== FILA 1: WORLD VIEW STATE + REGIMEN ===== */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">I — World View</span>
            <Link to="/world-view/operativa" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">OPERATIVA →</Link>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-0">
            {[
              { label: 'REGIMEN',   value: regime,              color: regimeColor },
              { label: 'MOMENTUM',  value: scoreGDP.toFixed(2), color: scoreGDP > 0 ? 'text-[#4ade80]' : scoreGDP < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'WOC',       value: wocScore.toFixed(2), color: wocScore > 0 ? 'text-[#4ade80]' : wocScore < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'USD BIAS',  value: usdBias,             color: usdBias === 'BULLISH' ? 'text-[#4ade80]' : usdBias === 'BEARISH' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'INFLACION', value: inflation,           color: inflation === 'INFLACIONARIO' ? 'text-[#f59e0b]' : inflation === 'DESINFLACIONARIO' ? 'text-[#60a5fa]' : 'text-[#e5e5e5]' },
              { label: 'Z-SCORES',  value: hasZscores ? `${Object.keys(zScores).length}v` : 'SIN DATOS', color: hasZscores ? 'text-[#4ade80]' : 'text-[#ef4444]' },
            ].map(item => (
              <div key={item.label} className="p-3 border-r border-b border-[#222]">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-lg font-mono font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== FILA 2: SEÑALES FX ===== */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">II — Señales FX Endogenous</span>
            <Link to="/endogenous" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">OPERATIVA →</Link>
          </div>
          {!hasZscores ? (
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-sm text-[#555] uppercase tracking-wider">Sin z-scores — carga series históricas primero</span>
              <Link to="/model-inputs" className="text-xs font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">
                → MODEL INPUTS
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-[#111] border-b border-[#222] text-left text-[#555]">
                  <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[18%]">Par</th>
                  <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[15%]">Señal</th>
                  <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[14%]">Conv</th>
                  <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[53%]">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {topPairs.map(({ a, b, signal, conv }) => {
                  const long  = signal >= 0 ? a.label : b.label
                  const short = signal >= 0 ? b.label : a.label
                  return (
                    <tr key={`${a.prefix}-${b.prefix}`} className="border-b border-[#1a1a1a] hover:bg-[#0a0a0a]">
                      <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3] text-xs">{a.label}/{b.label}</td>
                      <td className={`px-3 py-1.5 font-mono font-bold text-sm ${scoreColor(signal)}`}>{fmtScore(signal)}</td>
                      <td className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${convColor(conv)}`}>{conv}</td>
                      <td className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wide ${conv === 'FLAT' ? 'text-[#444]' : 'text-white'}`}>
                        {conv === 'FLAT' ? '— sin señal' : `LONG ${long} / SHORT ${short}`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== FILA 3: RANKING G10 ===== */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Ranking G10 — Fortaleza Endogenous</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-0">
            {ranked.map((c, i) => {
              const barPct = maxAbs > 0 ? Math.abs(c.score) / maxAbs * 100 : 0
              return (
                <div key={c.prefix} className="p-2 border-r border-b border-[#222] text-center">
                  <div className="text-[10px] text-[#555] uppercase tracking-widest mb-0.5">#{i + 1}</div>
                  <div className="text-xs font-bold text-[#a3a3a3] uppercase mb-1">{c.label}</div>
                  <div className={`text-sm font-mono font-bold ${scoreColor(c.score)}`}>{fmtScore(c.score)}</div>
                  <div className="mt-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.score > 0 ? 'bg-[#4ade80]' : c.score < 0 ? 'bg-[#ef4444]' : 'bg-[#333]'}`}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== FILA 4: EXOGENOUS ===== */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">II.6 — Exogenous Drivers</span>
            <Link to="/exogenous/operativa" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">OPERATIVA →</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-0">
            {[
              { id: 'exo_brent',       label: 'Brent',      unit: '$/bbl' },
              { id: 'exo_wti',         label: 'WTI',        unit: '$/bbl' },
              { id: 'exo_iron',        label: 'Iron Ore',   unit: '$/t'   },
              { id: 'exo_copper',      label: 'Copper',     unit: '$/lb'  },
              { id: 'exo_gold',        label: 'Gold',       unit: '$/oz'  },
              { id: 'exo_chn_pmi',     label: 'China PMI',  unit: 'pts'   },
              { id: 'exo_us10y',       label: 'US 10Y',     unit: '%'     },
              { id: 'exo_vix',         label: 'VIX',        unit: 'pts'   },
            ].map(item => {
              const src = sources.find(s => s.id === item.id)
              const val = src?._value
              const hasVal = val != null && val !== ''
              const n = hasVal ? Number(val) : null
              return (
                <div key={item.id} className="p-2 border-r border-b border-[#222] text-center">
                  <div className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">{item.label}</div>
                  <div className={`text-sm font-mono font-bold ${hasVal ? 'text-white' : 'text-[#333]'}`}>
                    {hasVal && n != null ? (item.unit === '%' ? n.toFixed(2) + '%' : n.toFixed(item.unit === '$/lb' ? 3 : 1)) : '—'}
                  </div>
                  <div className="text-[9px] text-[#444]">{item.unit}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-between text-[10px] text-[#444] uppercase tracking-wider">
          <span>{sources.length} indicadores · {Object.keys(zScores).length} z-scores</span>
          <span>POLARIS FRAMEWORK v0.1</span>
        </div>

      </div>
    </div>
  )
}
