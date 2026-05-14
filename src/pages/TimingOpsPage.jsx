import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { INDICATORS, loadBetas, computeBetaTotal } from '../lib/endogenousBetas'
import { TIMING_CHECKS, computeTimingVerdict } from '../lib/timing/score'

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

const STATUS_VALUES = { true: true, false: false, null: null }

export default function TimingOpsPage() {
  const { worldview: wv, zscores: zScores } = useModelStore()
  const [betas] = useState(loadBetas)
  const [selectedPair, setSelectedPair] = useState('EUR/USD')
  const [checks, setChecks] = useState({})

  const regimeOn  = wv.vix < 30 && wv.hyOas < 30 && wv.sp200dma === 1 && wv.embi < 40
  const regimeOff = wv.vix > 70 || wv.hyOas > 70 || wv.sp200dma === 0 || wv.embi > 70
  const regime    = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'

  const countryScores = useMemo(() =>
    COUNTRIES.map(c => ({
      ...c,
      score: computeCountryScore(c.prefix, c.cyclical, regime, zScores, betas),
    })),
    [regime, zScores, betas]
  )

  const pairInfo = useMemo(() => {
    const pair = PAIRS.find(p => p.label === selectedPair)
    if (!pair) return null
    const byPrefix = new Map(countryScores.map(c => [c.prefix, c]))
    const base  = byPrefix.get(pair.base)
    const quote = byPrefix.get(pair.quote)
    const signal = base && quote ? base.score - quote.score : 0
    return { signal, conv: getConviction(signal), direction: signal >= 0 ? 'LONG' : 'SHORT' }
  }, [selectedPair, countryScores])

  const { verdict, failing, score } = useMemo(() =>
    computeTimingVerdict(checks),
    [checks]
  )

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
                to="/risk/operativa"
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
