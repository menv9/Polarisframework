import { useState, useEffect, useMemo, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { INDICATORS as BASE_INDICATORS } from '../lib/endogenousBetas'

const STORAGE_KEY_HISTORY = 'polaris_endogenous_history'
const STORAGE_KEY_ZSCORES = 'polaris_endogenous_zscores'

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

// ── Parsing ──────────────────────────────────────────────────────────────────
// Acepta:
//   • Un valor por línea:          1.4\n2.1\n...
//   • date,value por línea:        2016-01,1.4\n...
//   • Coma/punto-y-coma separados: 1.4,2.1,3.0,...
function parseCSV(text) {
  const cleaned = text.trim()
  if (!cleaned) return []
  const nums = []
  // Dividir por líneas primero; si solo hay una línea, dividir por coma/;
  const lines = cleaned.includes('\n') ? cleaned.split('\n') : cleaned.split(/[,;]/)
  for (const line of lines) {
    const parts = line.trim().split(/[,;\t]/)
    // Coger el último token numérico de cada línea (para soportar date,value)
    for (let i = parts.length - 1; i >= 0; i--) {
      const n = parseFloat(parts[i].trim().replace(',', '.'))
      if (!isNaN(n)) { nums.push(n); break }
    }
  }
  return nums
}

// ── Estadísticas ─────────────────────────────────────────────────────────────
function computeStats(values) {
  if (!values || values.length === 0) return null
  const n = values.length
  const mean = values.reduce((s, v) => s + v, 0) / n
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n
  const std = Math.sqrt(variance)
  const last = values[values.length - 1]
  const z = std > 0 ? Math.max(-4, Math.min(4, (last - mean) / std)) : 0
  return { n, mean, std, last, z }
}

// ── URLs desde dataSources ────────────────────────────────────────────────────
function getSourceId(prefix, key) {
  const suffix = key === 'nfp' && prefix !== 'usa' ? 'empl' : key
  return `endo_${prefix}_${suffix}`
}

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

// ── localStorage ─────────────────────────────────────────────────────────────
function loadHistory() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_HISTORY)
    if (saved) return JSON.parse(saved)
  } catch { /* ignore */ }
  return {}
}

function syncZScores(history) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_ZSCORES)
    const current = saved ? JSON.parse(saved) : {}
    const updated = { ...current }
    for (const [key, entry] of Object.entries(history)) {
      if (!entry?.values) continue
      const stats = computeStats(entry.values)
      if (stats) updated[key] = stats.z
    }
    localStorage.setItem(STORAGE_KEY_ZSCORES, JSON.stringify(updated))
  } catch { /* ignore */ }
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

