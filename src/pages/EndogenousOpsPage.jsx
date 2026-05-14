import { useState, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'

const STORAGE_KEY_ZSCORES = 'polaris_endogenous_zscores'
const STORAGE_KEY_WV      = 'polaris_worldview_data'
const STORAGE_KEY_SOURCES = 'polaris_data_sources'

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

const INDICATORS = [
  { key: 'real_2y',    label: 'Real Rate 2Y',          beta: 0.14, sign:  1, horizon: 'MEDIUM', category: 'CARRY'       },
  { key: 'ca_gdp',     label: 'Current Account %GDP',   beta: 0.07, sign:  1, horizon: 'LONG',   category: 'ESTRUCTURAL' },
  { key: 'reer',       label: 'REER Deviation vs 10Y',  beta: 0.06, sign: -1, horizon: 'LONG',   category: 'VALUATION'   },
  { key: 'tot',        label: 'Terms of Trade YoY',     beta: 0.06, sign:  1, horizon: 'LONG',   category: 'ESTRUCTURAL' },
  { key: '10y_real',   label: '10Y Real Yield',         beta: 0.06, sign:  1, horizon: 'MEDIUM', category: 'RATES'       },
  { key: 'core_cpi',   label: 'Core CPI YoY',           beta: 0.05, sign:  1, horizon: 'MEDIUM', category: 'INFLACION'   },
  { key: 'niip',       label: 'NIIP % GDP',             beta: 0.05, sign:  1, horizon: 'LONG',   category: 'ESTRUCTURAL' },
  { key: 'policy',     label: 'Policy Rate',            beta: 0.05, sign:  1, horizon: 'MEDIUM', category: 'RATES'       },
  { key: 'cpi',        label: 'CPI YoY',                beta: 0.04, sign:  1, horizon: 'MEDIUM', category: 'INFLACION'   },
  { key: 'nfp',        label: 'Employment YoY',         beta: 0.04, sign:  1, horizon: 'MEDIUM', category: 'EMPLEO'      },
  { key: 'pmi',        label: 'ISM/PMI',                beta: 0.03, sign:  1, horizon: 'MEDIUM', category: 'CRECIMIENTO' },
  { key: 'cftc',       label: 'CFTC Positioning',       beta: 0.03, sign:  1, horizon: 'SHORT',  category: 'SENTIMIENTO' },
  { key: 'cb_balance', label: 'CB Balance/GDP YoY',     beta: 0.03, sign: -1, horizon: 'MEDIUM', category: 'MONETARIO'   },
  { key: 'debt',       label: 'Govt Debt/GDP',          beta: 0.03, sign: -1, horizon: 'LONG',   category: 'SOBERANO'    },
  { key: 'umcsi',      label: 'Consumer Sentiment',     beta: 0.02, sign:  1, horizon: 'SHORT',  category: 'CRECIMIENTO' },
]

const BETA_TOTAL = INDICATORS.reduce((s, i) => s + i.beta, 0)

const INDICATORS_BY_CATEGORY = INDICATORS.reduce((acc, ind) => {
  const last = acc[acc.length - 1]
  if (last && last.category === ind.category) {
    last.items.push(ind)
  } else {
    acc.push({ category: ind.category, items: [ind] })
  }
  return acc
}, [])

function getSourceId(prefix, key) {
  const suffix = key === 'nfp' && prefix !== 'usa' ? 'empl' : key
  return `endo_${prefix}_${suffix}`
}

const DEFAULT_WV_DATA = {
  gdpUsa: 0.3, gdpEur: -0.2, gdpChn: 0.5, gdpJpn: 0.1, gdpResto: 0.0,
  vix: 15, hyOas: 45, sp200dma: 1, embi: 55,
  smartZ: 0.5, retailZ: -0.8,
  dxy: 103.5, dxy200dma: 101.0, dxyRising: 1,
  cpiG7: 2.8, breakevens: 2.3,
}

const WV_DATA_MAP = {
  gdpUsa: 'wv_gdp_usa', gdpEur: 'wv_gdp_eur', gdpChn: 'wv_gdp_chn',
  gdpJpn: 'wv_gdp_jpn', gdpResto: 'wv_cesi',
  vix: 'wv_vix', hyOas: 'wv_hy_oas', sp200dma: 'wv_sp500', embi: 'wv_embi',
  smartZ: 'wv_cftc', retailZ: 'wv_retail',
  dxy: 'wv_dxy', dxy200dma: 'wv_dxy_200dma',
  cpiG7: 'wv_cpi_usa', breakevens: 'wv_breakevens',
}

function loadWorldViewData() {
  try {
    const savedSources = localStorage.getItem(STORAGE_KEY_SOURCES)
    if (savedSources) {
      const sources = JSON.parse(savedSources)
      const fromSources = {}
      for (const [key, id] of Object.entries(WV_DATA_MAP)) {
        const source = sources.find((s) => s.id === id)
        if (source?._value != null && source._value !== '') {
          const num = Number(source._value)
          if (!isNaN(num)) fromSources[key] = num
        }
      }
      if (Object.keys(fromSources).length > 0) return { ...DEFAULT_WV_DATA, ...fromSources }
    }
    const saved = localStorage.getItem(STORAGE_KEY_WV)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return DEFAULT_WV_DATA
}

function loadZScores() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ZSCORES)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  const defaults = {}
  for (const c of COUNTRIES) {
    for (const ind of INDICATORS) {
      defaults[`${c.prefix}_${ind.key}`] = 0
    }
  }
  return defaults
}

