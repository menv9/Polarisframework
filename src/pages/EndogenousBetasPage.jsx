import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ALL_INDICATORS, DEFAULT_BETAS, loadBetas, saveBetas } from '../lib/endogenousBetas'
import { parsePairBetaCSV, savePairBetas, clearPairBetas, loadPairBetasMeta, loadPairBetas, getPairEntry, pairLabelToId } from '../lib/pairBetas'

const CATEGORY_MAP = {
  real_2y: 'CARRY', ca_gdp: 'ESTRUCTURAL', reer: 'VALUATION', tot: 'ESTRUCTURAL',
  '10y_real': 'RATES', core_cpi: 'INFLACIÓN', niip: 'ESTRUCTURAL', policy: 'RATES',
  cpi: 'INFLACIÓN', nfp: 'EMPLEO', pmi: 'CRECIMIENTO', cftc: 'SENTIMIENTO',
  cb_balance: 'MONETARIO', debt: 'SOBERANO', umcsi: 'CRECIMIENTO',
  nmi: 'CRECIMIENTO', permits: 'CRECIMIENTO', m2: 'MONETARIO', ppi: 'INFLACIÓN',
  core_ppi: 'INFLACIÓN', fiscal: 'SOBERANO', interest_gdp: 'SOBERANO',
  liquidity: 'ESTRUCTURAL', breakevens: 'RATES',
}

const CATEGORY_COLOR = {
  CARRY: 'text-[#ecd987]', RATES: 'text-[#60a5fa]', INFLACIÓN: 'text-[#f97316]',
  EMPLEO: 'text-[#a78bfa]', CRECIMIENTO: 'text-[#4ade80]', SENTIMIENTO: 'text-[#f43f5e]',
  MONETARIO: 'text-[#38bdf8]', SOBERANO: 'text-[#fb923c]', ESTRUCTURAL: 'text-[#a3a3a3]',
  VALUATION: 'text-[#e879f9]',
}

function horizonColor(h) {
  return h === 'SHORT' ? 'text-[#60a5fa]' : h === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#666]'
}

function horizonShort(h) {
  return h === 'SHORT' ? 'S' : h === 'MEDIUM' ? 'M' : 'L'
}

const BETA_DOC_TOTAL  = ALL_INDICATORS.reduce((s, i) => s + i.betaDoc, 0)
const BETA_IMPL_DOC   = ALL_INDICATORS.filter(i => i.implemented).reduce((s, i) => s + i.betaDoc, 0)

// Group indicators by category preserving order
function groupByCategory(indicators) {
  const groups = []
  for (const ind of indicators) {
    const cat = CATEGORY_MAP[ind.key] ?? 'OTROS'
    const existing = groups.find(g => g.category === cat)
    if (existing) existing.items.push(ind)
    else groups.push({ category: cat, items: [ind] })
  }
  return groups
}

const GROUPS = groupByCategory(ALL_INDICATORS)

const VIEW_PAIRS = [
  { label: 'EUR/USD', base: 'eur', quote: 'usa' },
  { label: 'USD/JPY', base: 'usa', quote: 'jpn' },
  { label: 'GBP/USD', base: 'gbr', quote: 'usa' },
  { label: 'USD/CHF', base: 'usa', quote: 'che' },
  { label: 'AUD/USD', base: 'aus', quote: 'usa' },
  { label: 'USD/CAD', base: 'usa', quote: 'can' },
  { label: 'NZD/USD', base: 'nzl', quote: 'usa' },
  { label: 'EUR/GBP', base: 'eur', quote: 'gbr' },
  { label: 'EUR/JPY', base: 'eur', quote: 'jpn' },
  { label: 'GBP/JPY', base: 'gbr', quote: 'jpn' },
]

function BetaCell({ entry, docBeta }) {
  if (!entry) return <span className="text-[#2a2a2a] font-mono text-xs">—</span>
  const beta = entry.beta
  const color = !entry.significant
    ? 'text-[#444]'
    : beta > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'
  const r2Pct = entry.r2 != null ? (entry.r2 * 100).toFixed(0) : null
  return (
    <div className="flex flex-col items-end">
      <span className={`font-mono text-xs font-bold ${color}`}>
        {beta >= 0 ? '+' : ''}{beta.toFixed(4)}
      </span>
      {r2Pct != null && (
        <span className="text-[9px] font-mono text-[#333]">R²{r2Pct}%</span>
      )}
    </div>
  )
}

