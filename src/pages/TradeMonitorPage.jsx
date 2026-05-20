import { useState, useEffect } from 'react'
import {
  LineChart, Line, ComposedChart,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ── Helpers ───────────────────────────────────────────────────────────────────

function changePctColor(v) {
  if (v == null) return 'text-[#555]'
  return v >= 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'
}

function changePctLabel(v) {
  if (v == null) return '—'
  const sign = v >= 0 ? '▲' : '▼'
  return `${sign} ${Math.abs(v).toFixed(2)}%`
}

function fmtTimestamp(ms) {
  const d = new Date(ms)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

function fmtUpdatedAt(iso) {
  if (!iso) return 'N/A'
  const d = new Date(iso)
  return d.toUTCString().replace(' GMT', ' UTC')
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, changePct, sub }) {
  return (
    <div className="p-3 border-r border-b border-[#222] flex-1 min-w-0">
      <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-xl font-mono font-bold text-[#e5e5e5]">{value ?? '—'}</div>
      <div className={`text-xs font-mono mt-0.5 ${changePctColor(changePct)}`}>
        {changePctLabel(changePct)}
      </div>
      {sub && <div className="text-[10px] text-[#444] mt-0.5">{sub}</div>}
    </div>
  )
}

function SectionHeader({ title }) {
  return (
    <div className="px-3 py-2 border-b border-[#222] bg-[#0a0a0a]">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[#555]">{title}</span>
    </div>
  )
}

function BdiChart({ history }) {
  if (!history?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[#333] text-xs font-mono">
        No data — run update_trade.py
      </div>
    )
  }
  const data = history.map(([ts, v]) => ({ ts, value: v }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="ts"
          tickFormatter={fmtTimestamp}
          tick={{ fill: '#444', fontSize: 10 }}
          axisLine={{ stroke: '#222' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#444', fontSize: 10 }}
          axisLine={{ stroke: '#222' }}
          tickLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 0 }}
          labelStyle={{ color: '#555', fontSize: 10 }}
          itemStyle={{ color: '#60a5fa', fontSize: 11 }}
          labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
          formatter={(v) => [v.toLocaleString(), 'BDI']}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#60a5fa"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3, fill: '#60a5fa' }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

function OverlayChart({ data, bdiKey, fxKey, fxLabel, fxColor }) {
  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-40 text-[#333] text-xs font-mono">
        No data
      </div>
    )
  }
  const chartData = data.map(([ts, bdi, fx]) => ({ ts, bdi, fx }))
  return (
    <ResponsiveContainer width="100%" height={160}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 40, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="ts"
          tickFormatter={fmtTimestamp}
          tick={{ fill: '#444', fontSize: 10 }}
          axisLine={{ stroke: '#222' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          yAxisId="bdi"
          orientation="left"
          tick={{ fill: '#6a5a30', fontSize: 10 }}
          axisLine={{ stroke: '#222' }}
          tickLine={false}
          width={50}
        />
        <YAxis
          yAxisId="fx"
          orientation="right"
          tick={{ fill: '#2a5a6a', fontSize: 10 }}
          axisLine={{ stroke: '#222' }}
          tickLine={false}
          width={40}
        />
        <Tooltip
          contentStyle={{ background: '#111', border: '1px solid #333', borderRadius: 0 }}
          labelStyle={{ color: '#555', fontSize: 10 }}
          itemStyle={{ fontSize: 11 }}
          labelFormatter={(ts) => new Date(ts).toLocaleDateString()}
        />
        <Legend
          wrapperStyle={{ fontSize: 10, color: '#555' }}
          formatter={(value) => value === 'bdi' ? 'BDI' : fxLabel}
        />
        <Line
          yAxisId="bdi"
          type="monotone"
          dataKey="bdi"
          stroke="#ecd987"
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          yAxisId="fx"
          type="monotone"
          dataKey="fx"
          stroke={fxColor}
          strokeWidth={1.5}
          dot={false}
          activeDot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

function AviationTable({ routes, iataNote }) {
  return (
    <div>
      <table className="w-full text-xs font-mono border-collapse">
        <thead>
          <tr className="border-b border-[#222]">
            <th className="text-left px-3 py-2 text-[10px] text-[#555] uppercase tracking-wider font-normal">Route</th>
            <th className="text-right px-3 py-2 text-[10px] text-[#555] uppercase tracking-wider font-normal">Min Price</th>
            <th className="text-right px-3 py-2 text-[10px] text-[#555] uppercase tracking-wider font-normal">Date (+30d)</th>
            <th className="text-right px-3 py-2 text-[10px] text-[#555] uppercase tracking-wider font-normal">Status</th>
          </tr>
        </thead>
        <tbody>
          {routes.map((r, i) => (
            <tr key={i} className="border-b border-[#111] hover:bg-[#0a0a0a]">
              <td className="px-3 py-2 text-[#e5e5e5]">
                {r.origin} <span className="text-[#444]">→</span> {r.destination}
              </td>
              <td className="px-3 py-2 text-right">
                {r.min_price_usd != null
                  ? <span className="text-[#4ade80]">${r.min_price_usd.toLocaleString()}</span>
                  : <span className="text-[#555]">—</span>}
              </td>
              <td className="px-3 py-2 text-right text-[#666]">{r.date_queried ?? '—'}</td>
              <td className="px-3 py-2 text-right">
                {r.error
                  ? <span className="text-[#f59e0b] text-[10px]">{r.error}</span>
                  : r.min_price_usd == null
                    ? <span className="text-[#555] text-[10px]">manual</span>
                    : <span className="text-[#4ade80] text-[10px]">OK</span>}
              </td>
            </tr>
          ))}
          {routes.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-4 text-center text-[#333]">
                Run update_trade.py to fetch aviation data
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {iataNote && (
        <div className="px-3 py-2 text-[10px] text-[#444] italic border-t border-[#111]">
          {iataNote}
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TradeMonitorPage() {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/trade_data.json')
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(setData)
      .catch((e) => setError(e.message))
  }, [])

  const m = data?.maritime ?? {}
  const av = data?.aviation ?? { routes: [], iata_note: '' }
  const ov = data?.macro_overlay ?? { bdi_vs_aud: [], bdi_vs_cad: [] }

  return (
    <div className="pt-12 min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b-2 border-[#333] px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-bold tracking-widest text-white">
          POLARIS · GLOBAL TRADE MONITOR
        </span>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-[10px] text-[#ef4444] font-mono">
              Error: {error}
            </span>
          )}
          <span className="text-[10px] font-mono text-[#555] border border-[#222] px-2 py-0.5">
            {data ? `Updated: ${fmtUpdatedAt(data.updated_at)}` : 'Loading...'}
          </span>
        </div>
      </div>

      {/* KPI row — BDI, FBX, Oil */}
      <div className="border-b border-[#222]">
        <div className="flex divide-x divide-[#222]">
          <KpiCard
            label="BDI Proxy (BDRY ETF)"
            value={m.bdi?.current != null ? `$${m.bdi.current.toFixed(2)}` : null}
            changePct={m.bdi?.change_pct}
            sub="Breakwave Dry Bulk — BDI proxy"
          />
          <KpiCard
            label="Freightos FBX"
            value={m.fbx?.current?.toLocaleString()}
            changePct={m.fbx?.change_pct}
            sub={`Container rates · ${m.fbx?.updated ?? 'N/A'}`}
          />
          <KpiCard
            label="Oil WTI"
            value={m.oil?.current != null ? `$${m.oil.current.toFixed(2)}` : null}
            changePct={m.oil?.change_pct}
            sub="CL=F · Energy proxy"
          />
          <KpiCard
            label="AUD/USD"
            value={m.aud?.current?.toFixed(4)}
            changePct={m.aud?.change_pct}
            sub="Commodities proxy"
          />
          <KpiCard
            label="CAD/USD"
            value={m.cad?.current?.toFixed(4)}
            changePct={m.cad?.change_pct}
            sub="Energy + commodities"
          />
          <KpiCard
            label="NOK/USD"
            value={m.nok?.current?.toFixed(4)}
            changePct={m.nok?.change_pct}
            sub="Oil proxy"
          />
        </div>
      </div>

      {/* BDI 90d chart */}
      <div className="border-b border-[#222]">
        <SectionHeader title="BDI — 90 días" />
        <div className="px-2 py-3">
          <BdiChart history={m.bdi?.history} />
        </div>
      </div>

      {/* Dual overlay row */}
      <div className="border-b border-[#222] grid grid-cols-2 divide-x divide-[#222]">
        <div>
          <SectionHeader title="BDI vs AUD/USD" />
          <div className="px-2 py-3">
            <OverlayChart
              data={ov.bdi_vs_aud}
              fxLabel="AUD/USD"
              fxColor="#60a5fa"
            />
          </div>
        </div>
        <div>
          <SectionHeader title="BDI vs CAD/USD" />
          <div className="px-2 py-3">
            <OverlayChart
              data={ov.bdi_vs_cad}
              fxLabel="CAD/USD"
              fxColor="#a78bfa"
            />
          </div>
        </div>
      </div>

      {/* Aviation table */}
      <div className="border-b border-[#222]">
        <SectionHeader title="Aviation — Rutas Estratégicas (Economy +30d)" />
        <AviationTable routes={av.routes} iataNote={av.iata_note} />
      </div>
    </div>
  )
}
