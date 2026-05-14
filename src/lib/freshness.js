// Data freshness utilities — shared across pages
// status: 'ok' | 'warn' | 'stale' | 'missing'

export function getFreshness(lastUpdate, frequencyDays) {
  if (!lastUpdate) return { status: 'missing', daysOld: null, label: '—' }
  const last = new Date(lastUpdate)
  if (isNaN(last.getTime())) return { status: 'missing', daysOld: null, label: '—' }
  const daysOld = Math.floor((Date.now() - last.getTime()) / 86_400_000)
  const freq = frequencyDays ?? 30
  let status
  if      (daysOld <= freq)         status = 'ok'
  else if (daysOld <= freq * 2)     status = 'warn'
  else                              status = 'stale'
  const label = daysOld === 0 ? 'hoy' : daysOld === 1 ? '1d' : `${daysOld}d`
  return { status, daysOld, label }
}

export const FRESHNESS_DOT = {
  ok:      'bg-[#4ade80]',
  warn:    'bg-[#f59e0b]',
  stale:   'bg-[#ef4444]',
  missing: 'bg-[#333]',
}

export const FRESHNESS_TEXT = {
  ok:      'text-[#4ade80]',
  warn:    'text-[#f59e0b]',
  stale:   'text-[#ef4444]',
  missing: 'text-[#444]',
}
