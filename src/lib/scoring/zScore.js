// Non-stationary series that require first-differencing before z-scoring.
// Debt/GDP and CB Balance/GDP trend structurally; z-scoring levels is meaningless.
const NONSTATIONARY_KEYS = new Set(['debt', 'cb_balance', 'niip'])

function winsorize(values, lo = 0.01, hi = 0.99) {
  if (values.length < 4) return values
  const sorted = [...values].sort((a, b) => a - b)
  const loVal = sorted[Math.floor((sorted.length - 1) * lo)]
  const hiVal = sorted[Math.floor((sorted.length - 1) * hi)]
  return values.map(v => Math.max(loVal, Math.min(hiVal, v)))
}

function firstDiff(values) {
  if (values.length < 2) return []
  return values.slice(1).map((v, i) => v - values[i])
}

// Extract indicator key from composite keys like "usa_debt" → "debt", "usa_cb_balance" → "cb_balance"
function indKeyFrom(key) {
  const parts = key.split('_')
  if (parts.length < 2) return key
  // Strip 3-letter country prefix (usa, eur, jpn, gbr, che, can, aus, nzl, swe, nor)
  return parts.slice(1).join('_')
}

/**
 * Compute rolling z-score for the last value of a series.
 *
 * @param {Array<{date: string, value: number}>} series - sorted oldest→newest
 * @param {object} opts
 * @param {string}  opts.key          - indicator key (detects non-stationary series)
 * @param {number}  opts.windowMonths - rolling window length, default 120 (10Y)
 * @param {number}  opts.clip         - abs clamp on z-score output, default 10
 * @returns {{ z: number, n: number, mean: number, std: number, last: number|null }}
 */
export function computeRollingZScore(series, { key = '', windowMonths = 120, clip = 10 } = {}) {
  const fallback = { z: 0, n: series?.length ?? 0, mean: 0, std: 0, last: series?.[series.length - 1]?.value ?? null }
  if (!series || series.length < 3) return fallback

  const window = series.slice(-windowMonths)
  let rawValues = window.map(p => p.value)

  const needsDiff = NONSTATIONARY_KEYS.has(indKeyFrom(key))
  if (needsDiff) {
    rawValues = firstDiff(rawValues)
    if (rawValues.length < 2) return { ...fallback, n: 0 }
  }

  const winsorized = winsorize(rawValues)
  const n = winsorized.length
  const mean = winsorized.reduce((s, v) => s + v, 0) / n
  const std = n > 1
    ? Math.sqrt(winsorized.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1))
    : 0

  // z-score of last value (pre-winsorization) against the winsorized distribution
  const lastRaw = rawValues[rawValues.length - 1]
  const z = std > 0 ? Math.max(-clip, Math.min(clip, (lastRaw - mean) / std)) : 0

  return { z, n, mean, std, last: series[series.length - 1].value }
}
