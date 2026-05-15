import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ALL_INDICATORS, INDICATORS } from '../lib/endogenousBetas'
import {
  parsePairBetaCSV, savePairBetas, clearPairBetas,
  loadPairBetasMeta, loadPairBetas, getPairEntry, pairLabelToId,
} from '../lib/pairBetas'

const CATEGORY_MAP = {
  real_2y: 'CARRY', ca_gdp: 'ESTRUCTURAL', reer: 'VALUATION', tot: 'ESTRUCTURAL',
  '10y_real': 'RATES', core_cpi: 'INFLACIÓN', niip: 'ESTRUCTURAL', policy: 'RATES',
  cpi: 'INFLACIÓN', nfp: 'EMPLEO', pmi: 'CRECIMIENTO', cftc: 'SENTIMIENTO',
  cb_balance: 'MONETARIO', debt: 'SOBERANO', umcsi: 'CRECIMIENTO',
}

const CATEGORY_COLOR = {
  CARRY: 'text-[#ecd987]', RATES: 'text-[#60a5fa]', INFLACIÓN: 'text-[#f97316]',
  EMPLEO: 'text-[#a78bfa]', CRECIMIENTO: 'text-[#4ade80]', SENTIMIENTO: 'text-[#f43f5e]',
  MONETARIO: 'text-[#38bdf8]', SOBERANO: 'text-[#fb923c]', ESTRUCTURAL: 'text-[#a3a3a3]',
  VALUATION: 'text-[#e879f9]',
}

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