// ── Componente ────────────────────────────────────────────────────────────────
export default function EndogenousZScoresPage() {
  const [history, setHistory]       = useState(loadHistory)
  const [sourceUrls]                = useState(loadSourceUrls)
  const [activeTab, setActiveTab]   = useState('usa')
  const [activeImport, setActiveImport] = useState(null) // 'prefix_key' | null
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [syncMsg, setSyncMsg]       = useState(null)

  // Persistir histórico y auto-sincronizar z-scores a operativa
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history))
    syncZScores(history)
  }, [history])

  // Estadísticas pre-computadas para todos los indicadores del país activo
  const activeStats = useMemo(() => {
    const result = {}
    for (const ind of INDICATORS) {
      const key = `${activeTab}_${ind.key}`
      const entry = history[key]
      result[ind.key] = entry?.values ? computeStats(entry.values) : null
    }
    return result
  }, [history, activeTab])

  // Resumen de cobertura para los tabs
  const tabCoverage = useMemo(() => {
    const cov = {}
    for (const c of COUNTRIES) {
      let ok = 0
      for (const ind of INDICATORS) {
        const entry = history[`${c.prefix}_${ind.key}`]
        if (entry?.values?.length > 0) ok++
      }
      cov[c.prefix] = ok
    }
    return cov
  }, [history])

  const handleOpenImport = (prefix, key) => {
    const storageKey = `${prefix}_${key}`
    const existing = history[storageKey]?.values
    setImportText(existing ? existing.join('\n') : '')
    setImportError('')
    setActiveImport(storageKey)
  }

  const handleConfirmImport = () => {
    const values = parseCSV(importText)
    if (values.length === 0) {
      setImportError('No se encontraron valores numéricos. Pega una columna de números.')
      return
    }
    setHistory(prev => ({
      ...prev,
      [activeImport]: {
        values,
        lastImported: new Date().toISOString().split('T')[0],
      }
    }))
    setActiveImport(null)
    setImportText('')
    setImportError('')
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
    syncZScores(history)
    setSyncMsg('Z-scores sincronizados ✓')
    setTimeout(() => setSyncMsg(null), 2500)
  }

  const handleClearAll = () => {
    if (!window.confirm('¿Borrar TODO el histórico de z-scores?')) return
    setHistory({})
  }

  const activeCountry = COUNTRIES.find(c => c.prefix === activeTab)

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Z-SCORES — ENDOGENOUS</h1>
            <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">
              Importa el histórico de cada indicador · La app calcula media, std y z-score · Se sincronizan automáticamente a Operativa
            </p>
          </div>
          <div className="flex items-center gap-3">
            {syncMsg && <span className="text-xs font-bold text-[#4ade80] uppercase tracking-wider">{syncMsg}</span>}
            <button
              onClick={handleSyncManual}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#4ade80] text-[#4ade80] hover:text-white hover:border-white"
            >
              SINCRONIZAR →
            </button>
            <Link
              to="/endogenous"
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
            >
              OPERATIVA →
            </Link>
          </div>
        </div>

        {/* ===== INSTRUCCIONES ===== */}
        <div className="border border-[#333] bg-[#0a0a0a] px-4 py-3 mb-4 text-xs text-[#777] leading-relaxed">
          <span className="text-[#ecd987] font-bold uppercase tracking-wider">Cómo importar: </span>
          Haz clic en <span className="text-white font-bold">IMPORTAR</span> en cualquier indicador y pega el histórico (mínimo 24 meses, ideal 10 años).
          Formatos aceptados: <span className="text-white">una columna de números</span> · <span className="text-white">fecha,valor por fila</span> · <span className="text-white">valores separados por comas</span>.
          La app calcula media y std sobre todos los valores importados y deriva <span className="text-white">z = (último − media) / std</span>, recortado a [−4, +4].
          Los z-scores se sincronizan automáticamente a la página Operativa.
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
            <button
              onClick={handleClearAll}
              className="ml-auto text-[10px] font-bold uppercase tracking-wider text-[#444] hover:text-[#ef4444]"
            >
              BORRAR TODO
            </button>
          </div>

          {/* Tabla de indicadores */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-fixed min-w-[700px]">
              <thead>
                <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[24%]">Indicador</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[6%]">N</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Media</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Std</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Último</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[14%]">Z-score</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[26%]">Acciones</th>
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
                            <span className="text-sm font-bold text-[#e5e5e5]">{ind.label}</span>
                            {(() => {
                              const url = sourceUrls[getSourceId(activeTab, ind.key)]
                              return url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[10px] font-bold text-[#ecd987] hover:text-white leading-none"
                                  title={url}
                                >
                                  ↗
                                </a>
                              ) : null
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
                        <td className="px-2 py-2 font-mono text-xs text-[#e5e5e5]">
                          {stats ? fmt2(stats.last) : '—'}
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
                          <div className="flex items-center gap-2">
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
                            {stats && (
                              <button
                                onClick={() => handleClearIndicator(activeTab, ind.key)}
                                className="text-xs font-bold uppercase tracking-wider text-[#444] hover:text-[#ef4444]"
                              >
                                ✕
                              </button>
                            )}
                            {lastImported && (
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
                                  Pega el histórico de <span className="text-white">{ind.label}</span> · Una columna de valores, de más antiguo a más reciente
                                </div>
                                <textarea
                                  autoFocus
                                  value={importText}
                                  onChange={e => { setImportText(e.target.value); setImportError('') }}
                                  placeholder={"1.2\n1.5\n2.0\n2.3\n..."}
                                  rows={8}
                                  className="w-full bg-[#111] border border-[#333] focus:border-[#ecd987] text-sm font-mono text-white px-3 py-2 outline-none resize-y"
                                />
                                {importError && (
                                  <div className="text-xs text-[#ef4444] mt-1">{importError}</div>
                                )}
                                {importText && (() => {
                                  const preview = parseCSV(importText)
                                  if (preview.length === 0) return null
                                  const s = computeStats(preview)
                                  return (
                                    <div className="mt-2 text-xs text-[#555] font-mono flex gap-4">
                                      <span>N: <span className="text-white">{s.n}</span></span>
                                      <span>Media: <span className="text-white">{fmt2(s.mean)}</span></span>
                                      <span>Std: <span className="text-white">{fmt2(s.std)}</span></span>
                                      <span>Último: <span className="text-white">{fmt2(s.last)}</span></span>
                                      <span>Z: <span className={`font-bold ${zColor(s.z)}`}>{fmtZ(s.z)}</span></span>
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

      </div>
    </div>
  )
}
