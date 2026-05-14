import { dataSources } from './dataSources'

const CURRENCY_PREFIX = {
  USD: 'usa',
  EUR: 'eur',
  JPY: 'jpn',
  GBP: 'gbr',
  CHF: 'che',
  CAD: 'can',
  AUD: 'aus',
  NZD: 'nzl',
  SEK: 'swe',
  NOK: 'nor',
}

const RELEASE_TO_SUFFIX = [
  { match: /core[_\s-]?inflation|core[_\s-]?cpi/i, suffix: 'core_cpi', quality: 'related', note: 'Core inflation relacionado con la fuente core CPI del registry.' },
  { match: /inflation|hicp|cpi/i, suffix: 'cpi', quality: 'related', note: 'Inflacion relacionada con la fuente CPI del registry; no se usa como input del modelo.' },
  { match: /policy[_\s-]?rate|fed funds|official cash rate|interest rate|deposit facility/i, suffix: 'policy', quality: 'related', note: 'Decision/tasa de banco central relacionada con la fuente policy rate.' },
  { match: /non[_\s-]?farm|payroll/i, suffix: 'nfp', quality: 'related', note: 'Payrolls relacionado con la fuente NFP cuando existe.' },
  { match: /employment|unemployment|job openings|jolts|wages|participation/i, suffix: 'empl', quality: 'related', note: 'Dato laboral relacionado con la fuente empleo del registry.' },
  { match: /manufacturing pmi|services pmi|non-manufacturing|business sentiment|pmi|nmi/i, suffix: 'pmi', quality: 'related', note: 'PMI/sentimiento empresarial relacionado con la fuente PMI del registry.' },
  { match: /current account|trade balance/i, suffix: 'ca_gdp', quality: 'related', note: 'Sector externo relacionado con Current Account % GDP.' },
  { match: /consumer sentiment|consumer confidence/i, suffix: 'umcsi', quality: 'related', note: 'Sentimiento consumidor relacionado con la fuente de consumer sentiment/confidence.' },
  { match: /government debt|debt/i, suffix: 'debt', quality: 'related', note: 'Dato fiscal relacionado con Debt/GDP.' },
  { match: /m1|m2|money supply|central bank balance/i, suffix: 'cb_balance', quality: 'related', note: 'Agregado monetario relacionado con balance/monetary liquidity.' },
  { match: /gdp/i, worldView: true, suffix: 'gdp', quality: 'related', note: 'GDP relacionado con fuente World View GDP cuando existe.' },
]

function eventTitle(event) {
  return String(event?.title || event?.event_name || event?.event || event?.name || '').trim()
}

function eventCurrency(event) {
  return String(event?.country || event?.currency || '').trim().toUpperCase()
}

function eventRelease(event) {
  return String(event?.release || event?.raw?.release || event?.raw_event?.release || event?.raw_event?.raw?.release || '').trim()
}

function sourceById(sourceId) {
  return dataSources.find((source) => source.id === sourceId) || null
}

function findSourceForRule(currency, rule) {
  const prefix = CURRENCY_PREFIX[currency]
  if (!prefix) return null

  const candidates = rule.worldView
    ? [`wv_${rule.suffix}_${prefix === 'usa' ? 'usa' : prefix}`]
    : [`endo_${prefix}_${rule.suffix}`]

  return candidates.map((id) => sourceById(id)).find(Boolean) || null
}

export function classifyCalendarEvent(event) {
  const title = eventTitle(event)
  const currency = eventCurrency(event)
  const release = eventRelease(event)
  const searchable = `${release} ${title}`

  const rule = RELEASE_TO_SUFFIX.find((item) => item.match.test(searchable))
  if (!rule) {
    return {
      sourceId: null,
      source: null,
      matchStatus: 'none',
      reason: 'Sin equivalente claro en el source registry. Se queda solo como evento del calendario.',
    }
  }

  const source = findSourceForRule(currency, rule)
  if (!source) {
    return {
      sourceId: null,
      source: null,
      matchStatus: 'candidate',
      reason: `${rule.note} No hay fuente equivalente conectada para ${currency}.`,
    }
  }

  return {
    sourceId: source.id,
    source,
    matchStatus: rule.quality,
    reason: `${rule.note} Barrera activa: no actualiza registry, history ni features.`,
  }
}

export const CALENDAR_TO_SOURCE = RELEASE_TO_SUFFIX