function BetaCell({ entry, ind }) {
  if (!entry) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        <span className="font-mono text-xs text-[#2a2a2a]">{ind.betaDoc.toFixed(4)}</span>
        <span className="text-[9px] text-[#1e1e1e]">doc · eff {(ind.betaEff * 100).toFixed(1)}%</span>
      </div>
    )
  }
  const beta  = entry.beta
  const color = !entry.significant ? 'text-[#555]' : beta > 0 ? 'text-[#4ade80]' : 'text-[#ef4444]'
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
  const [pairMeta,         setPairMeta]         = useState(loadPairBetasMeta)
  const [pairBetaData,     setPairBetaData]     = useState(loadPairBetas)
  const [selectedViewPair, setSelectedViewPair] = useState('EUR/USD')
  const [flashMsg,         setFlashMsg]         = useState(null)

  function flash(msg) {
    setFlashMsg(msg)
    setTimeout(() => setFlashMsg(null), 4000)
  }

  function handleCSVUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = evt => {
      const data  = parsePairBetaCSV(evt.target.result)
      const pairs = Object.keys(data)
      if (pairs.length === 0) { flash('CSV inválido — sin pares reconocidos'); return }
      savePairBetas(data)
      setPairMeta(loadPairBetasMeta())
      setPairBetaData(data)
      flash(`CSV cargado — ${pairs.length} pares`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleClear() {
    clearPairBetas()
    setPairMeta(null)
    setPairBetaData(null)
    flash('Betas por par eliminadas')
  }

  const vp      = VIEW_PAIRS.find(p => p.label === selectedViewPair) ?? VIEW_PAIRS[0]
  const pairId  = pairLabelToId(vp.label)
  const baseLbl = vp.base === 'can' ? 'CAD' : vp.base.toUpperCase()
  const quoteLbl = vp.quote === 'can' ? 'CAD' : vp.quote.toUpperCase()

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 py-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">BETAS</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">
              Pipeline · Betas calibradas por indicador × par
            </p>
          </div>
          <div className="flex items-center gap-2">
            {flashMsg && <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">{flashMsg}</span>}
            <Link to="/endogenous" className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white transition-colors">
              Operativa →
            </Link>
          </div>
        </div>

        {/* ── CSV ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#60a5fa]">Pipeline CSV</span>
            {pairMeta && (
              <span className="text-[10px] font-mono text-[#444]">
                {pairMeta.pairs} pares · {pairMeta.totalRows} regresiones
              </span>
            )}
          </div>
          <div className="px-3 py-3 flex items-center gap-3 flex-wrap">
            {pairMeta ? (
              <>
                <span className="text-xs text-[#4ade80]">
                  ✓ {new Date(pairMeta.loadedAt).toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-[10px] text-[#444] font-mono">{pairMeta.pairList?.join(' · ')}</span>
                <button onClick={handleClear}
                  className="ml-auto text-[10px] uppercase tracking-wider border border-[#ef4444] text-[#ef4444] hover:text-white hover:border-white px-2 py-0.5 transition-colors">
                  Borrar
                </button>
              </>
            ) : (
              <p className="text-[10px] text-[#555]">
                Sin CSV. Scoring usa <span className="text-[#666]">betaDoc §15.2</span> como fallback en todos los pares.
              </p>
            )}
            <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#333] text-[#555] hover:text-white hover:border-white transition-colors">
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
              {pairMeta ? 'Actualizar CSV' : 'Cargar beta_matrix_app.csv'}
            </label>
            <span className="text-[10px] text-[#333]">
              Genera con: <span className="font-mono text-[#3a3a3a]">beta_pipeline/run.py</span>
              <span className="ml-1 text-[#2a2a2a]">→ output/YYYYMMDD_HHMMSS/beta_matrix_app.csv</span>
            </span>
          </div>
        </div>

        {/* ── TABLA POR PAR ── */}
        <div className="border-2 border-[#333] mb-2">
          {/* Selector de par */}
          <div className="px-3 py-1.5 bg-[#0a0f1a] border-b border-[#60a5fa]/20 flex items-center justify-between flex-wrap gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-[#60a5fa]">Betas por Par</span>
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
                <th className="px-3 py-1.5 text-left   text-[10px] text-[#444] uppercase tracking-wider w-[35%]">Indicador</th>
                <th className="px-3 py-1.5 text-right  text-[10px] text-[#60a5fa] uppercase tracking-wider w-[18%]">{baseLbl} (base)</th>
                <th className="px-3 py-1.5 text-right  text-[10px] text-[#f59e0b] uppercase tracking-wider w-[18%]">{quoteLbl} (quote)</th>
                <th className="px-3 py-1.5 text-center text-[10px] text-[#444] uppercase tracking-wider w-[11%]">horizonte</th>
                <th className="px-3 py-1.5 text-left   text-[10px] text-[#444] uppercase tracking-wider w-[18%]">categoría</th>
              </tr>
            </thead>
            <tbody>
              {INDICATORS.map(ind => {
                const baseEntry  = getPairEntry(pairBetaData, pairId, vp.base,  ind.key)
                const quoteEntry = getPairEntry(pairBetaData, pairId, vp.quote, ind.key)
                const hasSig     = baseEntry?.significant || quoteEntry?.significant
                const cat        = CATEGORY_MAP[ind.key] ?? 'OTROS'
                return (
                  <tr key={ind.key}
                    className={`border-b border-[#0d0d1a] hover:bg-[#080810] transition-colors
                      ${pairBetaData && !hasSig ? 'opacity-40' : ''}`}>
                    <td className="px-3 py-1.5">
                      <div className="text-xs font-bold text-[#e5e5e5]">
                        {ind.label}
                        {ind.key === 'real_2y' && <span className="ml-1.5 text-[#ecd987]">★</span>}
                      </div>
                      <div className="text-[9px] font-mono text-[#333]">{ind.key}</div>
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <BetaCell entry={baseEntry}  ind={ind} />
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <BetaCell entry={quoteEntry} ind={ind} />
                    </td>
                    <td className="px-3 py-1.5 text-center">
                      <span className={`text-[9px] font-bold uppercase ${
                        ind.horizon === 'SHORT' ? 'text-[#60a5fa]' : ind.horizon === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#555]'
                      }`}>{ind.horizon}</span>
                    </td>
                    <td className="px-3 py-1.5">
                      <span className={`text-[9px] font-bold uppercase ${CATEGORY_COLOR[cat] ?? 'text-[#444]'}`}>{cat}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          <div className="px-3 py-2 border-t border-[#0d0d1a] text-[10px] text-[#333] leading-relaxed">
            {pairBetaData
              ? 'Beta con signo del pipeline OLS. Verde = positivo, Rojo = negativo. Atenuado = p≥0.05. Sin CSV → se muestra betaDoc §15.2 como fallback.'
              : 'Sin CSV cargado — mostrando betaDoc §15.2 como referencia.'}
            <span className="ml-2 text-[#2a2a2a]">
              doc = peso bruto del modelo completo (24 ind., suma 1.00) · eff = peso efectivo en scoring (15 implementados, renormalizado a 1.00)
            </span>
          </div>
        </div>

      </div>
    </div>
  )
}
