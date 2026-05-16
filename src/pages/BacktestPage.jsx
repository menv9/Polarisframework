import { useState, useCallback, useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, ReferenceLine, Cell,
} from 'recharts'

// ── File import helpers ───────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim())
  return lines.slice(1).map(line => {
    const vals = line.split(',')
    const obj = {}
    headers.forEach((h, i) => { obj[h] = vals[i]?.trim() ?? '' })
    return obj
  })
}

const STORAGE_KEY = 'polaris_backtest_metrics'

function loadStored() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ label, value, sub, color = 'text-[#e5e5e5]', verdict }) {
  return (
    <div className="p-3 border-r border-b border-[#222]">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value ?? '—'}</div>
      {sub && <div className="text-[10px] text-[#444] mt-0.5">{sub}</div>}
      {verdict && (
        <div className={`text-[10px] mt-0.5 font-bold uppercase ${verdict.color}`}>{verdict.label}</div>
      )}
    </div>
  )
}

function sharpeColor(v) {
  if (v == null) return 'text-[#555]'
  if (v < 0) return 'text-[#ef4444]'
  if (v < 0.5) return 'text-[#f59e0b]'
  if (v < 1.0) return 'text-[#a3a3a3]'
  return 'text-[#4ade80]'
}

function sharpeVerdict(v) {
  if (v == null) return null
  if (v < 0)   return { label: 'Sin edge', color: 'text-[#ef4444]' }
  if (v < 0.5) return { label: 'Marginal', color: 'text-[#f59e0b]' }
  if (v < 1.0) return { label: 'Bueno', color: 'text-[#a3a3a3]' }
  return { label: 'Muy bueno', color: 'text-[#4ade80]' }
}

function icVerdict(v) {
  if (v == null) return null
  if (v < 0)    return { label: 'Señal inversa', color: 'text-[#ef4444]' }
  if (v < 0.02) return { label: 'Sin señal', color: 'text-[#ef4444]' }
  if (v < 0.05) return { label: 'Débil', color: 'text-[#f59e0b]' }
  if (v < 0.10) return { label: 'Útil', color: 'text-[#a3a3a3]' }
  return { label: 'Fuerte', color: 'text-[#4ade80]' }
}

function psrVerdict(v) {
  if (v == null) return null
  if (v < 0.50) return { label: 'P<50% — sin edge estadístico', color: 'text-[#ef4444]' }
  if (v < 0.75) return { label: 'P<75% — marginal', color: 'text-[#f59e0b]' }
  if (v < 0.95) return { label: 'P>75% — positivo', color: 'text-[#a3a3a3]' }
  return { label: 'P>95% — robusto', color: 'text-[#4ade80]' }
}

// Monthly heatmap
const MONTHS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

function HeatmapCell({ ret }) {
  if (ret == null) return <div className="border border-[#111] h-8" />
  const abs = Math.min(Math.abs(ret) / 3, 1)
  const bg = ret >= 0
    ? `rgba(74,222,128,${0.12 + abs * 0.55})`
    : `rgba(239,68,68,${0.12 + abs * 0.55})`
  return (
    <div
      className="border border-[#111] h-8 flex items-center justify-center text-[10px] font-mono font-bold"
      style={{ background: bg, color: ret >= 0 ? '#4ade80' : '#ef4444' }}
      title={`${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`}
    >
      {ret >= 0 ? '+' : ''}{ret.toFixed(1)}
    </div>
  )
}

