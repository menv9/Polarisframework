const REGIME_PERCENTILE_SOURCE_IDS = new Set(['wv_vix', 'wv_hy_oas', 'wv_embi'])

export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

function latestSeriesValue(series) {
  if (!Array.isArray(series) || series.length === 0) return null
  return toFiniteNumber(series[series.length - 1]?.value)
}

export function computeRollingPercentile(series, currentValue, { window = 1300 } = {}) {
  const current = toFiniteNumber(currentValue)
  if (current === null || !Array.isArray(series) || series.length < 30) return null

  const values = series
    .slice(-window)
    .map(point => toFiniteNumber(point.value))
    .filter(value => value !== null)

  if (values.length < 30) return null
  const belowOrEqual = values.filter(value => value <= current).length
  return Math.max(0, Math.min(100, (belowOrEqual / values.length) * 100))
}

function featureValueForSource(source, historyEntry) {
  const rawValue = toFiniteNumber(source._value)
  const latestHistory = latestSeriesValue(historyEntry?.series)
  const baseValue = rawValue ?? latestHistory

  if (REGIME_PERCENTILE_SOURCE_IDS.has(source.id) && !source.apiPath?.includes('/percentile/')) {
    const percentile = computeRollingPercentile(historyEntry?.series, baseValue)
    if (percentile !== null) {
      return { value: percentile, rawValue: baseValue, transform: 'rolling_percentile_5y' }
    }
  }

  return {
    value: baseValue,
    rawValue: baseValue,
    transform: source.apiPath?.includes('/percentile/') ? 'source_percentile' : 'identity',
  }
}

export function deriveFeatureStore(dataSources, history) {
  const valuesBySourceId = {}
  const rawBySourceId = {}
  const metaBySourceId = {}

  for (const source of dataSources) {
    const entry = history?.[source.id]
    const feature = featureValueForSource(source, entry)
    rawBySourceId[source.id] = feature.rawValue
    metaBySourceId[source.id] = {
      transform: feature.transform,
      historyPoints: entry?.series?.length ?? 0,
    }
    if (feature.value !== null) valuesBySourceId[source.id] = feature.value
  }

  return { valuesBySourceId, rawBySourceId, metaBySourceId }
}
