import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getNextUpdate, getStatus } from '../data/dataSources'
import { useModelStore } from '../store/ModelDataContext'

const REVIEWED_KEY = 'polaris_data_notifications_reviewed'

function loadReviewed() {
  try {
    const saved = localStorage.getItem(REVIEWED_KEY)
    return saved ? JSON.parse(saved) : {}
  } catch {
    return {}
  }
}

function releaseId(row) {
  return `release:${row.event_hash || `${row.event_date}:${row.currency}:${row.event_name}`}`
}

function sourceId(kind, source) {
  return `${kind}:${source.id}:${source.lastUpdate || ''}`
}

function isNewRelease(row) {
  if (!row.saved_at) return true
  const savedAt = new Date(row.saved_at)
  if (Number.isNaN(savedAt.getTime())) return true
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return savedAt >= sevenDaysAgo
}

export default function NotificationsPage() {
  const { dataSources } = useModelStore()
  const [releases, setReleases] = useState([])
  const [error, setError] = useState(null)
  const [reviewed, setReviewed] = useState(loadReviewed)
  const [filter, setFilter] = useState('open')

  useEffect(() => {
    localStorage.setItem(REVIEWED_KEY, JSON.stringify(reviewed))
  }, [reviewed])

  useEffect(() => {
    let cancelled = false
    fetch('/api/calendar/releases')
      .then((res) => res.json().then((body) => ({ res, body })).catch(() => ({ res, body: {} })))
      .then(({ res, body }) => {
        if (cancelled) return
        if (!res.ok) throw new Error(body.message || body.error || 'Calendar releases failed')
        setReleases(Array.isArray(body.releases) ? body.releases : [])
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Calendar releases failed')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const notifications = useMemo(() => {
    const sourceAlerts = dataSources
      .map((source) => ({ source, status: getStatus(source) }))
      .filter(({ status }) => status.code === 'stale' || status.code === 'warning')
      .map(({ source, status }) => ({
        id: sourceId(status.code, source),
        type: status.code,
        severity: status.code === 'stale' ? 3 : 2,
        title: source.indicator,
        subtitle: source.module,
        meta: `${status.label} · last ${source.lastUpdate || '-'} · next ${getNextUpdate(source.lastUpdate, source.frequencyDays)}`,
        sourceId: source.id,
        actionPath: `/data/raw?highlight=${source.id}`,
        actionLabel: source.apiPath || source.fredSeriesId ? 'Refresh source' : 'Open source registry',
      }))

    const releaseAlerts = releases
      .filter(isNewRelease)
      .map((row) => ({
        id: releaseId(row),
        type: 'release',
        severity: 1,
        title: row.event_name,
        subtitle: `${row.currency || '-'} · ${row.event_date || '-'}`,
        meta: `actual ${row.actual_value || '-'} · forecast ${row.forecast_value || '-'} · previous ${row.previous_value || '-'}`,
        actionPath: '/data/economic-calendar',
        actionLabel: 'Open economic calendar',
      }))

    return [...sourceAlerts, ...releaseAlerts]
      .map((item) => ({ ...item, reviewed: Boolean(reviewed[item.id]) }))
      .sort((a, b) => Number(a.reviewed) - Number(b.reviewed) || b.severity - a.severity || a.title.localeCompare(b.title))
  }, [dataSources, releases, reviewed])

  const visible = useMemo(() => {
    if (filter === 'open') return notifications.filter((item) => !item.reviewed)
    if (filter === 'stale') return notifications.filter((item) => item.type === 'stale')
    if (filter === 'warning') return notifications.filter((item) => item.type === 'warning')
    if (filter === 'release') return notifications.filter((item) => item.type === 'release')
    return notifications
  }, [notifications, filter])

  const counts = useMemo(() => {
    return notifications.reduce((acc, item) => {
      acc.total += 1
      if (!item.reviewed) acc.open += 1
      acc[item.type] = (acc[item.type] || 0) + 1
      return acc
    }, { total: 0, open: 0, stale: 0, warning: 0, release: 0 })
  }, [notifications])

  const markReviewed = (id) => {
    setReviewed((prev) => ({ ...prev, [id]: new Date().toISOString() }))
  }

  const markAllReviewed = () => {
    const now = new Date().toISOString()
    setReviewed((prev) => notifications.reduce((acc, item) => ({ ...acc, [item.id]: now }), { ...prev }))
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Data Notifications</h1>
            <div className="text-xs text-[#777] uppercase tracking-wider mt-1">
              Inbox operativo: vencidos, proximos y releases nuevos del calendario.
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllReviewed}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#333] text-[#aaa] hover:text-white hover:border-white"
            >
              Mark all reviewed
            </button>
            <Link
              to="/data"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#333] text-[#aaa] hover:text-white hover:border-white"
            >
              DATA
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-2 border-[#333] mb-4">
          <Metric label="Open" value={counts.open} color="text-[#ecd987]" />
          <Metric label="Vencidos" value={counts.stale} color="text-[#ef4444]" />
          <Metric label="Proximos" value={counts.warning} color="text-[#f59e0b]" />
          <Metric label="Releases" value={counts.release} color="text-[#4ade80]" />
          <Metric label="Total" value={counts.total} color="text-white" />
        </div>

        {error && (
          <div className="mb-4 border-2 border-[#f59e0b] bg-[#1a1003] px-3 py-2 text-sm text-[#f59e0b] font-mono">
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {['open', 'all', 'stale', 'warning', 'release'].map((item) => (
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

        <div className="border-2 border-[#333] bg-[#080808]">
          <div className="divide-y divide-[#222]">
            {visible.map((item) => (
              <article key={item.id} className={`p-3 ${item.reviewed ? 'opacity-50' : ''}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge type={item.type} />
                      {item.reviewed && (
                        <span className="border border-[#333] text-[#777] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          REVIEWED
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-sm font-bold uppercase tracking-wider text-white break-words">
                      {item.title}
                    </h2>
                    <div className="mt-1 text-xs text-[#777] uppercase tracking-wider">{item.subtitle}</div>
                    <div className="mt-1 text-[10px] text-[#777] font-mono">{item.meta}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to={item.actionPath}
                      className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider border border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
                    >
                      {item.actionLabel}
                    </Link>
                    <button
                      onClick={() => markReviewed(item.id)}
                      disabled={item.reviewed}
                      className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider border ${
                        item.reviewed ? 'border-[#333] text-[#555] cursor-not-allowed' : 'border-[#333] text-[#aaa] hover:text-white hover:border-white'
                      }`}
                    >
                      Mark reviewed
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {visible.length === 0 && (
              <div className="p-6 text-sm text-[#777]">No notifications in this view.</div>
            )}
          </div>
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

function Badge({ type }) {
  const cfg = {
    stale: 'border-[#ef4444] text-[#ef4444] bg-[#1a0505]',
    warning: 'border-[#f59e0b] text-[#f59e0b] bg-[#1a1003]',
    release: 'border-[#4ade80] text-[#4ade80] bg-[#06140b]',
  }[type] || 'border-[#333] text-[#777] bg-[#080808]'

  const label = type === 'stale' ? 'VENCIDO' : type === 'warning' ? 'PROXIMO' : type === 'release' ? 'RELEASE' : type
  return (
    <span className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${cfg}`}>
      {label}
    </span>
  )
}
