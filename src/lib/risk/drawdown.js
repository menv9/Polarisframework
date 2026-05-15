// Drawdown protocols, circuit breakers, and portfolio exposure.
// Based on: Documentation/…/06_6._Drawdown_Protocols_Circuit_Breakers_(§19)
//           Documentation/…/05_5._Portfolio_Risk_(§18)

// ── Drawdown Levels ───────────────────────────────────────────────────────────
export const DRAWDOWN_LEVELS = [
  { id: 'NORMAL',  minPct: 0,  maxPct: 5,   label: 'Normal',    mult: 1.0,  color: '#4ade80', action: 'Operar full size' },
  { id: 'WATCH',   minPct: 5,  maxPct: 10,  label: 'Watch',     mult: 1.0,  color: '#a3a3a3', action: 'Full size — revisar últimos 10 trades' },
  { id: 'REDUCE1', minPct: 10, maxPct: 15,  label: 'Reduce 1',  mult: 0.5,  color: '#f59e0b', action: 'Sizing ×0.50 — reducir exposición 50%' },
  { id: 'REDUCE2', minPct: 15, maxPct: 20,  label: 'Reduce 2',  mult: 0.25, color: '#f97316', action: 'Sizing ×0.25 — reducir exposición 75%' },
  { id: 'PAUSE',   minPct: 20, maxPct: 25,  label: 'Pause',     mult: 0,    color: '#ef4444', action: 'PARAR operativa nueva hasta recuperación' },
  { id: 'STOP',    minPct: 25, maxPct: 999, label: 'Stop Total', mult: 0,   color: '#ef4444', action: 'CIERRE TOTAL — revisión completa del sistema' },
]

// Returns the active DD level object
export function getDrawdownLevel(ddPct) {
  return DRAWDOWN_LEVELS.find(l => ddPct >= l.minPct && ddPct < l.maxPct) ?? DRAWDOWN_LEVELS[5]
}

// ── Recovery Ramp-up ──────────────────────────────────────────────────────────
// After a drawdown, sizing recovers progressively.
// maxDDCapital: lowest equity reached during the drawdown
// peakCapital:  equity high watermark (before the drawdown)
// currentCapital: current equity
// Returns { stage: 1|2|3|null, sizingMult, label }
export function getRampupStage(peakCapital, maxDDCapital, currentCapital) {
  if (!peakCapital || !maxDDCapital || maxDDCapital >= peakCapital) return null
  if (currentCapital >= peakCapital) return { stage: 3, sizingMult: 1.0, label: 'Nuevo equity high — full size' }

  const totalDD  = peakCapital - maxDDCapital
  const recovered = currentCapital - maxDDCapital
  const pctRecovered = totalDD > 0 ? recovered / totalDD : 0

  if (pctRecovered >= 0.5)  return { stage: 2, sizingMult: 0.75, label: 'Etapa 2 — 50 % recuperado → sizing 75 %' }
  if (pctRecovered >= 0.25) return { stage: 1, sizingMult: 0.5,  label: 'Etapa 1 — 25 % recuperado → sizing 50 %' }
  return { stage: 0, sizingMult: 0, label: 'En recuperación — por debajo del mínimo de ramp-up' }
}

// ── Circuit Breakers ──────────────────────────────────────────────────────────
// Returns array of triggered circuit breaker objects (empty = all clear)
export function computeCircuitBreakers({ intradayPnlPct, weeklyPnlPct, ddPct, consecutiveLosers }) {
  const triggered = []

  if (intradayPnlPct <= -3)
    triggered.push({ id: 'intraday', severity: 'HALT', label: 'Pérdida intradía > 3 %', action: 'Cerrar todas las posiciones · Parar 24 h' })

  if (weeklyPnlPct <= -6)
    triggered.push({ id: 'weekly', severity: 'REDUCE', label: 'Pérdida semanal > 6 %', action: 'Reducir sizing 50 % la semana siguiente' })

  if (consecutiveLosers >= 5)
    triggered.push({ id: 'losers', severity: 'REVIEW', label: `${consecutiveLosers} trades perdedores consecutivos`, action: 'Revisión obligatoria antes del trade #' + (consecutiveLosers + 1) })

  if (ddPct >= 20)
    triggered.push({ id: 'dd20', severity: 'HALT', label: 'Drawdown ≥ 20 % desde máximo', action: 'Activar Pause — sin operativa nueva' })

  return triggered
}

// ── Portfolio Exposure ────────────────────────────────────────────────────────
// Approximate USD notional per standard lot (base currency × approx rate)
const LOT_USD_NOTIONAL = {
  'EUR/USD': 107000,
  'GBP/USD': 126000,
  'AUD/USD':  65000,
  'NZD/USD':  60000,
  'USD/JPY': 100000,
  'USD/CHF': 100000,
  'USD/CAD': 100000,
  'USD/NOK': 100000,
  'USD/SEK': 100000,
}

// pairs with USD as quote (long = long base, short USD)
const PAIR_CURRENCIES = {
  'EUR/USD': { base: 'EUR', quote: 'USD' },
  'GBP/USD': { base: 'GBP', quote: 'USD' },
  'AUD/USD': { base: 'AUD', quote: 'USD' },
  'NZD/USD': { base: 'NZD', quote: 'USD' },
  'USD/JPY': { base: 'USD', quote: 'JPY' },
  'USD/CHF': { base: 'USD', quote: 'CHF' },
  'USD/CAD': { base: 'USD', quote: 'CAD' },
  'USD/NOK': { base: 'USD', quote: 'NOK' },
  'USD/SEK': { base: 'USD', quote: 'SEK' },
}

// positions: [{ pair, lots, direction: 'LONG'|'SHORT' }]
// Returns { grossNotional, netByCurrency, grossByCurrency }
export function computePortfolioExposure(positions) {
  let grossNotional = 0
  const netByCurrency   = {}   // USD equivalent net per currency
  const grossByCurrency = {}   // absolute USD equivalent per currency

  for (const pos of positions) {
    if (!pos.pair || !pos.lots || pos.lots === 0) continue
    const notional = (LOT_USD_NOTIONAL[pos.pair] ?? 100000) * Math.abs(pos.lots)
    grossNotional += notional

    const { base, quote } = PAIR_CURRENCIES[pos.pair] ?? {}
    if (!base) continue
    const dir = pos.direction === 'LONG' ? 1 : -1

    netByCurrency[base]  = (netByCurrency[base]  ?? 0) + dir * notional
    netByCurrency[quote] = (netByCurrency[quote] ?? 0) - dir * notional
    grossByCurrency[base]  = (grossByCurrency[base]  ?? 0) + notional
    grossByCurrency[quote] = (grossByCurrency[quote] ?? 0) + notional
  }

  return { grossNotional, netByCurrency, grossByCurrency }
}
