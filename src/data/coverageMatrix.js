import { dataSources } from './dataSources'

export const coverageCountries = [
  { code: 'usa', label: 'USA' },
  { code: 'eur', label: 'EUR' },
  { code: 'jpn', label: 'JPY' },
  { code: 'gbr', label: 'GBP' },
  { code: 'che', label: 'CHF' },
  { code: 'can', label: 'CAD' },
  { code: 'aus', label: 'AUD' },
  { code: 'nzl', label: 'NZD' },
  { code: 'swe', label: 'SEK' },
  { code: 'nor', label: 'NOK' },
]

export const canonicalVariables = [
  {
    key: 'real_rate_2y',
    label: 'Real Rate 2Y',
    category: 'CARRY',
    comparable: 'cross-country',
    transform: 'rate/spread',
    description: 'Input de carry principal. Debe representar rentabilidad real de corto plazo.',
    sourceIds: {
      usa: 'endo_usa_real_2y',
      eur: 'endo_eur_real_2y',
      jpn: 'endo_jpn_real_2y',
      gbr: 'endo_gbr_real_2y',
      che: 'endo_che_real_2y',
      can: 'endo_can_real_2y',
      aus: 'endo_aus_real_2y',
      nzl: 'endo_nzl_real_2y',
      swe: 'endo_swe_real_2y',
      nor: 'endo_nor_real_2y',
    },
  },
  {
    key: 'current_account_gdp',
    label: 'Current Account / GDP',
    category: 'STRUCTURAL',
    comparable: 'cross-country',
    transform: '% GDP',
    description: 'Balance externo estructural, comparable si todos usan %GDP.',
    sourceIds: mapCountryIds('ca_gdp'),
  },
  {
    key: 'real_rate_10y',
    label: 'Real Rate 10Y',
    category: 'RATES',
    comparable: 'limited',
    transform: 'real yield/proxy',
    description: 'Debe usarse con cautela: muchos países no tienen 10Y real limpio.',
    sourceIds: mapCountryIds('10y_real'),
  },
  {
    key: 'terms_of_trade',
    label: 'Terms of Trade',
    category: 'STRUCTURAL',
    comparable: 'within-country',
    transform: 'YoY or z-score',
    description: 'Mejor como señal interna de mejora/deterioro que como nivel absoluto.',
    sourceIds: mapCountryIds('tot'),
  },
  {
    key: 'headline_cpi',
    label: 'Headline CPI',
    category: 'INFLATION',
    comparable: 'cross-country',
    transform: 'YoY',
    description: 'Inflación general. Comparable si está anualizada como YoY.',
    sourceIds: mapCountryIds('cpi'),
  },
  {
    key: 'core_cpi',
    label: 'Core CPI',
    category: 'INFLATION',
    comparable: 'limited',
    transform: 'YoY',
    description: 'La definición de core cambia por país; útil, pero no siempre idéntica.',
    sourceIds: mapCountryIds('core_cpi'),
  },
  {
    key: 'growth_momentum',
    label: 'Growth Momentum',
    category: 'GROWTH',
    comparable: 'limited',
    transform: 'PMI/CLI/z-score',
    description: 'PMI si existe; si no, CLI/actividad como proxy. No mezclar raw sin normalizar.',
    sourceIds: {
      usa: 'endo_usa_pmi',
      eur: 'endo_eur_pmi',
      jpn: 'endo_jpn_pmi',
      gbr: 'endo_gbr_pmi',
      che: 'endo_che_pmi',
      can: 'endo_can_pmi',
      aus: 'endo_aus_pmi',
      nzl: 'endo_nzl_pmi',
      swe: 'endo_swe_pmi',
      nor: 'endo_nor_pmi',
    },
  },
  {
    key: 'employment',
    label: 'Employment',
    category: 'LABOR',
    comparable: 'limited',
    transform: 'YoY/z-score',
    description: 'Señal laboral. USA usa NFP; otros suelen usar empleo LFS/OECD.',
    sourceIds: {
      usa: 'endo_usa_nfp',
      eur: 'endo_eur_empl',
      jpn: 'endo_jpn_empl',
      gbr: 'endo_gbr_empl',
      che: 'endo_che_empl',
      can: 'endo_can_empl',
      aus: 'endo_aus_empl',
      nzl: 'endo_nzl_empl',
      swe: 'endo_swe_empl',
      nor: 'endo_nor_empl',
    },
  },
  {
    key: 'policy_rate',
    label: 'Policy Rate',
    category: 'RATES',
    comparable: 'cross-country',
    transform: 'level/change',
    description: 'Tipo oficial o equivalente. Comparar nivel, pendiente y sorpresa.',
    sourceIds: mapCountryIds('policy'),
  },
  {
    key: 'positioning',
    label: 'Positioning',
    category: 'SENTIMENT',
    comparable: 'within-country',
    transform: 'z-score/percentile',
    description: 'CFTC debe normalizarse; contratos brutos no son comparables entre divisas.',
    sourceIds: mapCountryIds('cftc'),
  },
  {
    key: 'reer_valuation',
    label: 'REER Valuation',
    category: 'VALUATION',
    comparable: 'cross-country',
    transform: 'dev vs 10Y mean',
    description: 'REER es comparable cuando se transforma como desviación vs media histórica.',
    sourceIds: mapCountryIds('reer'),
  },
  {
    key: 'debt_gdp',
    label: 'Debt / GDP',
    category: 'SOVEREIGN',
    comparable: 'cross-country',
    transform: '% GDP',
    description: 'Riesgo soberano estructural. Mejor usar junto a déficit y CA/GDP.',
    sourceIds: mapCountryIds('debt'),
  },
  {
    key: 'niip_gdp',
    label: 'NIIP / GDP',
    category: 'STRUCTURAL',
    comparable: 'cross-country',
    transform: '% GDP',
    description: 'Posición externa neta. Si el dato no está en %GDP, requiere normalización.',
    sourceIds: mapCountryIds('niip'),
  },
  {
    key: 'cb_balance',
    label: 'CB Balance',
    category: 'MONEY',
    comparable: 'within-country',
    transform: 'YoY or %GDP',
    description: 'No comparar nivel bruto entre bancos centrales; usar YoY/%GDP.',
    sourceIds: mapCountryIds('cb_balance'),
  },
  {
    key: 'consumer_sentiment',
    label: 'Consumer Sentiment',
    category: 'GROWTH',
    comparable: 'within-country',
    transform: 'z-score',
    description: 'Indicador auxiliar. Útil como señal interna, no como input dominante.',
    sourceIds: mapCountryIds('umcsi'),
  },
]

const sourceById = new Map(dataSources.map((source) => [source.id, source]))

export function getCoverageRows() {
  return canonicalVariables.map((variable) => ({
    ...variable,
    cells: coverageCountries.map((country) => {
      const sourceId = variable.sourceIds[country.code]
      const source = sourceId ? sourceById.get(sourceId) : null
      return {
        country,
        sourceId,
        source,
        fit: source?.dataFit || 'missing',
        endpoint: source?.apiPath || source?.fredSeriesId || null,
        refreshable: Boolean(source?.apiPath || source?.fredSeriesId),
      }
    }),
  }))
}

export function getCoverageSummary(rows = getCoverageRows()) {
  return rows
    .flatMap((row) => row.cells)
    .reduce(
      (acc, cell) => {
        acc.total += 1
        acc[cell.fit] = (acc[cell.fit] || 0) + 1
        if (cell.refreshable) acc.refreshable += 1
        return acc
      },
      { total: 0, refreshable: 0 }
    )
}

function mapCountryIds(suffix) {
  return coverageCountries.reduce((acc, country) => {
    acc[country.code] = `endo_${country.code}_${suffix}`
    return acc
  }, {})
}
