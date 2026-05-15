// Position sizing — 3 métodos combinados + drawdown multiplier
// Based on: Documentation/03_CAPA_1_FX_Macro/FX_Risk_Management_Module/03_3._Position_Sizing.md
import { getDrawdownLevel } from './drawdown.js'

// Pip values (USD per pip per standard lot 100k)
export const PIP_VALUES = {
  'EUR/USD': 10,
  'GBP/USD': 10,
  'AUD/USD': 10,
  'NZD/USD': 10,
  'USD/JPY': 9.1,   // approx; 1000/price
  'USD/CHF': 9.2,   // approx; 1000/price
  'USD/CAD': 7.5,   // approx; 1000/price
  'USD/NOK': 1.0,   // minor; approx
  'USD/SEK': 1.1,   // minor; approx
}

export const CONVICTION_MULTIPLIER = {
  FULL: 1.0,
  HALF: 0.6,
  FLAT: 0,
}

export const REGIME_VOL_MULTIPLIER = {
  LOW:    1.0,
  NORMAL: 1.0,
  HIGH:   0.7,
  EXTREME: 0.4,
}

export const ATR_STOP_MULTIPLIER = {
  SHORT:  2.0,
  MEDIUM: 2.5,
  LONG:   3.0,
}


// Method 1: Risk per trade
// Returns position size in standard lots
export function sizeByRiskPerTrade({ capital, riskPct, stopPips, pair }) {
  const pip = PIP_VALUES[pair] ?? 10
  if (stopPips <= 0 || pip <= 0) return 0
  const riskUsd = capital * (riskPct / 100)
  return riskUsd / (stopPips * pip)
}

// Method 2: Fractional Kelly
// Returns position size in units (base currency)
export function sizeByKelly({ capital, winRate, avgWinLoss, kellyFraction = 0.25 }) {
  const p = Math.max(0, Math.min(1, winRate))
  const b = Math.max(0.01, avgWinLoss)
  const q = 1 - p
  const fStar = (p * b - q) / b
  const fApplied = kellyFraction * fStar
  if (fApplied <= 0) return 0
  return capital * fApplied
}

// Method 3: Volatility targeting
// Returns position size in units
export function sizeByVolTarget({ capital, volTargetPct, annualVolPct }) {
  if (annualVolPct <= 0) return 0
  return capital * (volTargetPct / 100) / (annualVolPct / 100)
}

// Convert USD-denominated units (from Kelly/VolTarget) to standard lots.
// 1 standard lot = 100,000 base currency units; Kelly/VolTarget both return USD amounts.
// For USD-base pairs (USD/JPY etc.) the base IS USD so no price conversion needed.
function unitsToLots(units) {
  return units / 100000
}

// Main function: compute all 3 methods + final position
// ddPct: current drawdown from peak as a percentage (0–100). Default 0 = no drawdown.
export function computePositionSize({
  capital,
  riskPct = 1,
  stopPips,
  pair,
  conviction = 'FULL',
  regimeVol = 'NORMAL',
  horizon = 'MEDIUM',
  winRate = 0.5,
  avgWinLoss = 1.5,
  kellyFraction = 0.25,
  volTargetPct = 12,
  annualVolPct = 8,
  price = 1,
  atrPips,
  ddPct = 0,
}) {
  const convMult = CONVICTION_MULTIPLIER[conviction] ?? 1
  const regMult  = REGIME_VOL_MULTIPLIER[regimeVol] ?? 1

  // If FLAT conviction → no trade
  if (convMult === 0) return { verdict: 'NO OPERAR', lots1: 0, lots2: 0, lots3: 0, lotsMin: 0, lotsAdjusted: 0, stopPips: 0, tpPips: 0, stopLoss: 0, takeProfit: 0, ddMult: 1 }

  // Use ATR stop if no manual stop given
  const atrMult = ATR_STOP_MULTIPLIER[horizon] ?? 2.5
  const effectiveStop = stopPips > 0 ? stopPips : (atrPips ? atrPips * atrMult : 0)

  const lots1 = sizeByRiskPerTrade({ capital, riskPct, stopPips: effectiveStop, pair })

  const kellyUnits = sizeByKelly({ capital, winRate, avgWinLoss, kellyFraction })
  const lots2 = unitsToLots(kellyUnits)

  const volUnits = sizeByVolTarget({ capital, volTargetPct, annualVolPct })
  const lots3 = unitsToLots(volUnits)

  const lotsMin = Math.min(
    lots1 > 0 ? lots1 : Infinity,
    lots2 > 0 ? lots2 : Infinity,
    lots3 > 0 ? lots3 : Infinity,
  )
  const finalMin = lotsMin === Infinity ? 0 : lotsMin

  // Drawdown multiplier from §19 protocol
  const ddMult = getDrawdownLevel(ddPct).mult

  const lotsAdjusted = finalMin * convMult * regMult * ddMult

  // Take profit at 1.5R (minimum per doc)
  const tpPips = effectiveStop * 1.5
  // Pip size in price units: JPY pairs quote in 2 decimals (1 pip = 0.01), all others 4 decimals (0.0001)
  const pipSize = pair?.includes('JPY') ? 0.01 : 0.0001
  const stopLoss   = +(effectiveStop * pipSize).toFixed(5)
  const takeProfit = +(tpPips * pipSize).toFixed(5)

  return {
    lots1: +lots1.toFixed(3),
    lots2: +lots2.toFixed(3),
    lots3: +lots3.toFixed(3),
    lotsMin: +finalMin.toFixed(3),
    lotsAdjusted: +lotsAdjusted.toFixed(3),
    ddMult,
    stopPips: Math.round(effectiveStop),
    tpPips: Math.round(tpPips),
    riskUsd: +(capital * (riskPct / 100) * convMult * regMult * ddMult).toFixed(2),
    verdict: lotsAdjusted > 0 ? 'OPERAR' : 'NO OPERAR',
  }
}
