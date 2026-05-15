import { useState, Fragment, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { INDICATORS as BASE_INDICATORS } from '../lib/endogenousBetas'
import { getRegimeMultiplier, getConviction } from '../lib/scoring/regime'
import { computeExogenousCurrencyScores, combineEndogenousExogenous } from '../lib/scoring/exogenous'
import { loadPairBetas, computeCountryScoreDetailed, buildCountryBetaArr } from '../lib/pairBetas'
import { useModelStore } from '../store/ModelDataContext'
import { getFreshness, FRESHNESS_DOT, FRESHNESS_TEXT } from '../lib/freshness'

const ENDO_FREQ = {
  real_2y: 1, '10y_real': 1, policy: 1,
  cftc: 7,
  core_cpi: 30, cpi: 30, nfp: 30, pmi: 30, umcsi: 30, cb_balance: 30,
  ca_gdp: 90, reer: 90, tot: 90, niip: 90, debt: 90,
}

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

const CATEGORY_MAP = {
  real_2y: 'CARRY', ca_gdp: 'ESTRUCTURAL', reer: 'VALUATION', tot: 'ESTRUCTURAL',
  '10y_real': 'RATES', core_cpi: 'INFLACIÓN', niip: 'ESTRUCTURAL', policy: 'RATES',
  cpi: 'INFLACIÓN', nfp: 'EMPLEO', pmi: 'CRECIMIENTO', cftc: 'SENTIMIENTO',
  cb_balance: 'MONETARIO', debt: 'SOBERANO', umcsi: 'CRECIMIENTO',
}

const CATEGORY_COLOR = {
  CARRY: 'text-[#ecd987]', RATES: 'text-[#60a5fa]', INFLACIÓN: 'text-[#f97316]',
  EMPLEO: 'text-[#a78bfa]', CRECIMIENTO: 'text-[#4ade80]', SENTIMIENTO: 'text-[#f43f5e]',
  MONETARIO: 'text-[#38bdf8]', SOBERANO: 'text-[#fb923c]', ESTRUCTURAL: 'text-[#a3a3a3]',
  VALUATION: 'text-[#e879f9]',
}

const INDICATORS = BASE_INDICATORS.map(i => ({ ...i, category: CATEGORY_MAP[i.key] ?? i.key.toUpperCase() }))

const INDICATORS_BY_CATEGORY = INDICATORS.reduce((acc, ind) => {
  const last = acc[acc.length - 1]
  if (last && last.category === ind.category) last.items.push(ind)
  else acc.push({ category: ind.category, items: [ind] })
  return acc
}, [])

function getIndLabel(key, prefix) {
  switch (key) {
    case 'nfp':       return prefix === 'usa' ? 'NFP YoY' : 'Unemployment Rate'
    case 'umcsi':     return prefix === 'usa' ? 'UMCSI Consumer Sentiment' : 'Consumer Confidence'
    case '10y_real':  return prefix === 'usa' ? '10Y Real Yield (TIPS)' : '10Y Nominal Yield'
    case 'pmi':       return prefix === 'usa' ? 'ISM Manufacturing' : 'PMI Manufacturing'
    case 'policy':
      if (prefix === 'usa') return 'Fed Funds Rate'
      if (prefix === 'eur') return 'ECB Deposit Rate'
      if (prefix === 'can') return 'BoC Rate'
      return 'Policy Rate'
    case 'cb_balance':
      if (prefix === 'usa') return 'Fed Balance/GDP'
      if (prefix === 'eur') return 'ECB Balance/GDP'
      if (prefix === 'jpn') return 'BoJ Balance/GDP'
      return 'CB Balance/GDP'
    case 'real_2y':   return prefix === 'usa' ? 'Real Rate 2Y (2Y−TIPS)' : 'Real Rate 2Y'
    case 'cftc':
      if (prefix === 'usa') return 'CFTC USD Index'
      if (prefix === 'swe' || prefix === 'nor') return 'CFTC USD (inv. proxy)'
      return `CFTC ${prefix === 'eur' ? 'Euro FX' : prefix === 'jpn' ? 'JPY' : prefix === 'gbr' ? 'GBP' : prefix === 'che' ? 'CHF' : prefix === 'can' ? 'CAD' : prefix === 'aus' ? 'AUD' : 'NZD'}`
    case 'tot':       return 'Terms of Trade YoY'
    default:          return INDICATORS.find(i => i.key === key)?.label ?? key
  }
}

const IND_TIPS = {
  real_2y:    'DOMINANTE (β=0.14). USA: 2Y − TIPS breakeven. Resto: policy rate − CPI. Mayor real rate = carry más atractivo = divisa más fuerte.',
  '10y_real': 'USA: TIPS 10Y real yield. Resto: 10Y nominal yield (proxy). Precaución: no-USA es nominal.',
  ca_gdp:     'Cuenta corriente / PIB. Superávit = demanda estructural de la divisa. Déficit = presión vendedora.',
  tot:        'Términos de intercambio YoY. Fuente varía por país. Proxy de ingresos de exportación.',
  core_cpi:   'IPC subyacente YoY. Proxy de inflación estructural; anticipa movimientos de tipos.',
  niip:       'Posición de Inversión Internacional Neta / PIB. Positivo = acreedor neto (CHF, JPY).',
  policy:     'Tipo nominal del banco central. Se combina con CPI para derivar el tipo real.',
  cpi:        'IPC general YoY. Incluye volátiles (energía, alimentos).',
  nfp:        'USA: PAYEMS YoY. Resto: tasa de paro (inversa — z alto = paro alto = laboral débil).',
  cftc:       'Posicionamiento neto especulativo CFTC. SEK/NOK usan USD Index invertido como proxy.',
  cb_balance: 'Activos banco central / PIB. Signo −1: expansión (QE) = bajista para la divisa.',
  pmi:        'USA: ISM Manufacturing. Resto: PMI nacional (entrada manual).',
  debt:       'Deuda pública / PIB. Signo −1: más deuda = menor credibilidad fiscal.',
  reer:       'Desviación REER vs media 10Y. Signo −1: si está cara en términos reales, tiende a revertir.',
  umcsi:      'UMCSI (USA) / OCDE (resto). Anticipa gasto privado y perspectivas económicas.',
}

function getSourceId(prefix, key) {
  const suffix = key === 'nfp' && prefix !== 'usa' ? 'empl' : key
  return `endo_${prefix}_${suffix}`
}


function scoreColor(v) {
  return v > 0.001 ? 'text-[#4ade80]' : v < -0.001 ? 'text-[#ef4444]' : 'text-[#555]'
}

function fmtScore(v) {
  return (v >= 0 ? '+' : '') + v.toFixed(3)
}

// Mini bar para z-score (rango -4 a +4)
function ZBar({ z }) {
  const clamped = Math.max(-4, Math.min(4, z))
  const pct = Math.abs(clamped) / 4 * 100
  const positive = clamped >= 0
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-mono font-bold w-14 text-right ${z === 0 ? 'text-[#333]' : z > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
        {z >= 0 ? '+' : ''}{z.toFixed(2)}
      </span>
      <div className="w-16 h-1.5 bg-[#1a1a1a] relative flex-shrink-0">
        {positive
          ? <div className="absolute left-1/2 top-0 h-full bg-[#4ade80]" style={{ width: `${pct / 2}%` }} />
          : <div className="absolute right-1/2 top-0 h-full bg-[#ef4444]" style={{ width: `${pct / 2}%` }} />
        }
        <div className="absolute left-1/2 top-0 w-px h-full bg-[#333]" />
      </div>
    </div>
  )
}

// Mini bar para contribución
function ContribBar({ contrib, maxContrib }) {
  const pct = maxContrib > 0 ? Math.abs(contrib) / maxContrib * 100 : 0
  const positive = contrib >= 0
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-sm font-mono font-bold w-14 text-right ${scoreColor(contrib)}`}>
        {fmtScore(contrib)}
      </span>
      <div className="w-20 h-2 bg-[#1a1a1a] flex-shrink-0 rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm ${positive ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`}
          style={{ width: `${pct}%`, opacity: 0.7 }}
        />
      </div>
    </div>
  )
}

