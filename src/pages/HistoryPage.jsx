import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { dataSources } from '../data/dataSources'

const statusConfig = {
  ok: { label: 'OK', color: 'border-[#4ade80] text-[#4ade80] bg-[#06140b]' },
  error: { label: 'ERROR', color: 'border-[#ef4444] text-[#ef4444] bg-[#1a0505]' },
  skipped: { label: 'SKIP', color: 'border-[#777] text-[#aaa] bg-[#111]' },
  missing: { label: 'SIN HIST', color: 'border-[#333] text-[#555] bg-[#080808]' },
}

function isAutomatable(source) {
  return Boolean(source.apiPath || source.fredSeriesId)
}

function endpointOf(source) {
  return source.apiPath || (source.fredSeriesId ? `/api/fred/${source.fredYoY ? 'yoy' : 'latest'}/${source.fredSeriesId}` : '')
}

function rowStatusOf(source) {
  return source.history?.status || 'missing'
}

function displayStatusOf(source) {
  const rowStatus = rowStatusOf(source)
  return (statusConfig[rowStatus] || statusConfig.missing).label
}

function displayHistoryDetail(source) {
  return source.history?.error
    || source.history?.file
    || (source.history?.storage === 'supabase' ? 'Supabase history_observations' : '')
    || source.endpoint
    || 'No endpoint automatico'
}

