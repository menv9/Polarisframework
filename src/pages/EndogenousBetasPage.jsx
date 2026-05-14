import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ALL_INDICATORS, DEFAULT_BETAS, loadBetas, saveBetas } from '../lib/endogenousBetas'

const BETA_DOC_TOTAL = ALL_INDICATORS.reduce((s, i) => s + i.betaDoc, 0) // = 1.00
const BETA_IMPL_DOC  = ALL_INDICATORS.filter(i => i.implemented).reduce((s, i) => s + i.betaDoc, 0) // = 0.76

function horizonColor(h) {
  return h === 'SHORT' ? 'text-[#60a5fa]' : h === 'MEDIUM' ? 'text-[#f59e0b]' : 'text-[#a3a3a3]'
}

export default function EndogenousBetasPage() {
  const [betas, setBetas] = useState(loadBetas)
  const [resetMsg, setResetMsg] = useState(null)

  useEffect(() => {
    saveBetas(betas)
  }, [betas])

  const handleChange = (key, value) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0 && num <= 1) {
      setBetas(prev => ({ ...prev, [key]: num }))
    }
  }

  const handleReset = () => {
    setBetas({ ...DEFAULT_BETAS })
    setResetMsg('Restaurado a valores §15.2')
    setTimeout(() => setResetMsg(null), 3000)
  }

  const betaTotalCustom    = ALL_INDICATORS.reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0)
  const betaImplCustom     = ALL_INDICATORS.filter(i => i.implemented).reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0)
  const betaPendingCustom  = ALL_INDICATORS.filter(i => !i.implemented).reduce((s, i) => s + (betas[i.key] ?? i.betaDoc), 0)
  const implementedCount   = ALL_INDICATORS.filter(i => i.implemented).length

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">BETAS — ENDOGENOUS</h1>
            <p className="text-xs text-[#555] uppercase tracking-wider mt-0.5">
              24 indicadores · §15.2 documentación · Σβ = 1.00
            </p>
          </div>
          <div className="flex items-center gap-3">
            {resetMsg && <span className="text-xs font-bold text-[#f59e0b] uppercase tracking-wider">{resetMsg}</span>}
            <button
              onClick={handleReset}
              className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#555] text-[#777] hover:text-white hover:border-white"
            >
              RESET A DOC
            </button>
            <Link to="/endogenous/zscores" className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#333] text-[#777] hover:text-white hover:border-white">
              Z-SCORES →
            </Link>
            <Link to="/endogenous" className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white">
              OPERATIVA →
            </Link>
          </div>
        </div>

        {/* ===== RESUMEN ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Cobertura</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-0">
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Implementados</div>
              <div className="text-2xl font-mono font-bold text-white">{implementedCount}<span className="text-sm text-[#555]">/{ALL_INDICATORS.length}</span></div>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Σβ Implementados</div>
              <div className="text-2xl font-mono font-bold text-[#4ade80]">{betaImplCustom.toFixed(2)}</div>
              <div className="text-[10px] text-[#555] mt-0.5">doc: {BETA_IMPL_DOC.toFixed(2)}</div>
            </div>
            <div className="p-3 border-r border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Σβ Pendientes</div>
              <div className="text-2xl font-mono font-bold text-[#f59e0b]">{betaPendingCustom.toFixed(2)}</div>
              <div className="text-[10px] text-[#555] mt-0.5">doc: {(BETA_DOC_TOTAL - BETA_IMPL_DOC).toFixed(2)}</div>
            </div>
            <div className="p-3 border-b border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Σβ Total</div>
              <div className={`text-2xl font-mono font-bold ${Math.abs(betaTotalCustom - 1) < 0.005 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                {betaTotalCustom.toFixed(2)}
              </div>
              <div className="text-[10px] text-[#555] mt-0.5">objetivo: 1.00</div>
            </div>
          </div>
        </div>

        {/* ===== INSTRUCCIONES ===== */}
        <div className="border border-[#333] bg-[#0a0a0a] px-4 py-2 mb-4 text-xs text-[#777]">
          <span className="text-[#ecd987] font-bold uppercase tracking-wider">Nota: </span>
          Los betas se guardan automáticamente y se usan en las páginas Operativa y Z-Scores.
          Edita solo cuando tengas betas calibrados por regresión (§9). Los valores por defecto son literatura académica (§15.2).
          Indicadores <span className="text-[#555]">grises</span> = pendientes de implementar en dataSources.
        </div>

        {/* ===== TABLA ===== */}
        <div className="border-2 border-[#333] overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[680px]">
            <thead>
              <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[6%]">#</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[30%]">Indicador</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">β Doc</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[14%]">β Actual</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[14%]">β Norm.</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[8%]">Signo</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[12%]">Horizonte</th>
                <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[6%]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {ALL_INDICATORS.map(ind => {
                const currentBeta  = betas[ind.key] ?? ind.betaDoc
                const normBeta     = betaImplCustom > 0 && ind.implemented ? currentBeta / betaImplCustom : null
                const isModified   = Math.abs(currentBeta - ind.betaDoc) > 0.0001
                const dimmed       = !ind.implemented

                return (
                  <tr
                    key={ind.key}
                    className={`border-b border-[#222] ${dimmed ? 'opacity-40' : 'hover:bg-[#0a0a0a]'}`}
                  >
                    <td className="px-2 py-2">
                      <span className="text-xs font-mono text-[#555]">{ind.num}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className={`text-sm font-bold ${dimmed ? 'text-[#555]' : 'text-[#e5e5e5]'}`}>
                        {ind.label}
                        {ind.num === 18 && (
                          <span className="ml-2 text-[10px] font-bold text-[#ecd987] uppercase tracking-wider">DOMINANTE</span>
                        )}
                      </div>
                      <div className="text-[10px] text-[#444] font-mono">{ind.key}</div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-sm font-mono text-[#777]">{ind.betaDoc.toFixed(2)}</span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={currentBeta}
                          min={0}
                          max={1}
                          step={0.01}
                          onChange={e => handleChange(ind.key, e.target.value)}
                          disabled={dimmed}
                          className={`w-16 bg-[#111] border-b-2 text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none
                            ${dimmed ? 'border-[#222] opacity-40 cursor-not-allowed' : isModified ? 'border-[#f59e0b] focus:border-white' : 'border-[#ecd987] focus:border-white'}`}
                        />
                        {isModified && !dimmed && (
                          <button
                            onClick={() => handleChange(ind.key, ind.betaDoc)}
                            className="text-[10px] text-[#f59e0b] hover:text-white"
                            title="Restaurar valor doc"
                          >↺</button>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <span className="text-xs font-mono text-[#555]">
                        {normBeta != null ? normBeta.toFixed(3) : '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`text-sm font-bold ${ind.sign === 1 ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>
                        {ind.sign === 1 ? '+1' : '−1'}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <span className={`text-xs font-bold uppercase tracking-wider ${horizonColor(ind.horizon)}`}>
                        {ind.horizon}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      {ind.implemented
                        ? <span className="text-[10px] font-bold text-[#4ade80] uppercase">✓ ACTIVO</span>
                        : <span className="text-[10px] font-bold text-[#444] uppercase">PENDIENTE</span>
                      }
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#333] bg-[#111]">
                <td colSpan={2} className="px-2 py-2 text-xs font-bold text-[#777] uppercase tracking-wider">
                  TOTAL ({ALL_INDICATORS.length} indicadores)
                </td>
                <td className="px-2 py-2 text-sm font-mono font-bold text-[#777]">{BETA_DOC_TOTAL.toFixed(2)}</td>
                <td className="px-2 py-2 text-sm font-mono font-bold text-white">{betaTotalCustom.toFixed(2)}</td>
                <td className="px-2 py-2 text-sm font-mono font-bold text-[#4ade80]">1.000</td>
                <td colSpan={3} />
              </tr>
            </tfoot>
          </table>
        </div>

      </div>
    </div>
  )
}
