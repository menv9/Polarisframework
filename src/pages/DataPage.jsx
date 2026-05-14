import { useState, useMemo, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { dataSources, getNextUpdate, getStatus, countByStatus, getAccessSummary } from '../data/dataSources'

function exportCsv(sources) {
  const headers = [
    'id', 'modulo', 'pais', 'indicador', 'categoria',
    'valor', 'ultima_actualizacion', 'proxima_actualizacion', 'estado',
    'fuente', 'endpoint', 'frecuencia', 'fit', 'medida', 'notas',
  ]

  const escape = (v) => {
    if (v === null || v === undefined) return ''
    const s = String(v).replace(/"/g, '""')
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s
  }

  const rows = sources.map((s) => {
    const parts = s.module.split(/\s+(?:—|–)\s+/)
    const endpoint = s.apiPath || (s.fredSeriesId ? `/api/fred/${s.fredYoY ? 'yoy' : 'latest'}/${s.fredSeriesId}` : '')
    const next = getNextUpdate(s.lastUpdate, s.frequencyDays)
    const status = getStatus(s)
    return [
      s.id, parts[0] || '', parts[1] || '', s.indicator, s.category,
      s._value || '', s.lastUpdate || '', next, status.label,
      s.primarySource || '', endpoint, s.frequency || '', s.dataFit || '', s.dataMeasure || '', s.notes || '',
    ].map(escape).join(',')
  })

  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `polaris_data_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const STORAGE_KEY = 'polaris_data_sources'
const USER_EDITABLE_FIELDS = ['lastUpdate', '_lastScrape', '_scrapedValue', '_value', '_refreshError']

function splitModuleName(moduleName) {
  return moduleName.split(/\s+(?:—|â€”)\s+/)
}

function mergeSavedSource(defaultSrc, savedSrc) {
  if (!savedSrc) return defaultSrc
  const preserved = USER_EDITABLE_FIELDS.reduce((acc, field) => {
    if (Object.hasOwn(savedSrc, field)) acc[field] = savedSrc[field]
    return acc
  }, {})
  return { ...defaultSrc, ...preserved }
}

function loadSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      return dataSources.map((defaultSrc) => {
        const savedSrc = parsed.find((s) => s.id === defaultSrc.id)
        return mergeSavedSource(defaultSrc, savedSrc)
      })
    }
  } catch {
    // ignore parse errors
  }
  return dataSources
}

async function fetchFredData(seriesId, yoy = false) {
  const endpoint = yoy ? `/api/fred/yoy/${seriesId}` : `/api/fred/latest/${seriesId}`
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || res.statusText)
  }
  return res.json()
}

// Permanent failure — don't retry. Carries an HTTP status so we can distinguish
// "series doesn't exist" (4xx) from "upstream had a hiccup" (5xx / network).
class PermanentFetchError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'PermanentFetchError'
    this.status = status
  }
}

async function fetchSourceData(source) {
  const endpoint = source.apiPath || (source.fredSeriesId ? (source.fredYoY ? `/api/fred/yoy/${source.fredSeriesId}` : `/api/fred/latest/${source.fredSeriesId}`) : null)
  if (!endpoint) throw new Error('No automatic endpoint configured')

  // Retry transient failures (5xx, network errors) with backoff. 4xx is permanent
  // (bad series / not found) — fail fast.
  const delays = [400, 1200, 3000]
  let lastErr = null
  for (let attempt = 0; attempt <= delays.length; attempt += 1) {
    try {
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
      if (res.ok) return await res.json()
      const body = await res.json().catch(() => ({}))
      const message = body.message || res.statusText || `HTTP ${res.status}`
      if (res.status >= 400 && res.status < 500) {
        throw new PermanentFetchError(message, res.status)
      }
      lastErr = new Error(`${res.status} ${message}`)
    } catch (err) {
      if (err instanceof PermanentFetchError) throw err
      lastErr = err
    }
    if (attempt < delays.length) {
      await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
    }
  }
  throw lastErr || new Error('Fetch failed after retries')
}

export default function DataPage() {
  const [sources, setSources] = useState(loadSources)
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [lastGlobalRefresh, setLastGlobalRefresh] = useState(null)
  const [globalRefreshResult, setGlobalRefreshResult] = useState(null)

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources))
  }, [sources])

  const counts = useMemo(() => countByStatus(sources), [sources])
  const accessSummary = useMemo(() => getAccessSummary(sources), [sources])

  // ====== FILTROS JERARQUICOS: Modulo -> Pais/Submodulo -> Categoria ======
  const [searchParams] = useSearchParams()
  const highlightId = searchParams.get('highlight')
  const moduleParam = searchParams.get('module')
  const highlightRef = useRef(null)

  const topModules = ['todas', 'World View', 'Endogenous', 'Exogenous']
  const [activeTop, setActiveTop] = useState(() => {
    if (moduleParam && topModules.includes(moduleParam)) return moduleParam
    if (highlightId?.startsWith('wv_')) return 'World View'
    if (highlightId?.startsWith('endo_')) return 'Endogenous'
    if (highlightId?.startsWith('exo_')) return 'Exogenous'
    return 'todas'
  })

  // Sub-filter: pais (Endogenous) o sub-modulo (Exogenous). No aplica a World View.
  const subOptions = useMemo(() => {
    const pool =
      activeTop === 'todas'
        ? sources
        : sources.filter((s) => s.module.startsWith(activeTop))
    const subs = new Set()
    pool.forEach((s) => {
      const parts = splitModuleName(s.module)
      if (parts.length > 1) subs.add(parts[1])
    })
    return ['todas', ...Array.from(subs).sort()]
  }, [sources, activeTop])
  const [activeSub, setActiveSub] = useState('todas')

  // Category filter (tercer nivel)
  const categories = useMemo(() => {
    let pool = sources
    if (activeTop !== 'todas') pool = pool.filter((s) => s.module.startsWith(activeTop))
    if (activeSub !== 'todas') pool = pool.filter((s) => s.module.endsWith(activeSub))
    return ['todas', ...new Set(pool.map((s) => s.category))]
  }, [sources, activeTop, activeSub])
  const [activeCategory, setActiveCategory] = useState('todas')

  // Reset sub y category cuando cambia top
  useEffect(() => {
    setActiveSub('todas')
    setActiveCategory('todas')
  }, [activeTop])

  // Reset category cuando cambia sub
  useEffect(() => {
    setActiveCategory('todas')
  }, [activeSub])

  // Scroll + highlight cuando viene ?highlight=<id> desde otra página
  useEffect(() => {
    if (!highlightId || !highlightRef.current) return
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 150)
    return () => clearTimeout(timer)
  }, [highlightId, highlightRef.current])

  // Filtrado en 3 niveles
  const filtered = sources.filter((s) => {
    const matchTop = activeTop === 'todas' || s.module.startsWith(activeTop)
    const matchSub = activeSub === 'todas' || s.module.endsWith(activeSub)
    const matchCat = activeCategory === 'todas' || s.category === activeCategory
    return matchTop && matchSub && matchCat
  })

  // Extract top-level module groups (World View, Endogenous, Exogenous)
  const topGroups = useMemo(() => {
    const groups = filtered.reduce((acc, s) => {
      const top = splitModuleName(s.module)[0]
      if (!acc[top]) acc[top] = {}
      if (!acc[top][s.module]) acc[top][s.module] = []
      acc[top][s.module].push(s)
      return acc
    }, {})
    return groups
  }, [filtered])

  // Collapsible state for top-level groups
  const [collapsed, setCollapsed] = useState({})
  const toggleGroup = (group) => {
    setCollapsed((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const refreshSource = async (id) => {
    const source = sources.find((s) => s.id === id)
    if (!source) return

    setLoadingId(id)

    try {
      const today = new Date().toISOString().split('T')[0]

      if (source.apiPath || (source.accessKind === 'fred' && source.fredSeriesId)) {
        const result = await fetchSourceData(source)
        const valueOnly = result.value !== null ? String(result.value) : null
        const scrapedLabel = valueOnly
          ? `${source.indicator}: ${valueOnly}${source.fredYoY ? '%' : ''} (${result.date || 'latest'})`
          : null

        setSources((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  lastUpdate: today,
                  _lastScrape: result,
                  _scrapedValue: scrapedLabel,
                  _value: valueOnly || s._value,
                  _refreshError: null,
                }
              : s
          )
        )
      } else {
        // API/manual: solo marca como actualizado (hoy)
        setSources((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, lastUpdate: today } : s
          )
        )
      }
    } catch (err) {
      console.error('Refresh failed:', err)
      setSources((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, _refreshError: err.message || 'Refresh failed' } : s
        )
      )
    } finally {
      setLoadingId(null)
    }
  }

  const refreshAllSources = async () => {
    setLoadingAll(true)
    setGlobalRefreshResult(null)
    const today = new Date().toISOString().split('T')[0]

    const refreshableSources = sources.filter((s) => canRefresh(s))
    let okCount = 0
    let errorCount = 0
    const skippedCount = sources.length - refreshableSources.length

    if (refreshableSources.length === 0) {
      setGlobalRefreshResult({ ok: 0, errors: 0, skipped: skippedCount })
      setLoadingAll(false)
      return
    }

    for (const source of refreshableSources) {
      try {
        setLoadingId(source.id)
        const result = await fetchSourceData(source)
        const valueOnly = result.value !== null ? String(result.value) : null
        const scrapedLabel = valueOnly
          ? `${source.indicator}: ${valueOnly}${source.fredYoY ? '%' : ''} (${result.date || 'latest'})`
          : null
        okCount += 1
        setSources((prev) =>
          prev.map((s) =>
            s.id === source.id
              ? {
                  ...s,
                  lastUpdate: today,
                  _lastScrape: result,
                  _scrapedValue: scrapedLabel,
                  _value: valueOnly || s._value,
                  _refreshError: null,
                }
              : s
          )
        )
      } catch (err) {
        errorCount += 1
        console.warn(`Failed to refresh ${source.id}:`, err.message)
        setSources((prev) =>
          prev.map((s) =>
            s.id === source.id ? { ...s, _refreshError: err.message || 'Refresh failed' } : s
          )
        )
      }
      await new Promise((resolve) => setTimeout(resolve, 150))
    }

    setLastGlobalRefresh(
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    )
    setGlobalRefreshResult({ ok: okCount, errors: errorCount, skipped: skippedCount })
    setLoadingId(null)
    setLoadingAll(false)
  }

  const sourceBadge = (source) => {
    const map = {
      fred: { label: 'FRED', color: 'text-[#60a5fa] border-[#60a5fa]' },
      manual: { label: 'MANUAL', color: 'text-[#888] border-[#888]' },
      'needs-mapping': { label: 'MAPEAR', color: 'text-[#f59e0b] border-[#f59e0b]' },
      'bulk-file': { label: 'CSV/XLS', color: 'text-[#4ade80] border-[#4ade80]' },
      'rest-api': { label: 'REST', color: 'text-[#4ade80] border-[#4ade80]' },
      'official-api': { label: 'OFICIAL', color: 'text-[#4ade80] border-[#4ade80]' },
      'public-api': { label: 'API', color: 'text-[#4ade80] border-[#4ade80]' },
    }
    const cfg = map[source.accessKind] || map['public-api']
    return (
      <span
        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}
        title={`${source.primarySource} · ${source.accessMode}`}
      >
        {cfg.label}
      </span>
    )
  }

  const qualityBadge = (source) => {
    const map = {
      exact: { label: 'OK', color: 'text-[#4ade80] border-[#4ade80]' },
      derived: { label: 'DERIV', color: 'text-[#60a5fa] border-[#60a5fa]' },
      proxy: { label: 'PROXY', color: 'text-[#f59e0b] border-[#f59e0b]' },
      manual: { label: 'MANUAL', color: 'text-[#888] border-[#888]' },
      pending: { label: 'REVISAR', color: 'text-[#ef4444] border-[#ef4444]' },
    }
    const cfg = map[source.dataFit] || map.pending
    return (
      <span
        className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}
        title={source.dataCheck}
      >
        {cfg.label}
      </span>
    )
  }

  const canRefresh = (source) => Boolean(source.apiPath || source.fredSeriesId)

  const endpointLabel = (source) => {
    if (source.apiPath) return 'ENDPOINT'
    if (source.fredSeriesId) return 'FRED'
    return source.accessKind === 'manual' ? 'MANUAL' : 'PENDIENTE'
  }

  const endpointDetail = (source) => {
    if (source.apiPath) return source.apiPath
    if (source.fredSeriesId) return `/api/fred/${source.fredYoY ? 'yoy' : 'latest'}/${source.fredSeriesId}`
    return source.accessKind === 'manual' ? 'Input manual' : 'Sin endpoint conectado'
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <h1 className="text-2xl font-bold uppercase tracking-widest">CENTRO DE CONTROL — DATOS</h1>
          <div className="flex items-center gap-3">
            {lastGlobalRefresh && (
              <span className="text-xs text-[#777] uppercase tracking-wider">
                REFRESH: {lastGlobalRefresh}
              </span>
            )}
            {globalRefreshResult && (
              <span className={`text-xs uppercase tracking-wider ${
                globalRefreshResult.errors ? 'text-[#ef4444]' : 'text-[#4ade80]'
              }`}>
                OK {globalRefreshResult.ok} / ERR {globalRefreshResult.errors} / SKIP {globalRefreshResult.skipped}
              </span>
            )}
            <button
              onClick={() => exportCsv(sources)}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#4ade80] text-[#4ade80] hover:text-white hover:border-white"
            >
              EXPORT CSV
            </button>
            <Link
              to="/data/coverage-matrix"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#60a5fa] text-[#60a5fa] hover:text-white hover:border-white"
            >
              COVERAGE MATRIX
            </Link>
            <Link
              to="/model-inputs"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#333] text-[#aaa] hover:text-white hover:border-white"
            >
              MODEL INPUTS
            </Link>
            <button
              onClick={refreshAllSources}
              disabled={loadingAll}
              className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
                loadingAll
                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
              }`}
            >
              {loadingAll ? `ACTUALIZANDO${loadingId ? `: ${loadingId}` : '...'}` : 'REFRESH TODO'}
            </button>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-0 border-2 border-[#333] mb-4">
          <div className="p-3 border-r border-[#222]">
            <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">Actualizados</div>
            <div className="text-xl font-mono font-bold text-[#4ade80]">{counts.ok}</div>
          </div>
          <div className="p-3 border-r border-[#222]">
            <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">Proximos</div>
            <div className="text-xl font-mono font-bold text-[#f59e0b]">{counts.warning}</div>
          </div>
          <div className="p-3">
            <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">Desactualizados</div>
            <div className="text-xl font-mono font-bold text-[#ef4444]">{counts.stale}</div>
          </div>
          <div className="p-3 border-l border-[#222]">
            <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">Auto gratis</div>
            <div className="text-xl font-mono font-bold text-[#4ade80]">{accessSummary.automatic}</div>
          </div>
          <div className="p-3 border-l border-[#222]">
            <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">Manual</div>
            <div className="text-xl font-mono font-bold text-[#888]">{accessSummary.manual}</div>
          </div>
          <div className="p-3 border-l border-[#222]">
            <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">Por mapear</div>
            <div className="text-xl font-mono font-bold text-[#f59e0b]">{accessSummary.needsMapping}</div>
          </div>
        </div>

        {/* ===== FILTROS — MODULO (top-level) ===== */}
        <div className="mb-2">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5">Modulo</div>
          <div className="flex items-center gap-2 flex-wrap">
            {topModules.map((mod) => (
              <button
                key={mod}
                onClick={() => setActiveTop(mod)}
                className={`px-3 py-1 text-sm font-bold uppercase tracking-wider border-2 ${
                  activeTop === mod
                    ? 'border-[#ecd987] text-[#ecd987]'
                    : 'border-[#333] text-[#777] hover:text-white hover:border-[#555]'
                }`}
              >
                {mod === 'todas' ? 'TODOS' : mod}
              </button>
            ))}
          </div>
        </div>

        {/* ===== FILTROS — PAIS / SUBMODULO (solo Endogenous & Exogenous) ===== */}
        {(activeTop === 'Endogenous' || activeTop === 'Exogenous') && (
          <div className="mb-2">
            <div className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5">
              {activeTop === 'Endogenous' ? 'Pais' : 'Sub-modulo'}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {subOptions.map((sub) => (
                <button
                  key={sub}
                  onClick={() => setActiveSub(sub)}
                  className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border-2 ${
                    activeSub === sub
                      ? 'border-[#ecd987] text-[#ecd987]'
                      : 'border-[#333] text-[#777] hover:text-white hover:border-[#555]'
                  }`}
                >
                  {sub === 'todas' ? 'TODOS' : sub}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ===== FILTROS — CATEGORIA ===== */}
        <div className="mb-3">
          <div className="text-[10px] text-[#555] uppercase tracking-widest mb-1.5">Categoria</div>
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider border-2 ${
                  activeCategory === cat
                    ? 'border-[#ecd987] text-[#ecd987]'
                    : 'border-[#333] text-[#777] hover:text-white hover:border-[#555]'
                }`}
              >
                {cat === 'todas' ? 'TODAS' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* ===== TABLA ===== */}
        <div className="border-2 border-[#333] overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[17%]">Indicador</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[8%]">Categoria</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[11%]">Fuente</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Fit</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[7%]">Frec</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[7%]">Ultima</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[7%]">Proxima</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[6%]">Estado</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[8%]">Dato</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[18%]">Endpoint / Accion</th>
              </tr>
            </thead>
            {Object.entries(topGroups).map(([topGroup, subModules]) => {
              const isCollapsed = collapsed[topGroup]
              const groupCount = Object.values(subModules).flat().length
              return (
                <tbody key={topGroup}>
                  {/* TOP-LEVEL ACCORDION HEADER */}
                  <tr
                    className="bg-[#000] border-b-2 border-[#333] cursor-pointer select-none hover:bg-[#0a0a0a]"
                    onClick={() => toggleGroup(topGroup)}
                  >
                    <td colSpan={10} className="px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold uppercase tracking-widest text-white">
                            {isCollapsed ? '[+]' : '[-]'}
                          </span>
                          <span className="text-sm font-bold uppercase tracking-widest text-[#ecd987]">
                            {topGroup}
                          </span>
                          <span className="text-xs text-[#555]">({groupCount})</span>
                        </div>
                        <span className="text-[10px] text-[#555] uppercase tracking-wider">
                          {isCollapsed ? 'Click para expandir' : 'Click para colapsar'}
                        </span>
                      </div>
                    </td>
                  </tr>
                  {/* SUB-MODULES (only when not collapsed) */}
                  {!isCollapsed &&
                    Object.entries(subModules).map(([moduleName, items]) => (
                      <>
                        {/* Submodule header */}
                        <tr className="bg-[#0a0a0a] border-b border-[#333]">
                          <td
                            colSpan={10}
                            className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#a3a3a3]"
                          >
                            {splitModuleName(moduleName)[1] || moduleName}
                            <span className="ml-2 text-[#555]">({items.length})</span>
                          </td>
                        </tr>
                        {items.map((source) => {
                          const status = getStatus(source)
                          const nextUpdate = getNextUpdate(source.lastUpdate, source.frequencyDays)
                          const isStale = status.code === 'stale'
                          const isLoading = loadingId === source.id

                          const isHighlighted = source.id === highlightId
                          return (
                            <tr
                              key={source.id}
                              ref={isHighlighted ? highlightRef : null}
                              className={`border-b border-[#222] ${isHighlighted ? 'bg-[#1a1a00] outline outline-1 outline-[#ecd987]' : isStale ? 'bg-[#1a0a0a]' : ''}`}
                            >
                              <td className="px-2 py-1.5">
                                <span className="text-sm font-bold text-white uppercase tracking-wider">{source.indicator}</span>
                                <div className="text-[10px] text-[#555] mt-0.5">{source.notes}</div>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">{source.category}</span>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="space-y-1">
                                  {sourceBadge(source)}
                                  <div className="text-[10px] text-[#777] uppercase tracking-wider">{source.primarySource}</div>
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="space-y-1">
                                  {qualityBadge(source)}
                                  <div className="text-[10px] text-[#a3a3a3] leading-tight">{source.dataMeasure}</div>
                                  <div className="text-[10px] text-[#555] leading-tight">{source.dataCheck}</div>
                                </div>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className="text-xs text-[#888] uppercase">{source.frequency}</span>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className="text-xs font-mono text-[#888]">{source.lastUpdate}</span>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`text-xs font-mono ${isStale ? 'text-[#ef4444]' : 'text-[#888]'}`}>
                                  {nextUpdate}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className={`text-xs font-bold uppercase tracking-wider ${status.color}`}>
                                  {status.label}
                                </span>
                              </td>
                              <td className="px-2 py-1.5">
                                <input
                                  type="text"
                                  value={source._value || ''}
                                  onChange={(e) => {
                                    setSources((prev) =>
                                      prev.map((s) =>
                                        s.id === source.id ? { ...s, _value: e.target.value } : s
                                      )
                                    )
                                  }}
                                  placeholder="--"
                                  className="w-full bg-[#111] border-b-2 border-[#4ade80] text-xs font-mono font-bold text-white px-1.5 py-1 outline-none focus:border-white focus:bg-[#0a1a0a]"
                                  title="Dato actual. Edita manualmente o usa [REF] para scrapear"
                                />
                              </td>
                              <td className="px-2 py-1.5">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                    canRefresh(source)
                                      ? 'border-[#4ade80] text-[#4ade80]'
                                      : source.accessKind === 'manual'
                                        ? 'border-[#888] text-[#888]'
                                        : 'border-[#f59e0b] text-[#f59e0b]'
                                  }`}>
                                    {endpointLabel(source)}
                                  </span>
                                  <span className="text-[10px] text-[#777] uppercase tracking-wider">
                                    {source.accessCost}
                                  </span>
                                </div>
                                <div
                                  className={`text-[10px] font-mono mb-1 break-all ${
                                    canRefresh(source) ? 'text-[#a3a3a3]' : 'text-[#555]'
                                  }`}
                                  title={endpointDetail(source)}
                                >
                                  {endpointDetail(source)}
                                </div>
                                <div className="text-[10px] text-[#555] mb-1">{source.coverage}</div>
                                {/* Scrape preview */}
                                {source._scrapedValue && (
                                  <div className="text-[10px] text-[#4ade80] font-mono mb-1">
                                    {source._scrapedValue}
                                  </div>
                                )}
                                {source._refreshError && (
                                  <div className="text-[10px] text-[#ef4444] font-mono mb-1 break-all">
                                    ERR: {source._refreshError}
                                  </div>
                                )}
                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => refreshSource(source.id)}
                                    disabled={isLoading || !canRefresh(source)}
                                    className={`text-xs font-bold uppercase tracking-wider border-b-2 px-2 py-0.5 ${
                                      isLoading || !canRefresh(source)
                                        ? 'border-[#333] text-[#555] cursor-not-allowed'
                                        : isStale
                                          ? 'border-[#ef4444] text-[#ef4444] hover:text-white hover:border-white'
                                          : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                                    }`}
                                  >
                                    {isLoading ? '...' : 'REFRESH'}
                                  </button>
                                  {source.scrapeUrl && (
                                    <a
                                      href={source.scrapeUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-[10px] text-[#777] hover:text-[#ecd987] border-b border-[#333] hover:border-[#ecd987]"
                                    >
                                      [EXT]
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </>
                    ))}
                </tbody>
              )
            })}
          </table>
        </div>

        {/* ===== FOOTER ===== */}
        <div className="mt-3 flex items-center justify-between text-xs text-[#555] uppercase tracking-wider">
          <span>{filtered.length} INDICADORES EN VISTA / {sources.length} TOTALES</span>
          <Link to="/world-view/operativa" className="text-[#ecd987] hover:underline">
            IR A OPERATIVA {'->'}
          </Link>
        </div>
      </div>
    </div>
  )
}