function exportHistoryCsv(rows) {
  const headers = [
    'fuente', 'indicador', 'modulo', 'estado', 'obs',
    'start', 'end', 'endpoint_error', 'accion',
  ]

  const escape = (value) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/"/g, '""')
    return text.includes(',') || text.includes('"') || text.includes('\n') ? `"${text}"` : text
  }

  const body = rows.map((source) => {
    return [
      source.id,
      source.indicator,
      source.module,
      displayStatusOf(source),
      source.history?.count || 0,
      source.history?.start || '-',
      source.history?.end || '-',
      displayHistoryDetail(source),
      source.automatable ? 'INGEST' : 'NO AUTO',
    ].map(escape).join(',')
  })

  const csv = [headers.join(','), ...body].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `polaris_history_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function HistoryPage() {
  const [status, setStatus] = useState({})
  const [loadingId, setLoadingId] = useState(null)
  const [runningAll, setRunningAll] = useState(false)
  const [result, setResult] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')

  const sources = useMemo(() => dataSources.map((source) => ({
    ...source,
    history: status[source.id] || null,
    endpoint: endpointOf(source),
    automatable: isAutomatable(source),
  })), [status])

  const visibleSources = useMemo(() => {
    const q = query.trim().toLowerCase()
    return sources.filter((source) => {
      const rowStatus = rowStatusOf(source)
      if (filter === 'auto' && !source.automatable) return false
      if (filter !== 'all' && filter !== 'auto' && rowStatus !== filter) return false
      if (!q) return true
      return [source.id, source.indicator, source.module, source.category, source.endpoint]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    })
  }, [sources, query, filter])

  const counts = useMemo(() => sources.reduce((acc, source) => {
    const rowStatus = rowStatusOf(source)
    acc.total += 1
    acc[rowStatus] = (acc[rowStatus] || 0) + 1
    if (source.automatable) acc.auto += 1
    return acc
  }, { total: 0, auto: 0 }), [sources])

  const loadStatus = async () => {
    const res = await fetch('/api/history/status')
    if (res.ok) setStatus(await res.json())
  }

  useEffect(() => {
    loadStatus()
  }, [])

  const ingestOne = async (source) => {
    setLoadingId(source.id)
    setResult(null)
    try {
      const res = await fetch('/api/history/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source }),
      })
      const body = await res.json().catch(() => ({}))
      setStatus((prev) => ({ ...prev, [source.id]: body }))
      setResult({ ok: body.status === 'ok' ? 1 : 0, errors: body.status === 'error' ? 1 : 0, skipped: body.status === 'skipped' ? 1 : 0 })
    } finally {
      setLoadingId(null)
    }
  }

  const ingestAll = async () => {
    const batch = sources.filter((source) => source.automatable)
    setRunningAll(true)
    setLoadingId('all')
    setResult(null)
    try {
      const res = await fetch('/api/history/ingest-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sources: batch }),
      })
      const body = await res.json().catch(() => ({}))
      if (Array.isArray(body.results)) {
        setStatus((prev) => body.results.reduce((acc, row) => ({ ...acc, [row.sourceId]: row }), { ...prev }))
      }
      setResult(body)
    } finally {
      setRunningAll(false)
      setLoadingId(null)
    }
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">History Pipeline</h1>
            <div className="text-xs text-[#777] uppercase tracking-wider mt-1">
              Historicos raw persistidos en Supabase. En local puede usar data/history como fallback.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {result && (
              <span className={`text-xs uppercase tracking-wider ${result.errors ? 'text-[#ef4444]' : 'text-[#4ade80]'}`}>
                OK {result.ok || 0} / ERR {result.errors || 0} / SKIP {result.skipped || 0}
              </span>
            )}
            <button
              onClick={() => exportHistoryCsv(visibleSources)}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#4ade80] text-[#4ade80] hover:text-white hover:border-white"
            >
              EXPORT CSV
            </button>
            <button
              onClick={ingestAll}
              disabled={runningAll}
              className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
                runningAll ? 'border-[#333] text-[#555] cursor-not-allowed' : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
              }`}
            >
              {runningAll ? 'INGESTING...' : 'INGEST ALL HISTORY'}
            </button>
            <Link
              to="/data"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#333] text-[#aaa] hover:text-white hover:border-white"
            >
              DATA
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-0 border-2 border-[#333] mb-4">
          <Metric label="Fuentes" value={counts.total} color="text-white" />
          <Metric label="Automatizables" value={counts.auto} color="text-[#4ade80]" />
          <Metric label="Con historico" value={counts.ok || 0} color="text-[#4ade80]" />
          <Metric label="Sin historico" value={counts.missing || 0} color="text-[#555]" />
          <Metric label="Skipped" value={counts.skipped || 0} color="text-[#aaa]" />
          <Metric label="Errores" value={counts.error || 0} color="text-[#ef4444]" />
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar fuente, indicador, endpoint..."
            className="bg-[#080808] border-2 border-[#333] px-3 py-2 text-sm text-white outline-none focus:border-[#ecd987] min-w-[320px]"
          />
          {['all', 'auto', 'ok', 'missing', 'skipped', 'error'].map((item) => (
            <button
              key={item}
              onClick={() => setFilter(item)}
              className={`px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider border ${
                filter === item ? 'border-[#ecd987] text-[#ecd987]' : 'border-[#333] text-[#777] hover:text-white hover:border-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="border-2 border-[#333] overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm table-fixed">
            <thead>
              <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[230px]">Fuente</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[90px]">Estado</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[95px]">Obs</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[110px]">Start</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[110px]">End</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest">Endpoint / error</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[170px]">Accion</th>
              </tr>
            </thead>
            <tbody>
              {visibleSources.map((source) => {
                const rowStatus = rowStatusOf(source)
                const cfg = statusConfig[rowStatus] || statusConfig.missing
                return (
                  <tr key={source.id} className="border-b border-[#222] align-top">
                    <td className="px-2 py-2">
                      <Link to={`/data/raw?highlight=${source.id}`} className="text-sm font-bold text-white hover:text-[#ecd987]">
                        {source.id}
                      </Link>
                      <div className="text-[10px] text-[#777] mt-1 leading-tight">{source.indicator}</div>
                      <div className="text-[10px] text-[#555] uppercase tracking-wider mt-1">{source.module}</div>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-2 py-2 font-mono text-xs text-[#aaa]">{source.history?.count || 0}</td>
                    <td className="px-2 py-2 font-mono text-xs text-[#aaa]">{source.history?.start || '-'}</td>
                    <td className="px-2 py-2 font-mono text-xs text-[#aaa]">{source.history?.end || '-'}</td>
                    <td className="px-2 py-2">
                      <div className="text-[10px] text-[#888] leading-tight break-all">
                        {displayHistoryDetail(source)}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => ingestOne(source)}
                          disabled={loadingId === source.id || !source.automatable}
                          className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                            loadingId === source.id || !source.automatable
                              ? 'border-[#333] text-[#555] cursor-not-allowed'
                              : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                          }`}
                        >
                          {loadingId === source.id ? '...' : source.automatable ? 'INGEST' : 'NO AUTO'}
                        </button>
                        <Link
                          to={`/data/history/${source.id}`}
                          className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                            source.history?.status === 'ok'
                              ? 'border-[#60a5fa] text-[#60a5fa] hover:text-white hover:border-white'
                              : 'border-[#333] text-[#555]'
                          }`}
                        >
                          VIEW
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="p-3 border-r border-b md:border-b-0 border-[#222]">
      <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  )
}

