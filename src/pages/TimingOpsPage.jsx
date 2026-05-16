import { useState, useMemo, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { TIMING_CHECKS, TECH_SETUP_DEFAULTS, computeTimingVerdict, evaluateTechnicalSetup } from '../lib/timing/score'
import { getConviction } from '../lib/scoring/regime'
import { computeExogenousCurrencyScores, combineEndogenousExogenous } from '../lib/scoring/exogenous'
import { loadPairBetas, computeCountryScore, computeCountryScoreForPair, pairLabelToId } from '../lib/pairBetas'

const HTF_STORAGE_KEY = 'polaris_timing_htf_levels'

const PAIRS = [
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

const FX_SPOT_SOURCE_IDS = {
  'EUR/USD': 'exo_eurusd',
  'USD/JPY': 'exo_usdjpy',
  'GBP/USD': 'exo_gbpusd',
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


const STATUS_VALUES = { true: true, false: false, null: null }

function loadHtfLevels() {
  try {
    const saved = localStorage.getItem(HTF_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return {}
}

function htfFieldsForPair(htfLevels, pair) {
  return {
    weeklyTrend: 'UNKNOWN',
    monthlyTrend: 'UNKNOWN',
    weeklySupport: '',
    weeklyResistance: '',
    monthlySupport: '',
    monthlyResistance: '',
    htfNotes: '',
    ...(htfLevels[pair] || {}),
  }
}

export default function TimingOpsPage() {
  const { regime, zscores: zScores, dataSources, history, worldview: wv, features, signalHistory, recordSignalSample } = useModelStore()
  const vixRaw = wv.vixRaw
  const [pairBetaData] = useState(loadPairBetas)
  const [searchParams] = useSearchParams()
  const [selectedPair, setSelectedPair] = useState(() => {
    const p = searchParams.get('pair')
    return PAIRS.some(x => x.label === p) ? p : 'EUR/USD'
  })
  const [checks, setChecks] = useState({})
  const [techSetup, setTechSetup] = useState(TECH_SETUP_DEFAULTS)
  const [htfLevels, setHtfLevels] = useState(loadHtfLevels)

  const queryPair = searchParams.get('pair')
  const querySignal = Number(searchParams.get('signal'))
  const queryConviction = searchParams.get('conviction')
  const hasSignalOverride = selectedPair === queryPair && Number.isFinite(querySignal)
  const selectedHtf = htfFieldsForPair(htfLevels, selectedPair)
  const spotSourceId = FX_SPOT_SOURCE_IDS[selectedPair]
  const spotPrice = spotSourceId ? features.valuesBySourceId[spotSourceId] : null

  useEffect(() => {
    localStorage.setItem(HTF_STORAGE_KEY, JSON.stringify(htfLevels))
  }, [htfLevels])

  useEffect(() => {
    setTechSetup(prev => ({ ...prev, ...htfFieldsForPair(htfLevels, selectedPair) }))
  }, [selectedPair, htfLevels])

  const exogenousScores = useMemo(() =>
    computeExogenousCurrencyScores(dataSources, history),
    [dataSources, history]
  )

  const countryScores = useMemo(() =>
    COUNTRIES.map(c => {
      const endoScore = computeCountryScore(c.prefix, c.cyclical, regime, zScores, pairBetaData, vixRaw)
      const exoScore  = exogenousScores[c.ccy] ?? 0
      return {
        ...c,
        endoScore,
        exoScore,
        score: combineEndogenousExogenous(endoScore, exoScore, c.ccy),
      }
    }),
    [regime, zScores, pairBetaData, exogenousScores]
  )

  const pairInfo = useMemo(() => {
    const pair = PAIRS.find(p => p.label === selectedPair)
    if (!pair) return null
    const byPrefix = new Map(countryScores.map(c => [c.prefix, c]))
    const base  = byPrefix.get(pair.base)
    const quote = byPrefix.get(pair.quote)
    let signal
    if (hasSignalOverride) {
      signal = querySignal
    } else if (base && quote) {
      const pairId    = pairLabelToId(pair.label)
      const baseEndo  = computeCountryScoreForPair(pair.base,  base.cyclical,  regime, zScores, pairBetaData, pairId, vixRaw)
      const quoteEndo = computeCountryScoreForPair(pair.quote, quote.cyclical, regime, zScores, pairBetaData, pairId, vixRaw)
      signal = combineEndogenousExogenous(baseEndo,  base.exoScore,  base.ccy)
             - combineEndogenousExogenous(quoteEndo, quote.exoScore, quote.ccy)
    } else {
      signal = 0
    }
    const conv = hasSignalOverride && ['FULL', 'HALF', 'FLAT'].includes(queryConviction)
      ? queryConviction
      : getConviction(signal, signalHistory[selectedPair])
    return { signal, conv, direction: signal >= 0 ? 'LONG' : 'SHORT' }
  }, [selectedPair, countryScores, regime, zScores, pairBetaData, hasSignalOverride, querySignal, queryConviction, signalHistory])

  useEffect(() => {
    if (pairInfo) recordSignalSample(selectedPair, pairInfo.signal)
  }, [selectedPair, pairInfo, recordSignalSample])

  const { verdict, failing, score } = useMemo(() =>
    computeTimingVerdict(checks),
    [checks]
  )
  const setupVerdict = useMemo(() =>
    evaluateTechnicalSetup(techSetup, pairInfo?.direction),
    [techSetup, pairInfo?.direction]
  )

  useEffect(() => {
    const verdict = evaluateTechnicalSetup(techSetup, pairInfo?.direction)
    setChecks(prev => ({ ...prev, ...verdict.checkUpdates }))
  }, [techSetup, pairInfo?.direction])

  function toggle(id) {
    setChecks(prev => {
      const cur = prev[id]
      // null → true → false → null
      const next = cur === undefined || cur === null ? true : cur === true ? false : null
      return { ...prev, [id]: next }
    })
  }

  function resetChecks() {
    setChecks({})
    setTechSetup({ ...TECH_SETUP_DEFAULTS, ...selectedHtf })
  }

  function updateHtfField(key, value) {
    setHtfLevels(prev => ({
      ...prev,
      [selectedPair]: {
        ...htfFieldsForPair(prev, selectedPair),
        [key]: value,
      },
    }))
  }

  const verdictColor = verdict === 'READY' ? 'text-[#4ade80]' : verdict === 'WAIT' ? 'text-[#f59e0b]' : 'text-[#ef4444]'
  const verdictBg    = verdict === 'READY' ? 'bg-[#0d1f0d]' : verdict === 'WAIT' ? 'bg-[#1f1400]' : 'bg-[#1f0d0d]'
  const signalColor  = pairInfo?.signal > 0 ? 'text-[#4ade80]' : pairInfo?.signal < 0 ? 'text-[#ef4444]' : 'text-[#777]'
  const convColor    = pairInfo?.conv === 'FULL' ? 'text-[#4ade80]' : pairInfo?.conv === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">TIMING</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">
              Módulo IV — ¿Cuándo entrar?
            </p>
          </div>
          <Link to="/dashboard" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">
            ← DASHBOARD
          </Link>
        </div>

        {/* Par selector + señal macro */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Par a analizar</span>
          </div>
          <div className="p-3 flex flex-wrap items-center gap-2">
            {PAIRS.map(p => (
              <button
                key={p.label}
                onClick={() => { setSelectedPair(p.label); setChecks({}) }}
                className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider border transition-colors ${
                  selectedPair === p.label
                    ? 'border-[#ecd987] text-[#ecd987] bg-[#1a1a0d]'
                    : 'border-[#333] text-[#555] hover:text-[#a3a3a3] hover:border-[#555]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {pairInfo && (
            <div className="grid grid-cols-4 border-t border-[#222]">
              {[
                { label: 'SEÑAL',     value: (pairInfo.signal >= 0 ? '+' : '') + pairInfo.signal.toFixed(3), color: signalColor },
                { label: 'CONVICCIÓN',value: pairInfo.conv,      color: convColor },
                { label: 'DIRECCIÓN', value: pairInfo.direction, color: pairInfo.direction === 'LONG' ? 'text-[#4ade80]' : 'text-[#ef4444]' },
                { label: 'RÉGIMEN',   value: regime,             color: regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
              ].map(item => (
                <div key={item.label} className="p-3 border-r border-[#222]">
                  <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{item.label}</div>
                  <div className={`text-base font-mono font-bold ${item.color}`}>{item.value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup técnico */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Validación Setup A+</span>
            <span className={`text-[10px] font-bold uppercase tracking-wider ${setupVerdict.aPlus ? 'text-[#4ade80]' : 'text-[#f59e0b]'}`}>
              {setupVerdict.aPlus ? 'A+ VALIDADO' : 'PENDIENTE'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Tipo</div>
              <select
                value={techSetup.tradeType}
                onChange={e => setTechSetup(s => ({ ...s, tradeType: e.target.value }))}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]"
              >
                <option value="MOMENTUM">Momentum</option>
                <option value="MEAN_REVERSION">Mean-reversion</option>
              </select>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">RSI</div>
              <input type="number" value={techSetup.rsi} min={0} max={100} step={1}
                onChange={e => setTechSetup(s => ({ ...s, rsi: Number(e.target.value) }))}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]" />
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">ADX</div>
              <input type="number" value={techSetup.adx} min={0} max={100} step={1}
                onChange={e => setTechSetup(s => ({ ...s, adx: Number(e.target.value) }))}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]" />
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Confluencias</div>
              <input type="number" value={techSetup.confluences} min={0} max={6} step={1}
                onChange={e => setTechSetup(s => ({ ...s, confluences: Number(e.target.value) }))}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5">
            {[
              ['pullback', 'Pullback 50/100dma'],
              ['retest', 'Ruptura + retest'],
              ['candlePattern', 'Pin/engulfing'],
              ['divergence', 'Divergencia'],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTechSetup(s => ({ ...s, [key]: !s[key] }))}
                className={`p-3 border-r border-b border-[#222] text-left transition-colors ${techSetup[key] ? 'bg-[#0a1a0a] text-[#4ade80]' : 'text-[#555] hover:text-[#a3a3a3]'}`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider">{label}</div>
              </button>
            ))}
            <button
              onClick={() => setTechSetup(s => ({ ...s, mtfAligned: s.mtfAligned === true ? false : s.mtfAligned === false ? null : true }))}
              className={`p-3 border-r border-b border-[#222] text-left transition-colors ${techSetup.mtfAligned === true ? 'bg-[#0a1a0a] text-[#4ade80]' : techSetup.mtfAligned === false ? 'bg-[#1a0a0a] text-[#ef4444]' : 'text-[#555] hover:text-[#a3a3a3]'}`}
            >
              <div className="text-[10px] font-bold uppercase tracking-wider">MTF {techSetup.mtfAligned === true ? 'OK' : techSetup.mtfAligned === false ? 'FAIL' : 'N/A'}</div>
            </button>
          </div>
        </div>

        {/* Niveles HTF */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Filtro Multi-Timeframe</span>
            <span className="text-[10px] text-[#777] uppercase tracking-wider">
              Spot {Number.isFinite(spotPrice) ? spotPrice.toFixed(selectedPair.includes('JPY') ? 3 : 5) : 'sin fuente'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 border-b border-[#222]">
            {[
              ['weeklyTrend', 'Weekly trend'],
              ['monthlyTrend', 'Monthly trend'],
            ].map(([key, label]) => (
              <div key={key} className="p-3 border-r border-b border-[#222]">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
                <select
                  value={selectedHtf[key]}
                  onChange={e => updateHtfField(key, e.target.value)}
                  className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]"
                >
                  <option value="UNKNOWN">Sin dato</option>
                  <option value="UP">Alcista</option>
                  <option value="DOWN">Bajista</option>
                  <option value="RANGE">Rango</option>
                </select>
              </div>
            ))}
            {[
              ['weeklySupport', 'Weekly soporte'],
              ['weeklyResistance', 'Weekly resistencia'],
              ['monthlySupport', 'Monthly soporte'],
              ['monthlyResistance', 'Monthly resistencia'],
            ].map(([key, label]) => (
              <div key={key} className="p-3 border-r border-b border-[#222]">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
                <input
                  type="number"
                  value={selectedHtf[key]}
                  step={selectedPair.includes('JPY') ? 0.01 : 0.0001}
                  onChange={e => updateHtfField(key, e.target.value)}
                  className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-sm px-2 py-1 w-full focus:outline-none focus:border-[#ecd987]"
                />
              </div>
            ))}
          </div>
          <div className="p-3">
            <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Notas HTF</div>
            <input
              type="text"
              value={selectedHtf.htfNotes}
              onChange={e => updateHtfField('htfNotes', e.target.value)}
              placeholder="Ej: weekly HH-HL, monthly resistance 1.1050, esperar cierre sobre nivel"
              className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-2 py-1.5 w-full focus:outline-none focus:border-[#ecd987]"
            />
          </div>
        </div>

        {/* Checklist */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Checklist Pre-Entry — Pipeline de Timing</span>
            <button onClick={resetChecks} className="text-[10px] uppercase tracking-wider text-[#555] hover:text-[#ef4444]">
              Reset
            </button>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {TIMING_CHECKS.map(check => {
              const val = checks[check.id]
              const isOk   = val === true
              const isFail = val === false
              const isNa   = val === undefined || val === null
              return (
                <div
                  key={check.id}
                  className={`flex items-start gap-3 px-3 py-2.5 cursor-pointer hover:bg-[#0a0a0a] transition-colors ${
                    isFail ? 'bg-[#1a0a0a]' : isOk ? 'bg-[#0a1a0a]' : ''
                  }`}
                  onClick={() => toggle(check.id)}
                >
                  <div className={`mt-0.5 w-5 h-5 flex-shrink-0 border flex items-center justify-center text-xs font-bold ${
                    isOk   ? 'border-[#4ade80] text-[#4ade80] bg-[#0d1f0d]' :
                    isFail ? 'border-[#ef4444] text-[#ef4444] bg-[#1f0d0d]' :
                             'border-[#333] text-[#333]'
                  }`}>
                    {isOk ? '✓' : isFail ? '✗' : '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${
                        isOk ? 'text-[#a3a3a3]' : isFail ? 'text-[#ef4444]' : 'text-[#555]'
                      }`}>
                        {check.label}
                      </span>
                      {check.required && (
                        <span className="text-[9px] font-bold uppercase text-[#ef4444] border border-[#ef4444] px-1">REQUIRED</span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#444] mt-0.5 leading-relaxed">{check.description}</div>
                  </div>
                  <div className="text-[10px] text-[#333] uppercase tracking-wider flex-shrink-0 mt-1">
                    {isOk ? 'OK' : isFail ? 'FAIL' : 'N/A'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Veredicto */}
        <div className={`border-2 ${verdict === 'READY' ? 'border-[#4ade80]' : verdict === 'WAIT' ? 'border-[#f59e0b]' : 'border-[#ef4444]'} ${verdictBg} p-4 mb-3`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Veredicto de Timing</div>
              <div className={`text-3xl font-mono font-bold uppercase ${verdictColor}`}>{verdict}</div>
              <div className="text-xs text-[#555] mt-1 uppercase tracking-wider">
                {verdict === 'READY' && `${score}% checks passed — proceder a Risk Management`}
                {verdict === 'WAIT'  && `${failing} items fallando — esperar condiciones mejores`}
                {verdict === 'ABORT' && 'Señal requerida ausente — no proceder'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Checks</div>
              <div className="text-2xl font-mono font-bold text-[#a3a3a3]">
                {Object.values(checks).filter(v => v === true).length}
                <span className="text-[#333] text-base"> / {TIMING_CHECKS.length}</span>
              </div>
              {failing > 0 && (
                <div className="text-xs text-[#ef4444] mt-0.5">{failing} fallando</div>
              )}
            </div>
          </div>
          {verdict === 'READY' && (
            <div className="mt-3 pt-3 border-t border-[#333] flex gap-3">
              <Link
                to={`/risk/operativa?pair=${encodeURIComponent(selectedPair)}&conviction=${pairInfo?.conv ?? 'FULL'}&signal=${pairInfo?.signal?.toFixed(3) ?? '0'}`}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-[#4ade80] text-black hover:bg-[#22c55e] transition-colors"
              >
                → Risk Management
              </Link>
            </div>
          )}
        </div>

        {/* Guía rápida */}
        <div className="border border-[#222] p-3 text-[10px] text-[#444] leading-relaxed">
          <span className="text-[#555] font-bold uppercase tracking-wider">Regla: </span>
          Si ≥ 2 items no cumplen → WAIT. Si el check &quot;Señal FX vigente&quot; falla → ABORT.
          Haz click en cada item para marcarlo OK (✓), FAIL (✗), o N/A.
        </div>

      </div>
    </div>
  )
}
