import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { dataSources, getNextUpdate, getStatus, countByStatus } from '../data/dataSources'

const STORAGE_KEY = 'polaris_data_sources'

function loadSources() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      const parsed = JSON.parse(saved)
      // Merge with defaults to ensure any new fields from code updates are present
      return dataSources.map((defaultSrc) => {
        const savedSrc = parsed.find((s) => s.id === defaultSrc.id)
        return savedSrc ? { ...defaultSrc, ...savedSrc } : defaultSrc
      })
    }
  } catch {
    // ignore parse errors
  }
  return dataSources
}

async function scrapeTradingEconomics(url, indicatorName) {
  const res = await fetch('/api/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, indicatorName }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || res.statusText)
  }
  return res.json()
}

function isTradingEconomicsUrl(url) {
  return url && url.includes('tradingeconomics.com')
}

export default function DataPage() {
  const [sources, setSources] = useState(loadSources)
  const [loadingAll, setLoadingAll] = useState(false)
  const [loadingId, setLoadingId] = useState(null)
  const [lastGlobalRefresh, setLastGlobalRefresh] = useState(null)
  const [scrapeLog, setScrapeLog] = useState(null)

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sources))
  }, [sources])

  const counts = useMemo(() => countByStatus(sources), [sources])

  // ====== FILTROS JERARQUICOS: Modulo -> Pais/Submodulo -> Categoria ======
  const topModules = ['todas', 'World View', 'Endogenous', 'Exogenous']
  const [activeTop, setActiveTop] = useState('todas')

  // Sub-filter: pais (Endogenous) o sub-modulo (Exogenous). No aplica a World View.
  const subOptions = useMemo(() => {
    const pool =
      activeTop === 'todas'
        ? sources
        : sources.filter((s) => s.module.startsWith(activeTop))
    const subs = new Set()
    pool.forEach((s) => {
      const parts = s.module.split(' — ')
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
      const top = s.module.split(' — ')[0]
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

  const updateField = (id, field, value) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const refreshSource = async (id) => {
    const source = sources.find((s) => s.id === id)
    if (!source) return

    setLoadingId(id)
    setScrapeLog(null)

    try {
      const url = source.scrapeUrl
      const isTE = isTradingEconomicsUrl(url)

      if (isTE && url) {
        // Detecto TE: fuerza scraper a TE y scrapea con indicatorName
        const result = await scrapeTradingEconomics(url, source.indicator)
        const today = new Date().toISOString().split('T')[0]

        const scrapedValue = result.matchedIndicator
          ? `${result.matchedIndicator.name}: ${result.matchedIndicator.last}${result.matchedIndicator.unit ? ' ' + result.matchedIndicator.unit : ''}`
          : null

        setSources((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  scraper: 'trading-economics',
                  lastUpdate: today,
                  _lastScrape: result,
                  _scrapedValue: scrapedValue,
                }
              : s
          )
        )
        setScrapeLog({ id, result, scrapedValue })
      } else if (source.scraper === 'trading-economics' && url) {
        // Scraper ya era TE pero URL no parece TE (caso raro)
        const result = await scrapeTradingEconomics(url, source.indicator)
        const today = new Date().toISOString().split('T')[0]
        setSources((prev) =>
          prev.map((s) =>
            s.id === id
              ? { ...s, lastUpdate: today, _lastScrape: result }
              : s
          )
        )
        setScrapeLog({ id, result })
      } else {
        // API/manual: solo marca como actualizado (hoy)
        const today = new Date().toISOString().split('T')[0]
        setSources((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, lastUpdate: today } : s
          )
        )
      }
    } catch (err) {
      console.error('Refresh failed:', err)
      setScrapeLog({ id, error: err.message })
    } finally {
      setLoadingId(null)
    }
  }

  const refreshAllStale = async () => {
    setLoadingAll(true)
    setScrapeLog(null)
    const today = new Date().toISOString().split('T')[0]

    const staleSources = sources.filter((s) => getStatus(s).code !== 'ok')

    for (const source of staleSources) {
      try {
        if (source.scraper === 'trading-economics' && source.scrapeUrl) {
          await scrapeTradingEconomics(source.scrapeUrl, source.indicator)
        }
      } catch (err) {
        console.warn(`Failed to refresh ${source.id}:`, err.message)
      }
    }

    setSources((prev) =>
      prev.map((s) => {
        const st = getStatus(s)
        return st.code !== 'ok' ? { ...s, lastUpdate: today } : s
      })
    )

    setLastGlobalRefresh(
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
    )
    setLoadingAll(false)
  }

  const scraperBadge = (scraper) => {
    const map = {
      'trading-economics': { label: 'TE', color: 'text-[#ecd987] border-[#ecd987]' },
      api: { label: 'API', color: 'text-[#4ade80] border-[#4ade80]' },
      manual: { label: 'MANUAL', color: 'text-[#888] border-[#888]' },
    }
    const cfg = map[scraper] || map.manual
    return (
      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
        {cfg.label}
      </span>
    )
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
            <button
              onClick={refreshAllStale}
              disabled={loadingAll}
              className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
                loadingAll
                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
              }`}
            >
              {loadingAll ? 'ACTUALIZANDO...' : 'REFRESH DESACTUALIZADOS'}
            </button>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <div className="grid grid-cols-3 gap-0 border-2 border-[#333] mb-4">
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
        </div>

        {/* ===== SCRAPE LOG ===== */}
        {scrapeLog && (
          <div className={`border-2 mb-4 p-3 ${scrapeLog.error ? 'border-[#ef4444] bg-[#1a0a0a]' : 'border-[#4ade80] bg-[#0a1a0a]'}`}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1">
              {scrapeLog.error ? (
                <span className="text-[#ef4444]">[!] ERROR: {scrapeLog.error}</span>
              ) : (
                <span className="text-[#4ade80]">[OK] SCRAPE EXITOSO</span>
              )}
            </div>
            {scrapeLog.result && (
              <div className="text-xs text-[#888] font-mono space-y-0.5">
                <div>URL: {scrapeLog.result.url}</div>
                {scrapeLog.scrapedValue ? (
                  <div className="text-[#4ade80] font-bold">VALOR: {scrapeLog.scrapedValue}</div>
                ) : (
                  <>
                    <div>Indicadores: {scrapeLog.result.totalIndicators || scrapeLog.result.indicators?.length || 0}</div>
                    {scrapeLog.result.indicators?.slice(0, 3).map((ind, i) => (
                      <div key={i}>• {ind.name}: {ind.last} {ind.unit}</div>
                    ))}
                    {(scrapeLog.result.totalIndicators || scrapeLog.result.indicators?.length || 0) > 3 && (
                      <div className="text-[#555]">... y mas</div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

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
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[20%]">Indicador</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Categoria</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[8%]">Scraper</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Frec</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Ultima</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Proxima</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[8%]">Estado</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[24%]">Fuente / Accion</th>
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
                    <td colSpan={8} className="px-3 py-2.5">
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
                            colSpan={8}
                            className="px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-[#a3a3a3]"
                          >
                            {moduleName.replace(topGroup + ' — ', '')}
                            <span className="ml-2 text-[#555]">({items.length})</span>
                          </td>
                        </tr>
                        {items.map((source) => {
                          const status = getStatus(source)
                          const nextUpdate = getNextUpdate(source.lastUpdate, source.frequencyDays)
                          const isStale = status.code === 'stale'
                          const isLoading = loadingId === source.id

                          return (
                            <tr
                              key={source.id}
                              className={`border-b border-[#222] ${isStale ? 'bg-[#1a0a0a]' : ''}`}
                            >
                              <td className="px-2 py-1.5">
                                <span className="text-sm font-bold text-white uppercase tracking-wider">{source.indicator}</span>
                                <div className="text-[10px] text-[#555] mt-0.5">{source.notes}</div>
                              </td>
                              <td className="px-2 py-1.5">
                                <span className="text-xs font-bold text-[#a3a3a3] uppercase tracking-wider">{source.category}</span>
                              </td>
                              <td className="px-2 py-1.5">
                                {scraperBadge(source.scraper)}
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
                                {/* Editable URL */}
                                <div className="mb-1.5">
                                  <input
                                    type="text"
                                    value={source.scrapeUrl || ''}
                                    onChange={(e) => {
                                      const val = e.target.value
                                      const isTE = isTradingEconomicsUrl(val)
                                      setSources((prev) =>
                                        prev.map((s) =>
                                          s.id === source.id
                                            ? { ...s, scrapeUrl: val, scraper: isTE ? 'trading-economics' : s.scraper }
                                            : s
                                        )
                                      )
                                    }}
                                    placeholder="https://tradingeconomics.com/..."
                                    className="w-full bg-[#111] border-b-2 border-[#ecd987] text-xs text-white font-mono px-1.5 py-1 outline-none focus:border-white focus:bg-[#1a1a0d]"
                                  />
                                </div>
                                {/* Scrape preview */}
                                {source._scrapedValue && (
                                  <div className="text-[10px] text-[#4ade80] font-mono mb-1">
                                    {source._scrapedValue}
                                  </div>
                                )}
                                {/* Action buttons */}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => refreshSource(source.id)}
                                    disabled={isLoading}
                                    className={`text-xs font-bold uppercase tracking-wider border-b-2 px-2 py-0.5 ${
                                      isLoading
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
