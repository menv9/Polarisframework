// ── Centralized regime detection, conviction, and regime multipliers ──────────
//
// Regime inputs are feature values, not raw registry values.
// vix/hyOas/embi are rolling 5Y percentiles (0-100) from
// Source -> History -> Features. sp200dma is a derived 1/0 feature.

const REGIME_ON_THRESHOLDS  = { vix: 30, hyOas: 30, embi: 40 }
const REGIME_OFF_THRESHOLDS = { vix: 70, hyOas: 70, embi: 70 }
const REGIME_PERSISTENCE_SESSIONS = 5
const REGIME_SHOCK_PERCENTILE = 99
const INFLATION_POLICY = {
  HAWKISH: 1,
  NEUTRAL: 0,
  DOVISH: -1,
}
const MIN_CONVICTION_HISTORY = 20

function percentile(values, p) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (nums.length === 0) return null
  const idx = (nums.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return nums[lo]
  return nums[lo] + (nums[hi] - nums[lo]) * (idx - lo)
}

/**
 * Detect market regime from worldview data.
 * wv must have: { vix, hyOas, sp200dma (1|0), embi }
 * Returns 'RISK-ON' | 'RISK-OFF' | 'MIXTO'
 */
export function detectRegime(wv) {
  const { vix, hyOas, sp200dma, embi } = wv
  const t = REGIME_ON_THRESHOLDS
  const f = REGIME_OFF_THRESHOLDS
  const regimeOn  = vix < t.vix && hyOas < t.hyOas && sp200dma === 1 && embi < t.embi
  const regimeOff = vix > f.vix || hyOas > f.hyOas || sp200dma === 0 || embi > f.embi
  return regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'
}

export function hasRegimeShock(wv) {
  const stress = [wv.vix, wv.hyOas, wv.embi].filter(Number.isFinite)
  return stress.some(value => value >= REGIME_SHOCK_PERCENTILE)
}

function regimeSignature(rawRegime, wv) {
  const keys = ['vix', 'hyOas', 'sp200dma', 'embi']
  const parts = keys.map(key => {
    const value = wv[key]
    return Number.isFinite(value) ? `${key}:${value.toFixed(2)}` : `${key}:na`
  })
  return `${rawRegime}|${parts.join('|')}`
}

export function resolvePersistentRegime(rawRegime, wv, previousState = null) {
  const signature = regimeSignature(rawRegime, wv)
  if (previousState?.lastSignature === signature) return previousState

  const shock = hasRegimeShock(wv)
  const priorCurrent = previousState?.current ?? rawRegime

  let current = priorCurrent
  let candidate = previousState?.candidate ?? null
  let candidateCount = previousState?.candidateCount ?? 0

  if (shock || rawRegime === priorCurrent) {
    current = rawRegime
    candidate = null
    candidateCount = 0
  } else if (rawRegime === candidate) {
    candidateCount += 1
    if (candidateCount >= REGIME_PERSISTENCE_SESSIONS) {
      current = rawRegime
      candidate = null
      candidateCount = 0
    }
  } else {
    candidate = rawRegime
    candidateCount = 1
  }

  const history = [
    ...(previousState?.history ?? []),
    {
      at: new Date().toISOString(),
      rawRegime,
      effectiveRegime: current,
      candidate,
      candidateCount,
      shock,
    },
  ].slice(-20)

  return {
    current,
    rawRegime,
    candidate,
    candidateCount,
    requiredCount: REGIME_PERSISTENCE_SESSIONS,
    shock,
    lastSignature: signature,
    history,
  }
}

export function detectInflationRegime(wv) {
  const cpi = Number(wv.cpiG7)
  const breakevens = Number(wv.breakevens)
  const policy = Number(wv.cbPolicyStance ?? INFLATION_POLICY.NEUTRAL)

  const cpiHigh = Number.isFinite(cpi) && cpi > 3.0
  const breakevensHigh = Number.isFinite(breakevens) && breakevens > 2.5
  const policyHawkish = policy >= INFLATION_POLICY.HAWKISH
  if (cpiHigh && breakevensHigh && policyHawkish) return 'INFLACIONARIO'

  const cpiLow = Number.isFinite(cpi) && cpi < 2.0
  const breakevensLow = Number.isFinite(breakevens) && breakevens < 2.0
  const policyDovish = policy <= INFLATION_POLICY.NEUTRAL
  if (cpiLow && breakevensLow && policyDovish) return 'DESINFLACIONARIO'

  return 'ESTABLE'
}

/**
 * Position multiplier based on regime and whether the currency is cyclical.
 * Cyclical (AUD, CAD, NOK, NZD, EUR, GBP, SEK): benefit from risk-on environments.
 * Defensive (USD, JPY, CHF): benefit from risk-off environments.
 *
 * vixRaw: raw VIX level (not percentile). When >= 30, applies a shock cap that
 * overrides the regime-based multiplier for cyclical currencies, independent of
 * whether the percentile-based regime detection has caught up.
 */
export function getRegimeMultiplier(regime, cyclical, vixRaw = null) {
  const base = regime === 'RISK-ON'  ? (cyclical ? 1.0 : 0.5)
             : regime === 'RISK-OFF' ? (cyclical ? 0.5 : 1.0)
             : 0.75

  if (cyclical && Number.isFinite(vixRaw)) {
    if (vixRaw >= 40) return Math.min(base, 0.10)
    if (vixRaw >= 30) return Math.min(base, 0.30)
  }
  return base
}

/**
 * Conviction tier from a pair's differential signal.
 * Uses historical signal percentiles when enough samples exist.
 * Returns 'FULL' | 'HALF' | 'FLAT'
 */
export function getConviction(signal, historicalSignals = []) {
  const a = Math.abs(signal)
  const historicalAbs = historicalSignals
    .map(item => typeof item === 'number' ? Math.abs(item) : Math.abs(Number(item?.value)))
    .filter(Number.isFinite)

  if (historicalAbs.length >= MIN_CONVICTION_HISTORY) {
    const p50 = percentile(historicalAbs, 0.50)
    const p75 = percentile(historicalAbs, 0.75)
    return a >= p75 ? 'FULL' : a >= p50 ? 'HALF' : 'FLAT'
  }

  return a > 2.5 ? 'FULL' : a > 1.0 ? 'HALF' : 'FLAT'
}
