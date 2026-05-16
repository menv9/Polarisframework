import { useState, useEffect, useMemo, useRef, Fragment } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { INDICATORS as BASE_INDICATORS } from '../lib/endogenousBetas'
import { computeRollingZScore } from '../lib/scoring/zScore'
import { useModelStore } from '../store/ModelDataContext'

const COUNTRIES = [
  { label: 'USD', prefix: 'usa' },
  { label: 'EUR', prefix: 'eur' },
  { label: 'JPY', prefix: 'jpn' },
  { label: 'GBP', prefix: 'gbr' },
  { label: 'CHF', prefix: 'che' },
  { label: 'CAD', prefix: 'can' },
  { label: 'AUD', prefix: 'aus' },
  { label: 'NZD', prefix: 'nzl' },
  { label: 'SEK', prefix: 'swe' },
  { label: 'NOK', prefix: 'nor' },
]

const CATEGORY_MAP = {
  real_2y: 'CARRY', ca_gdp: 'ESTRUCTURAL', reer: 'VALUATION', tot: 'ESTRUCTURAL',
  '10y_real': 'RATES', core_cpi: 'INFLACION', niip: 'ESTRUCTURAL', policy: 'RATES',
  cpi: 'INFLACION', nfp: 'EMPLEO', pmi: 'CRECIMIENTO', cftc: 'SENTIMIENTO',
  cb_balance: 'MONETARIO', debt: 'SOBERANO', umcsi: 'CRECIMIENTO',
}

const INDICATORS = BASE_INDICATORS.map(i => ({ ...i, beta: i.betaDoc, category: CATEGORY_MAP[i.key] ?? i.key.toUpperCase() }))

// Labels por indicador y país — alineados con lo que está realmente en dataSources.js

function getIndLabel(key, prefix) {
  switch (key) {
    case 'nfp':
      // USA: PAYEMS YoY | Resto: LRHUTTTXXXM156S (tasa de paro OECD)
      return prefix === 'usa' ? 'NFP YoY (PAYEMS)' : 'Unemployment Rate (OECD)'
    case 'umcsi':
      // USA: UMCSENT | Resto: CSCICP03XXM665S (OECD consumer confidence)
      return prefix === 'usa' ? 'UMCSI (Univ. Michigan)' : 'Consumer Confidence (OECD)'
    case '10y_real':
      // USA: DFII10 (TIPS — yield real real) | Resto: IRLTLT01XXM156N (yield NOMINAL OECD)
      return prefix === 'usa' ? '10Y Real Yield (TIPS)' : '10Y Nominal Yield (OECD)'
    case 'pmi':
      return prefix === 'usa' ? 'ISM Manufacturing' : 'PMI Manufacturing (manual)'
    case 'policy':
      if (prefix === 'usa') return 'Fed Funds Rate (DFF)'
      if (prefix === 'eur') return 'ECB Deposit Facility Rate'
      if (prefix === 'can') return 'BoC Overnight Rate'
      return 'Policy Rate (OECD IRSTCI01)'
    case 'cb_balance':
      if (prefix === 'usa') return 'Fed Balance/GDP (WALCL)'
      if (prefix === 'eur') return 'ECB Balance/GDP (ECBASSETSW)'
      if (prefix === 'jpn') return 'BoJ Balance/GDP (JPNASSETS)'
      return 'CB Balance/GDP (manual)'
    case 'real_2y':
      // USA: DGS2 − T5YIFR | Resto: IRSTCI01XXM156N − CPI (policy rate proxy)
      return prefix === 'usa' ? 'Real Rate 2Y (2Y − TIPS brkevn)' : 'Real Rate 2Y (policy − CPI)'
    case 'cftc':
      if (prefix === 'usa') return 'CFTC USD Index'
      if (prefix === 'swe' || prefix === 'nor') return 'CFTC USD Index (inv. proxy)'
      return `CFTC ${prefix === 'eur' ? 'Euro FX' : prefix === 'jpn' ? 'Japanese Yen' : prefix === 'gbr' ? 'British Pound' : prefix === 'che' ? 'Swiss Franc' : prefix === 'can' ? 'Canadian Dollar' : prefix === 'aus' ? 'Australian Dollar' : 'NZ Dollar'}`
    case 'tot':
      // Sin scraper config en ningún país — entrada manual
      return 'Terms of Trade YoY (manual)'
    default:
      return INDICATORS.find(i => i.key === key)?.label ?? key
  }
}