function MonthlyHeatmap({ data }) {
  const byYearMonth = useMemo(() => {
    const map = {}
    for (const d of data) {
      if (!map[d.year]) map[d.year] = {}
      map[d.year][d.month] = d.ret_pct
    }
    return map
  }, [data])

  const years = Object.keys(byYearMonth).map(Number).sort()

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: 680 }}>
        {/* Header */}
        <div className="grid text-[10px] text-[#555] uppercase tracking-wider mb-1"
          style={{ gridTemplateColumns: '52px repeat(12, 1fr) 60px' }}>
          <div />
          {MONTHS.map(m => <div key={m} className="text-center">{m}</div>)}
          <div className="text-center">Total</div>
        </div>
        {years.map(year => {
          const row = byYearMonth[year]
          const total = Object.values(row).reduce((a, b) => a + b, 0)
          return (
            <div key={year} className="grid items-center mb-0.5"
              style={{ gridTemplateColumns: '52px repeat(12, 1fr) 60px' }}>
              <div className="text-[10px] text-[#555] font-mono pr-1 text-right">{year}</div>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => (
                <HeatmapCell key={m} ret={row[m] ?? null} />
              ))}
              <div className={`text-[10px] font-mono font-bold text-center ${total >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                {total >= 0 ? '+' : ''}{total.toFixed(1)}%
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Drop zone ─────────────────────────────────────────────────────────────────

function DropZone({ onFiles }) {
  const [dragging, setDragging] = useState(false)

  const handleDrop = useCallback(e => {
    e.preventDefault()
    setDragging(false)
    onFiles([...e.dataTransfer.files])
  }, [onFiles])

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed p-8 text-center transition-colors cursor-pointer ${
        dragging ? 'border-[#ecd987] bg-[#1a1a0d]' : 'border-[#333] hover:border-[#555]'
      }`}
    >
      <div className="text-xs font-bold uppercase tracking-wider text-[#555] mb-2">
        Arrastra aquí los outputs del pipeline
      </div>
      <div className="text-[10px] text-[#444] space-y-0.5">
        <div><span className="font-mono text-[#666]">backtest_metrics.json</span> — métricas completas (obligatorio)</div>
        <div><span className="font-mono text-[#666]">backtest_equity.csv</span> — curva de equity</div>
        <div><span className="font-mono text-[#666]">backtest_trades.csv</span> — detalle por trade</div>
      </div>
      <div className="text-[10px] text-[#333] mt-3">
        Genera estos archivos corriendo <span className="font-mono">python run_pipeline.py</span>
      </div>
    </div>
  )
}

// ── Tooltip formatters ────────────────────────────────────────────────────────

function EquityTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-black border border-[#333] px-2 py-1 text-[10px] font-mono">
      <div className="text-[#555]">{label}</div>
      <div className="text-[#ecd987]">{Number(payload[0].value).toFixed(4)}</div>
    </div>
  )
}

function BarTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="bg-black border border-[#333] px-2 py-1 text-[10px] font-mono">
      <div className="text-[#555]">{label}</div>
      <div className={v >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}>
        {v >= 0 ? '+' : ''}{v.toFixed(2)}%
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BacktestPage() {
  const [metrics, setMetrics] = useState(loadStored)
  const [equity, setEquity] = useState(null)
  const [trades, setTrades] = useState(null)
  const [tab, setTab] = useState('overview') // overview | is_oos | trades

  const handleFiles = useCallback(async (files) => {
    for (const file of files) {
      const text = await file.text()
      if (file.name.endsWith('.json')) {
        try {
          const parsed = JSON.parse(text)
          setMetrics(parsed)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed))
        } catch { /* ignore */ }
      } else if (file.name.includes('equity') && file.name.endsWith('.csv')) {
        const rows = parseCSV(text).map(r => ({
          date: r.date?.substring(0, 7),
          equity: parseFloat(r.equity),
        })).filter(r => !isNaN(r.equity))
        setEquity(rows)
      } else if (file.name.includes('trade') && file.name.endsWith('.csv')) {
        const rows = parseCSV(text).map(r => ({
          ...r,
          predicted: parseFloat(r.predicted),
          actual: parseFloat(r.actual),
          gross_return_pct: parseFloat(r.gross_return_pct),
          cost_pct: parseFloat(r.cost_pct),
          net_return_pct: parseFloat(r.net_return_pct),
        }))
        setTrades(rows)
      }
    }
  }, [])

  const equityData = useMemo(() => equity ?? [], [equity])

  const monthlyBarData = useMemo(() => {
    if (!metrics?.monthly_heatmap) return []
    return metrics.monthly_heatmap.map(d => ({
      name: `${d.year}-${String(d.month).padStart(2, '0')}`,
      ret: d.ret_pct,
    }))
  }, [metrics])

  const m = metrics ?? {}

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'is_oos',   label: 'IS / OOS' },
    { id: 'dist',     label: 'Distribución' },
    { id: 'attr',     label: 'Attribution' },
    { id: 'trades',   label: 'Trades' },
  ]

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">BACKTEST</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">
              Capa 1 FX Macro G10 — Walk-forward mensual · Beta regression model
            </p>
          </div>
          {metrics && (
            <button
              onClick={() => { setMetrics(null); localStorage.removeItem(STORAGE_KEY) }}
              className="text-[10px] font-bold uppercase tracking-wider text-[#333] hover:text-[#ef4444] transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>

        {/* Import zone */}
        {!metrics && (
          <DropZone onFiles={handleFiles} />
        )}

        {metrics && (
          <>
            {/* Status bar */}
            <div className="flex items-center gap-4 mb-3 text-[10px] text-[#555] font-mono border border-[#1a1a1a] px-3 py-1.5">
              <span>{m.start_date ?? '—'} → {m.end_date ?? '—'}</span>
              <span className="text-[#333]">|</span>
              <span>{m.n_months ?? 0} meses · {m.n_trades ?? 0} trades</span>
              {m.note_is_oos && (
                <>
                  <span className="text-[#333]">|</span>
                  <span className="text-[#444] italic">{m.note_is_oos}</span>
                </>
              )}
              <button
                onClick={() => document.getElementById('bt-drop-extra')?.click()}
                className="ml-auto text-[#444] hover:text-[#ecd987] uppercase tracking-wider"
              >
                + Añadir archivos
              </button>
              <input id="bt-drop-extra" type="file" multiple className="hidden"
                onChange={e => handleFiles([...e.target.files])} />
            </div>

            {/* Tabs */}
            <div className="flex gap-0 mb-3 border-b border-[#222]">
              {tabs.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
                    tab === t.id
                      ? 'border-[#ecd987] text-[#ecd987]'
                      : 'border-transparent text-[#555] hover:text-[#999]'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {tab === 'overview' && (
              <>
                <div className="border-2 border-[#333] mb-3">
                  <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                    <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Métricas — Full Period</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4">
                    <MetricCard label="Retorno Total"
                      value={m.total_return_pct != null ? `${m.total_return_pct >= 0 ? '+' : ''}${m.total_return_pct}%` : '—'}
                      color={m.total_return_pct >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'} />
                    <MetricCard label="Retorno Anualizado"
                      value={m.annualized_return_pct != null ? `${m.annualized_return_pct >= 0 ? '+' : ''}${m.annualized_return_pct}%` : '—'}
                      color={m.annualized_return_pct >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'} />
                    <MetricCard label="Volatilidad Anualizada"
                      value={m.annualized_vol_pct != null ? `${m.annualized_vol_pct}%` : '—'} />
                    <MetricCard label="Max Drawdown"
                      value={m.max_drawdown_pct != null ? `${m.max_drawdown_pct}%` : '—'}
                      color={m.max_drawdown_pct < -20 ? 'text-[#ef4444]' : m.max_drawdown_pct < -15 ? 'text-[#f59e0b]' : 'text-[#e5e5e5]'} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#222]">
                    <MetricCard label="Sharpe"
                      value={m.sharpe != null ? m.sharpe.toFixed(3) : '—'}
                      color={sharpeColor(m.sharpe)}
                      verdict={sharpeVerdict(m.sharpe)} />
                    <MetricCard label="Sortino"
                      value={m.sortino != null ? m.sortino.toFixed(3) : '—'} />
                    <MetricCard label="Calmar"
                      value={m.calmar != null ? m.calmar.toFixed(3) : '—'} />
                    <MetricCard label="Time Underwater"
                      value={m.time_underwater_pct != null ? `${m.time_underwater_pct}%` : '—'}
                      color={m.time_underwater_pct > 60 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'} />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#222]">
                    <MetricCard label="PSR (P[SR>0])"
                      value={m.probabilistic_sharpe_ratio != null ? m.probabilistic_sharpe_ratio.toFixed(4) : '—'}
                      verdict={psrVerdict(m.probabilistic_sharpe_ratio)} />
                    <MetricCard label="IC Mensual"
                      value={m.ic_monthly != null ? m.ic_monthly.toFixed(4) : '—'}
                      sub="corr(pred, actual) por mes"
                      verdict={icVerdict(m.ic_monthly)} />
                    <MetricCard label="IC Trimestral"
                      value={m.ic_quarterly != null ? m.ic_quarterly.toFixed(4) : '—'}
                      verdict={icVerdict(m.ic_quarterly)} />
                    <MetricCard label="Profit Factor"
                      value={m.profit_factor != null ? m.profit_factor.toFixed(3) : '—'}
                      color={m.profit_factor > 1 ? 'text-[#4ade80]' : 'text-[#ef4444]'} />
                  </div>
                </div>

                {/* Equity curve */}
                {equityData.length > 0 && (
                  <div className="border-2 border-[#333] mb-3">
                    <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Equity Curve</span>
                    </div>
                    <div className="p-3" style={{ height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={equityData}>
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={{ stroke: '#222' }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={v => v.toFixed(2)} width={40} />
                          <Tooltip content={<EquityTooltip />} />
                          <ReferenceLine y={1} stroke="#333" strokeDasharray="3 3" />
                          <Line type="monotone" dataKey="equity" stroke="#ecd987" strokeWidth={1.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Monthly returns bar */}
                {monthlyBarData.length > 0 && (
                  <div className="border-2 border-[#333] mb-3">
                    <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Retornos Mensuales</span>
                    </div>
                    <div className="p-3" style={{ height: 160 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyBarData} barSize={6}>
                          <XAxis dataKey="name" tick={{ fontSize: 8, fill: '#333' }} tickLine={false} axisLine={{ stroke: '#222' }} interval={11} />
                          <YAxis tick={{ fontSize: 9, fill: '#444' }} tickLine={false} axisLine={false} tickFormatter={v => `${v}%`} width={36} />
                          <Tooltip content={<BarTooltip />} />
                          <ReferenceLine y={0} stroke="#333" />
                          <Bar dataKey="ret">
                            {monthlyBarData.map((entry, i) => (
                              <Cell key={i} fill={entry.ret >= 0 ? '#4ade80' : '#ef4444'} fillOpacity={0.7} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}

                {/* Monthly heatmap */}
                {m.monthly_heatmap?.length > 0 && (
                  <div className="border-2 border-[#333] mb-3">
                    <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                      <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Heatmap P&L Mensual</span>
                    </div>
                    <div className="p-3">
                      <MonthlyHeatmap data={m.monthly_heatmap} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* IS / OOS */}
            {tab === 'is_oos' && (
              <div className="border-2 border-[#333] mb-3">
                <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">IS / OOS — Estabilidad temporal (split 70/30)</span>
                </div>
                <div className="px-3 py-2 text-[10px] text-[#444] border-b border-[#1a1a1a] italic">
                  Betas calculadas full-sample. IS/OOS aquí es análisis de estabilidad del modelo, no walk-forward puro.
                  Si IS supera ampliamente a OOS, las betas están sobreajustadas al período de entrenamiento.
                </div>
                <div className="grid grid-cols-3">
                  <div className="p-3 border-r border-[#222]">
                    <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2">Full Period</div>
                    <div className="space-y-1.5">
                      {[
                        ['Meses', m.n_months],
                        ['Sharpe', m.sharpe?.toFixed(3)],
                        ['Sortino', m.sortino?.toFixed(3)],
                        ['Max DD', m.max_drawdown_pct != null ? `${m.max_drawdown_pct}%` : '—'],
                        ['Ann. Ret', m.annualized_return_pct != null ? `${m.annualized_return_pct}%` : '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between text-xs font-mono">
                          <span className="text-[#555]">{label}</span>
                          <span className="text-[#e5e5e5]">{val ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 border-r border-[#222]">
                    <div className="text-[10px] text-[#4ade80] uppercase tracking-wider mb-2">In-Sample (IS) — 70%</div>
                    <div className="space-y-1.5">
                      {[
                        ['Meses', m.is_n_months],
                        ['Sharpe', m.is_sharpe?.toFixed(3)],
                        ['Sortino', m.is_sortino?.toFixed(3)],
                        ['Max DD', m.is_max_dd_pct != null ? `${m.is_max_dd_pct}%` : '—'],
                        ['Ann. Ret', m.is_ann_ret_pct != null ? `${m.is_ann_ret_pct}%` : '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between text-xs font-mono">
                          <span className="text-[#555]">{label}</span>
                          <span className="text-[#4ade80]">{val ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] text-[#f59e0b] uppercase tracking-wider mb-2">Out-of-Sample (OOS) — 30%</div>
                    <div className="space-y-1.5">
                      {[
                        ['Meses', m.oos_n_months],
                        ['Sharpe', m.oos_sharpe?.toFixed(3)],
                        ['Sortino', m.oos_sortino?.toFixed(3)],
                        ['Max DD', m.oos_max_dd_pct != null ? `${m.oos_max_dd_pct}%` : '—'],
                        ['Ann. Ret', m.oos_ann_ret_pct != null ? `${m.oos_ann_ret_pct}%` : '—'],
                      ].map(([label, val]) => (
                        <div key={label} className="flex justify-between text-xs font-mono">
                          <span className="text-[#555]">{label}</span>
                          <span className="text-[#f59e0b]">{val ?? '—'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                {m.is_sharpe != null && m.oos_sharpe != null && (
                  <div className="px-3 py-2 border-t border-[#1a1a1a]">
                    <div className="text-[10px] text-[#555]">
                      Degradación IS→OOS:{' '}
                      <span className={m.is_sharpe > 0 && m.oos_sharpe / m.is_sharpe < 0.5
                        ? 'text-[#ef4444] font-bold'
                        : m.oos_sharpe / m.is_sharpe < 0.75
                        ? 'text-[#f59e0b] font-bold'
                        : 'text-[#4ade80] font-bold'
                      }>
                        {m.is_sharpe !== 0
                          ? `${((m.oos_sharpe / m.is_sharpe) * 100).toFixed(0)}% del Sharpe IS`
                          : '—'}
                      </span>
                      {m.oos_sharpe / m.is_sharpe < 0.5 && m.is_sharpe > 0 &&
                        ' — posible sobreajuste. Revisar betas y período de calibración.'}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* DISTRIBUCIÓN */}
            {tab === 'dist' && (
              <div className="border-2 border-[#333] mb-3">
                <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Distribución de Retornos</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4">
                  <MetricCard label="Skewness"
                    value={m.skew != null ? m.skew.toFixed(3) : '—'}
                    sub="positivo = cola derecha"
                    color={m.skew > 0 ? 'text-[#4ade80]' : m.skew < -0.5 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'} />
                  <MetricCard label="Kurtosis"
                    value={m.kurtosis != null ? m.kurtosis.toFixed(3) : '—'}
                    sub="normal = 3"
                    color={m.kurtosis > 5 ? 'text-[#f59e0b]' : 'text-[#e5e5e5]'} />
                  <MetricCard label="VaR 95%"
                    value={m.var_95_pct != null ? `${m.var_95_pct}%` : '—'}
                    sub="percentil 5 mensual"
                    color="text-[#ef4444]" />
                  <MetricCard label="CVaR 95%"
                    value={m.cvar_95_pct != null ? `${m.cvar_95_pct}%` : '—'}
                    sub="media de los peores meses"
                    color="text-[#ef4444]" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-[#222]">
                  <MetricCard label="Avg Win"
                    value={m.avg_win_pct != null ? `+${m.avg_win_pct}%` : '—'}
                    color="text-[#4ade80]" />
                  <MetricCard label="Avg Loss"
                    value={m.avg_loss_pct != null ? `${m.avg_loss_pct}%` : '—'}
                    color="text-[#ef4444]" />
                  <MetricCard label="Profit Factor"
                    value={m.profit_factor != null ? m.profit_factor.toFixed(3) : '—'}
                    sub="wins brutos / losses brutos"
                    color={m.profit_factor > 1 ? 'text-[#4ade80]' : 'text-[#ef4444]'} />
                  <MetricCard label="Duración media"
                    value={m.avg_trade_duration_days != null ? `${m.avg_trade_duration_days}d` : '—'}
                    sub="por trade" />
                </div>
              </div>
            )}

            {/* ATTRIBUTION */}
            {tab === 'attr' && (
              <div className="border-2 border-[#333] mb-3">
                <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Attribution por Par</span>
                </div>
                {m.attribution_by_pair?.length > 0 ? (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                        <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Par</th>
                        <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest">Trades</th>
                        <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest">Win%</th>
                        <th className="px-3 py-1.5 text-right font-bold uppercase tracking-widest">Net P&L</th>
                        <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Barra</th>
                      </tr>
                    </thead>
                    <tbody>
                      {m.attribution_by_pair.map(row => {
                        const maxAbs = Math.max(...m.attribution_by_pair.map(r => Math.abs(r.net_pct)))
                        const pct = maxAbs > 0 ? Math.abs(row.net_pct) / maxAbs * 100 : 0
                        return (
                          <tr key={row.pair} className="border-b border-[#1a1a1a] hover:bg-[#0a0a0a]">
                            <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3] uppercase">{row.pair}</td>
                            <td className="px-3 py-1.5 text-right text-[#555]">{row.n}</td>
                            <td className="px-3 py-1.5 text-right font-mono">{row.win_rate_pct}%</td>
                            <td className={`px-3 py-1.5 text-right font-mono font-bold ${row.net_pct >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                              {row.net_pct >= 0 ? '+' : ''}{row.net_pct.toFixed(2)}%
                            </td>
                            <td className="px-3 py-1.5">
                              <div className="h-2 rounded-sm" style={{
                                width: `${pct}%`,
                                background: row.net_pct >= 0 ? '#4ade80' : '#ef4444',
                                opacity: 0.6,
                              }} />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-[10px] text-[#444] uppercase tracking-wider">
                    Importa backtest_metrics.json con datos de attribution
                  </div>
                )}
              </div>
            )}

            {/* TRADES */}
            {tab === 'trades' && (
              <div className="border-2 border-[#333] mb-3">
                <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
                  <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">
                    Detalle de Trades {trades ? `(${trades.length})` : ''}
                  </span>
                </div>
                {!trades ? (
                  <div className="p-6 text-center text-[10px] text-[#444] uppercase tracking-wider">
                    Arrastra <span className="font-mono">backtest_trades.csv</span> para ver el detalle
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" style={{ minWidth: 700 }}>
                      <thead>
                        <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                          {['Open','Close','Par','Dir','Predicho','Real','Bruto','Coste','Neto'].map(h => (
                            <th key={h} className="px-2 py-1.5 text-left font-bold uppercase tracking-widest whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {trades.map((t, i) => (
                          <tr key={i} className="border-b border-[#111] hover:bg-[#0a0a0a]">
                            <td className="px-2 py-1 font-mono text-[#555]">{t.open_date?.substring(0,7)}</td>
                            <td className="px-2 py-1 font-mono text-[#555]">{t.close_date?.substring(0,7)}</td>
                            <td className="px-2 py-1 font-mono font-bold text-[#a3a3a3] uppercase">{t.pair}</td>
                            <td className={`px-2 py-1 font-bold uppercase ${t.direction === 'LONG' ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                              {t.direction}
                            </td>
                            <td className="px-2 py-1 font-mono text-[#666]">{(t.predicted * 100).toFixed(2)}%</td>
                            <td className={`px-2 py-1 font-mono ${t.actual >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                              {(t.actual * 100).toFixed(2)}%
                            </td>
                            <td className={`px-2 py-1 font-mono ${t.gross_return_pct >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                              {(t.gross_return_pct * 100).toFixed(2)}%
                            </td>
                            <td className="px-2 py-1 font-mono text-[#444]">{(t.cost_pct * 100).toFixed(3)}%</td>
                            <td className={`px-2 py-1 font-mono font-bold ${t.net_return_pct >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                              {(t.net_return_pct * 100).toFixed(2)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Footer hint */}
            {!equity && tab === 'overview' && (
              <div className="text-center py-3">
                <label className="text-[10px] text-[#333] uppercase tracking-wider cursor-pointer hover:text-[#555]">
                  <input type="file" accept=".csv,.json" multiple className="hidden"
                    onChange={e => handleFiles([...e.target.files])} />
                  + Añadir equity.csv y trades.csv para gráficos completos
                </label>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
