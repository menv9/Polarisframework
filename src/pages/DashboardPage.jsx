import { useState, useMemo, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { useAppStore } from '../stores/appStore'
import { detectInflationRegime, getConviction } from '../lib/scoring/regime'
import { computeExogenousCurrencyScores, combineEndogenousExogenous } from '../lib/scoring/exogenous'
import { loadPairBetas, computeCountryScore, computeCountryScoreForPair, pairLabelToId } from '../lib/pairBetas'
import { ALL_INDICATORS } from '../lib/endogenousBetas'

const EXO_CCYS = ['AUD','CAD','NOK','NZD','JPY','CHF','USD','EUR','GBP','SEK']

const EXO_DRIVERS = [
  { id: 'exo_brent',       bullCcy: ['CAD','NOK'],            bearCcy: [] },
  { id: 'exo_wti',         bullCcy: ['CAD'],                  bearCcy: [] },
  { id: 'exo_iron',        bullCcy: ['AUD'],                  bearCcy: [] },
  { id: 'exo_copper',      bullCcy: ['AUD','NZD'],            bearCcy: [] },
  { id: 'exo_gold',        bullCcy: ['CHF','JPY'],            bearCcy: [] },
  { id: 'exo_gdt',         bullCcy: ['NZD'],                  bearCcy: [] },
  { id: 'exo_coal',        bullCcy: ['AUD','NZD'],            bearCcy: [] },
  { id: 'exo_grains',      bullCcy: ['AUD','NZD','CAD'],      bearCcy: [] },
  { id: 'exo_chn_pmi',     bullCcy: ['AUD','NZD'],            bearCcy: [] },
  { id: 'exo_chn_caixin',  bullCcy: ['AUD','NZD'],            bearCcy: [] },
  { id: 'exo_chn_credit',  bullCcy: ['AUD'],                  bearCcy: [] },
  { id: 'exo_eur_pmi_comp',bullCcy: ['EUR','SEK'],            bearCcy: [] },
  { id: 'exo_us10y',       bullCcy: ['USD'],                  bearCcy: ['JPY'] },
  { id: 'exo_us_real',     bullCcy: ['USD'],                  bearCcy: [] },
  { id: 'exo_us_2y',       bullCcy: ['USD'],                  bearCcy: [] },
  { id: 'exo_vix',         bullCcy: ['JPY','CHF','USD'],      bearCcy: ['AUD','NZD','CAD','NOK'] },
  { id: 'exo_embi',        bullCcy: ['USD'],                  bearCcy: ['AUD','NZD','SEK'] },
]

const COUNTRIES = [
  { label: 'USD', prefix: 'usa', ccy: 'USD', cyclical: false },
  { label: 'EUR', prefix: 'eur', ccy: 'EUR', cyclical: true  },
  { label: 'JPY', prefix: 'jpn', ccy: 'JPY', cyclical: false },
  { label: 'GBP', prefix: 'gbr', ccy: 'GBP', cyclical: true  },
  { label: 'CHF', prefix: 'che', ccy: 'CHF', cyclical: false },
  { label: 'CAD', prefix: 'can', ccy: 'CAD', cyclical: true  },
  { label: 'AUD', prefix: 'aus', ccy: 'AUD', cyclical: true  },
  { label: 'NZD', prefix: 'nzl', ccy: 'NZD', cyclical: true  },
  { label: 'SEK', prefix: 'swe', ccy: 'SEK', cyclical: true  },
  { label: 'NOK', prefix: 'nor', ccy: 'NOK', cyclical: true  },
]

const DASHBOARD_PAIRS = [
  { label: 'EUR/USD', base: 'eur', quote: 'usa' },
  { label: 'USD/JPY', base: 'usa', quote: 'jpn' },
  { label: 'GBP/USD', base: 'gbr', quote: 'usa' },
  { label: 'USD/CHF', base: 'usa', quote: 'che' },
  { label: 'AUD/USD', base: 'aus', quote: 'usa' },
  { label: 'USD/CAD', base: 'usa', quote: 'can' },
  { label: 'NZD/USD', base: 'nzl', quote: 'usa' },
  { label: 'USD/NOK', base: 'usa', quote: 'nor' },
  { label: 'USD/SEK', base: 'usa', quote: 'swe' },
]

const BETA_CATEGORIES = {
  real_2y:    { label: 'CARRY',      color: '#c4a35a' },
  '10y_real': { label: 'RATES',      color: '#6a9ec8' },
  policy:     { label: 'RATES',      color: '#6a9ec8' },
  core_cpi:   { label: 'INFLATION',  color: '#e07a3c' },
  cpi:        { label: 'INFLATION',  color: '#e07a3c' },
  ppi:        { label: 'INFLATION',  color: '#e07a3c' },
  core_ppi:   { label: 'INFLATION',  color: '#e07a3c' },
  nfp:        { label: 'EMPLOYMENT', color: '#a78bfa' },
  pmi:        { label: 'GROWTH',     color: '#5fd38a' },
  nmi:        { label: 'GROWTH',     color: '#5fd38a' },
  umcsi:      { label: 'GROWTH',     color: '#5fd38a' },
  permits:    { label: 'GROWTH',     color: '#5fd38a' },
  cftc:       { label: 'SENTIMENT',  color: '#f43f5e' },
  cb_balance: { label: 'MONETARY',   color: '#38bdf8' },
  m2:         { label: 'MONETARY',   color: '#38bdf8' },
  liquidity:  { label: 'MONETARY',   color: '#38bdf8' },
  ca_gdp:     { label: 'STRUCTURAL', color: '#7a8fa8' },
  tot:        { label: 'STRUCTURAL', color: '#7a8fa8' },
  niip:       { label: 'STRUCTURAL', color: '#7a8fa8' },
  breakevens: { label: 'STRUCTURAL', color: '#7a8fa8' },
  debt:       { label: 'SOVEREIGN',  color: '#fb923c' },
  fiscal:     { label: 'SOVEREIGN',  color: '#fb923c' },
  interest_gdp:{ label: 'SOVEREIGN', color: '#fb923c' },
  reer:       { label: 'VALUATION',  color: '#b86fd4' },
}

const CAT_WEIGHTS = (() => {
  const acc = {}
  for (const ind of ALL_INDICATORS) {
    const cat = BETA_CATEGORIES[ind.key]
    const label = cat?.label ?? 'OTHER'
    const color = cat?.color ?? '#555'
    if (!acc[label]) acc[label] = { weight: 0, color, impl: 0, total: 0 }
    acc[label].weight += ind.betaDoc
    acc[label].total++
    if (ind.implemented) acc[label].impl++
  }
  const total = Object.values(acc).reduce((s, v) => s + v.weight, 0)
  return Object.entries(acc)
    .map(([label, { weight, color, impl, total: tot }]) => ({
      label, weight, color, impl, total: tot,
      pct: weight / total * 100,
    }))
    .sort((a, b) => b.weight - a.weight)
})()

function scoreColor(v) {
  return v > 0 ? 'text-[#4ade80]' : v < 0 ? 'text-[#ef4444]' : 'text-[#555]'
}

function fmtScore(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(3)
}

function exportDashboardCsv({ regime, wv, inflation, usdBias, scoreGDP, wocScore, dashboardPairs, ranked, exoBias, upcomingEvents }) {
  const esc = v => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
  }
  const row  = cols => cols.map(esc).join(',')
  const date = new Date().toISOString().slice(0, 16).replace('T', ' ')

  const sections = []
  sections.push('# SNAPSHOT')
  sections.push(row(['date', 'regime', 'vix', 'dxy', 'dxy_rising', 'inflation', 'usd_bias', 'gdp_momentum', 'woc']))
  sections.push(row([
    date, regime,
    Number.isFinite(wv.vix) ? wv.vix.toFixed(1) : '',
    Number.isFinite(wv.dxy) ? wv.dxy.toFixed(1) : '',
    wv.dxyRising, inflation, usdBias,
    scoreGDP.toFixed(4), wocScore.toFixed(4),
  ]))
  sections.push('')
  sections.push('# SEÑALES FX')
  sections.push(row(['pair', 'endo', 'exo', 'signal', 'conviction', 'direction']))
  for (const { label, endoDiff, exoDiff, signal, conv, direction } of dashboardPairs) {
    sections.push(row([label, endoDiff.toFixed(4), exoDiff.toFixed(4), signal.toFixed(4), conv, direction]))
  }
  sections.push('')
  sections.push('# RANKING G10')
  sections.push(row(['rank', 'currency', 'endo', 'exo', 'total']))
  ranked.forEach((c, i) => {
    sections.push(row([i + 1, c.label, c.endoScore.toFixed(4), c.exoScore.toFixed(4), c.score.toFixed(4)]))
  })
  sections.push('')
  sections.push('# SESGO EXÓGENO')
  sections.push(row(['currency', 'bull_drivers', 'bear_drivers', 'net']))
  for (const ccy of EXO_CCYS) {
    const { bull, bear } = exoBias[ccy]
    sections.push(row([ccy, bull, bear, bull - bear]))
  }
  if (upcomingEvents.length > 0) {
    sections.push('')
    sections.push('# PRÓXIMOS EVENTOS')
    sections.push(row(['date', 'currency', 'title']))
    for (const ev of upcomingEvents) {
      sections.push(row([ev.date.toISOString().slice(0, 16).replace('T', ' '), ev.currency, ev.title]))
    }
  }
  const csv  = sections.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href     = url
  link.download = `polaris_dashboard_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function DashboardPage() {
  const { worldview: wv, regime, dataSources: sources, zscores: zScores, history, features, signalHistory, recordSignalSample } = useModelStore()
  const theme = useAppStore((s) => s.theme)
  const vixRaw = wv.vixRaw
  const [pairBetaData] = useState(loadPairBetas)
  const [upcomingEvents, setUpcomingEvents] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    if (theme !== 'mainframe') return
    const html = document.documentElement
    const prevZoom = html.style.zoom
    const prevOverflow = html.style.overflow
    html.style.zoom = '1.05'
    html.style.overflow = 'hidden'
    return () => {
      html.style.zoom = prevZoom
      html.style.overflow = prevOverflow
    }
  }, [theme])

  useEffect(() => {
    const ctrl = new AbortController()
    fetch('/api/calendar', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(body => {
        if (!body?.events) return
        const now = Date.now()
        const week = now + 7 * 86400_000
        const upcoming = body.events
          .filter(e => {
            const raw = e.date || e.datetime || e.timestamp || e.time
            if (!raw) return false
            const t = new Date(raw).getTime()
            if (!Number.isFinite(t)) return false
            return t >= now && t <= week
          })
          .sort((a, b) => {
            const ta = new Date(a.date || a.datetime || a.timestamp || a.time).getTime()
            const tb = new Date(b.date || b.datetime || b.timestamp || b.time).getTime()
            return ta - tb
          })
          .slice(0, 30)
          .map(e => ({
            title:    e.title || e.event || e.name || '—',
            currency: (e.currency || e.country || '').toUpperCase(),
            date:     new Date(e.date || e.datetime || e.timestamp || e.time),
            impact:   (e.impact || '').toLowerCase(),
          }))
        setUpcomingEvents(upcoming)
      })
      .catch(() => {})
    return () => ctrl.abort()
  }, [])

  const scoreGDP  = wv.gdpUsa * 0.25 + wv.gdpEur * 0.18 + wv.gdpChn * 0.18 + wv.gdpJpn * 0.05 + wv.gdpResto * 0.34
  const wocScore  = 0.7 * wv.smartZ - 0.3 * wv.retailZ
  const usdBias   = wv.dxyRising === 1 && wv.dxy > 100 ? 'BULLISH' : wv.dxyRising === 0 && wv.dxy < 95 ? 'BEARISH' : 'NEUTRAL'
  const inflation = detectInflationRegime(wv)

  const exogenousScores = useMemo(() =>
    computeExogenousCurrencyScores(sources, history),
    [sources, history]
  )

  const countryScores = useMemo(() =>
    COUNTRIES.map(c => {
      const endoScore = computeCountryScore(c.prefix, c.cyclical, regime, zScores, pairBetaData, vixRaw)
      const exoScore  = exogenousScores[c.ccy] ?? 0
      return { ...c, endoScore, exoScore, score: combineEndogenousExogenous(endoScore, exoScore, c.ccy) }
    }),
    [regime, zScores, pairBetaData, exogenousScores]
  )

  const hasZscores = useMemo(() => Object.keys(zScores).length > 0, [zScores])

  const dashboardPairs = useMemo(() => {
    const byPrefix = new Map(countryScores.map((country) => [country.prefix, country]))
    return DASHBOARD_PAIRS.map((pair) => {
      const base  = byPrefix.get(pair.base)
      const quote = byPrefix.get(pair.quote)
      if (!base || !quote) return { ...pair, signal: 0, conv: 'FLAT', direction: 'LONG' }
      const pairId    = pairLabelToId(pair.label)
      const baseEndo  = computeCountryScoreForPair(pair.base,  base.cyclical,  regime, zScores, pairBetaData, pairId, vixRaw)
      const quoteEndo = computeCountryScoreForPair(pair.quote, quote.cyclical, regime, zScores, pairBetaData, pairId, vixRaw)
      const signal    = combineEndogenousExogenous(baseEndo,  base.exoScore,  base.ccy)
                      - combineEndogenousExogenous(quoteEndo, quote.exoScore, quote.ccy)
      const endoDiff  = baseEndo - quoteEndo
      const exoDiff   = signal - endoDiff
      return { ...pair, signal, endoDiff, exoDiff, conv: getConviction(signal, signalHistory[pair.label]), direction: signal >= 0 ? 'LONG' : 'SHORT' }
    })
  }, [countryScores, regime, zScores, pairBetaData, signalHistory])

  useEffect(() => {
    for (const pair of dashboardPairs) recordSignalSample(pair.label, pair.signal)
  }, [dashboardPairs, recordSignalSample])

  const ranked = useMemo(() =>
    [...countryScores].sort((a, b) => b.score - a.score),
    [countryScores]
  )

  const maxAbs = useMemo(() =>
    Math.max(...countryScores.map(c => Math.abs(c.score)), 0.01),
    [countryScores]
  )

  const exoBias = useMemo(() => {
    const bias = Object.fromEntries(EXO_CCYS.map(c => [c, { bull: 0, bear: 0 }]))
    for (const { id, bullCcy, bearCcy } of EXO_DRIVERS) {
      if (!Number.isFinite(features.valuesBySourceId[id])) continue
      for (const c of bullCcy) if (bias[c]) bias[c].bull++
      for (const c of bearCcy) if (bias[c]) bias[c].bear++
    }
    return bias
  }, [features])

  const convColor = (conv) =>
    conv === 'FULL' ? 'text-[#4ade80]' : conv === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'

  const regimeColor = regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]'

  return (
    <div className="pt-12 min-h-screen">
      <div className="flex items-start w-full">

        {/* ===== LEFT SIDEBAR — BETAS ===== */}
        <aside className="dash-sidebar hidden xl:flex flex-col w-[200px] shrink-0 sticky top-12 h-[calc(100vh-48px)] border-r border-[#222] overflow-y-auto">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">Pesos del Modelo</span>
          </div>
          <div className="px-3 py-3 flex-1">
            {CAT_WEIGHTS.map(({ label, weight, color, pct, impl, total }) => (
              <div key={label} className="mb-3">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color }}>{label}</span>
                  <span className="text-[10px] font-mono text-[#444]">{pct.toFixed(0)}%</span>
                </div>
                <div className="h-1 bg-[#1a1a1a] mb-0.5">
                  <div className="h-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }} />
                </div>
                <div className="text-[9px] text-[#333] font-mono">
                  β={weight.toFixed(2)} · {impl}/{total} impl
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 py-2 border-t border-[#222] shrink-0">
            <Link to="/endogenous/betas" className="text-[9px] text-[#444] hover:text-[#ecd987] uppercase tracking-wider">
              → Ver betas completas
            </Link>
          </div>
        </aside>

        {/* ===== CENTER — MAIN CONTENT ===== */}
        <div className="flex-1 min-w-0 px-4 py-4">

          {/* HEADER */}
          <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
            <h1 className="text-2xl font-bold uppercase tracking-widest">DASHBOARD</h1>
            <div className="flex items-center gap-4">
              <button
                onClick={() => exportDashboardCsv({ regime, wv, inflation, usdBias, scoreGDP, wocScore, dashboardPairs, ranked, exoBias, upcomingEvents })}
                className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white hover:border-white transition-colors"
              >
                Export CSV
              </button>
              <div className="text-xs text-[#777] uppercase tracking-wider">
                {new Date().toLocaleDateString('en-GB')} · {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* WORLD VIEW */}
          <div className="border-2 border-[#333] mb-3">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">I — World View</span>
              <Link to="/world-view" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">OPERATIVA →</Link>
            </div>
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-0">
              {[
                { label: 'REGIMEN',   value: regime,              color: regimeColor },
                { label: 'MOMENTUM',  value: scoreGDP.toFixed(2), color: scoreGDP > 0 ? 'text-[#4ade80]' : scoreGDP < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                { label: 'WOC',       value: wocScore.toFixed(2), color: wocScore > 0 ? 'text-[#4ade80]' : wocScore < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                { label: 'USD BIAS',  value: usdBias,             color: usdBias === 'BULLISH' ? 'text-[#4ade80]' : usdBias === 'BEARISH' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                { label: 'VIX',       value: Number.isFinite(wv.vix) ? wv.vix.toFixed(1) : '—', color: wv.vix > 30 ? 'text-[#ef4444]' : wv.vix > 20 ? 'text-[#f59e0b]' : 'text-[#4ade80]' },
                { label: 'DXY',       value: Number.isFinite(wv.dxy) ? wv.dxy.toFixed(1) : '—', color: wv.dxyRising === 1 ? 'text-[#4ade80]' : wv.dxyRising === 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                { label: 'INFLACION', value: inflation,           color: inflation === 'INFLACIONARIO' ? 'text-[#f59e0b]' : inflation === 'DESINFLACIONARIO' ? 'text-[#60a5fa]' : 'text-[#e5e5e5]' },
                { label: 'Z-SCORES',  value: hasZscores ? `${Object.keys(zScores).length}v` : 'SIN DATOS', color: hasZscores ? 'text-[#4ade80]' : 'text-[#ef4444]' },
              ].map(item => (
                <div key={item.label} className="p-3 border-r border-b border-[#222]">
                  <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                  <div className={`text-base font-mono font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SEÑALES FX */}
          <div className="border-2 border-[#333] mb-3">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">II — Señales FX Total (Endo + Exo)</span>
              <Link to="/endogenous" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">OPERATIVA →</Link>
            </div>
            {!hasZscores ? (
              <div className="px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[#555] uppercase tracking-wider">Sin z-scores — carga series históricas primero</span>
                <Link to="/model-inputs" className="text-xs font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">→ MODEL INPUTS</Link>
              </div>
            ) : (
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[#111] border-b border-[#222] text-left text-[#555]">
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[13%]">Par</th>
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[11%]">Endo</th>
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[11%]">Exo</th>
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[11%]">Señal</th>
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[9%]">Conv</th>
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[20%]">Dirección</th>
                    <th className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest w-[25%]"></th>
                  </tr>
                </thead>
                <tbody>
                  {dashboardPairs.map(({ label, signal, endoDiff, exoDiff, conv, direction }) => {
                    const timingUrl = `/timing/operativa?pair=${encodeURIComponent(label)}&signal=${signal.toFixed(3)}&conviction=${conv}`
                    return (
                      <tr key={label} className="border-b border-[#1a1a1a] hover:bg-[#0a0a0a] group">
                        <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3] text-xs">{label}</td>
                        <td className={`px-3 py-1.5 font-mono text-xs ${scoreColor(endoDiff)}`}>{fmtScore(endoDiff)}</td>
                        <td className={`px-3 py-1.5 font-mono text-xs ${scoreColor(exoDiff)}`}>{fmtScore(exoDiff)}</td>
                        <td className={`px-3 py-1.5 font-mono font-bold text-sm ${scoreColor(signal)}`}>{fmtScore(signal)}</td>
                        <td className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider ${convColor(conv)}`}>{conv}</td>
                        <td className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wide ${direction === 'LONG' ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>{direction}</td>
                        <td className="px-3 py-1.5">
                          {conv !== 'FLAT' ? (
                            <button
                              onClick={() => navigate(timingUrl)}
                              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border transition-colors ${
                                conv === 'FULL'
                                  ? 'border-[#4ade80] text-[#4ade80] hover:bg-[#4ade80] hover:text-black'
                                  : 'border-[#f59e0b] text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black'
                              }`}
                            >
                              Analizar trade →
                            </button>
                          ) : (
                            <span className="text-[10px] text-[#333] uppercase tracking-wider">señal débil</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* RANKING G10 */}
          <div className="border-2 border-[#333] mb-3">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Ranking G10 — Fortaleza Total</span>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-0">
              {ranked.map((c, i) => {
                const barPct = maxAbs > 0 ? Math.abs(c.score) / maxAbs * 100 : 0
                return (
                  <div key={c.prefix} className="p-2 border-r border-b border-[#222] text-center">
                    <div className="text-[10px] text-[#555] uppercase tracking-widest mb-0.5">#{i + 1}</div>
                    <div className="text-xs font-bold text-[#a3a3a3] uppercase mb-1">{c.label}</div>
                    <div className={`text-sm font-mono font-bold ${scoreColor(c.score)}`}>{fmtScore(c.score)}</div>
                    <div className="mt-1 flex justify-center gap-1">
                      <span className={`text-[9px] font-mono ${scoreColor(c.endoScore)}`}>E:{c.endoScore.toFixed(1)}</span>
                      <span className={`text-[9px] font-mono ${scoreColor(c.exoScore)}`}>X:{c.exoScore.toFixed(1)}</span>
                    </div>
                    <div className="mt-1 h-1 bg-[#1a1a1a] overflow-hidden">
                      <div
                        className={`h-full ${c.score > 0 ? 'bg-[#4ade80]' : c.score < 0 ? 'bg-[#ef4444]' : 'bg-[#333]'}`}
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* SESGO EXÓGENO */}
          <div className="border-2 border-[#333] mb-3">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">II.6 — Sesgo Exógeno por Divisa</span>
              <Link to="/exogenous/operativa" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">OPERATIVA →</Link>
            </div>
            <div className="grid grid-cols-5 sm:grid-cols-10 gap-0">
              {EXO_CCYS.map(ccy => {
                const { bull, bear } = exoBias[ccy]
                const net = bull - bear
                const color = net > 0 ? 'text-[#4ade80]' : net < 0 ? 'text-[#ef4444]' : 'text-[#555]'
                const label = net > 1 ? '▲▲' : net === 1 ? '▲' : net === -1 ? '▼' : net < -1 ? '▼▼' : '—'
                return (
                  <div key={ccy} className="p-3 border-r border-b border-[#222] text-center">
                    <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{ccy}</div>
                    <div className={`text-xl font-mono font-bold ${color}`}>{label}</div>
                    {(bull > 0 || bear > 0) && (
                      <div className="text-[9px] text-[#444] mt-0.5">{bull}↑ {bear}↓</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* PIPELINE */}
          <div className="border-2 border-[#333] mb-3">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Pipeline de Ejecución — Capa 1 Completa</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
              {[
                { label: 'Timing',    desc: '¿Cuándo entrar?',        to: '/timing/operativa' },
                { label: 'Risk Mgmt', desc: 'Sizing · Stops',          to: '/risk/operativa' },
                { label: 'Execution', desc: 'Costes · Órdenes',        to: '/execution/operativa' },
                { label: 'Journal',   desc: 'Registrar · Performance', to: '/journal' },
              ].map(item => (
                <Link key={item.label} to={item.to}
                  className="p-3 border-r border-[#222] hover:bg-[#0a0a0a] transition-colors group">
                  <div className="text-[10px] text-[#444] uppercase tracking-wider mb-1">{item.desc}</div>
                  <div className="text-base font-bold uppercase tracking-wider text-[#a3a3a3] group-hover:text-[#ecd987] transition-colors">
                    {item.label} →
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* FOOTER */}
          <div className="flex items-center justify-between text-[10px] text-[#444] uppercase tracking-wider">
            <span>{sources.length} indicadores · {Object.keys(zScores).length} z-scores</span>
            <span>POLARIS FRAMEWORK v0.1</span>
          </div>

        </div>

        {/* ===== RIGHT SIDEBAR — CALENDARIO ===== */}
        <aside className="dash-sidebar hidden xl:flex flex-col w-[200px] shrink-0 sticky top-12 h-[calc(100vh-48px)] border-l border-[#222] overflow-y-auto">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] shrink-0 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">Calendario Macro</span>
            <Link to="/data/economic-calendar" className="text-[9px] text-[#444] hover:text-[#ecd987]">→</Link>
          </div>
          <div className="flex-1 overflow-y-auto">
            {upcomingEvents.length === 0 ? (
              <div className="px-3 py-4">
                <p className="text-[10px] text-[#333] uppercase tracking-wider">Sin eventos esta semana</p>
              </div>
            ) : (
              <div className="divide-y divide-[#1a1a1a]">
                {upcomingEvents.map((ev, i) => (
                  <div key={i} className="px-3 py-2">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[9px] font-mono text-[#444]">
                        {ev.date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' })}
                        {' '}
                        {ev.date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className={`text-[8px] font-bold uppercase ${ev.impact.includes('high') ? 'text-[#ef4444]' : ev.impact.includes('medium') ? 'text-[#f59e0b]' : 'text-[#444]'}`}>
                        {ev.impact.includes('high') ? '●' : ev.impact.includes('medium') ? '●' : '○'}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <span className="text-[9px] font-bold text-[#f59e0b] shrink-0 w-7">{ev.currency}</span>
                      <span className="text-[10px] text-[#888] leading-tight">{ev.title}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-[#222] shrink-0">
            <span className="text-[9px] text-[#333] uppercase tracking-wider">Próximos 7 días</span>
          </div>
        </aside>

      </div>
    </div>
  )
}
