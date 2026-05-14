// Performance metrics for Self-Awareness module
// Based on: Documentation/03_CAPA_1_FX_Macro/FX_Self_Awareness_Module/02_2._Métricas_de_P&L.md

export function computeMetrics(closedTrades) {
  if (!closedTrades || closedTrades.length === 0) return null

  const pnls = closedTrades.map(t => t.pnlNet ?? 0)
  const rMults = closedTrades.filter(t => t.rMultiple != null).map(t => t.rMultiple)
  const wins   = closedTrades.filter(t => (t.pnlNet ?? 0) > 0)
  const losses = closedTrades.filter(t => (t.pnlNet ?? 0) < 0)

  const totalPnl = pnls.reduce((s, v) => s + v, 0)
  const winRate  = wins.length / closedTrades.length
  const avgWin   = wins.length   > 0 ? wins.reduce((s, t)   => s + t.pnlNet, 0) / wins.length   : 0
  const avgLoss  = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlNet, 0) / losses.length : 0
  const avgRMult = rMults.length > 0 ? rMults.reduce((s, v) => s + v, 0) / rMults.length : 0
  const expectancy = (winRate * avgWin) + ((1 - winRate) * avgLoss)

  // Max drawdown
  let equity = 0, peak = 0, mdd = 0
  for (const pnl of pnls) {
    equity += pnl
    if (equity > peak) peak = equity
    const dd = peak > 0 ? (peak - equity) / peak : 0
    if (dd > mdd) mdd = dd
  }

  // Sharpe (annualized, daily approximation)
  let sharpe = null
  if (pnls.length >= 3) {
    const mean = totalPnl / pnls.length
    const std  = Math.sqrt(pnls.reduce((s, v) => s + (v - mean) ** 2, 0) / pnls.length)
    sharpe = std > 0 ? (mean / std) * Math.sqrt(252) : null
  }

  // Calmar = annualized return / MDD
  const cagr = pnls.length > 0 ? (totalPnl / pnls.length) * 252 : 0
  const calmar = mdd > 0 ? cagr / (mdd * 100) : null

  return {
    totalTrades: closedTrades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: +(winRate * 100).toFixed(1),
    avgWin: +avgWin.toFixed(2),
    avgLoss: +avgLoss.toFixed(2),
    avgRMult: +avgRMult.toFixed(2),
    expectancy: +expectancy.toFixed(2),
    totalPnl: +totalPnl.toFixed(2),
    mdd: +(mdd * 100).toFixed(1),
    sharpe: sharpe != null ? +sharpe.toFixed(2) : null,
    calmar: calmar != null ? +calmar.toFixed(2) : null,
  }
}

export function generateTradeId(trades) {
  const max = trades.reduce((m, t) => Math.max(m, t.id ?? 0), 0)
  return max + 1
}

export const CLOSE_REASONS = ['STOP', 'TARGET', 'SIGNAL_FLIP', 'TEMPORAL', 'CIRCUIT_BREAKER', 'MANUAL']
export const HORIZONS = ['CORTO', 'MEDIO', 'LARGO']
export const PAIRS = ['EUR/USD','USD/JPY','GBP/USD','USD/CHF','AUD/USD','USD/CAD','NZD/USD','USD/NOK','USD/SEK']
export const CONVICTIONS = ['FULL','HALF','FLAT']
export const REGIMES = ['RISK-ON','RISK-OFF','MIXTO']
export const VOL_REGIMES = ['LOW','NORMAL','HIGH']