// ── Date helpers ──────────────────────────────────────────────────────────────
function normalizeDate(str) {
  if (!str || typeof str !== 'string') return null
  const s = str.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.substring(0, 7)
  if (/^\d{4}-\d{2}$/.test(s)) return s
  if (/^\d{4}\/\d{2}(\/\d{2})?$/.test(s)) return s.substring(0, 7).replace('/', '-')
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    const [m, , y] = s.split('/')
    return `${y}-${m.padStart(2, '0')}`
  }
  return null
}

function autoMonthlyDates(n) {
  const today = new Date()
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (n - 1 - i), 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

// ── Parsing ──────────────────────────────────────────────────────────────────
// Acepta:
//   • Un valor por línea:           1.4\n2.1\n...
//   • date,value por línea:         2016-01,1.4\n...
//   • Valores separados por comas:  1.4,2.1,3.0,...
// Devuelve: [{date: 'YYYY-MM', value: number}]
function parseSeriesCSV(text) {
  const cleaned = text.trim()
  if (!cleaned) return []

  const lines = cleaned.includes('\n') ? cleaned.split('\n') : cleaned.split(/[,;]/)
  const result = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    // Skip header rows
    if (/^(date|fecha|month|mes|periodo|period|year|año)/i.test(trimmed)) continue

    const parts = trimmed.split(/[,;\t]/)
    if (parts.length >= 2) {
      const rawDate = parts[0].trim()
      const rawValue = parts[parts.length - 1].trim().replace(',', '.')
      const value = parseFloat(rawValue)
      if (isNaN(value)) continue
      const date = normalizeDate(rawDate)
      result.push({ date, value })
    } else {
      const value = parseFloat(trimmed.replace(',', '.'))
      if (!isNaN(value)) result.push({ date: null, value })
    }
  }

  // Fill auto-dates for entries without one
  const needsDate = result.some(p => p.date === null)
  if (needsDate) {
    const dates = autoMonthlyDates(result.length)
    result.forEach((p, i) => { if (p.date === null) p.date = dates[i] })
  }

  return result
}

// ── Estadísticas ─────────────────────────────────────────────────────────────
function computeStats(series) {
  if (!series || series.length === 0) return null
  const values = series.map(p => p.value)
  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)
  const last = values[values.length - 1]
  const z = std > 0 ? Math.max(-4, Math.min(4, (last - mean) / std)) : 0
  const firstDate = series[0].date
  const lastDate = series[n - 1].date
  return { n, mean, std, last, z, firstDate, lastDate }
}

// ── URLs desde dataSources ────────────────────────────────────────────────────
function getSourceId(prefix, key) {
  const suffix = key === 'nfp' && prefix !== 'usa' ? 'empl' : key
  return `endo_${prefix}_${suffix}`
}

const STORAGE_KEY_URLS = 'polaris_endogenous_urls'

function loadSourceUrls() {
  try {
    const saved = localStorage.getItem('polaris_data_sources')
    if (!saved) return {}
    const sources = JSON.parse(saved)
    const map = {}
    for (const s of sources) {
      if (s.scrapeUrl) map[s.id] = s.scrapeUrl
    }
    return map
  } catch { return {} }
}

function loadCustomUrls() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_URLS)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return {}
}


// ── Helpers de formato ───────────────────────────────────────────────────────
function fmt2(v) { return v == null ? '—' : v.toFixed(2) }
function fmtZ(z) { return z == null ? '—' : (z >= 0 ? '+' : '') + z.toFixed(3) }
function zColor(z) {
  if (z == null) return 'text-[#555]'
  return z > 0.5 ? 'text-[#4ade80]' : z < -0.5 ? 'text-[#ef4444]' : 'text-[#e5e5e5]'
}
function zBar(z) {
  if (z == null) return null
  const pct = Math.min(Math.abs(z) / 4, 1) * 100
  const color = z > 0 ? '#4ade80' : '#ef4444'
  const align = z > 0 ? 'left' : 'right'
  return { pct, color, align }
}

