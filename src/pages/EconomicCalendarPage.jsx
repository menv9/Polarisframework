import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { classifyCalendarEvent } from '../data/calendarMapping'

const SYNC_INTERVAL_MS = 5 * 60 * 1000

function eventTitle(event) {
  return String(event?.title || event?.event || event?.name || '').trim()
}

function eventCurrency(event) {
  return String(event?.country || event?.currency || '').trim()
}

function eventDateTime(event) {
  const raw = event?.date || event?.datetime || event?.timestamp || event?.time
  if (!raw) return null
  if (typeof raw === 'number') {
    const date = new Date(raw * (raw < 10_000_000_000 ? 1000 : 1))
    return Number.isNaN(date.getTime()) ? null : date
  }
  const date = new Date(String(raw))
  return Number.isNaN(date.getTime()) ? null : date
}

function eventKey(event) {
  const date = eventDateTime(event)
  return [
    date ? date.toISOString() : String(event?.date || ''),
    eventCurrency(event),
    eventTitle(event),
  ].join('|')
}

function releaseKey(row) {
  const raw = row.raw_event || {}
  const date = eventDateTime(raw)
  return [
    date ? date.toISOString() : String(raw.date || row.event_date || ''),
    row.currency || eventCurrency(raw),
    row.event_name || eventTitle(raw),
  ].join('|')
}

function hasActual(event) {
  const actual = event?.actual
  if (actual === null || actual === undefined) return false
  const text = String(actual).trim()
  return Boolean(text && text !== '-' && text.toLowerCase() !== 'null')
}

