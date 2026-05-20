// EM Scoring, Filters & Sizing
// Based on: Documentation/06_Extensiones_Criticas/FX_Emerging_Markets_Module/

import { computeRollingZScore } from './zScore'
import { EM_DRIVERS, EM_DEFAULT_PARAMS, EM_TIERS, getCurrencyInfo } from '../../data/emergingMarkets'

// ── Scoring ──────────────────────────────────────────────────────────────────

/**
 * Compute EM exogenous score for a single EM currency.
 * Uses driver weights and z-scores from history.
 *
 * @param {string} ccy — e.g. 'MXN', 'BRL'
 * @param {object} featureValues — valuesBySourceId from model store
 * @param {object} history — history object from model store
 * @returns {{ score: number, n: number, details: Array<{driver, z, contrib}> }}
 */
export function computeEMCurrencyScore(ccy, featureValues, history) {
  const drivers = EM_DRIVERS.filter(d => d.ccy === ccy || d.ccy === 'ALL')
  let num = 0
  let den = 0
  const details = []

  for (const driver of drivers) {
    const val = featureValues?.[driver.id]
    const hist = history?.[driver.id]
    const hasHistory = hist?.series?.length >= 3

    // If we have history, use z-score; otherwise use raw value normalized [-3, +3]
    let z = 0
    if (hasHistory) {
      const windowMonths = driver.ccy === 'TRY' ? 36 : 60 // 3Y for TRY, 5Y for others
      const res = computeRollingZScore(hist.series, { key: driver.id, windowMonths, clip: 4 })
      z = res.z
    } else if (Number.isFinite(val)) {
      // Fallback: raw value scaled arbitrarily to [-3, +3] based on typical ranges
      z = rawToPseudoZ(val, driver)
    } else {
      continue
    }

    const contrib = driver.weight * z * driver.sign
    num += contrib
    den += driver.weight
    details.push({ driver: driver.id, label: driver.label, z: z * driver.sign, weight: driver.weight, contrib })
  }

  const score = den > 0 ? num / den : 0
  return { score, n: den, details }
}

function rawToPseudoZ(val, driver) {
  // Approximate pseudo z-scores for raw values when no history exists
  switch (driver.id) {
    case 'em_global_dxy':
      // DXY ~100 baseline; range 90–110 → [-2, +2]
      return (val - 100) / 5
    case 'em_global_vix':
      // VIX ~20 baseline; >30 = stressed
      return (20 - val) / 5 // High VIX = negative for EM
    case 'em_global_embi':
      // EMBI ~300 baseline; >500 = stressed
      return (300 - val) / 100
    case 'em_brl_cds':
    case 'em_mxn_cds':
    case 'em_zar_cds':
    case 'em_inr_cds':
    case 'em_try_cds':
      // CDS ~200 baseline; >400 = stressed
      return (200 - val) / 100
    case 'em_brl_embi':
    case 'em_mxn_embi':
      // EMBI country ~250 baseline
      return (250 - val) / 100
    case 'em_inr_brent':
      // Brent ~80 baseline; higher = bad for INR
      return (80 - val) / 20
    case 'em_mxn_us_ism':
      // ISM ~50 baseline
      return (val - 50) / 5
    case 'em_pln_eurusd':
      // EUR/USD ~1.10 baseline
      return (val - 1.10) / 0.10
    case 'em_pln_eur_pmi':
      // Eurozone PMI ~50 baseline
      return (val - 50) / 5
    case 'em_krw_sox':
      // SOX ~3000 baseline
      return (val - 3000) / 500
    case 'em_zar_gold':
      // Gold ~2000 baseline
      return (val - 2000) / 300
    case 'em_zar_platinum':
      // Platinum ~1000 baseline
      return (val - 1000) / 200
    case 'em_brl_soja':
      // Soybeans ~1200¢ baseline
      return (val - 1200) / 200
    case 'em_brl_iron':
      // Iron ore ~100$/t baseline
      return (val - 100) / 20
    case 'em_try_infl':
      // TRY inflation ~40% baseline; higher = worse
      return (40 - val) / 15
    case 'em_inr_reserves':
    case 'em_try_reserves':
      // Reserve coverage ~8 months baseline
      return (val - 8) / 3
    case 'em_cnh_pboc_fix':
      // PBOC fix proxy
      return (val - 7.2) / 0.3
    case 'em_cnh_credit':
      // Credit impulse ~0 baseline
      return val / 5
    case 'em_krw_chn_demand':
      // China demand proxy
      return val / 10
    default:
      // Generic: assume value centered at 0, scale by 10
      return val / 10
  }
}

/**
 * Compute scores for all operable EM currencies.
 */
