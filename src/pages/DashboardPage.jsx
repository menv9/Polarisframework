import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { dataSources, getStatus, countByStatus } from '../data/dataSources'

const STORAGE_KEY_WV = 'polaris_worldview_data'

function loadWorldViewData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_WV)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return {
    gdpUsa: 0.3, gdpEur: -0.2, gdpChn: 0.5, gdpJpn: 0.1, gdpResto: 0.0,
    vix: 15, hyOas: 45, sp200dma: 1, embi: 55,
    smartZ: 0.5, retailZ: -0.8,
    dxy: 103.5, dxy200dma: 101.0, dxyRising: 1,
    cpiG7: 2.8, breakevens: 2.3,
  }
}

export default function DashboardPage() {
  const wv = loadWorldViewData()
  const [sources] = useState(() => {
    try {
      const saved = localStorage.getItem('polaris_data_sources')
      if (saved) {
        const parsed = JSON.parse(saved)
        return dataSources.map((d) => {
          const s = parsed.find((x) => x.id === d.id)
          return s ? { ...d, ...s } : d
        })
      }
    } catch { /* ignore */ }
    return dataSources
  })

  const counts = useMemo(() => countByStatus(sources), [sources])

  const scoreGDP = wv.gdpUsa * 0.25 + wv.gdpEur * 0.18 + wv.gdpChn * 0.18 + wv.gdpJpn * 0.05 + wv.gdpResto * 0.34
  const regimeOn = wv.vix < 30 && wv.hyOas < 30 && wv.sp200dma === 1 && wv.embi < 40
  const regimeOff = wv.vix > 70 || wv.hyOas > 70 || wv.sp200dma === 0 || wv.embi > 70
  const regime = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'
  const wocScore = 0.7 * wv.smartZ - 0.3 * wv.retailZ
  const usdBias = wv.dxyRising === 1 && wv.dxy > 100 ? 'BULLISH' : wv.dxyRising === 0 && wv.dxy < 95 ? 'BEARISH' : 'NEUTRAL'
  const inflation = wv.cpiG7 > 3.0 || wv.breakevens > 2.5 ? 'INFLACIONARIO' : wv.cpiG7 < 2.0 && wv.breakevens < 2.0 ? 'DESINFLACIONARIO' : 'ESTABLE'

  const endoCountries = ['USA', 'EUR', 'JPN', 'GBP', 'CHF', 'CAD', 'AUD', 'NZD', 'SEK', 'NOK']

  const getCountryStatus = (country) => {
    const countrySources = sources.filter((s) => s.module === `Endogenous — ${country}`)
    if (countrySources.length === 0) return { ok: 0, total: 0, pct: 0 }
    const ok = countrySources.filter((s) => getStatus(s).code === 'ok').length
    return { ok, total: countrySources.length, pct: Math.round((ok / countrySources.length) * 100) }
  }

  const getExoStatus = () => {
    const exoSources = sources.filter((s) => s.module.startsWith('Exogenous'))
    if (exoSources.length === 0) return { ok: 0, total: 0, pct: 0 }
    const ok = exoSources.filter((s) => getStatus(s).code === 'ok').length
    return { ok, total: exoSources.length, pct: Math.round((ok / exoSources.length) * 100) }
  }

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
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">World View — Estado Global</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0">
            {[
              { label: 'REGIMEN', value: regime, color: regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'MOMENTUM', value: scoreGDP.toFixed(2), color: scoreGDP > 0 ? 'text-[#4ade80]' : scoreGDP < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'WOC', value: wocScore.toFixed(2), color: wocScore > 0 ? 'text-[#4ade80]' : wocScore < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'USD BIAS', value: usdBias, color: usdBias === 'BULLISH' ? 'text-[#4ade80]' : usdBias === 'BEARISH' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              { label: 'INFLACION', value: inflation, color: inflation === 'INFLACIONARIO' ? 'text-[#f59e0b]' : inflation === 'DESINFLACIONARIO' ? 'text-[#60a5fa]' : 'text-[#e5e5e5]' },
            ].map((item) => (
              <div key={item.label} className="p-3 border-r border-b border-[#222]">
                <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{item.label}</div>
                <div className={`text-xl font-mono font-bold ${item.color}`}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ===== GRID: ENDOGENOUS + DATA HEALTH ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
          {/* Endogenous by country */}
          <div className="lg:col-span-2 border-2 border-[#333]">
            <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
              <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Endogenous — Salud por Pais</span>
            </div>
            <div className="grid grid-cols-5 gap-0">
              {endoCountries.map((c) => {
                const st = getCountryStatus(c)
                return (
                  <div key={c} className="p-2 border-r border-b border-[#222]">
                    <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{c}</div>
                    <div className={`text-lg font-mono font-bold ${st.pct >= 80 ? 'text-[#4ade80]' : st.pct >= 50 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                      {st.ok}/{st.total}
                    </div>
                    <div className="text-[10px] text-[#555]">{st.pct}% OK</div>
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
              <div className="border-t border-[#333] pt-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#777] uppercase tracking-wider">Exogenos OK</span>
                  <span className="text-sm font-mono font-bold text-[#4ade80]">{getExoStatus().ok}/{getExoStatus().total}</span>
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
              { to: '/world-view/operativa', label: 'World View Ops', desc: 'Vector de estado + parametros' },
              { to: '/world-view', label: 'World View Teoria', desc: 'Documentacion del modulo' },
              { to: '/data', label: 'Centro de Control', desc: 'Gestion de fuentes de datos' },
            ].map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="p-3 border-r border-b border-[#222] hover:bg-[#0a0a0a] group"
              >
                <div className="text-sm font-bold uppercase tracking-wider text-white group-hover:text-[#ecd987]">
                  {link.label} {'->'}
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
