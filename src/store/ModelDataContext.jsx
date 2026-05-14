import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { dataSources as defaultDataSources } from '../data/dataSources'

// ── Claves localStorage ───────────────────────────────────────────────────────
export const STORAGE_KEY_HISTORY = 'polaris_endogenous_history'
export const STORAGE_KEY_ZSCORES = 'polaris_endogenous_zscores'
export const STORAGE_KEY_SOURCES = 'polaris_data_sources'

// Campos que el usuario puede editar en DataPage (se preservan al hacer merge)
const USER_EDITABLE_FIELDS = ['lastUpdate', '_lastScrape', '_scrapedValue', '_value', '_refreshError']

// ── Worldview defaults y mapa de fuentes ─────────────────────────────────────
export const DEFAULT_WV_DATA = {
  gdpUsa: 0.3, gdpEur: -0.2, gdpChn: 0.5, gdpJpn: 0.1, gdpResto: 0.0,
  vix: 15, hyOas: 45, sp200dma: 1, embi: 55,
  smartZ: 0.5, retailZ: -0.8,
  dxy: 103.5, dxyRising: 1,
  cpiG7: 2.8, breakevens: 2.3,
}

// Mapa worldview key → source ID en dataSources
export const WV_DATA_MAP = {
  gdpUsa:     'wv_gdp_usa',
  gdpEur:     'wv_gdp_eur',
  gdpChn:     'wv_gdp_chn',
  gdpJpn:     'wv_gdp_jpn',
  gdpResto:   'wv_cesi',
  vix:        'wv_vix',
  hyOas:      'wv_hy_oas',
  sp200dma:   'wv_sp500',
  embi:       'wv_embi',
  smartZ:     'wv_cftc',
  retailZ:    'wv_retail',
  dxy:        'wv_dxy',
  dxyRising:  'wv_dxy_200dma',
  cpiG7:      'wv_cpi_usa',
  breakevens: 'wv_breakevens',
}

// ── Utilidades ────────────────────────────────────────────────────────────────
function autoMonthlyDates(n) {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

function migrateEntry(entry) {
  if (!entry) return null
  if (entry.series) return entry
  if (Array.isArray(entry.values) && entry.values.length > 0) {
    const dates = autoMonthlyDates(entry.values.length)
    return {
      series: entry.values.map((value, i) => ({ date: dates[i], value })),
      lastImported: entry.lastImported ?? new Date().toISOString().split('T')[0],
    }
  }
  return null
}

function computeStats(series) {
  if (!series || series.length === 0) return null
  const values = series.map(p => p.value)
  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  const std  = Math.sqrt(values.reduce((s, v) => s + (v - mean) ** 2, 0) / n)
  const last = values[values.length - 1]
  const z    = std > 0 ? Math.max(-4, Math.min(4, (last - mean) / std)) : 0
  return { n, mean, std, last, z }
}

function deriveZscores(history, current = {}) {
  const updated = { ...current }
  for (const [key, entry] of Object.entries(history)) {
    if (!entry?.series?.length) continue
    const stats = computeStats(entry.series)
    if (stats) updated[key] = stats.z
  }
  return updated
}

// Deriva el objeto worldview desde el array de dataSources
function deriveWorldview(sources) {
  const sourceMap = new Map(sources.map(s => [s.id, s]))
  const derived = {}
  for (const [key, id] of Object.entries(WV_DATA_MAP)) {
    const source = sourceMap.get(id)
    if (source?._value != null && source._value !== '') {
      const num = Number(source._value)
      if (!isNaN(num)) derived[key] = num
    }
  }
  return { ...DEFAULT_WV_DATA, ...derived }
}

// ── Cargadores de localStorage ────────────────────────────────────────────────
function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY)
    if (!saved) return {}
    const raw = JSON.parse(saved)
    const migrated = {}
    for (const [key, entry] of Object.entries(raw)) {
      const m = migrateEntry(entry)
      if (m) migrated[key] = m
    }
    return migrated
  } catch { return {} }
}

function loadZscores() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ZSCORES)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return {}
}

function loadDataSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SOURCES)
    if (saved) {
      const parsed = JSON.parse(saved)
      return defaultDataSources.map(defaultSrc => {
        const savedSrc = parsed.find(s => s.id === defaultSrc.id)
        if (!savedSrc) return defaultSrc
        const preserved = USER_EDITABLE_FIELDS.reduce((acc, field) => {
          if (Object.hasOwn(savedSrc, field)) acc[field] = savedSrc[field]
          return acc
        }, {})
        return { ...defaultSrc, ...preserved }
      })
    }
  } catch { /* ignore */ }
  return defaultDataSources
}

// ── Context ───────────────────────────────────────────────────────────────────
const ModelDataContext = createContext(null)

export function ModelDataProvider({ children }) {
  const [history,     setHistory]     = useState(loadHistory)
  const [zscores,     setZscores]     = useState(loadZscores)
  const [dataSources, setDataSources] = useState(loadDataSources)

  // worldview se deriva reactivamente de dataSources — sin estado propio
  const worldview = useMemo(() => deriveWorldview(dataSources), [dataSources])

  // Cuando cambia history, re-deriva z-scores automáticamente
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
    setZscores(prev => {
      const updated = deriveZscores(history, prev)
      localStorage.setItem(STORAGE_KEY_ZSCORES, JSON.stringify(updated))
      return updated
    })
  }, [history])

  // Persiste zscores cuando se actualizan
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ZSCORES, JSON.stringify(zscores))
  }, [zscores])

  // Persiste dataSources cuando DataPage actualiza un _value
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(dataSources))
  }, [dataSources])

  return (
    <ModelDataContext.Provider value={{
      history, setHistory,
      zscores, setZscores,
      dataSources, setDataSources,
      worldview,
    }}>
      {children}
    </ModelDataContext.Provider>
  )
}

export function useModelStore() {
  const ctx = useContext(ModelDataContext)
  if (!ctx) throw new Error('useModelStore must be used within ModelDataProvider')
  return ctx
}