function exportModelInputsCsv({ history, activeTab, activeCountry, activeStats }) {
  const headers = [
    'country', 'indicator_key', 'indicator', 'category', 'observations',
    'start_date', 'end_date', 'mean', 'std', 'last_value', 'z_score',
    'last_imported', 'source_id',
  ]

  const escape = (value) => {
    if (value === null || value === undefined) return ''
    const text = String(value).replace(/"/g, '""')
    return text.includes(',') || text.includes('"') || text.includes('\n') ? `"${text}"` : text
  }

  const rows = INDICATORS.map((indicator) => {
    const storageKey = `${activeTab}_${indicator.key}`
    const entry = history[storageKey]
    const stats = activeStats[indicator.key]
    return [
      activeCountry?.label || activeTab,
      indicator.key,
      getIndLabel(indicator.key, activeTab),
      indicator.category,
      stats?.n || 0,
      stats?.firstDate || '',
      stats?.lastDate || '',
      stats?.mean ?? '',
      stats?.std ?? '',
      stats?.last ?? '',
      stats?.z ?? '',
      entry?.lastImported || '',
      getSourceId(activeTab, indicator.key),
    ].map(escape).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `polaris_model_inputs_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

function deriveZscoresFromHistory(history) {
  const updated = {}
  for (const [key, entry] of Object.entries(history)) {
    if (!entry?.series?.length) continue
    const { z } = computeRollingZScore(entry.series, { key })
    updated[key] = z
  }
  return updated
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function ModelInputsPage() {
  const { history, setHistory, setZscores } = useModelStore()
  const [searchParams]                  = useSearchParams()
  const [sourceUrls]                    = useState(loadSourceUrls)
  const [customUrls, setCustomUrls]     = useState(loadCustomUrls)
  const initCountry = COUNTRIES.find(c => c.prefix === searchParams.get('country'))?.prefix ?? 'usa'
  const [activeTab, setActiveTab]       = useState(initCountry)
  const [activeImport, setActiveImport] = useState(null)
  const [importText, setImportText]     = useState('')
  const [importError, setImportError]   = useState('')
  const [syncMsg, setSyncMsg]           = useState(null)
  const [featureMsg, setFeatureMsg]     = useState(null)
  const [buildingFeatures, setBuildingFeatures] = useState(false)
  const [confirmClear, setConfirmClear] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(new Set())
  const [loadAllMsg, setLoadAllMsg]     = useState(null)
  const [urlEditKey, setUrlEditKey]     = useState(null)
  const [urlEditValue, setUrlEditValue] = useState('')
  const fileInputRef                    = useRef(null)
  const pipelineJsonRef                 = useRef(null)
  const [isDragging, setIsDragging]     = useState(false)
  const [pipelineMsg, setPipelineMsg]   = useState(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_URLS, JSON.stringify(customUrls))
  }, [customUrls])

  function handleDragEnter(e) {
    e.preventDefault()
    setIsDragging(true)
  }
  function handleDragOver(e) {
    e.preventDefault()
  }
  function handleDragLeave(e) {
    if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false)
  }
  function handleDropFile(e) {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      setImportText(ev.target.result)
      setImportError('')
    }
    reader.readAsText(file)
  }

  // URL efectiva: override manual > dataSources
  const getEffectiveUrl = (sourceId) => customUrls[sourceId] || sourceUrls[sourceId] || ''

  const handleUrlEdit = (sourceId) => {
    setUrlEditKey(sourceId)
    setUrlEditValue(customUrls[sourceId] || sourceUrls[sourceId] || '')
  }

  const handleUrlSave = (sourceId) => {
    const trimmed = urlEditValue.trim()
    setCustomUrls(prev => {
      const next = { ...prev }
      if (trimmed) next[sourceId] = trimmed
      else delete next[sourceId]  // vacío = volver a dataSources
      return next
    })
    setUrlEditKey(null)
    setUrlEditValue('')
  }

  const activeStats = useMemo(() => {
    const result = {}
    for (const ind of INDICATORS) {
      const entry = history[`${activeTab}_${ind.key}`]
      result[ind.key] = entry?.series ? computeStats(entry.series) : null
    }
    return result
  }, [history, activeTab])

  const tabCoverage = useMemo(() => {
    const cov = {}
    for (const c of COUNTRIES) {
      let ok = 0
      for (const ind of INDICATORS) {
        const entry = history[`${c.prefix}_${ind.key}`]
        if (entry?.series?.length > 0) ok++
      }
      cov[c.prefix] = ok
    }
    return cov
  }, [history])

  const handleOpenImport = (prefix, key) => {
    const storageKey = `${prefix}_${key}`
    const existing = history[storageKey]?.series
    setImportText(existing ? existing.map(p => `${p.date},${p.value}`).join('\n') : '')
    setImportError('')
    setActiveImport(storageKey)
  }

  const handleConfirmImport = () => {
    const series = parseSeriesCSV(importText)
    if (series.length === 0) {
      setImportError('No se encontraron valores numéricos. Pega una columna de números o fecha,valor.')
      return
    }
    setHistory(prev => ({
      ...prev,
      [activeImport]: {
        series,
        lastImported: new Date().toISOString().split('T')[0],
      }
    }))
    setActiveImport(null)
    setImportText('')
    setImportError('')
  }

  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImportText(ev.target.result)
      setImportError('')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleClearIndicator = (prefix, key) => {
    const storageKey = `${prefix}_${key}`
    setHistory(prev => {
      const next = { ...prev }
      delete next[storageKey]
      return next
    })
  }

  const handleSyncManual = () => {
    const updated = deriveZscoresFromHistory(history)
    setZscores(updated)
    setSyncMsg('Z-scores sincronizados ✓')
    setTimeout(() => setSyncMsg(null), 2500)
  }

  const handleClearAll = () => {
    if (!confirmClear) { setConfirmClear(true); return }
    setHistory({})
    setConfirmClear(false)
  }

  const handlePipelineJSON = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result)
        let count = 0
        setHistory(prev => {
          const next = { ...prev }
          for (const [key, entry] of Object.entries(data)) {
            if (Array.isArray(entry?.series) && entry.series.length > 0) {
              next[key] = entry
              count++
            }
          }
          return next
        })
        setPipelineMsg(`Pipeline: ${count} series cargadas`)
        setTimeout(() => setPipelineMsg(null), 4000)
      } catch {
        setPipelineMsg('Error: JSON inválido')
        setTimeout(() => setPipelineMsg(null), 4000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleLoadFromHistory = async (prefix, key) => {
    const sourceId = getSourceId(prefix, key)
    const storageKey = `${prefix}_${key}`
    setLoadingHistory(prev => new Set(prev).add(storageKey))
    try {
      const res = await fetch(`/api/history/series/${sourceId}?limit=500&order=asc`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const body = await res.json()
      const observations = body.observations || []
      if (observations.length === 0) throw new Error('sin datos en history')
      const series = observations
        .map(o => ({ date: String(o.date).substring(0, 7), value: Number(o.value) }))
        .filter(o => !isNaN(o.value))
      setHistory(prev => ({
        ...prev,
        [storageKey]: { series, lastImported: new Date().toISOString().split('T')[0] },
      }))
    } catch (err) {
      console.warn(`History load failed for ${sourceId}:`, err.message)
    } finally {
      setLoadingHistory(prev => { const next = new Set(prev); next.delete(storageKey); return next })
    }
  }

  const handleLoadAllFromHistory = async () => {
    setLoadAllMsg('Cargando...')
    let ok = 0, errors = 0
    for (const ind of INDICATORS) {
      const sourceId = getSourceId(activeTab, ind.key)
      const storageKey = `${activeTab}_${ind.key}`
      try {
        const res = await fetch(`/api/history/series/${sourceId}?limit=500&order=asc`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const body = await res.json()
        const observations = body.observations || []
        if (observations.length === 0) continue
        const series = observations
          .map(o => ({ date: String(o.date).substring(0, 7), value: Number(o.value) }))
          .filter(o => !isNaN(o.value))
        setHistory(prev => ({
          ...prev,
          [storageKey]: { series, lastImported: new Date().toISOString().split('T')[0] },
        }))
        ok++
      } catch { errors++ }
    }
    setLoadAllMsg(`Cargado: ${ok} OK / ${errors} sin datos`)
    setTimeout(() => setLoadAllMsg(null), 4000)
  }

  const handleBuildFeatures = async () => {
    setBuildingFeatures(true)
    setFeatureMsg(null)
    try {
      const res = await fetch('/api/features/build-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 25 }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.message || body.error || 'Feature build failed')
      setFeatureMsg(`Features: OK ${body.ok || 0} / ERR ${body.errors || 0} / processed ${body.processed || 0}`)
    } catch (err) {
      setFeatureMsg(`Error: ${err.message}`)
    } finally {
      setBuildingFeatures(false)
    }
  }

  const activeCountry = COUNTRIES.find(c => c.prefix === activeTab)

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">MODEL INPUTS</h1>
            <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">
              Historicos raw {'->'} transformaciones {'->'} z-scores. No es Data: es la capa de features del modelo.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider">{syncMsg}</span>}
            {featureMsg && <span className={`text-xs font-bold uppercase tracking-wider ${featureMsg.startsWith('Error') ? 'text-[#ef4444]' : 'text-[#4ade80]'}`}>{featureMsg}</span>}
            {pipelineMsg && <span className={`text-xs font-bold uppercase tracking-wider ${pipelineMsg.startsWith('Error') ? 'text-[#ef4444]' : 'text-[#60a5fa]'}`}>{pipelineMsg}</span>}
            <label className="cursor-pointer px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#60a5fa] text-[#60a5fa] hover:text-white hover:border-white">
              <input ref={pipelineJsonRef} type="file" accept=".json" onChange={handlePipelineJSON} className="hidden" />
              PIPELINE JSON
            </label>
            <button
              onClick={() => exportModelInputsCsv({ history, activeTab, activeCountry, activeStats })}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#4ade80] text-[#4ade80] hover:text-white hover:border-white"
            >
              EXPORT CSV
            </button>
            <button
              onClick={handleBuildFeatures}
              disabled={buildingFeatures}
              className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
                buildingFeatures ? 'border-[#333] text-[#555] cursor-not-allowed' : 'border-[#60a5fa] text-[#60a5fa] hover:text-white hover:border-white'
              }`}
            >
              {buildingFeatures ? 'BUILDING...' : 'BUILD FEATURES'}
            </button>
            <button
              onClick={handleSyncManual}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#4ade80] text-[#4ade80] hover:text-white hover:border-white"
            >
              SYNC →
            </button>
            <Link
              to="/endogenous"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
            >
              ENDOGENOUS →
            </Link>
          </div>
        </div>

        {/* ===== INSTRUCCIONES ===== */}
        <div className="border border-[#333] bg-[#0a0a0a] px-4 py-3 mb-4 text-xs text-[#777] leading-relaxed">
          <span className="text-[#ecd987] font-bold uppercase tracking-wider">Capa correcta: </span>
          Aqui se calculan features internas: media, std y z-score. Las fuentes externas viven en <span className="text-white">Data</span> y su cobertura en <span className="text-white">Coverage Matrix</span>.
          <br />
          <span className="text-[#ecd987] font-bold uppercase tracking-wider">Como importar: </span>
          Haz clic en <span className="text-white font-bold">IMPORTAR</span> o sube un archivo CSV.
          Formatos: <span className="text-white">una columna de valores</span> · <span className="text-white">fecha,valor por fila (YYYY-MM,X)</span> · <span className="text-white">valores separados por comas</span>.
          Sin fechas, la app asigna meses automáticos terminando hoy.
          Formula: <span className="text-white">z = (último − media) / std</span>, recortado a [−4, +4].
        </div>

        {/* ===== TABS PAÍSES ===== */}
        <div className="border-2 border-[#333]">
          <div className="flex border-b-2 border-[#333] overflow-x-auto">
            {COUNTRIES.map(c => {
              const ok = tabCoverage[c.prefix] ?? 0
              return (
                <button
                  key={c.prefix}
                  onClick={() => setActiveTab(c.prefix)}
                  className={`px-3 py-2 text-sm font-bold uppercase tracking-wider border-r border-[#222] whitespace-nowrap flex-shrink-0 ${
                    activeTab === c.prefix
                      ? 'bg-[#111] text-[#ecd987] border-b-2 border-[#ecd987] -mb-[2px]'
                      : 'text-[#777] hover:text-white'
                  }`}
                >
                  {c.label}
                  <span className={`ml-1.5 text-[10px] ${ok === INDICATORS.length ? 'text-[#4ade80]' : ok > 0 ? 'text-[#f59e0b]' : 'text-[#444]'}`}>
                    {ok}/{INDICATORS.length}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Info bar del país activo */}
          <div className="px-3 py-2 bg-[#0a0a0a] border-b border-[#222] flex items-center gap-4">
            <span className="text-sm font-bold text-white uppercase tracking-wider">{activeCountry?.label}</span>
            <span className="text-xs text-[#555]">
              {tabCoverage[activeTab] ?? 0} / {INDICATORS.length} indicadores con histórico
            </span>
            {loadAllMsg && (
              <span className={`text-xs font-bold uppercase tracking-wider ${loadAllMsg.startsWith('Carg') && !loadAllMsg.includes('OK') ? 'text-[#f59e0b]' : 'text-[#4ade80]'}`}>
                {loadAllMsg}
              </span>
            )}
            <button
              onClick={handleLoadAllFromHistory}
              className="ml-auto text-[10px] font-bold uppercase tracking-wider border border-[#60a5fa] text-[#60a5fa] px-2 py-0.5 hover:text-white hover:border-white"
            >
              LOAD ALL FROM HISTORY
            </button>
            {confirmClear ? (
              <span className="flex items-center gap-2">
                <button onClick={handleClearAll}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#ef4444] border border-[#ef4444] px-1.5">
                  CONFIRMAR BORRADO
                </button>
                <button onClick={() => setConfirmClear(false)}
                  className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-white">
                  CANCELAR
                </button>
              </span>
            ) : (
              <button onClick={handleClearAll}
                className="text-[10px] font-bold uppercase tracking-wider text-[#444] hover:text-[#ef4444]">
                BORRAR TODO
              </button>
            )}
          </div>

          {/* Tabla de indicadores */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[760px]">
              <thead>
                <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[22%]">Indicador</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[5%]">N</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[9%]">Media</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[9%]">Std</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[9%]">Último</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[13%]">Z-score</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[33%]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {INDICATORS.map(ind => {
                  const stats = activeStats[ind.key]
                  const storageKey = `${activeTab}_${ind.key}`
                  const isOpen = activeImport === storageKey
                  const bar = stats ? zBar(stats.z) : null
                  const lastImported = history[storageKey]?.lastImported

                  return (
                    <Fragment key={ind.key}>
                      {/* Fila principal */}
                      <tr className={`border-b border-[#222] ${isOpen ? 'bg-[#111]' : 'hover:bg-[#0a0a0a]'}`}>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-[#e5e5e5]">{getIndLabel(ind.key, activeTab)}</span>
                            {(() => {
                              const sid = getSourceId(activeTab, ind.key)
                              const url = getEffectiveUrl(sid)
                              const isCustom = !!customUrls[sid]
                              const isEditing = urlEditKey === sid

                              if (isEditing) return (
                                <span className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
                                  <input
                                    autoFocus
                                    value={urlEditValue}
                                    onChange={e => setUrlEditValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleUrlSave(sid); if (e.key === 'Escape') { setUrlEditKey(null); setUrlEditValue('') } }}
                                    placeholder="https://..."
                                    className="w-48 bg-[#111] border-b border-[#ecd987] text-[10px] font-mono text-white px-1 py-0.5 outline-none"
                                  />
                                  <button onClick={() => handleUrlSave(sid)} className="text-[10px] font-bold text-[#4ade80] hover:text-white">✓</button>
                                  <button onClick={() => { setUrlEditKey(null); setUrlEditValue('') }} className="text-[10px] font-bold text-[#555] hover:text-white">✕</button>
                                </span>
                              )

                              return (
                                <span className="flex items-center gap-1 ml-1">
                                  {url && (
                                    <a href={url} target="_blank" rel="noopener noreferrer"
                                      className={`text-[10px] font-bold leading-none ${isCustom ? 'text-[#60a5fa] hover:text-white' : 'text-[#ecd987] hover:text-white'}`}
                                      title={url}
                                    >↗</a>
                                  )}
                                  <button
                                    onClick={() => handleUrlEdit(sid)}
                                    className="text-[10px] text-[#444] hover:text-[#ecd987] leading-none"
                                    title={url ? 'Editar URL' : 'Añadir URL'}
                                  >✎</button>
                                </span>
                              )
                            })()}
                          </div>
                          <div className="text-[10px] text-[#444] uppercase tracking-wider">{ind.category}</div>
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-[#777]">
                          {stats ? stats.n : '—'}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-[#777]">
                          {stats ? fmt2(stats.mean) : '—'}
                        </td>
                        <td className="px-2 py-2 font-mono text-xs text-[#777]">
                          {stats ? fmt2(stats.std) : '—'}
                        </td>
                        <td className="px-2 py-2">
                          {stats ? (
                            <>
                              <div className="font-mono text-xs text-[#e5e5e5]">{fmt2(stats.last)}</div>
                              {stats.lastDate && (
                                <div className="text-[10px] text-[#444] font-mono">{stats.lastDate}</div>
                              )}
                            </>
                          ) : '—'}
                        </td>
                        <td className="px-2 py-2">
                          {stats ? (
                            <div>
                              <span className={`font-mono font-bold text-sm ${zColor(stats.z)}`}>
                                {fmtZ(stats.z)}
                              </span>
                              {bar && (
                                <div className="mt-1 h-1 bg-[#222] w-full relative">
                                  <div
                                    className="absolute top-0 h-1"
                                    style={{
                                      width: `${bar.pct}%`,
                                      background: bar.color,
                                      [bar.align]: 0,
                                    }}
                                  />
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-[#444]">sin datos</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => isOpen ? setActiveImport(null) : handleOpenImport(activeTab, ind.key)}
                              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border ${
                                isOpen
                                  ? 'border-[#ecd987] text-[#ecd987]'
                                  : 'border-[#555] text-[#777] hover:border-[#ecd987] hover:text-[#ecd987]'
                              }`}
                            >
                              {isOpen ? 'CERRAR' : stats ? 'EDITAR' : 'IMPORTAR'}
                            </button>
                            <button
                              onClick={() => handleLoadFromHistory(activeTab, ind.key)}
                              disabled={loadingHistory.has(storageKey)}
                              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 border ${
                                loadingHistory.has(storageKey)
                                  ? 'border-[#333] text-[#444] cursor-not-allowed'
                                  : 'border-[#60a5fa] text-[#60a5fa] hover:text-white hover:border-white'
                              }`}
                              title={`Cargar desde History: ${getSourceId(activeTab, ind.key)}`}
                            >
                              {loadingHistory.has(storageKey) ? '...' : 'HIST'}
                            </button>
                            {stats && (
                              <button
                                onClick={() => handleClearIndicator(activeTab, ind.key)}
                                className="text-xs font-bold uppercase tracking-wider text-[#444] hover:text-[#ef4444]"
                              >
                                ✕
                              </button>
                            )}
                            {stats?.firstDate && stats?.lastDate && (
                              <span className="text-[10px] text-[#444] font-mono">
                                {stats.firstDate} → {stats.lastDate}
                              </span>
                            )}
                            {lastImported && !stats?.firstDate && (
                              <span className="text-[10px] text-[#444]">{lastImported}</span>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Fila de importación expandible */}
                      {isOpen && (
                        <tr className="border-b border-[#333]">
                          <td colSpan={7} className="px-3 py-3 bg-[#0d0d0d]">
                            <div className="flex items-start gap-3">
                              <div className="flex-1">
                                <div className="text-xs text-[#777] uppercase tracking-wider mb-1.5">
                                  Histórico de <span className="text-white">{ind.label}</span> — de más antiguo a más reciente
                                </div>
                                <div
                                  onDragEnter={handleDragEnter}
                                  onDragOver={handleDragOver}
                                  onDragLeave={handleDragLeave}
                                  onDrop={handleDropFile}
                                  className="relative"
                                >
                                  {isDragging && (
                                    <div className="absolute inset-0 z-10 border-2 border-dashed border-[#ecd987] bg-[#0d0d0d]/90 flex items-center justify-center pointer-events-none">
                                      <span className="text-sm font-bold text-[#ecd987] uppercase tracking-widest">Soltar CSV aquí</span>
                                    </div>
                                  )}
                                  <textarea
                                    autoFocus
                                    value={importText}
                                    onChange={e => { setImportText(e.target.value); setImportError('') }}
                                    placeholder={"Arrastra un CSV aquí, o pega valores:\n\n2016-01,1.2\n2016-02,1.5\n...\n\n— o solo valores —\n1.2\n1.5\n..."}
                                    rows={8}
                                    className="w-full bg-[#111] border border-[#333] focus:border-[#ecd987] text-sm font-mono text-white px-3 py-2 outline-none resize-y"
                                  />
                                </div>
                                {importError && (
                                  <div className="text-xs text-[#ef4444] mt-1">{importError}</div>
                                )}
                                {importText && (() => {
                                  const preview = parseSeriesCSV(importText)
                                  if (preview.length === 0) return null
                                  const s = computeStats(preview)
                                  const hasAnyDate = preview.some(p => p.date)
                                  return (
                                    <div className="mt-2">
                                      <div className="text-xs text-[#555] font-mono flex gap-4 flex-wrap">
                                        <span>N: <span className="text-white">{s.n}</span></span>
                                        <span>Media: <span className="text-white">{fmt2(s.mean)}</span></span>
                                        <span>Std: <span className="text-white">{fmt2(s.std)}</span></span>
                                        <span>Último: <span className="text-white">{fmt2(s.last)}</span></span>
                                        <span>Z: <span className={`font-bold ${zColor(s.z)}`}>{fmtZ(s.z)}</span></span>
                                        {hasAnyDate && (
                                          <span className="text-[#4ade80]">{s.firstDate} → {s.lastDate}</span>
                                        )}
                                      </div>
                                      {/* Vista previa de primeras/últimas filas con fecha */}
                                      {preview.length > 0 && (
                                        <div className="mt-2 border border-[#222] bg-[#0a0a0a] overflow-x-auto">
                                          <table className="w-full text-xs font-mono">
                                            <thead>
                                              <tr className="border-b border-[#222] text-[#555]">
                                                <th className="px-2 py-1 text-left font-bold uppercase tracking-wider">Fecha</th>
                                                <th className="px-2 py-1 text-right font-bold uppercase tracking-wider">Valor</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {[...preview.slice(0, 3), ...(preview.length > 6 ? [null] : []), ...preview.slice(-3)].map((p, i) => (
                                                p === null
                                                  ? <tr key="ellipsis"><td colSpan={2} className="px-2 py-0.5 text-center text-[#444]">⋯ {preview.length - 6} filas más ⋯</td></tr>
                                                  : <tr key={i} className="border-b border-[#161616]">
                                                      <td className="px-2 py-0.5 text-[#777]">{p.date ?? '—'}</td>
                                                      <td className="px-2 py-0.5 text-right text-white">{p.value}</td>
                                                    </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })()}
                              </div>
                              <div className="flex flex-col gap-2 pt-6">
                                <button
                                  onClick={handleConfirmImport}
                                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider border-2 border-[#4ade80] text-[#4ade80] hover:text-white hover:border-white whitespace-nowrap"
                                >
                                  CONFIRMAR
                                </button>
                                <button
                                  onClick={() => fileInputRef.current?.click()}
                                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider border border-[#555] text-[#777] hover:text-white hover:border-white whitespace-nowrap"
                                >
                                  SUBIR CSV
                                </button>
                                <button
                                  onClick={() => { setActiveImport(null); setImportText(''); setImportError('') }}
                                  className="px-4 py-2 text-sm font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white whitespace-nowrap"
                                >
                                  CANCELAR
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFileUpload}
        />

      </div>
    </div>
  )
}