function getRegimeMultiplier(regime, cyclical) {
  if (regime === 'RISK-ON')  return cyclical ? 1.0 : 0.5
  if (regime === 'RISK-OFF') return cyclical ? 0.5 : 1.0
  return 0.75
}

function computeCountryScore(prefix, cyclical, regime, zScores) {
  const rm = getRegimeMultiplier(regime, cyclical)
  let short = 0, medium = 0, longScore = 0
  for (const ind of INDICATORS) {
    const z = zScores[`${prefix}_${ind.key}`] ?? 0
    const contrib = (ind.beta / BETA_TOTAL) * z * ind.sign * rm
    if (ind.horizon === 'SHORT')  short      += contrib
    if (ind.horizon === 'MEDIUM') medium     += contrib
    if (ind.horizon === 'LONG')   longScore  += contrib
  }
  return { composite: 0.20 * short + 0.50 * medium + 0.30 * longScore, short, medium, long: longScore }
}

function getConviction(signal) {
  const a = Math.abs(signal)
  return a > 0.6 ? 'FULL' : a > 0.4 ? 'HALF' : 'FLAT'
}

function convictionColor(conviction) {
  return conviction === 'FULL' ? 'text-[#4ade80]' : conviction === 'HALF' ? 'text-[#f59e0b]' : 'text-[#777]'
}

function scoreColor(v) {
  return v > 0 ? 'text-[#4ade80]' : v < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'
}

function fmtScore(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(3)
}