export function computeEMScores(featureValues, history) {
  const operable = EM_DRIVERS
    .map(d => d.ccy)
    .filter((v, i, a) => v !== 'ALL' && a.indexOf(v) === i)

  return Object.fromEntries(
    operable.map(ccy => [ccy, computeEMCurrencyScore(ccy, featureValues, history)])
  )
}

// ── Filters ──────────────────────────────────────────────────────────────────

/**
 * Check EM-specific filters and return active vetos/warnings.
 *
 * @param {object} worldview — derived worldview object
 * @param {object} opts — { dxy6mChange, hasEventNearby }
 * @returns {Array<{type, label, message, severity}>}
 */
export function checkEMFilters(worldview, opts = {}) {
  const alerts = []
  const vixRaw = worldview?.vixRaw ?? worldview?.vix ?? 20
  const dxy = worldview?.dxy ?? 100
  const dxy6mChange = opts.dxy6mChange ?? 0

  // VIX veto: > P85(5Y) ≈ 25+ typically
  if (vixRaw > 25) {
    alerts.push({
      type: 'VETO',
      label: 'VIX Veto',
      message: `VIX = ${vixRaw.toFixed(1)} > 25 (P85 aprox). NO abrir nuevos longs EM. Reducir posiciones existentes 50%. Cerrar carry trades.`,
      severity: 'CRITICAL',
    })
  } else if (vixRaw > 20) {
    alerts.push({
      type: 'WARN',
      label: 'VIX Elevado',
      message: `VIX = ${vixRaw.toFixed(1)} elevado. Precaución con nuevos longs EM.`,
      severity: 'HIGH',
    })
  }

  // DXY rising veto: > 5% in 6 months
  if (dxy6mChange > 5) {
    alerts.push({
      type: 'VETO',
      label: 'DXY Rising Veto',
      message: `DXY +${dxy6mChange.toFixed(1)}% en 6m. Bias bajista para todo EM. No abrir longs EM. Considerar shorts EM como hedge.`,
      severity: 'CRITICAL',
    })
  } else if (dxy6mChange > 3) {
    alerts.push({
      type: 'WARN',
      label: 'DXY Strengthening',
      message: `DXY +${dxy6mChange.toFixed(1)}% en 6m. Headwind para EM FX.`,
      severity: 'HIGH',
    })
  }

  // Event blacklist
  if (opts.hasEventNearby) {
    alerts.push({
      type: 'VETO',
      label: 'Evento EM Próximo',
      message: 'Evento EM en 24h (BC meeting, CPI, elecciones, rating). NO operar.',
      severity: 'HIGH',
    })
  }

  return alerts
}

/**
 * Determine if a currency is tradeable given alerts.
 */
export function isEMCurrencyTradeable(ccy, alerts) {
  const info = getCurrencyInfo(ccy)
  if (!info) return false
  const tier = EM_TIERS[info.tier]
  if (!tier?.operable) return false

  // Critical vetos block everything
  if (alerts.some(a => a.type === 'VETO')) return false
  return true
}

// ── Conviction ───────────────────────────────────────────────────────────────

/**
 * EM conviction levels (higher threshold than G10).
 */
export function getEMConviction(signal) {
  const abs = Math.abs(signal)
  if (abs >= EM_DEFAULT_PARAMS.convictionMinEntry) return 'FULL'
  if (abs >= EM_DEFAULT_PARAMS.convictionMinEntry * 0.55) return 'HALF'
  return 'FLAT'
}

// ── Sizing ───────────────────────────────────────────────────────────────────

/**
 * EM-specific position sizing.
 *
 * @param {object} params
 * @param {number} params.capital — total capital
 * @param {number} params.stopPips — stop distance in pips
 * @param {string} params.pair — e.g. 'USD/MXN'
 * @param {string} params.conviction — 'FULL' | 'HALF' | 'FLAT'
 * @param {number} params.atrPips — ATR in pips (optional)
 * @param {string} params.horizon — 'SHORT' | 'MEDIUM' | 'LONG'
 * @param {number} params.ddPct — current drawdown %
 * @param {number} params.emExposurePct — current total EM exposure %
 * @returns {object}
 */