export default function EndogenousBetasPage() {
  const [betas,            setBetas]            = useState(loadBetas)
  const [confirm,          setConfirm]          = useState(false)
  const [flashMsg,         setFlashMsg]         = useState(null)
  const [pairMeta,         setPairMeta]         = useState(loadPairBetasMeta)
  const [pairBetaData,     setPairBetaData]     = useState(loadPairBetas)
  const [selectedViewPair, setSelectedViewPair] = useState('EUR/USD')
  const [viewMode,         setViewMode]         = useState('doc') // 'doc' | 'pipeline'

  function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const data = parsePairBetaCSV(evt.target.result)
      const pairs = Object.keys(data)
      if (pairs.length === 0) {
        setFlashMsg('CSV inválido — sin pares reconocidos')
        setTimeout(() => setFlashMsg(null), 4000)
        return
      }
      savePairBetas(data)
      setPairMeta(loadPairBetasMeta())
      setPairBetaData(data)
      setFlashMsg(`CSV cargado — ${pairs.length} pares`)
      setTimeout(() => setFlashMsg(null), 4000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClearPairBetas() {
    clearPairBetas()
    setPairMeta(null)
    setPairBetaData(null)
    setFlashMsg('Betas por par eliminadas')
    setTimeout(() => setFlashMsg(null), 3000)
  }

  useEffect(() => { saveBetas(betas) }, [betas])

  const handleChange = (key, value) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0 && num <= 1) {
      setBetas(prev => ({ ...prev, [key]: num }))
    }
  }

  const handleReset = () => {
    setBetas({ ...DEFAULT_BETAS })
    setConfirm(false)
    setFlashMsg('Restaurado a valores doc §15.2')
    setTimeout(() => setFlashMsg(null), 3000)
  }

  const betaTotalCustom   = ALL_INDICATORS.reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0)
  const betaImplCustom    = ALL_INDICATORS.filter(i => i.implemented).reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0)
  const betaPendingCustom = ALL_INDICATORS.filter(i => !i.implemented).reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0)
  const implementedCount  = ALL_INDICATORS.filter(i => i.implemented).length
  const modifiedCount     = ALL_INDICATORS.filter(i => Math.abs((betas[i.key] ?? i.betaDoc) - i.betaDoc) > 0.0001).length

  const maxBeta = Math.max(...ALL_INDICATORS.map(i => betas[i.key] ?? i.betaDoc))

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">BETAS</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">
              Endogenous · 24 indicadores · §15.2 · Σβ = 1.00
            </p>
          </div>
          <div className="flex items-center gap-2">
            {flashMsg && <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">{flashMsg}</span>}
            {viewMode === 'doc' && modifiedCount > 0 && !flashMsg && (
              <span className="text-xs text-[#f59e0b] uppercase tracking-wider">{modifiedCount} modificados</span>
            )}
            {/* Toggle Doc / Pipeline */}
            {pairBetaData && (
              <div className="flex border border-[#333] overflow-hidden">
                <button onClick={() => setViewMode('doc')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors
                    ${viewMode === 'doc' ? 'bg-[#222] text-white' : 'text-[#444] hover:text-[#888]'}`}>
                  Doc
                </button>
                <button onClick={() => setViewMode('pipeline')}
                  className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors border-l border-[#333]
                    ${viewMode === 'pipeline' ? 'bg-[#0a1220] text-[#60a5fa]' : 'text-[#444] hover:text-[#888]'}`}>
                  Pipeline
                </button>
              </div>
            )}
            {confirm ? (
              <div className="flex items-center gap-2 border border-[#ef4444] px-2 py-1">
                <span className="text-xs text-[#ef4444] uppercase">¿Resetear todo?</span>
                <button onClick={handleReset} className="text-xs font-bold text-[#ef4444] hover:text-white uppercase">Confirmar</button>
                <button onClick={() => setConfirm(false)} className="text-xs text-[#555] hover:text-white uppercase">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirm(true)}
                className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white hover:border-white transition-colors">
                Reset a Doc
              </button>
            )}
            <Link to="/endogenous" className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white transition-colors">
              Operativa →
            </Link>
          </div>
        </div>

        {/* ── RESUMEN — solo en modo Doc ── */}
        {viewMode === 'doc' && <div className="border-2 border-[#333] mb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4">
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Implementados</div>
              <div className="text-xl font-mono font-bold text-white">{implementedCount}<span className="text-sm text-[#444]">/{ALL_INDICATORS.length}</span></div>
              <div className="mt-1.5 h-1 bg-[#1a1a1a]">
                <div className="h-full bg-[#4ade80]" style={{ width: `${implementedCount / ALL_INDICATORS.length * 100}%` }} />
              </div>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Σβ Implementados</div>
              <div className="text-xl font-mono font-bold text-[#4ade80]">{betaImplCustom.toFixed(2)}</div>
              <div className="text-[10px] text-[#444] mt-0.5">doc: {BETA_IMPL_DOC.toFixed(2)}</div>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Σβ Pendientes</div>
              <div className="text-xl font-mono font-bold text-[#f59e0b]">{betaPendingCustom.toFixed(2)}</div>
              <div className="text-[10px] text-[#444] mt-0.5">sin datos aún</div>
            </div>
            <div className="p-3 border-b border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Σβ Total</div>
              <div className={`text-xl font-mono font-bold ${Math.abs(betaTotalCustom - 1) < 0.005 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                {betaTotalCustom.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#444] mt-0.5">objetivo 1.00</div>
            </div>
          </div>
          <div className="px-3 py-2 text-[10px] text-[#444] border-t border-[#111]">
            <span className="text-[#555]">Nota: </span>
            Los betas se guardan automáticamente. Edita solo con datos de regresión propios (§9).
            Los valores por defecto son literatura académica (§15.2). Indicadores atenuados = pendientes.
            <span className="text-[#ecd987] ml-1">★ = dominante</span>
          </div>
        </div>}

        {/* ── TABLA POR CATEGORÍA — solo en modo Doc ── */}
        {viewMode === 'doc' && GROUPS.map(({ category, items }) => (
          <div key={category} className="border-2 border-[#333] mb-2">
            <div className="px-3 py-1.5 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-widest ${CATEGORY_COLOR[category] ?? 'text-[#555]'}`}>
                {category}
              </span>
              <span className="text-[10px] text-[#333] font-mono">
                Σβ {items.reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0).toFixed(2)}
              </span>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {items.map(ind => {
                  const currentBeta = betas[ind.key] ?? ind.betaDoc
                  const normBeta    = betaImplCustom > 0 && ind.implemented ? currentBeta / betaImplCustom : null
                  const isModified  = Math.abs(currentBeta - ind.betaDoc) > 0.0001
                  const dimmed      = !ind.implemented
                  const barPct      = maxBeta > 0 ? currentBeta / maxBeta * 100 : 0

                  return (
                    <tr key={ind.key}
                      className={`border-b border-[#111] transition-colors ${dimmed ? 'opacity-35' : 'hover:bg-[#0a0a0a]'}`}>

                      {/* # + nombre */}
                      <td className="px-3 py-2 w-[40%]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-mono text-[#333] w-5 flex-shrink-0">{ind.num}</span>
                          <div>
                            <div className={`text-xs font-bold ${dimmed ? 'text-[#444]' : 'text-[#e5e5e5]'}`}>
                              {ind.label}
                              {ind.key === 'real_2y' && <span className="ml-1.5 text-[#ecd987]">★</span>}
                            </div>
                            <div className="text-[9px] font-mono text-[#333]">{ind.key}</div>
                          </div>
                        </div>
                      </td>

                      {/* Barra de peso */}
                      <td className="px-3 py-2 w-[20%]">
                        <div className="h-1.5 bg-[#1a1a1a] w-full">
                          <div className={`h-full ${dimmed ? 'bg-[#333]' : isModified ? 'bg-[#f59e0b]' : 'bg-[#4ade80]'}`}
                            style={{ width: `${barPct}%` }} />
                        </div>
                        {normBeta != null && (
                          <div className="text-[9px] font-mono text-[#444] mt-0.5">{(normBeta * 100).toFixed(1)}% del score</div>
                        )}
                      </td>

                      {/* β Doc */}
                      <td className="px-3 py-2 w-[10%] text-right">
                        <span className="text-xs font-mono text-[#444]">{ind.betaDoc.toFixed(2)}</span>
                      </td>

                      {/* β Actual (editable) */}
                      <td className="px-3 py-2 w-[15%]">
                        <div className="flex items-center gap-1">
                          <input type="number" value={currentBeta} min={0} max={1} step={0.01}
                            onChange={e => handleChange(ind.key, e.target.value)}
                            disabled={dimmed}
                            className={`w-16 bg-[#111] border-b text-sm font-mono font-bold text-white px-1 py-0.5 text-right outline-none
                              ${dimmed ? 'border-[#1a1a1a] cursor-not-allowed' : isModified ? 'border-[#f59e0b] focus:border-white' : 'border-[#333] focus:border-[#ecd987]'}`}
                          />
                          {isModified && !dimmed && (
                            <button onClick={() => handleChange(ind.key, ind.betaDoc)}
                              className="text-[10px] text-[#f59e0b] hover:text-white" title="Restaurar">↺</button>
                          )}
                        </div>
                      </td>

                      {/* Signo + horizonte + estado */}
                      <td className="px-3 py-2 w-[15%]">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold ${ind.sign === 1 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                            {ind.sign === 1 ? '+' : '−'}
                          </span>
                          <span className={`text-[9px] font-bold uppercase ${
                            ind.horizon === 'SHORT' ? 'text-[#60a5fa]' : ind.horizon === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#555]'
                          }`}>{horizonShort(ind.horizon)}</span>
                          {ind.implemented
                            ? <span className="text-[9px] text-[#4ade80]">✓</span>
                            : <span className="text-[9px] text-[#333]">—</span>
                          }
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

        {/* ── BETAS POR PAR — PIPELINE CSV ── */}
        <div className="border-2 border-[#333] mb-2">
          <div className="px-3 py-1.5 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#60a5fa]">Betas por Par — Pipeline CSV</span>
            {pairMeta && (
              <span className="text-[10px] font-mono text-[#444]">
                {pairMeta.pairs} pares · {pairMeta.totalRows} regresiones
              </span>
            )}
          </div>
          <div className="px-3 py-3 flex flex-col gap-2">
            {pairMeta ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs text-[#4ade80]">
                  ✓ Cargado — {new Date(pairMeta.loadedAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-[#444] font-mono">
                  {pairMeta.pairList?.join(' · ')}
                </span>
                <button onClick={handleClearPairBetas}
                  className="ml-auto text-[10px] uppercase tracking-wider border border-[#ef4444] text-[#ef4444] hover:text-white hover:border-white px-2 py-0.5 transition-colors">
                  Borrar
                </button>
              </div>
            ) : (
              <p className="text-[10px] text-[#444]">
                Sin CSV cargado. El scoring usa los valores doc §15.2 para todos los pares.
              </p>
            )}
            <div className="flex items-center gap-3">
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white hover:border-white transition-colors">
                <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                {pairMeta ? 'Actualizar CSV' : 'Cargar beta_matrix_full.csv'}
              </label>
              <span className="text-[10px] text-[#333]">
                Genera con: <span className="font-mono text-[#3a3a3a]">beta_pipeline/run.py</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── VISTA POR PAR — solo en modo Pipeline ── */}
        {pairBetaData && viewMode === 'pipeline' && (() => {
          const vp = VIEW_PAIRS.find(p => p.label === selectedViewPair) ?? VIEW_PAIRS[0]
          const pairId = pairLabelToId(vp.label)
          const implOnly = ALL_INDICATORS.filter(i => i.implemented)
          const baseLbl  = vp.base.toUpperCase()
          const quoteLbl = vp.quote === 'can' ? 'CAD' : vp.quote.toUpperCase()
          return (
            <div className="border-2 border-[#60a5fa]/30 mb-2">
              {/* Cabecera + selector de par */}
              <div className="px-3 py-1.5 bg-[#0a0f1a] border-b border-[#60a5fa]/20 flex items-center justify-between flex-wrap gap-2">
                <span className="text-xs font-bold uppercase tracking-widest text-[#60a5fa]">
                  Betas Pipeline por Par
                </span>
                <div className="flex items-center gap-1 flex-wrap">
                  {VIEW_PAIRS.map(p => (
                    <button key={p.label} onClick={() => setSelectedViewPair(p.label)}
                      className={`px-2 py-0.5 text-[10px] font-bold font-mono uppercase transition-colors
                        ${selectedViewPair === p.label
                          ? 'bg-[#60a5fa]/20 text-[#60a5fa] border border-[#60a5fa]/50'
                          : 'text-[#444] border border-[#222] hover:text-[#888]'}`}>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabla */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1a1a2e]">
                    <th className="px-3 py-1.5 text-left text-[10px] text-[#444] uppercase tracking-wider w-[35%]">Indicador</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-[#60a5fa] uppercase tracking-wider w-[20%]">{baseLbl} (base)</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-[#f59e0b] uppercase tracking-wider w-[20%]">{quoteLbl} (quote)</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-[#444] uppercase tracking-wider w-[12%]">β doc</th>
                    <th className="px-3 py-1.5 text-right text-[10px] text-[#444] uppercase tracking-wider w-[13%]">horizon</th>
                  </tr>
                </thead>
                <tbody>
                  {implOnly.map(ind => {
                    const baseEntry  = getPairEntry(pairBetaData, pairId, vp.base,  ind.key)
                    const quoteEntry = getPairEntry(pairBetaData, pairId, vp.quote, ind.key)
                    const hasSig = baseEntry?.significant || quoteEntry?.significant
                    return (
                      <tr key={ind.key}
                        className={`border-b border-[#0d0d1a] transition-colors hover:bg-[#080810]
                          ${hasSig ? '' : 'opacity-40'}`}>
                        <td className="px-3 py-1.5">
                          <div className="text-xs font-bold text-[#e5e5e5]">{ind.label}</div>
                          <div className="text-[9px] font-mono text-[#333]">{ind.key}</div>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <BetaCell entry={baseEntry}  docBeta={ind.betaDoc} />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <BetaCell entry={quoteEntry} docBeta={ind.betaDoc} />
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <span className="text-[10px] font-mono text-[#333]">{ind.betaDoc.toFixed(2)}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right">
                          <span className={`text-[9px] font-bold uppercase ${
                            ind.horizon === 'SHORT' ? 'text-[#60a5fa]' : ind.horizon === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#555]'
                          }`}>{ind.horizon}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="px-3 py-2 border-t border-[#0d0d1a] text-[10px] text-[#333]">
                Betas con signo directo del pipeline OLS. Verde = positivo (divisa sube con el indicador). Rojo = negativo.
                Atenuado = p≥0.05, no significativo. R² = poder explicativo.
              </div>
            </div>
          )
        })()}

        {/* Footer total — solo en modo Doc */}
        {viewMode === 'doc' && <div className="border border-[#222] px-3 py-2 flex items-center justify-between text-xs">
          <span className="text-[#444] uppercase tracking-wider">Total — {ALL_INDICATORS.length} indicadores</span>
          <div className="flex gap-6 font-mono">
            <span className="text-[#555]">Doc: {BETA_DOC_TOTAL.toFixed(2)}</span>
            <span className="text-white">Actual: {betaTotalCustom.toFixed(2)}</span>
            <span className={Math.abs(betaTotalCustom - 1) < 0.005 ? 'text-[#4ade80]' : 'text-[#ef4444]'}>
              {Math.abs(betaTotalCustom - 1) < 0.005 ? '✓ OK' : '⚠ Suma ≠ 1'}
            </span>
          </div>
        </div>}

      </div>
    </div>
  )
}
