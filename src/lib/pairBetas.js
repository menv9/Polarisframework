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

// ─── CSV / Storage ────────────────────────────────────────────────────────────

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

// ─── Lookups puntuales ────────────────────────────────────────────────────────

// abs(beta) para un par concreto — fallback a null si no hay dato.
export function getPairBeta(pairData, fxPairId, appPrefix, appKey) {
  const pairEntry = pairData?.[fxPairId]
  if (!pairEntry) return null
  const entry = pairEntry[toPipelineName(appPrefix, appKey)]
  if (!entry) return null
  return Math.abs(entry.beta)
}

// Entrada completa { beta (con signo), r2, significant } para visualización.
export function getPairEntry(pairData, fxPairId, appPrefix, appKey) {
  const pairEntry = pairData?.[fxPairId]
  if (!pairEntry) return null
  return pairEntry[toPipelineName(appPrefix, appKey)] ?? null
}

// Promedio de abs(beta) de un indicador para una divisa a través de TODOS los pares.
// Usado para scores individuales de país (ranking G10, EndogenousOps).
function getCountryAvgBeta(pairData, appPrefix, appKey) {
  if (!pairData) return null
  const name = toPipelineName(appPrefix, appKey)
  const values = []
  for (const indicators of Object.values(pairData)) {
    const entry = indicators[name]
    if (entry) values.push(Math.abs(entry.beta))
  }
  return values.length > 0 ? values.reduce((s, v) => s + v, 0) / values.length : null
}

// 'EUR/USD' → 'eurusd'
export function pairLabelToId(label) {
  return label.replace('/', '').toLowerCase()
}

// ─── Arrays de betas efectivas ───────────────────────────────────────────────

// Array de betas para un país (promedio pipeline o betaDoc si no hay dato).
// Un elemento por cada INDICATOR implementado, mismo orden que INDICATORS.
export function buildCountryBetaArr(pairData, appPrefix) {
  return INDICATORS.map(ind => {
    const avg = getCountryAvgBeta(pairData, appPrefix, ind.key)
    return avg ?? ind.betaDoc
  })
}

// ─── Funciones de scoring ─────────────────────────────────────────────────────

// Score endógeno de país usando betas promediadas del pipeline (o betaDoc fallback).
// Para scores individuales: ranking G10, EndogenousOps.
export function computeCountryScore(prefix, cyclical, regime, zScores, pairData) {
  const rm      = getRegimeMultiplier(regime, cyclical)
  const betaArr = buildCountryBetaArr(pairData, prefix)
  const total   = betaArr.reduce((s, b) => s + b, 0) || 1
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

// Igual que computeCountryScore pero devuelve el desglose por horizonte.
// Para EndogenousOpsPage que necesita short/medium/long por separado.
export function computeCountryScoreDetailed(prefix, cyclical, regime, zScores, pairData) {
  const rm      = getRegimeMultiplier(regime, cyclical)
  const betaArr = buildCountryBetaArr(pairData, prefix)
  const total   = betaArr.reduce((s, b) => s + b, 0) || 1
  let short = 0, medium = 0, longScore = 0

  INDICATORS.forEach((ind, i) => {
    const z       = zScores[`${prefix}_${ind.key}`] ?? 0
    const contrib = (betaArr[i] / total) * z * ind.sign * rm
    if      (ind.horizon === 'SHORT')  short     += contrib
    else if (ind.horizon === 'MEDIUM') medium    += contrib
    else                               longScore += contrib
  })

  return { composite: 0.20 * short + 0.50 * medium + 0.30 * longScore, short, medium, long: longScore }
}

// Score endógeno de un país en el contexto de un par concreto.
// Usa betas específicas del par; fallback a betaDoc si el indicador no está en el CSV.
export function computeCountryScoreForPair(prefix, cyclical, regime, zScores, pairData, fxPairId) {
  const rm = getRegimeMultiplier(regime, cyclical)

  const betaArr = INDICATORS.map(ind => {
    const pb = getPairBeta(pairData, fxPairId, prefix, ind.key)
    return pb ?? ind.betaDoc
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