export function computeEMPositionSize({
  capital = 100000,
  stopPips = 0,
  pair = 'USD/MXN',
  conviction = 'FULL',
  atrPips = 0,
  horizon = 'MEDIUM',
  ddPct = 0,
  emExposurePct = 0,
}) {
  const pipValues = {
    'USD/MXN': 0.55, 'USD/BRL': 0.18, 'USD/ZAR': 0.58,
    'USD/KRW': 0.075, 'USD/TWD': 0.031, 'EUR/PLN': 2.35,
    'EUR/HUF': 2.75, 'EUR/CZK': 4.40, 'USD/ILS': 2.80,
    'USD/CNH': 1.45, 'USD/INR': 1.20, 'USD/TRY': 0.033,
    'USD/IDR': 0.0065, 'USD/MYR': 0.022, 'USD/PHP': 0.018,
  }

  const pip = pipValues[pair] ?? 0.5
  const convMult = conviction === 'FULL' ? 1.0 : conviction === 'HALF' ? 0.6 : 0

  // EM risk per trade: 0.5%
  const riskPct = EM_DEFAULT_PARAMS.riskPerTrade

  // ATR multiplier: 3.0–4.0
  const atrMult = horizon === 'SHORT' ? 3.0 : horizon === 'MEDIUM' ? 3.5 : 4.0
  const effectiveStop = stopPips > 0 ? stopPips : (atrPips ? atrPips * atrMult : 0)

  if (convMult === 0 || effectiveStop <= 0 || pip <= 0) {
    return {
      verdict: 'NO OPERAR',
      lots: 0,
      riskUsd: 0,
      stopPips: effectiveStop,
      tpPips: 0,
      notes: ['Convicción FLAT o sin stop válido'],
    }
  }

  const riskUsd = capital * (riskPct / 100)
  const lots = riskUsd / (effectiveStop * pip)

  // Apply conviction
  const finalLots = lots * convMult

  // EM exposure limit: max 30% total EM
  const maxEmNotional = capital * (EM_DEFAULT_PARAMS.maxNotionalTotalEM / 100)
  const currentEmNotional = capital * (emExposurePct / 100)
  const remainingEmCapacity = maxEmNotional - currentEmNotional

  // Approx notional of this trade
  const approxNotional = finalLots * 100000 // standard lot = 100k base

  const notes = []

  // Check EM exposure cap
  if (approxNotional > remainingEmCapacity && remainingEmCapacity > 0) {
    notes.push(`EM exposure cap: reduciendo a capacidad restante (${(remainingEmCapacity / 1000).toFixed(0)}K)`)
  }

  // Check per-currency cap (8%)
  const maxPerCcy = capital * (EM_DEFAULT_PARAMS.maxNotionalPerCurrency / 100)
  if (approxNotional > maxPerCcy) {
    notes.push(`Per-currency cap: max ${(maxPerCcy / 1000).toFixed(0)}K (${EM_DEFAULT_PARAMS.maxNotionalPerCurrency}% capital)`)
  }

  // Tier 2-3 cap (10%)
  const ccy = pair.split('/')[1]
  const info = getCurrencyInfo(ccy)
  if (info?.tier === 'TIER_2') {
    const maxTier23 = capital * (EM_DEFAULT_PARAMS.maxNotionalTier23 / 100)
    if (approxNotional > maxTier23) {
      notes.push(`TIER 2 cap: max ${(maxTier23 / 1000).toFixed(0)}K (${EM_DEFAULT_PARAMS.maxNotionalTier23}% capital)`)
    }
  }

  // Drawdown reduction (same as G10)
  let ddMult = 1.0
  if (ddPct >= 20) ddMult = 0
  else if (ddPct >= 15) ddMult = 0.25
  else if (ddPct >= 10) ddMult = 0.50
  else if (ddPct >= 5) ddMult = 0.75

  const adjustedLots = finalLots * ddMult

  // Take profit: 1.5R minimum
  const tpPips = effectiveStop * 1.5

  return {
    verdict: adjustedLots > 0 ? 'OPERAR' : 'NO OPERAR',
    lots: +adjustedLots.toFixed(3),
    rawLots: +finalLots.toFixed(3),
    riskUsd: +(riskUsd * convMult * ddMult).toFixed(2),
    stopPips: Math.round(effectiveStop),
    tpPips: Math.round(tpPips),
    atrMult,
    ddMult,
    notes,
  }
}

// ── Activation checks ────────────────────────────────────────────────────────

/**
 * Check if EM module should be activated based on prerequisites.
 */
export function checkEMActivation({ g10Months, sharpe12m, capital, hasNDFBroker }) {
  const checks = [
    { label: 'G10 operativo ≥ 18 meses', pass: (g10Months ?? 0) >= 18 },
    { label: 'Sharpe G10 12m ≥ 0.6', pass: (sharpe12m ?? 0) >= 0.6 },
    { label: 'Capital ≥ 50,000 USD', pass: (capital ?? 0) >= 50000 },
    { label: 'Broker con NDF (para TIER 2)', pass: !!hasNDFBroker },
  ]
  const allPass = checks.every(c => c.pass)
  return { allPass, checks }
}
