// Pipeline-calibrated per-(indicator, fx_pair) betas
// CSV input: beta_matrix_full.csv generado por beta_pipeline

import { INDICATORS } from './endogenousBetas'
import { getRegimeMultiplier } from './scoring/regime'

export const STORAGE_KEY_PAIR_BETAS      = 'polaris_pair_betas'
export const STORAGE_KEY_PAIR_BETAS_META = 'polaris_pair_betas_meta'

// App country prefix → pipeline prefix (solo diferencias)
const PREFIX_MAP = { can: 'cad' }

// App indicator key → pipeline suffix (solo diferencias)
const KEY_MAP = {
  debt:   'debt_gdp',
  ca_gdp: 'ca',
  umcsi:  'conf',
}

function toPipelineName(appPrefix, appKey) {
  const prefix = PREFIX_MAP[appPrefix] ?? appPrefix
  const suffix = appKey === 'nfp' && appPrefix !== 'usa'
    ? 'unempl'
    : (KEY_MAP[appKey] ?? appKey)
  return `endo_${prefix}_${suffix}`
}

// Parsea beta_matrix_full.csv → { [fxPair]: { [indicator]: { beta, r2, significant } } }
export function parsePairBetaCSV(csvText) {
  const lines = csvText.trim().split(/\r?\n/)
  if (lines.length < 2) return {}
  const header = lines[0].split(',').map(h => h.trim())
  const idx    = name => header.indexOf(name)
  const fxI    = idx('fx_pair')
  const indI   = idx('indicator')
  const betaI  = idx('beta')
  const r2I    = idx('r2')
  const sigI   = idx('significant')
  if (fxI < 0 || indI < 0 || betaI < 0) return {}

  const result = {}
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',')
    const fx   = cols[fxI]?.trim()
    const ind  = cols[indI]?.trim()
    const beta = parseFloat(cols[betaI])
    if (!fx || !ind || isNaN(beta)) continue
    if (!result[fx]) result[fx] = {}
    result[fx][ind] = {
      beta,
      r2:          r2I  >= 0 ? parseFloat(cols[r2I])         : null,
      significant: sigI >= 0 ? cols[sigI]?.trim() === 'True' : null,
    }
  }
  return result
}

export function loadPairBetas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAIR_BETAS)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

export function savePairBetas(data) {
  try {
    const pairs = Object.keys(data)
    localStorage.setItem(STORAGE_KEY_PAIR_BETAS, JSON.stringify(data))
    localStorage.setItem(STORAGE_KEY_PAIR_BETAS_META, JSON.stringify({
      loadedAt:  new Date().toISOString(),
      pairs:     pairs.length,
      pairList:  pairs,
      totalRows: pairs.reduce((s, p) => s + Object.keys(data[p]).length, 0),
    }))
  } catch { /* ignore storage errors */ }
}

export function clearPairBetas() {
  try {
    localStorage.removeItem(STORAGE_KEY_PAIR_BETAS)
    localStorage.removeItem(STORAGE_KEY_PAIR_BETAS_META)
  } catch { /* ignore */ }
}

export function loadPairBetasMeta() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAIR_BETAS_META)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// Devuelve abs(beta) del pipeline para (fxPair, countryPrefix, indicatorKey).
// null si no hay dato → el caller usa betaDoc como fallback.
export function getPairBeta(pairData, fxPairId, appPrefix, appKey) {
  const pairEntry = pairData?.[fxPairId]
  if (!pairEntry) return null
  const entry = pairEntry[toPipelineName(appPrefix, appKey)]
  if (!entry) return null
  return Math.abs(entry.beta)
}

// Devuelve la entrada completa { beta (con signo), r2, significant } o null.
// Para uso en UI de visualización.
export function getPairEntry(pairData, fxPairId, appPrefix, appKey) {
  const pairEntry = pairData?.[fxPairId]
  if (!pairEntry) return null
  return pairEntry[toPipelineName(appPrefix, appKey)] ?? null
}

// 'EUR/USD' → 'eurusd'
export function pairLabelToId(label) {
  return label.replace('/', '').toLowerCase()
}

// Score endógeno de un país usando betas específicas del par cuando estén disponibles.
// Si no hay dato de pipeline para un indicador, usa defaultBetas[key] ?? betaDoc.
export function computeCountryScoreForPair(
  prefix, cyclical, regime, zScores, defaultBetas, pairData, fxPairId
) {
  const rm = getRegimeMultiplier(regime, cyclical)

  const betaArr = INDICATORS.map(ind => {
    const pb = getPairBeta(pairData, fxPairId, prefix, ind.key)
    return pb ?? (defaultBetas[ind.key] ?? ind.betaDoc)
  })

  const total = betaArr.reduce((s, b) => s + b, 0) || 1
  let short = 0, medium = 0, longScore = 0

  INDICATORS.forEach((ind, i) => {
    const z       = zScores[`${prefix}_${ind.key}`] ?? 0
    const contrib = (betaArr[i] / total) * z * ind.sign * rm
    if      (ind.horizon === 'SHORT')  short     += contrib
    else if (ind.horizon === 'MEDIUM') medium    += contrib
    else                               longScore += contrib
  })

  return 0.20 * short + 0.50 * medium + 0.30 * longScore
}
