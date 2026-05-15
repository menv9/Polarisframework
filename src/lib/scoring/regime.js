// ── Centralized regime detection, conviction, and regime multipliers ──────────
//
// Regime inputs are feature values, not raw registry values.
// vix/hyOas/embi are rolling 5Y percentiles (0-100) from
// Source -> History -> Features. sp200dma is a derived 1/0 feature.

const REGIME_ON_THRESHOLDS  = { vix: 30, hyOas: 30, embi: 40 }
const REGIME_OFF_THRESHOLDS = { vix: 70, hyOas: 70, embi: 70 }

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

/**
 * Position multiplier based on regime and whether the currency is cyclical.
 * Cyclical (AUD, CAD, NOK, NZD, EUR, GBP, SEK): benefit from risk-on environments.
 * Defensive (USD, JPY, CHF): benefit from risk-off environments.
 */
export function getRegimeMultiplier(regime, cyclical) {
  if (regime === 'RISK-ON')  return cyclical ? 1.0 : 0.5
  if (regime === 'RISK-OFF') return cyclical ? 0.5 : 1.0
  return 0.75
}

/**
 * Conviction tier from a pair's differential signal.
 * Returns 'FULL' | 'HALF' | 'FLAT'
 */
export function getConviction(signal) {
  const a = Math.abs(signal)
  return a > 0.25 ? 'FULL' : a > 0.10 ? 'HALF' : 'FLAT'
}
