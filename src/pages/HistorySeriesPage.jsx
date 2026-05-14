import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { dataSources } from '../data/dataSources'

const PAGE_SIZE = 250

export default function HistorySeriesPage() {
  const { sourceId } = useParams()
  const [payload, setPayload] = useState(null)
  const [status, setStatus] = useState(null)
  const [order, setOrder] = useState('asc')
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const source = useMemo(() => dataSources.find((item) => item.id === sourceId), [sourceId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [seriesRes, statusRes] = await Promise.all([
          fetch(`/api/history/series/${encodeURIComponent(sourceId)}?limit=${PAGE_SIZE}&offset=${offset}&order=${order}`),
          fetch('/api/history/status'),
        ])
        const seriesBody = await seriesRes.json().catch(() => ({}))
        const statusBody = await statusRes.json().catch(() => ({}))
        if (!seriesRes.ok) throw new Error(seriesBody.message || seriesBody.error || 'History series failed')
        if (!cancelled) {
          setPayload(seriesBody)
          setStatus(statusBody[sourceId] || null)
        }
      } catch (err) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [sourceId, offset, order])

  const observations = payload?.observations || []
  const total = payload?.total || 0
  const canPrev = offset > 0
  const canNext = offset + PAGE_SIZE < total

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">History Series</h1>
            <div className="text-xs text-[#777] uppercase tracking-wider mt-1">
              {sourceId} {source?.indicator ? `- ${source.indicator}` : ''}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setOffset(0)
                setOrder((current) => current === 'asc' ? 'desc' : 'asc')
              }}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#333] text-[#aaa] hover:text-white hover:border-white"
            >
              ORDER {order === 'asc' ? 'ASC' : 'DESC'}
            </button>
            <Link
              to="/data/history"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
            >
              HISTORY
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-2 border-[#333] mb-4">
          <Metric label="Status" value={status?.status || '-'} color={status?.status === 'ok' ? 'text-[#4ade80]' : 'text-[#f59e0b]'} />
          <Metric label="Obs" value={total} color="text-white" />
          <Metric label="Start" value={status?.start || '-'} color="text-[#aaa]" />
          <Metric label="End" value={status?.end || '-'} color="text-[#aaa]" />
          <Metric label="Storage" value={payload?.storage || status?.storage || '-'} color="text-[#60a5fa]" />
        </div>

        {source && (
          <div className="border border-[#333] bg-[#0a0a0a] px-4 py-3 mb-4 text-xs text-[#777] leading-relaxed">
            <span className="text-[#ecd987] font-bold uppercase tracking-wider">Fuente: </span>
            {source.module} / {source.category}. {source.dataMeasure || source.notes}
          </div>
        )}

        {error && (
          <div className="border-2 border-[#ef4444] text-[#ef4444] px-4 py-3 mb-4 text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-[#777] uppercase tracking-wider">
            Showing {total === 0 ? 0 : offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setOffset((current) => Math.max(0, current - PAGE_SIZE))}
              disabled={!canPrev || loading}
              className={`px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider border ${canPrev && !loading ? 'border-[#333] text-[#aaa] hover:text-white hover:border-white' : 'border-[#222] text-[#444] cursor-not-allowed'}`}
            >
              Prev
            </button>
            <button
              onClick={() => setOffset((current) => current + PAGE_SIZE)}
              disabled={!canNext || loading}
              className={`px-2.5 py-1.5 text-xs font-bold uppercase tracking-wider border ${canNext && !loading ? 'border-[#333] text-[#aaa] hover:text-white hover:border-white' : 'border-[#222] text-[#444] cursor-not-allowed'}`}
            >
              Next
            </button>
          </div>
        </div>

        <div className="border-2 border-[#333] overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm table-fixed">
            <thead>
              <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[160px]">Date</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[180px]">Value</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest">Raw</th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[210px]">Fetched At</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[#777] uppercase tracking-wider">Loading...</td>
                </tr>
              ) : observations.length ? observations.map((row) => (
                <tr key={`${row.source_id}-${row.date}`} className="border-b border-[#222]">
                  <td className="px-2 py-2 font-mono text-xs text-[#aaa]">{row.date}</td>
                  <td className="px-2 py-2 font-mono text-xs text-white">{formatValue(row.value)}</td>
                  <td className="px-2 py-2 font-mono text-[10px] text-[#777] truncate">{formatRaw(row.raw)}</td>
                  <td className="px-2 py-2 font-mono text-[10px] text-[#777]">{row.fetched_at || '-'}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-3 py-8 text-center text-[#777] uppercase tracking-wider">No observations</td>
                </tr>
              )}
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
      <div className={`text-sm md:text-lg font-mono font-bold uppercase ${color}`}>{value}</div>
    </div>
  )
}

function formatValue(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return '-'
  return Math.abs(number) >= 1000 ? number.toFixed(2) : String(Number(number.toFixed(6)))
}

function formatRaw(raw) {
  if (raw === null || raw === undefined || raw === '') return '-'
  return typeof raw === 'object' ? JSON.stringify(raw) : String(raw)
}
