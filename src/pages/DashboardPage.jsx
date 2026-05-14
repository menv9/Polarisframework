import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getStatus, countByStatus } from '../data/dataSources'
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
    const beta   = betas[ind.key] ?? ind.betaDoc
    const z      = zScores[`${prefix}_${ind.key}`] ?? 0
    const contrib = (beta / betaTotal) * z * ind.sign * rm
    if (ind.horizon === 'SHORT')  short     += contrib
    if (ind.horizon === 'MEDIUM') medium    += contrib
    if (ind.horizon === 'LONG')   longScore += contrib
  }
  return { composite: 0.20 * short + 0.50 * medium + 0.30 * longScore }
}

function getConviction(signal) {
  const a = Math.abs(signal)
  return a > 0.6 ? 'FULL' : a > 0.4 ? 'HALF' : 'FLAT'
}

function convictionColor(conviction) {
  return conviction === 'FULL' ? 'text-[#4ade80]' : conviction === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'
}

function scoreColor(v) {
  return v > 0 ? 'text-[#4ade80]' : v < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'
}

function fmtScore(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(3)
}

export default function DashboardPage() {
  const { worldview: wv, dataSources: sources, zscores: zScores } = useModelStore()
  const [betas] = useState(loadBetas)

  const counts = useMemo(() => countByStatus(sources), [sources])

  const scoreGDP  = wv.gdpUsa * 0.25 + wv.gdpEur * 0.18 + wv.gdpChn * 0.18 + wv.gdpJpn * 0.05 + wv.gdpResto * 0.34
  const regimeOn  = wv.vix < 30 && wv.hyOas < 30 && wv.sp200dma === 1 && wv.embi < 40
  const regimeOff = wv.vix > 70 || wv.hyOas > 70 || wv.sp200dma === 0 || wv.embi > 70
  const regime    = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'
  const wocScore  = 0.7 * wv.smartZ - 0.3 * wv.retailZ
  const usdBias   = wv.dxyRising === 1 && wv.dxy > 100 ? 'BULLISH' : wv.dxyRising === 0 && wv.dxy < 95 ? 'BEARISH' : 'NEUTRAL'
  const inflation = wv.cpiG7 > 3.0 || wv.breakevens > 2.5 ? 'INFLACIONARIO' : wv.cpiG7 < 2.0 && wv.breakevens < 2.0 ? 'DESINFLACIONARIO' : 'ESTABLE'

  // ── Señales por par ──────────────────────────────────────────────────────────
  const countryScores = useMemo(() =>
    COUNTRIES.map(c => ({ ...c, composite: computeCountryScore(c.prefix, c.cyclical, regime, zScores, betas).composite })),
    [regime, zScores, betas]
  )

  const topPairs = useMemo(() => {
    const pairs = []
    for (let i = 0; i < COUNTRIES.length; i++) {
      for (let j = i + 1; j < COUNTRIES.length; j++) {
        const a = countryScores[i]
        const b = countryScores[j]
        const signal = a.composite - b.composite
        const conv = getConviction(signal)
        if (conv !== 'FLAT') pairs.push({ a, b, signal, conv })
      }
    }
    return pairs.sort((x, y) => Math.abs(y.signal) - Math.abs(x.signal)).slice(0, 7)
  }, [countryScores])

  // ── Salud Endogenous ─────────────────────────────────────────────────────────
  const getCountryStatus = (country) => {
    const cs = sources.filter(s => s.module === `Endogenous — ${country}`)
    if (cs.length === 0) return { ok: 0, total: 0, pct: 0 }
    const ok = cs.filter(s => getStatus(s).code === 'ok').length
    return { ok, total: cs.length, pct: Math.round((ok / cs.length) * 100) }
  }

  const getExoStatus = () => {
    const es = sources.filter(s => s.module?.startsWith('Exogenous'))
    if (es.length === 0) return { ok: 0, total: 0, pct: 0 }
    const ok = es.filter(s => getStatus(s).code === 'ok').length
    return { ok, total: es.length, pct: Math.round((ok / es.length) * 100) }
  }

  const exo = getExoStatus()

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <h1 className="text-2xl font-bold uppercase tracking-widest">DASHBOARD</h1>
          <div className="text-xs text-[#777] uppercase tracking-wider">
            {new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        {/* ===== WORLD VIEW STATE VECTOR ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987] flex items-center justify-between">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">World View — Estado Global</span>
            <Link to="/world-view/operativa" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">→ OPERATIVA</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0">
            {[
              { label: 'REGIMEN',   value: regime,              color: regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'MOMENTUM',  value: scoreGDP.toFixed(2), color: scoreGDP > 0 ? 'text-[#4ade80]' : scoreGDP < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'WOC',       value: wocScore.toFixed(2), color: wocScore > 0 ? 'text-[#4ade80]' : wocScore < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'USD BIAS',  value: usdBias,             color: usdBias === 'BULLISH' ? 'text-[#4ade80]' : usdBias === 'BEARISH' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'INFLACION', value: inflation,           color: inflation === 'INFLACIONARIO' ? 'text-[#f59e0b]' : inflation === 'DESINFLACIONARIO' ? 'text-[#60a5fa]' : 'text-[#e5e5e5]' },
            ].map(item => (
              <div key={item.label} className="p-3 border-r border-b border-[#222]">
                <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-xl font-mono font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== SEÑALES FX — TOP CONVICTION ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987] flex items-center justify-between">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Señales FX — Top Conviction</span>
            <Link to="/endogenous" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">→ OPERATIVA</Link>
          </div>
          {topPairs.length === 0 ? (
            <div className="px-3 py-4 text-sm text-[#555] uppercase tracking-wider">Sin señales activas — actualizar z-scores en /model-inputs</div>
          ) : (
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-[#111] border-b border-[#333] text-left text-[#555]">
                  <th className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest w-[22%]">Par</th>
                  <th className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest w-[18%]">Señal</th>
                  <th className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest w-[18%]">Conv</th>
                  <th className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest w-[42%]">Dirección</th>
                </tr>
              </thead>
              <tbody>
                {topPairs.map(({ a, b, signal, conv }) => {
                  const long  = signal > 0 ? a.label : b.label
                  const short = signal > 0 ? b.label : a.label
                  return (
                    <tr key={`${a.prefix}-${b.prefix}`} className="border-b border-[#222] hover:bg-[#0a0a0a]">
                      <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3]">{a.label}/{b.label}</td>
                      <td className={`px-3 py-1.5 font-mono font-bold ${scoreColor(signal)}`}>{fmtScore(signal)}</td>
                      <td className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${convictionColor(conv)}`}>{conv}</td>
                      <td className="px-3 py-1.5 text-sm font-bold text-white uppercase tracking-wide">
                        LONG {long} / SHORT {short}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ===== GRID: ENDOGENOUS + DATA HEALTH ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Endogenous by country */}
          <div className="lg:col-span-2 border-2 border-[#333]">
            <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987] flex items-center justify-between">
              <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Endogenous — Salud por Pais</span>
              <Link to="/model-inputs" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">→ MODEL INPUTS</Link>
            </div>
            <div className="grid grid-cols-5 gap-0">
              {COUNTRIES.map(c => {
                const st  = getCountryStatus(c.label)
                const sc  = countryScores.find(x => x.prefix === c.prefix)
                return (
                  <div key={c.prefix} className="p-2 border-r border-b border-[#222]">
                    <div className="text-xs text-[#777] uppercase tracking-wider mb-0.5">{c.label}</div>
                    <div className={`text-sm font-mono font-bold ${st.pct >= 80 ? 'text-[#4ade80]' : st.pct >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                      {st.ok}/{st.total}
                    </div>
                    {sc && (
                      <div className={`text-[10px] font-mono ${scoreColor(sc.composite)}`}>
                        {fmtScore(sc.composite)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Data health summary */}
          <div className="border-2 border-[#333]">
            <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
              <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Centro de Control</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#777] uppercase tracking-wider">Actualizados</span>
                <span className="text-lg font-mono font-bold text-[#4ade80]">{counts.ok}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#777] uppercase tracking-wider">Proximos</span>
                <span className="text-lg font-mono font-bold text-[#f59e0b]">{counts.warning}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#777] uppercase tracking-wider">Desactualizados</span>
                <span className="text-lg font-mono font-bold text-[#ef4444]">{counts.stale}</span>
              </div>
              <div className="border-t border-[#333] pt-2 mt-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#777] uppercase tracking-wider">Exogenos OK</span>
                  <span className={`text-sm font-mono font-bold ${exo.pct >= 80 ? 'text-[#4ade80]' : exo.pct >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                    {exo.ok}/{exo.total}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#777] uppercase tracking-wider">Régimen</span>
                  <span className={`text-sm font-mono font-bold ${regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]'}`}>
                    {regime}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== QUICK LINKS ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Navegacion Rapida</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
            {[
              { to: '/world-view/operativa', label: 'World View Ops',   desc: 'Vector de estado + parámetros' },
              { to: '/endogenous',           label: 'Endogenous Ops',   desc: 'Señales + ranking G10' },
              { to: '/model-inputs',         label: 'Model Inputs',     desc: 'Z-scores + historial series' },
              { to: '/exogenous/operativa',   label: 'Exogenous Ops',    desc: 'Commodities, China, Rates' },
              { to: '/data',                 label: 'Centro de Datos',  desc: 'Fuentes + cobertura' },
            ].map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="p-3 border-r border-b border-[#222] hover:bg-[#0a0a0a] group"
              >
                <div className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#ecd987]">
                  {link.label} →
                </div>
                <div className="text-[10px] text-[#555] mt-0.5">{link.desc}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="flex items-center justify-between text-xs text-[#555] uppercase tracking-wider">
          <span>{sources.length} INDICADORES EN BASE DE DATOS</span>
          <span>POLARIS FRAMEWORK v0.1</span>
        </div>

      </div>
    </div>
  )
}