function formatDateTime(event) {
  const date = eventDateTime(event)
  if (!date) return String(event?.date || '-')
  return date.toLocaleString('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

function isBlackout(event) {
  const date = eventDateTime(event)
  if (!date) return false
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const eventDay = new Date(date)
  eventDay.setHours(0, 0, 0, 0)
  return eventDay.getTime() === today.getTime() || eventDay.getTime() === tomorrow.getTime()
}

function impactClass(impact) {
  const text = String(impact || '').toLowerCase()
  if (text.includes('high')) return 'border-[#ef4444] text-[#ef4444] bg-[#1a0505]'
  if (text.includes('medium')) return 'border-[#f59e0b] text-[#f59e0b] bg-[#1a1003]'
  if (text.includes('low')) return 'border-[#777] text-[#aaa] bg-[#111]'
  return 'border-[#333] text-[#777] bg-[#080808]'
}

export default function EconomicCalendarPage() {
  const [events, setEvents] = useState([])
  const [releases, setReleases] = useState([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState(null)
  const [lastSync, setLastSync] = useState(null)

  const savedKeys = useMemo(() => new Set(releases.map(releaseKey)), [releases])

  const stats = useMemo(() => {
    return events.reduce((acc, event) => {
      acc.total += 1
      if (hasActual(event)) acc.released += 1
      if (savedKeys.has(eventKey(event))) acc.saved += 1
      if (isBlackout(event)) acc.blackout += 1
      return acc
    }, { total: 0, released: 0, saved: 0, blackout: 0 })
  }, [events, savedKeys])

  const loadCalendar = useCallback(async () => {
    const res = await fetch('/api/calendar')
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.message || body.error || 'Calendar fetch failed')
    setEvents(Array.isArray(body.events) ? body.events : [])
  }, [])

  const loadReleases = useCallback(async () => {
    const res = await fetch('/api/calendar/releases')
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.message || body.error || 'Calendar releases failed')
    setReleases(Array.isArray(body.releases) ? body.releases : [])
  }, [])

  const syncCalendar = useCallback(async () => {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || body.error || 'Calendar sync failed')
      setReleases(Array.isArray(body.releases) ? body.releases : [])
      setLastSync(new Date().toLocaleTimeString('en-US', { hour12: false }))
      await loadCalendar()
    } catch (err) {
      setError(err.message || 'Calendar sync failed')
    } finally {
      setSyncing(false)
      setLoading(false)
    }
  }, [loadCalendar])

  useEffect(() => {
    Promise.all([loadCalendar(), loadReleases()])
      .catch((err) => setError(err.message || 'Calendar load failed'))
      .finally(() => {
        setLoading(false)
        syncCalendar()
      })

    const timer = setInterval(syncCalendar, SYNC_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [loadCalendar, loadReleases, syncCalendar])

  const sortedEvents = useMemo(() => {
    return events.slice().sort((a, b) => {
      const aDate = eventDateTime(a)?.getTime() || 0
      const bDate = eventDateTime(b)?.getTime() || 0
      return aDate - bDate
    })
  }, [events])

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Economic Calendar</h1>
            <div className="text-xs text-[#777] uppercase tracking-wider mt-1">
              ForexFactory releases guardados aparte. No escribe en registry, history ni features.
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastSync && (
              <span className="text-xs text-[#777] uppercase tracking-wider">SYNC {lastSync}</span>
            )}
            <button
              onClick={syncCalendar}
              disabled={syncing}
              className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
                syncing ? 'border-[#333] text-[#555] cursor-not-allowed' : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
              }`}
            >
              {syncing ? 'SYNCING...' : 'SYNC NOW'}
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
          <Metric label="Eventos" value={stats.total} color="text-white" />
          <Metric label="Liberados" value={stats.released} color="text-[#ecd987]" />
          <Metric label="Guardados" value={stats.saved} color="text-[#4ade80]" />
          <Metric label="Blackout" value={stats.blackout} color="text-[#ef4444]" />
          <Metric label="Auto-sync" value="5m" color="text-[#60a5fa]" />
        </div>

        {error && (
          <div className="mb-4 border-2 border-[#ef4444] bg-[#1a0505] px-3 py-2 text-sm text-[#ef4444] font-mono">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_520px] gap-4">
          <section className="border-2 border-[#333] bg-[#080808]">
            <div className="px-4 py-3 border-b-2 border-[#333] flex items-center justify-between">
              <div>
                <div className="text-sm font-bold uppercase tracking-widest text-white">Timeline</div>
                <div className="text-[10px] text-[#777] uppercase tracking-wider mt-1">
                  This week + next week desde ForexFactory
                </div>
              </div>
              {loading && <span className="text-xs text-[#777] uppercase tracking-wider">Loading...</span>}
            </div>
            <div className="divide-y divide-[#222]">
              {sortedEvents.map((event) => {
                const title = eventTitle(event)
                const saved = savedKeys.has(eventKey(event))
                const released = hasActual(event)
                const mapping = classifyCalendarEvent(event)
                return (
                  <article key={eventKey(event)} className="p-3 hover:bg-[#0d0d0d]">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs text-[#aaa]">{formatDateTime(event)}</span>
                          <span className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${impactClass(event.impact)}`}>
                            {event.impact || 'N/A'}
                          </span>
                          {isBlackout(event) && (
                            <span className="border border-[#ef4444] text-[#ef4444] bg-[#1a0505] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              BLACKOUT
                            </span>
                          )}
                          {released && (
                            <span className="border border-[#ecd987] text-[#ecd987] bg-[#1a1003] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              ACTUAL
                            </span>
                          )}
                          {saved && (
                            <span className="border border-[#4ade80] text-[#4ade80] bg-[#06140b] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              SAVED
                            </span>
                          )}
                        </div>
                        <h2 className="mt-2 text-sm font-bold uppercase tracking-wider text-white break-words">
                          {eventCurrency(event)} · {title}
                        </h2>
                        <div className="mt-2 grid grid-cols-3 gap-2 text-xs font-mono">
                          <Value label="Actual" value={event.actual} color={released ? 'text-[#4ade80]' : 'text-[#555]'} />
                          <Value label="Forecast" value={event.forecast} color="text-[#aaa]" />
                          <Value label="Previous" value={event.previous} color="text-[#aaa]" />
                        </div>
                      </div>
                      <div className="w-full sm:w-[260px] border border-[#222] bg-[#050505] px-2 py-2">
                        <div className={`text-[10px] font-bold uppercase tracking-wider ${mapping.matchStatus === 'candidate' ? 'text-[#f59e0b]' : 'text-[#777]'}`}>
                          {mapping.matchStatus}
                        </div>
                        <div className="text-[10px] text-[#777] leading-tight mt-1">
                          {mapping.reason}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
              {!loading && sortedEvents.length === 0 && (
                <div className="p-6 text-sm text-[#777]">No calendar events available.</div>
              )}
            </div>
          </section>

          <section className="border-2 border-[#333] bg-[#080808]">
            <div className="px-4 py-3 border-b-2 border-[#333]">
              <div className="text-sm font-bold uppercase tracking-widest text-white">Saved Releases</div>
              <div className="text-[10px] text-[#777] uppercase tracking-wider mt-1">
                Log separado: calendar_releases
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm table-fixed">
                <thead>
                  <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                    <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[86px]">Fecha</th>
                    <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest">Evento</th>
                    <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[74px]">Actual</th>
                    <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[86px]">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {releases.map((row) => (
                    <tr key={row.event_hash || `${row.event_date}-${row.event_name}`} className="border-b border-[#222] align-top">
                      <td className="px-2 py-2 font-mono text-xs text-[#aaa]">{row.event_date || '-'}</td>
                      <td className="px-2 py-2">
                        <div className="text-xs font-bold text-white uppercase tracking-wider">
                          {row.currency || '-'} · {row.event_name}
                        </div>
                        <div className="text-[10px] text-[#777] mt-1">
                          F {row.forecast_value || '-'} · P {row.previous_value || '-'} · {row.impact || 'N/A'}
                        </div>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs text-[#4ade80]">{row.actual_value || '-'}</td>
                      <td className="px-2 py-2">
                        <span className={`border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          row.source_id ? 'border-[#4ade80] text-[#4ade80]' : 'border-[#333] text-[#777]'
                        }`}>
                          {row.source_id || row.match_status || 'none'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!loading && releases.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-sm text-[#777]">
                        No saved releases yet. Sync runs automatically while this page is open.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
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

function Value({ label, value, color }) {
  return (
    <div className="border border-[#222] bg-[#050505] px-2 py-1.5 min-w-0">
      <div className="text-[10px] text-[#555] uppercase tracking-widest">{label}</div>
      <div className={`mt-1 truncate ${color}`}>{value || '-'}</div>
    </div>
  )
}
