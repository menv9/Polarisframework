import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { computeMetrics } from '../lib/journal/metrics'

const STORAGE_KEY = 'polaris_journal_trades'

function loadTrades() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function MetricCard({ label, value, sub, color = 'text-[#e5e5e5]', target, verdict }) {
  return (
    <div className="p-3 border-r border-b border-[#222]">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-[10px] text-[#444] mt-0.5">{sub}</div>}
      {target && <div className="text-[10px] text-[#333] mt-0.5">Target: {target}</div>}
      {verdict && <div className={`text-[10px] mt-0.5 font-bold uppercase ${verdict.color}`}>{verdict.label}</div>}
    </div>
  )
}

// Per-trade Sharpe (mean/std, no annualization). Typical range: −0.2 to +0.5.
function sharpeVerdict(v) {
  if (v == null) return null
  if (v <= 0)   return { label: 'Negativo', color: 'text-[#ef4444]' }
  if (v < 0.05) return { label: 'Sin edge claro', color: 'text-[#ef4444]' }
  if (v < 0.15) return { label: 'Marginal', color: 'text-[#f59e0b]' }
  if (v < 0.30) return { label: 'Bueno', color: 'text-[#a3a3a3]' }
  if (v < 0.50) return { label: 'Muy bueno', color: 'text-[#4ade80]' }
  return { label: 'Excelente — verificar', color: 'text-[#4ade80]' }
}

function calmarVerdict(v) {
  if (v == null) return null
  if (v < 0.3)  return { label: 'DD desproporcionado', color: 'text-[#ef4444]' }
  if (v < 0.5)  return { label: 'Aceptable', color: 'text-[#f59e0b]' }
  if (v < 1.0)  return { label: 'Bueno', color: 'text-[#a3a3a3]' }
  return { label: 'Excelente', color: 'text-[#4ade80]' }
}

function mddVerdict(v) {
  if (v == null) return null
  if (v > 25)  return { label: 'Crítico', color: 'text-[#ef4444]' }
  if (v > 20)  return { label: 'Alto', color: 'text-[#f59e0b]' }
  if (v > 15)  return { label: 'Moderado', color: 'text-[#a3a3a3]' }
  return { label: 'Controlado', color: 'text-[#4ade80]' }
}

export default function PerformancePage() {
  const [trades] = useState(loadTrades)
  const [period, setPeriod] = useState('all') // all | 3m | 6m | 12m

  const periodFiltered = useMemo(() => {
    if (period === 'all') return trades
    const now = new Date()
    const months = period === '3m' ? 3 : period === '6m' ? 6 : 12
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1)
    return trades.filter(t => new Date(t.openDate) >= cutoff)
  }, [trades, period])

  const closed = useMemo(() =>
    periodFiltered.filter(t => t.status === 'CLOSED'),
    [periodFiltered]
  )

  const metrics = useMemo(() => computeMetrics(closed), [closed])

  // Attribution: wins by conviction level
  const byConviction = useMemo(() => {
    const result = { FULL: { wins: 0, total: 0, pnl: 0 }, HALF: { wins: 0, total: 0, pnl: 0 }, FLAT: { wins: 0, total: 0, pnl: 0 } }
    for (const t of closed) {
      const c = t.conviction ?? 'FULL'
      if (result[c]) {
        result[c].total++
        result[c].pnl += t.pnlNet ?? 0
        if ((t.pnlNet ?? 0) > 0) result[c].wins++
      }
    }
    return result
  }, [closed])

  // Attribution: wins by pair
  const byPair = useMemo(() => {
    const result = {}
    for (const t of closed) {
      if (!result[t.pair]) result[t.pair] = { wins: 0, total: 0, pnl: 0 }
      result[t.pair].total++
      result[t.pair].pnl += t.pnlNet ?? 0
      if ((t.pnlNet ?? 0) > 0) result[t.pair].wins++
    }
    return Object.entries(result).sort((a, b) => b[1].pnl - a[1].pnl)
  }, [closed])

  const byReason = useMemo(() => {
    const result = {}
    for (const t of closed) {
      const r = t.closeReason ?? 'MANUAL'
      if (!result[r]) result[r] = { wins: 0, total: 0, pnl: 0 }
      result[r].total++
      result[r].pnl += t.pnlNet ?? 0
      if ((t.pnlNet ?? 0) > 0) result[r].wins++
    }
    return Object.entries(result).sort((a, b) => b[1].total - a[1].total)
  }, [closed])

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">PERFORMANCE</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Self-Awareness — Métricas P&L · Attribution</p>
          </div>
          <Link to="/journal" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">← JOURNAL</Link>
        </div>

        {/* Period filter */}
        <div className="flex items-center gap-2 mb-3">
          {[['all','Todo'],['3m','3 meses'],['6m','6 meses'],['12m','12 meses']].map(([v, l]) => (
            <button key={v} onClick={() => setPeriod(v)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${
                period === v ? 'border-[#ecd987] text-[#ecd987]' : 'border-[#333] text-[#555] hover:border-[#555]'
              }`}>
              {l}
            </button>
          ))}
          <span className="text-[10px] text-[#444] ml-2">{closed.length} trades cerrados</span>
        </div>

        {closed.length === 0 ? (
          <div className="border border-[#222] p-8 text-center text-[#444] text-xs uppercase tracking-wider">
            Sin trades cerrados — registra y cierra trades en el Journal primero
          </div>
        ) : (
          <>
            {/* Métricas principales */}
            <div className="border-2 border-[#333] mb-3">
              <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Métricas de P&L</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <MetricCard label="P&L Neto Total"
                  value={metrics ? `$${metrics.totalPnl >= 0 ? '+' : ''}${metrics.totalPnl.toFixed(0)}` : '—'}
                  color={metrics?.totalPnl >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'} />
                <MetricCard label="Win Rate"
                  value={metrics ? `${metrics.winRate}%` : '—'}
                  sub={metrics ? `${metrics.wins}W / ${metrics.losses}L` : ''}
                  color={metrics?.winRate >= 50 ? 'text-[#4ade80]' : 'text-[#f59e0b]'} />
                <MetricCard label="Expectancy"
                  value={metrics ? `$${metrics.expectancy >= 0 ? '+' : ''}${metrics.expectancy.toFixed(2)}` : '—'}
                  sub="por trade promedio"
                  color={metrics?.expectancy > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'} />
                <MetricCard label="R-Multiple Medio"
                  value={metrics ? `${metrics.avgRMult >= 0 ? '+' : ''}${metrics.avgRMult}R` : '—'}
                  color={metrics?.avgRMult > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}
                  target=">1.5R" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#222]">
                <MetricCard label="Sharpe (per-trade)"
                  value={metrics?.sharpe != null ? metrics.sharpe.toFixed(3) : '—'}
                  target=">0.15 bueno, >0.30 muy bueno"
                  verdict={sharpeVerdict(metrics?.sharpe)}
                  color="text-[#e5e5e5]" />
                <MetricCard label="Calmar Ratio"
                  value={metrics?.calmar != null ? metrics.calmar.toFixed(2) : '—'}
                  target=">0.5 bueno, >1.0 excelente"
                  verdict={calmarVerdict(metrics?.calmar)}
                  color="text-[#e5e5e5]" />
                <MetricCard label="Max Drawdown"
                  value={metrics?.mdd != null ? `${metrics.mdd}%` : '—'}
                  target="<20% bueno, <15% excelente"
                  verdict={mddVerdict(metrics?.mdd)}
                  color={metrics?.mdd > 20 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'} />
                <MetricCard label="Avg Win / Loss"
                  value={metrics ? `${metrics.avgWin.toFixed(0)} / ${metrics.avgLoss.toFixed(0)}` : '—'}
                  sub="USD por trade"
                  color="text-[#a3a3a3]" />
              </div>
            </div>

            {/* Attribution por convicción */}
            <div className="border-2 border-[#333] mb-3">
              <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Attribution por Convicción</span>
              </div>
              <div className="grid grid-cols-3">
                {Object.entries(byConviction).map(([conv, data]) => (
                  <div key={conv} className="p-3 border-r border-[#222]">
                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${conv === 'FULL' ? 'text-[#4ade80]' : conv === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'}`}>{conv}</div>
                    <div className="text-lg font-mono font-bold text-[#e5e5e5]">{data.total} trades</div>
                    <div className="text-[10px] text-[#555] mt-0.5">
                      {data.total > 0 ? `${((data.wins/data.total)*100).toFixed(0)}% win rate` : 'sin datos'}
                    </div>
                    <div className={`text-sm font-mono font-bold mt-1 ${data.pnl >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                      {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attribution por par */}
            {byPair.length > 0 && (
              <div className="border-2 border-[#333] mb-3">
                <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Attribution por Par</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Par</th>
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Trades</th>
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Win%</th>
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">P&L Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byPair.map(([pair, data]) => (
                      <tr key={pair} className="border-b border-[#1a1a1a] hover:bg-[#0a0a0a]">
                        <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3]">{pair}</td>
                        <td className="px-3 py-1.5 text-[#555]">{data.total}</td>
                        <td className="px-3 py-1.5 font-mono">{data.total > 0 ? `${((data.wins/data.total)*100).toFixed(0)}%` : '—'}</td>
                        <td className={`px-3 py-1.5 font-mono font-bold ${data.pnl >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                          {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Attribution por razón de cierre */}
            {byReason.length > 0 && (
              <div className="border-2 border-[#333] mb-3">
                <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Attribution por Razón de Cierre</span>
                </div>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Razón</th>
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Trades</th>
                      <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">P&L Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byReason.map(([reason, data]) => (
                      <tr key={reason} className="border-b border-[#1a1a1a] hover:bg-[#0a0a0a]">
                        <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3]">{reason}</td>
                        <td className="px-3 py-1.5 text-[#555]">{data.total}</td>
                        <td className={`px-3 py-1.5 font-mono font-bold ${data.pnl >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                          {data.pnl >= 0 ? '+' : ''}${data.pnl.toFixed(0)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

      </div>
    </div>
  )
}
