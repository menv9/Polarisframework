import { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react'
import { dataSources as defaultDataSources } from '../data/dataSources'
import { computeRollingZScore } from '../lib/scoring/zScore'
import { deriveFeatureStore } from '../lib/scoring/features'
import { detectRegime, resolvePersistentRegime } from '../lib/scoring/regime'

// ── Claves localStorage ───────────────────────────────────────────────────────
export const STORAGE_KEY_HISTORY = 'polaris_endogenous_history'
export const STORAGE_KEY_ZSCORES = 'polaris_endogenous_zscores'
export const STORAGE_KEY_SOURCES = 'polaris_data_sources'
export const STORAGE_KEY_REGIME_STATE = 'polaris_worldview_regime_state'
export const STORAGE_KEY_SIGNAL_HISTORY = 'polaris_signal_history'

// Campos que el usuario puede editar en DataPage (se preservan al hacer merge)
const USER_EDITABLE_FIELDS = ['lastUpdate', '_lastScrape', '_scrapedValue', '_value', '_refreshError']

// ── Worldview defaults y mapa de fuentes ─────────────────────────────────────
export const DEFAULT_WV_DATA = {
  gdpUsa: 0.3, gdpEur: -0.2, gdpChn: 0.5, gdpJpn: 0.1, gdpResto: 0.0,
  vix: 15, hyOas: 45, sp200dma: 1, embi: 55,
  vixRaw: 15,
  smartZ: 0.5, retailZ: -0.8,
  dxy: 103.5, dxyRising: 1,
  cpiG7: 2.8, breakevens: 2.3, cbPolicyStance: 0,
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
  cbPolicyStance: 'wv_cb_policy_stance',
}

export const WV_GDP_GAP_MAP = {
  gdpUsa:   { nowcast: 'wv_gdp_usa_nowcast',   consensus: 'wv_gdp_usa_consensus',   legacy: 'wv_gdp_usa' },
  gdpEur:   { nowcast: 'wv_gdp_eur_nowcast',   consensus: 'wv_gdp_eur_consensus',   legacy: 'wv_gdp_eur' },
  gdpChn:   { nowcast: 'wv_gdp_chn_nowcast',   consensus: 'wv_gdp_chn_consensus',   legacy: 'wv_gdp_chn' },
  gdpJpn:   { nowcast: 'wv_gdp_jpn_nowcast',   consensus: 'wv_gdp_jpn_consensus',   legacy: 'wv_gdp_jpn' },
  gdpResto: { nowcast: 'wv_gdp_resto_nowcast', consensus: 'wv_gdp_resto_consensus', legacy: 'wv_cesi' },
}

export const WV_CPI_G7_SOURCE_IDS = [
  'wv_cpi_usa',
  'wv_cpi_can',
  'wv_cpi_fra',
  'wv_cpi_deu',
  'wv_cpi_ita',
  'wv_cpi_jpn',
  'wv_cpi_gbr',
]

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

function deriveZscores(history) {
  const updated = {}
  for (const [key, entry] of Object.entries(history)) {
    if (!entry?.series?.length) continue
    const { z } = computeRollingZScore(entry.series, { key })
    updated[key] = z
  }
  return updated
}

function median(values) {
  const nums = values.filter(Number.isFinite).sort((a, b) => a - b)
  if (nums.length === 0) return null
  const mid = Math.floor(nums.length / 2)
  return nums.length % 2 === 1 ? nums[mid] : (nums[mid - 1] + nums[mid]) / 2
}

// Keys that must be z-scores (±10 max). Raw CFTC/SSI values (e.g. -922 contracts) are rejected.
const Z_SCORE_KEYS = new Set(['smartZ', 'retailZ'])
const Z_SCORE_MAX = 10

// Deriva el objeto worldview desde el array de dataSources
function deriveWorldview(features) {
  const values = features.valuesBySourceId
  const derived = {}
  for (const [key, ids] of Object.entries(WV_GDP_GAP_MAP)) {
    const nowcast = values[ids.nowcast]
    const consensus = values[ids.consensus]
    if (Number.isFinite(nowcast) && Number.isFinite(consensus)) {
      derived[key] = nowcast - consensus
      continue
    }
    if (Number.isFinite(values[ids.legacy])) derived[key] = values[ids.legacy]
  }
  for (const [key, id] of Object.entries(WV_DATA_MAP)) {
    if (key in WV_GDP_GAP_MAP) continue
    if (key === 'cpiG7') continue
    const v = values[id]
    if (!Number.isFinite(v)) continue
    // Reject z-score fields populated with raw values (e.g. CFTC net contracts = -922)
    if (Z_SCORE_KEYS.has(key) && Math.abs(v) > Z_SCORE_MAX) continue
    derived[key] = v
  }
  const cpiG7 = median(WV_CPI_G7_SOURCE_IDS.map(id => values[id]))
  if (cpiG7 !== null) derived.cpiG7 = cpiG7
  // Raw VIX (pre-percentile) for shock detection in scoring functions
  const vixRaw = features.rawBySourceId?.['wv_vix']
  if (Number.isFinite(vixRaw)) derived.vixRaw = vixRaw
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

function loadRegimeState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_REGIME_STATE)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return null
}

function loadSignalHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_SIGNAL_HISTORY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return {}
}

function normalizeSignalKey(key) {
  return String(key || '').trim().toUpperCase()
}

// ── Context ───────────────────────────────────────────────────────────────────
const ModelDataContext = createContext(null)

export function ModelDataProvider({ children }) {
  const [history,     setHistory]     = useState(loadHistory)
  const [zscores,     setZscores]     = useState(loadZscores)
  const [dataSources, setDataSources] = useState(loadDataSources)
  const [regimeState, setRegimeState] = useState(loadRegimeState)
  const [signalHistory, setSignalHistory] = useState(loadSignalHistory)

  // Source -> History -> Features -> Framework.
  const features = useMemo(() => deriveFeatureStore(dataSources, history), [dataSources, history])
  const worldview = useMemo(() => deriveWorldview(features), [features])
  const rawRegime = useMemo(() => detectRegime(worldview), [worldview])

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

  useEffect(() => {
    setRegimeState(prev => {
      const updated = resolvePersistentRegime(rawRegime, worldview, prev)
      localStorage.setItem(STORAGE_KEY_REGIME_STATE, JSON.stringify(updated))
      return updated
    })
  }, [rawRegime, worldview])

  const recordSignalSample = useCallback((key, value) => {
    const signal = Number(value)
    const signalKey = normalizeSignalKey(key)
    if (!signalKey || !Number.isFinite(signal)) return

    setSignalHistory(prev => {
      const current = Array.isArray(prev[signalKey]) ? prev[signalKey] : []
      const rounded = Number(signal.toFixed(4))
      const last = current[current.length - 1]
      if (last && Math.abs(Number(last.value) - rounded) < 0.0001) return prev

      const updated = {
        ...prev,
        [signalKey]: [...current, { at: new Date().toISOString(), value: rounded }].slice(-260),
      }
      localStorage.setItem(STORAGE_KEY_SIGNAL_HISTORY, JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <ModelDataContext.Provider value={{
      history, setHistory,
      zscores, setZscores,
      dataSources, setDataSources,
      features,
      worldview,
      rawRegime,
      regime: regimeState?.current ?? rawRegime,
      regimeState,
      signalHistory,
      recordSignalSample,
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