export default function EndogenousOpsPage() {
  const [zScores, setZScores] = useState(loadZScores)
  const [wvData]              = useState(loadWorldViewData)
  const [pairA, setPairA]     = useState('usa')
  const [pairB, setPairB]     = useState('eur')
  const [activeTab, setActiveTab] = useState('usa')
  const [resetMsg, setResetMsg] = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ZSCORES, JSON.stringify(zScores))
  }, [zScores])

  const handleZChange = (prefix, key, value) =>
    setZScores(prev => ({ ...prev, [`${prefix}_${key}`]: Number(value) }))

  const handleReset = () => {
    const defaults = {}
    for (const c of COUNTRIES) {
      for (const ind of INDICATORS) {
        defaults[`${c.prefix}_${ind.key}`] = 0
      }
    }
    setZScores(defaults)
    setResetMsg('Z-scores reseteados a 0')
    setTimeout(() => setResetMsg(null), 3000)
  }

  const regimeOn  = wvData.vix < 30 && wvData.hyOas < 30 && wvData.sp200dma === 1 && wvData.embi < 40
  const regimeOff = wvData.vix > 70 || wvData.hyOas > 70 || wvData.sp200dma === 0 || wvData.embi > 70
  const regime    = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'
  const regimeColor = regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]'

  const countryScores = COUNTRIES.map(c => ({ ...c, ...computeCountryScore(c.prefix, c.cyclical, regime, zScores) }))
  const rankedCountries = [...countryScores].sort((a, b) => b.composite - a.composite)

  const scoreA    = countryScores.find(c => c.prefix === pairA)
  const scoreB    = countryScores.find(c => c.prefix === pairB)
  const signal    = scoreA && scoreB ? scoreA.composite - scoreB.composite : 0
  const conviction = getConviction(signal)
  const direction  = signal > 0
    ? `LONG ${pairA.toUpperCase()}/${pairB.toUpperCase()}`
    : signal < 0
    ? `LONG ${pairB.toUpperCase()}/${pairA.toUpperCase()}`
    : 'FLAT — SIN SEÑAL'

  const activeCountry = COUNTRIES.find(c => c.prefix === activeTab)
  const activeRegimeMult = getRegimeMultiplier(regime, activeCountry?.cyclical ?? true)

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <h1 className="text-2xl font-bold uppercase tracking-widest">OPERATIVA — ENDOGENOUS</h1>
          <div className="flex items-center gap-3">
            {resetMsg && (
              <span className="text-xs font-bold uppercase tracking-wider text-[#f59e0b]">{resetMsg}</span>
            )}
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#555] text-[#777] hover:text-white hover:border-white"
            >
              RESET Z-SCORES
            </button>
            <Link
              to="/endogenous/zscores"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
            >
              CALCULAR Z-SCORES →
            </Link>
            <Link
              to="/data?module=Endogenous"
              className="text-xs font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]"
            >
              → /DATA
            </Link>
          </div>
        </div>

        {/* ===== STATE VECTOR ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Endogenous State Vector</span>
          </div>

          {/* Row 1: 5 cells */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-0">
            {/* Regimen */}
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Regimen (WV)</div>
              <div className={`text-xl font-mono font-bold ${regimeColor}`}>{regime}</div>
            </div>
            {/* Par selector */}
            <div className="p-3 border-r border-b border-[#222] sm:col-span-1">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Par</div>
              <div className="flex items-center gap-1">
                <div className="relative inline-block">
                  <select
                    value={pairA}
                    onChange={e => setPairA(e.target.value)}
                    className="appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-2 py-0.5 pr-5 outline-none focus:border-white w-16"
                  >
                    {COUNTRIES.map(c => <option key={c.prefix} value={c.prefix}>{c.label}</option>)}
                  </select>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                </div>
                <span className="text-[#555] font-bold text-sm">/</span>
                <div className="relative inline-block">
                  <select
                    value={pairB}
                    onChange={e => setPairB(e.target.value)}
                    className="appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-2 py-0.5 pr-5 outline-none focus:border-white w-16"
                  >
                    {COUNTRIES.map(c => <option key={c.prefix} value={c.prefix}>{c.label}</option>)}
                  </select>
                  <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                </div>
              </div>
            </div>
            {/* Señal */}
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Señal</div>
              <div className={`text-xl font-mono font-bold ${scoreColor(signal)}`}>{fmtScore(signal)}</div>
            </div>
            {/* Conviccion */}
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Conviccion</div>
              <div className={`text-xl font-mono font-bold ${convictionColor(conviction)}`}>{conviction}</div>
            </div>
            {/* Posicion */}
            <div className="p-3 border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Posicion</div>
              <div className={`text-base font-bold uppercase tracking-wide ${conviction === 'FLAT' ? 'text-[#777]' : 'text-white'}`}>
                {conviction === 'FLAT' ? '---' : direction}
              </div>
            </div>
          </div>

          {/* Row 2: horizon breakdown */}
          <div className="grid grid-cols-3 gap-0">
            {[
              { label: 'CORTO (20%)',  a: scoreA?.short,  b: scoreB?.short  },
              { label: 'MEDIO (50%)',  a: scoreA?.medium, b: scoreB?.medium },
              { label: 'LARGO (30%)',  a: scoreA?.long,   b: scoreB?.long   },
            ].map((h, i) => (
              <div key={h.label} className={`p-3 ${i < 2 ? 'border-r' : ''} border-[#222]`}>
                <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{h.label}</div>
                <div className="flex gap-3">
                  <span className={`text-sm font-mono font-bold ${scoreColor(h.a ?? 0)}`}>
                    {COUNTRIES.find(c => c.prefix === pairA)?.label}: {fmtScore(h.a ?? 0)}
                  </span>
                  <span className={`text-sm font-mono font-bold ${scoreColor(h.b ?? 0)}`}>
                    {COUNTRIES.find(c => c.prefix === pairB)?.label}: {fmtScore(h.b ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== RANKING DE FORTALEZA ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#111] border-b-2 border-[#333] flex items-center justify-between">
            <span className="text-base font-bold uppercase tracking-widest text-[#e5e5e5]">Ranking de Fortaleza G10</span>
            <span className="text-[10px] text-[#555] uppercase tracking-wider">Regime: {regime} · Mult pro-ciclico: {getRegimeMultiplier(regime, true).toFixed(2)} / refugio: {getRegimeMultiplier(regime, false).toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-0">
            {rankedCountries.map((c, i) => (
              <button
                key={c.prefix}
                onClick={() => setActiveTab(c.prefix)}
                className={`p-3 border-r border-b border-[#222] text-center transition-colors hover:bg-[#111] ${activeTab === c.prefix ? 'bg-[#111]' : ''}`}
              >
                <div className="text-[10px] text-[#777] uppercase tracking-widest mb-0.5">{c.label}</div>
                <div className={`text-lg font-mono font-bold ${scoreColor(c.composite)}`}>
                  {fmtScore(c.composite)}
                </div>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mt-0.5">#{i + 1}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ===== COUNTRY INPUTS ===== */}
        <div className="border-2 border-[#333]">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987] flex items-center justify-between">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Z-Scores por Pais</span>
            <Link to="/world-view/operativa" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">
              EDITAR REGIMEN EN WORLD VIEW →
            </Link>
          </div>

          {/* Tab bar */}
          <div className="flex border-b-2 border-[#333] overflow-x-auto">
            {COUNTRIES.map(c => {
              const cs = countryScores.find(x => x.prefix === c.prefix)
              return (
                <button
                  key={c.prefix}
                  onClick={() => setActiveTab(c.prefix)}
                  className={`px-3 py-2 text-sm font-bold uppercase tracking-wider border-r border-[#222] whitespace-nowrap flex-shrink-0 ${
                    activeTab === c.prefix
                      ? 'bg-[#111] text-[#ecd987] border-b-2 border-[#ecd987] -mb-[2px]'
                      : 'text-[#777] hover:text-white'
                  }`}
                >
                  {c.label}
                  {cs && (
                    <span className={`ml-1.5 text-xs font-mono ${scoreColor(cs.composite)}`}>
                      {fmtScore(cs.composite)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Active country info bar */}
          {activeCountry && (
            <div className="px-3 py-2 bg-[#0a0a0a] border-b border-[#222] flex items-center gap-6">
              <span className="text-sm font-bold text-white uppercase tracking-wider">{activeCountry.label}</span>
              <span className="text-xs text-[#555] uppercase tracking-wider">
                {activeCountry.cyclical ? 'PRO-CICLICA' : 'REFUGIO'} · Mult: {activeRegimeMult.toFixed(2)}
              </span>
              <Link
                to={`/data?module=Endogenous+%E2%80%94+${activeCountry.label}`}
                className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white ml-auto"
              >
                VER FUENTES →
              </Link>
            </div>
          )}

          {/* Indicator table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[640px]">
              <thead>
                <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[13%]">Cat</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[26%]">Indicador</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[14%]">Z-Score</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[9%]">β norm</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[11%]">Contrib</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[14%]">Horizonte</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[13%]">Data</th>
                </tr>
              </thead>
              <tbody>
                {activeCountry && INDICATORS_BY_CATEGORY.map(({ category, items }) => (
                  <Fragment key={category}>
                    <tr className="border-y border-[#333] bg-[#161616]">
                      <td colSpan={7} className="px-2 py-1.5">
                        <span className="text-sm font-bold uppercase tracking-widest text-[#ecd987]">{category}</span>
                      </td>
                    </tr>
                    {items.map(ind => {
                      const z = zScores[`${activeCountry.prefix}_${ind.key}`] ?? 0
                      const contrib = (ind.beta / BETA_TOTAL) * z * ind.sign * activeRegimeMult
                      return (
                        <tr key={ind.key} className="border-b border-[#222] hover:bg-[#0a0a0a]">
                          <td className="px-2 py-1.5">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[#555]">{category}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <div className="text-sm font-bold text-[#e5e5e5]">{ind.label}</div>
                            <div className="text-[10px] text-[#555]">{ind.sign === 1 ? '▲ FX positivo' : '▼ FX negativo'}</div>
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              value={z}
                              min={-4}
                              max={4}
                              step={0.01}
                              onChange={e => handleZChange(activeCountry.prefix, ind.key, e.target.value)}
                              className="w-20 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <span className="text-xs font-mono text-[#777]">{(ind.beta / BETA_TOTAL).toFixed(3)}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className={`text-sm font-mono font-bold ${scoreColor(contrib)}`}>
                              {fmtScore(contrib)}
                            </span>
                          </td>
                          <td className="px-2 py-1.5">
                            <span className={`text-xs font-bold uppercase tracking-wider ${
                              ind.horizon === 'SHORT'  ? 'text-[#60a5fa]' :
                              ind.horizon === 'MEDIUM' ? 'text-[#f59e0b]' :
                                                         'text-[#a3a3a3]'
                            }`}>{ind.horizon}</span>
                          </td>
                          <td className="px-2 py-1.5">
                            <Link
                              to={`/data?highlight=${getSourceId(activeCountry.prefix, ind.key)}`}
                              className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white"
                            >↗ DATA</Link>
                          </td>
                        </tr>
                      )
                    })}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per-country sub-score footer */}
          {activeCountry && (() => {
            const cs = countryScores.find(c => c.prefix === activeCountry.prefix)
            return cs ? (
              <div className="grid grid-cols-4 gap-0 border-t-2 border-[#333]">
                {[
                  { label: 'Score CORTO',    value: cs.short,     weight: '20%' },
                  { label: 'Score MEDIO',    value: cs.medium,    weight: '50%' },
                  { label: 'Score LARGO',    value: cs.long,      weight: '30%' },
                  { label: 'COMPUESTO',      value: cs.composite, weight: '—'   },
                ].map((item, i) => (
                  <div key={item.label} className={`p-3 ${i < 3 ? 'border-r' : ''} border-[#222] bg-[#0a0a0a]`}>
                    <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{item.label} <span className="text-[#444]">({item.weight})</span></div>
                    <div className={`text-lg font-mono font-bold ${scoreColor(item.value)}`}>{fmtScore(item.value)}</div>
                  </div>
                ))}
              </div>
            ) : null
          })()}
        </div>

      </div>
    </div>
  )
}