function Tooltip({ text, align = 'center' }) {
  const alignClass =
    align === 'left'  ? 'left-0' :
    align === 'right' ? 'right-0' :
                        'left-1/2 -translate-x-1/2'
  return (
    <span className="relative group inline-flex items-center ml-1 cursor-help">
      <span className="text-[9px] font-bold text-[#333] group-hover:text-[#666] select-none">ⓘ</span>
      <span className={`absolute bottom-full mb-2 ${alignClass} w-56 bg-[#0d0d0d] border border-[#333] text-[10px] text-[#aaa] px-2.5 py-2 leading-relaxed hidden group-hover:block z-50 pointer-events-none whitespace-normal`}>
        {text}
      </span>
    </span>
  )
}

export default function EndogenousOpsPage() {
  const { zscores: zScores, regime, history, dataSources, features, worldview: wv, signalHistory, recordSignalSample } = useModelStore()
  const vixRaw = wv.vixRaw
  const [pairBetaData] = useState(loadPairBetas)
  const [pairA, setPairA]   = useState('usa')
  const [pairB, setPairB]   = useState('eur')
  const [activeTab, setActiveTab] = useState('usa')

  const exogenousScores = computeExogenousCurrencyScores(dataSources, history)
  const countryScores  = COUNTRIES.map(c => {
    const endo     = computeCountryScoreDetailed(c.prefix, c.cyclical, regime, zScores, pairBetaData, vixRaw)
    const exoScore = exogenousScores[c.ccy] ?? 0
    return {
      ...c,
      ...endo,
      endoComposite: endo.composite,
      exoScore,
      composite: combineEndogenousExogenous(endo.composite, exoScore, c.ccy),
    }
  })
  const rankedCountries = [...countryScores].sort((a, b) => b.composite - a.composite)
  const maxAbsScore    = Math.max(...countryScores.map(c => Math.abs(c.composite)), 0.001)

  const scoreA     = countryScores.find(c => c.prefix === pairA)
  const scoreB     = countryScores.find(c => c.prefix === pairB)
  const signal     = scoreA && scoreB ? scoreA.composite - scoreB.composite : 0
  const pairLabel  = scoreA && scoreB ? `${scoreA.label}/${scoreB.label}` : ''
  const conviction = getConviction(signal, signalHistory[pairLabel])
  const direction  = signal > 0
    ? `LONG ${pairA.toUpperCase()}/${pairB.toUpperCase()}`
    : signal < 0
    ? `LONG ${pairB.toUpperCase()}/${pairA.toUpperCase()}`
    : 'FLAT'

  const activeCountry     = COUNTRIES.find(c => c.prefix === activeTab)
  const activeScore       = countryScores.find(c => c.prefix === activeTab)
  const activeRegimeMult  = getRegimeMultiplier(regime, activeCountry?.cyclical ?? true)

  useEffect(() => {
    if (pairLabel) recordSignalSample(pairLabel, signal)
  }, [pairLabel, signal, recordSignalSample])

  // Betas efectivas del país activo (promedio pipeline o betaDoc fallback)
  const activeBetaArr = activeCountry ? buildCountryBetaArr(pairBetaData, activeCountry.prefix) : []
  const activeBetaTotal = activeBetaArr.reduce((s, b) => s + b, 0) || 1

  // Max contribution for bar scaling
  const allContribs = activeCountry
    ? INDICATORS.map((ind, i) => {
        const z = zScores[`${activeCountry.prefix}_${ind.key}`] ?? 0
        return Math.abs((activeBetaArr[i] ?? ind.betaDoc) / activeBetaTotal * z * ind.sign * activeRegimeMult)
      })
    : []
  const maxContrib = Math.max(...allContribs, 0.001)

  const convColor = conviction === 'FULL' ? 'text-[#4ade80]' : conviction === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'
  const regimeColor = regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]'

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">ENDOGENOUS</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Módulo II — Scoring macroeconómico G10</p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/model-inputs" className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white hover:border-white transition-colors">
              Z-Scores
            </Link>
            <Link to="/endogenous/betas" className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white transition-colors">
              Betas
            </Link>
          </div>
        </div>

        {/* ── SEÑAL DEL PAR ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Señal de Par</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-0">

            {/* Par selector */}
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Par</div>
              <div className="flex items-center gap-1">
                <select value={pairA} onChange={e => setPairA(e.target.value)}
                  className="bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-1 py-0.5 outline-none w-14">
                  {COUNTRIES.map(c => <option key={c.prefix} value={c.prefix}>{c.label}</option>)}
                </select>
                <span className="text-[#444]">/</span>
                <select value={pairB} onChange={e => setPairB(e.target.value)}
                  className="bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-1 py-0.5 outline-none w-14">
                  {COUNTRIES.map(c => <option key={c.prefix} value={c.prefix}>{c.label}</option>)}
                </select>
              </div>
            </div>

            {/* Señal */}
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Señal
                <Tooltip text="Diferencial score_A − score_B. Positivo = divisa A más fuerte. Rango típico [−1, +1]." />
              </div>
              <div className={`text-2xl font-mono font-bold ${scoreColor(signal)}`}>{fmtScore(signal)}</div>
            </div>

            {/* Convicción */}
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">
                Convicción
                <Tooltip text="FULL si |señal|>0.25 · HALF si |señal|>0.10 · FLAT si ≤0.10 → no operar." />
              </div>
              <div className={`text-2xl font-mono font-bold ${convColor}`}>{conviction}</div>
            </div>

            {/* Dirección */}
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Dirección</div>
              <div className={`text-base font-bold uppercase tracking-wide ${conviction === 'FLAT' ? 'text-[#444]' : signal > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                {conviction === 'FLAT' ? '— sin señal —' : direction}
              </div>
            </div>

            {/* Régimen */}
            <div className="p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Régimen (WV)</div>
              <div className={`text-base font-bold uppercase ${regimeColor}`}>{regime}</div>
              <div className="text-[10px] text-[#444] mt-0.5">
                Mult: ciclicas ×{getRegimeMultiplier(regime, true).toFixed(2)} · refugio ×{getRegimeMultiplier(regime, false).toFixed(2)}
              </div>
            </div>
          </div>

          {/* Horizonte breakdown */}
          <div className="grid grid-cols-3 border-t border-[#222]">
            {[
              { label: 'CORTO 20%', tip: 'Indicadores de días-semanas (CFTC). Peso 20%.', a: scoreA?.short,  b: scoreB?.short  },
              { label: 'MEDIO 50%', tip: 'Indicadores 1-6 meses (tipos, inflación, empleo, PMI). Peso 50% — dominante.', a: scoreA?.medium, b: scoreB?.medium },
              { label: 'LARGO 30%', tip: 'Indicadores estructurales 6+ meses (CA, NIIP, ToT, REER, deuda). Peso 30%.', a: scoreA?.long,   b: scoreB?.long   },
            ].map((h, i) => (
              <div key={h.label} className={`px-3 py-2 ${i < 2 ? 'border-r' : ''} border-[#222]`}>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{h.label}<Tooltip text={h.tip} /></div>
                <div className="flex gap-4">
                  <span className={`text-xs font-mono font-bold ${scoreColor(h.a ?? 0)}`}>
                    {COUNTRIES.find(c => c.prefix === pairA)?.label} {fmtScore(h.a ?? 0)}
                  </span>
                  <span className={`text-xs font-mono font-bold ${scoreColor(h.b ?? 0)}`}>
                    {COUNTRIES.find(c => c.prefix === pairB)?.label} {fmtScore(h.b ?? 0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── RANKING G10 ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Ranking G10 — Fortaleza Total</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10">
            {rankedCountries.map((c, i) => {
              const barPct = Math.abs(c.composite) / maxAbsScore * 100
              const isActive = activeTab === c.prefix
              return (
                <button key={c.prefix} onClick={() => setActiveTab(c.prefix)}
                  className={`p-3 border-r border-b border-[#1a1a1a] text-center transition-colors ${isActive ? 'bg-[#111] border-b-2 border-b-[#ecd987]' : 'hover:bg-[#0a0a0a]'}`}>
                  <div className="text-[9px] text-[#444] uppercase mb-0.5">#{i + 1}</div>
                  <div className={`text-xs font-bold uppercase mb-1 ${isActive ? 'text-[#ecd987]' : 'text-[#a3a3a3]'}`}>{c.label}</div>
                  <div className={`text-base font-mono font-bold ${scoreColor(c.composite)}`}>{fmtScore(c.composite)}</div>
                  <div className="mt-1.5 h-1 bg-[#1a1a1a] overflow-hidden">
                    <div className={`h-full ${c.composite > 0 ? 'bg-[#4ade80]' : c.composite < 0 ? 'bg-[#ef4444]' : 'bg-[#333]'}`}
                      style={{ width: `${barPct}%` }} />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── DETALLE DE PAÍS ── */}
        <div className="border-2 border-[#333]">
          {/* Country header */}
          {activeCountry && activeScore && (
            <div className="px-4 py-3 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-[10px] text-[#555] uppercase tracking-wider mb-0.5">{activeCountry.cyclical ? 'Pro-Cíclica' : 'Refugio'} · RM ×{activeRegimeMult.toFixed(2)}</div>
                  <div className="text-2xl font-bold text-[#ecd987] uppercase">{activeCountry.label}</div>
                </div>
                <div className={`text-3xl font-mono font-bold ${scoreColor(activeScore.composite)}`}>
                  {fmtScore(activeScore.composite)}
                </div>
                <div className="flex flex-col gap-1 text-[10px]">
                  {[
                    { label: 'CORTO 20%', value: activeScore.short  },
                    { label: 'MEDIO 50%', value: activeScore.medium },
                    { label: 'LARGO 30%', value: activeScore.long   },
                  ].map(h => (
                    <div key={h.label} className="flex items-center gap-2">
                      <span className="text-[#444] w-20 uppercase">{h.label}</span>
                      <div className="w-24 h-1 bg-[#1a1a1a] relative">
                        {h.value >= 0
                          ? <div className="absolute left-1/2 top-0 h-full bg-[#4ade80]"
                              style={{ width: `${Math.min(Math.abs(h.value) / 0.5 * 50, 50)}%` }} />
                          : <div className="absolute right-1/2 top-0 h-full bg-[#ef4444]"
                              style={{ width: `${Math.min(Math.abs(h.value) / 0.5 * 50, 50)}%` }} />
                        }
                        <div className="absolute left-1/2 top-0 w-px h-full bg-[#333]" />
                      </div>
                      <span className={`font-mono w-14 ${scoreColor(h.value)}`}>{fmtScore(h.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Link to={`/model-inputs?country=${activeCountry.prefix}`}
                className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">
                → Datos
              </Link>
            </div>
          )}

          {/* Tab bar */}
          <div className="flex border-b border-[#222] overflow-x-auto bg-[#0a0a0a]">
            {COUNTRIES.map(c => {
              const cs = countryScores.find(x => x.prefix === c.prefix)
              return (
                <button key={c.prefix} onClick={() => setActiveTab(c.prefix)}
                  className={`px-3 py-2 text-xs font-bold uppercase tracking-wider border-r border-[#1a1a1a] whitespace-nowrap flex-shrink-0 transition-colors ${
                    activeTab === c.prefix
                      ? 'text-[#ecd987] bg-[#111]'
                      : 'text-[#444] hover:text-[#a3a3a3]'
                  }`}>
                  {c.label}
                  {cs && (
                    <span className={`ml-1.5 text-[10px] font-mono ${scoreColor(cs.composite)}`}>
                      {fmtScore(cs.composite)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Indicator table */}
          {activeCountry && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[580px]">
                <thead>
                  <tr className="bg-[#0a0a0a] border-b border-[#222] text-[#444] text-left">
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest w-[36%]">Indicador</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest w-[28%]">
                      Z-Score
                      <Tooltip text="Desviaciones estándar del valor actual respecto a la media histórica. Rango [−4, +4]." />
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest w-[28%]">
                      Contribución
                      <Tooltip align="right" text="β_norm × z × signo × RM. La barra muestra la magnitud relativa. Verde = aporta fortaleza." />
                    </th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest w-[8%]">TF</th>
                  </tr>
                </thead>
                <tbody>
                  {INDICATORS_BY_CATEGORY.map(({ category, items }) => (
                    <Fragment key={category}>
                      {/* Category row */}
                      <tr className="bg-[#0f0f0f] border-y border-[#1a1a1a]">
                        <td colSpan={4} className="px-3 py-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${CATEGORY_COLOR[category] ?? 'text-[#555]'}`}>
                            {category}
                          </span>
                        </td>
                      </tr>

                      {items.map((ind, _i) => {
                        const indIdx   = INDICATORS.findIndex(x => x.key === ind.key)
                        const z        = zScores[`${activeCountry.prefix}_${ind.key}`] ?? 0
                        const beta     = activeBetaArr[indIdx] ?? ind.betaDoc
                        const contrib  = (beta / activeBetaTotal) * z * ind.sign * activeRegimeMult
                        const rawVal   = features.valuesBySourceId[getSourceId(activeCountry.prefix, ind.key)]
                        const hasData  = z !== 0 || rawVal != null
                        const entry    = history[`${activeCountry.prefix}_${ind.key}`]
                        const fresh    = getFreshness(entry?.lastImported, ENDO_FREQ[ind.key])

                        return (
                          <tr key={ind.key} className={`border-b border-[#111] hover:bg-[#0a0a0a] transition-colors ${!hasData ? 'opacity-40' : ''}`}>
                            {/* Indicator name */}
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-1">
                                <span className="text-xs font-bold text-[#e5e5e5]">
                                  {getIndLabel(ind.key, activeCountry.prefix)}
                                </span>
                                {IND_TIPS[ind.key] && <Tooltip text={IND_TIPS[ind.key]} />}
                                {ind.key === 'real_2y' && (
                                  <span className="text-[9px] font-bold text-[#ecd987] ml-1">★</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`text-[9px] uppercase tracking-wider ${ind.sign === 1 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                                  {ind.sign === 1 ? '▲ bull' : '▼ bear'}
                                </span>
                                {rawVal != null && (
                                  <span className="text-[9px] font-mono text-[#f59e0b]">{rawVal.toFixed(2)}</span>
                                )}
                                {!hasData && (
                                  <span className="text-[9px] text-[#444] uppercase">sin datos</span>
                                )}
                              </div>
                            </td>

                            {/* Z-Score with bar */}
                            <td className="px-3 py-2">
                              <ZBar z={z} />
                            </td>

                            {/* Contribution with bar */}
                            <td className="px-3 py-2">
                              <ContribBar contrib={contrib} maxContrib={maxContrib} />
                            </td>

                            {/* Horizon + freshness */}
                            <td className="px-3 py-2">
                              <div className="flex flex-col items-center gap-0.5">
                                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                                  ind.horizon === 'SHORT'  ? 'text-[#60a5fa]' :
                                  ind.horizon === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#666]'
                                }`}>
                                  {ind.horizon === 'SHORT' ? 'S' : ind.horizon === 'MEDIUM' ? 'M' : 'L'}
                                </span>
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${FRESHNESS_DOT[fresh.status]}`}
                                  title={fresh.label} />
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
