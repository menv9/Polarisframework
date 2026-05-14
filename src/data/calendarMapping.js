const CANDIDATE_MAPPINGS = [
  {
    match: /core cpi/i,
    currency: 'USD',
    sourceId: null,
    matchStatus: 'candidate',
    reason: 'Core CPI relacionado con inflacion USA, pero no hay mapping exacto habilitado para auto-update.',
  },
  {
    match: /cpi/i,
    currency: 'USD',
    sourceId: null,
    matchStatus: 'candidate',
    reason: 'Inflacion USA relacionada, pero las fuentes CPI del modelo usan transformaciones YoY; no es exact-fit.',
  },
  {
    match: /federal funds|fomc|fed interest rate/i,
    currency: 'USD',
    sourceId: null,
    matchStatus: 'candidate',
    reason: 'Evento Fed relevante; la fuente del modelo usa tasa efectiva/serie canonica, no el valor del calendario.',
  },
  {
    match: /non-farm|nfp|payroll/i,
    currency: 'USD',
    sourceId: null,
    matchStatus: 'candidate',
    reason: 'Empleo USA relevante, pero el dato calendario no alimenta history ni features en esta fase.',
  },
]

export function classifyCalendarEvent(event) {
  const title = String(event?.title || event?.event_name || event?.event || '').trim()
  const currency = String(event?.country || event?.currency || '').trim().toUpperCase()
  const candidate = CANDIDATE_MAPPINGS.find((item) => {
    const currencyMatches = !item.currency || item.currency === currency
    return currencyMatches && item.match.test(title)
  })

  return candidate || {
    sourceId: null,
    matchStatus: 'none',
    reason: 'Sin mapping exacto. Se guarda solo como release de calendario.',
  }
}

export const CALENDAR_TO_SOURCE = CANDIDATE_MAPPINGS
