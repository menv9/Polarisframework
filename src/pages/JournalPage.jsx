import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { generateTradeId, PAIRS, HORIZONS, CONVICTIONS, REGIMES, VOL_REGIMES, CLOSE_REASONS } from '../lib/journal/metrics'
import { PIP_VALUES } from '../lib/risk/sizing'

const STORAGE_KEY = 'polaris_journal_trades'

function loadTrades() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? JSON.parse(saved) : []
  } catch { return [] }
}

function saveTrades(trades) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
}

const EMPTY_FORM = {
  pair: 'EUR/USD',
  direction: 'LONG',
  horizon: 'MEDIO',
  conviction: 'FULL',
  regime: 'MIXTO',
  volRegime: 'NORMAL',
  signalScore: '',
  scoreEndo: '',
  scoreExo: '',
  zLF: '',
  setupTech: '',
  entryTarget: '',
  entryExecuted: '',
  slippagePips: '',
  stopPips: '',
  stopLevel: '',
  tpLevel: '',
  rMultipleTarget: '1.5',
  sizePercent: '',
  lotSize: '1',
  thesis: '',
  openDate: new Date().toISOString().split('T')[0],
}

const EMPTY_CLOSE = {
  closeDate: new Date().toISOString().split('T')[0],
  closePrice: '',
  closeReason: '',
  pnlGross: '',
  costSpread: '',
  costSwap: '',
  costCommission: '',
  mfePips: '',
  maePips: '',
  thesisMaterialized: '',
  timingOptimal: '',
  overrideDiscretional: false,
  lesson: '',
}

export default function JournalPage() {
  const [trades, setTrades]   = useState(loadTrades)
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]   = useState(EMPTY_FORM)
  const [closeForm, setCloseForm] = useState({})
  const [closingId, setClosingId] = useState(null)
  const [viewId,  setViewId]  = useState(null)
  const [filter,  setFilter]  = useState('all') // all | open | closed
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  function persist(updated) {
    setTrades(updated)
    saveTrades(updated)
  }

  function openNew() {
    setForm({ ...EMPTY_FORM, openDate: new Date().toISOString().split('T')[0] })
    setShowForm(true)
  }

  function saveNew() {
    if (!form.pair || !form.openDate) return
    const id = generateTradeId(trades)
    const trade = { ...form, id, status: 'OPEN', createdAt: new Date().toISOString() }
    persist([trade, ...trades])
    setShowForm(false)
  }

  function startClose(trade) {
    setClosingId(trade.id)
    setCloseForm({ ...EMPTY_CLOSE, closeDate: new Date().toISOString().split('T')[0] })
  }

  function saveClose(tradeId) {
    if (!closeForm.closeReason) return
    const pnlNet = (parseFloat(closeForm.pnlGross) || 0) -
      (parseFloat(closeForm.costSpread) || 0) -
      (parseFloat(closeForm.costSwap) || 0) -
      (parseFloat(closeForm.costCommission) || 0)
    const trade      = trades.find(t => t.id === tradeId)
    const stopPips   = parseFloat(trade?.stopPips) || 0
    const lotSize    = parseFloat(trade?.lotSize) || 1
    const pipVal     = PIP_VALUES[trade?.pair] ?? 10
    const riskAmount = stopPips * pipVal * lotSize
    const rMultiple  = riskAmount > 0 ? pnlNet / riskAmount : null
    persist(trades.map(t =>
      t.id === tradeId
        ? { ...t, ...closeForm, pnlNet: +pnlNet.toFixed(2), rMultiple: rMultiple ? +rMultiple.toFixed(2) : null, status: 'CLOSED' }
        : t
    ))
    setClosingId(null)
  }

  function deleteTrade(id) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    persist(trades.filter(t => t.id !== id))
    if (viewId === id) setViewId(null)
    setConfirmDeleteId(null)
  }

  const filtered = useMemo(() =>
    trades.filter(t => filter === 'all' ? true : filter === 'open' ? t.status === 'OPEN' : t.status === 'CLOSED'),
    [trades, filter]
  )

  const viewTrade = trades.find(t => t.id === viewId)

  function Field({ label, value, onChange, type = 'text', options }) {
    return (
      <div className="p-2 border-r border-b border-[#222]">
        <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">{label}</div>
        {options ? (
          <select value={value} onChange={e => onChange(e.target.value)}
            className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-1.5 py-1 w-full focus:outline-none focus:border-[#ecd987]">
            {options.map(o => <option key={o}>{o}</option>)}
          </select>
        ) : (
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-1.5 py-1 w-full focus:outline-none focus:border-[#ecd987]" />
        )}
      </div>
    )
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">JOURNAL</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Self-Awareness — Registro de Trades</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/performance" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">PERFORMANCE →</Link>
            <button onClick={openNew}
              className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#ecd987] text-black hover:bg-white transition-colors">
              + Nuevo Trade
            </button>
          </div>
        </div>

        {/* Formulario nuevo trade */}
        {showForm && (
          <div className="border-2 border-[#ecd987] mb-3">
            <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Nuevo Trade — Pre-Cierre</span>
              <button onClick={() => setShowForm(false)} className="text-[10px] text-[#555] hover:text-[#ef4444] uppercase">Cancelar</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <Field label="Par"       value={form.pair}       onChange={v => setForm(f => ({...f, pair: v}))}       options={PAIRS} />
              <Field label="Dirección" value={form.direction}  onChange={v => setForm(f => ({...f, direction: v}))}  options={['LONG','SHORT']} />
              <Field label="Horizonte" value={form.horizon}    onChange={v => setForm(f => ({...f, horizon: v}))}    options={HORIZONS} />
              <Field label="Fecha apertura" value={form.openDate} onChange={v => setForm(f => ({...f, openDate: v}))} type="date" />
              <Field label="Convicción"  value={form.conviction}  onChange={v => setForm(f => ({...f, conviction: v}))}  options={CONVICTIONS} />
              <Field label="Régimen WV"  value={form.regime}      onChange={v => setForm(f => ({...f, regime: v}))}      options={REGIMES} />
              <Field label="Vol régimen" value={form.volRegime}   onChange={v => setForm(f => ({...f, volRegime: v}))}   options={VOL_REGIMES} />
              <Field label="Señal FX (σ)" value={form.signalScore} onChange={v => setForm(f => ({...f, signalScore: v}))} />
              <Field label="Score Endo"  value={form.scoreEndo}  onChange={v => setForm(f => ({...f, scoreEndo: v}))} />
              <Field label="Score Exo"   value={form.scoreExo}   onChange={v => setForm(f => ({...f, scoreExo: v}))} />
              <Field label="z_LF CFTC"   value={form.zLF}        onChange={v => setForm(f => ({...f, zLF: v}))} />
              <Field label="Setup técnico" value={form.setupTech} onChange={v => setForm(f => ({...f, setupTech: v}))} />
              <Field label="Entry objetivo" value={form.entryTarget}   onChange={v => setForm(f => ({...f, entryTarget: v}))} />
              <Field label="Entry ejecutado" value={form.entryExecuted} onChange={v => setForm(f => ({...f, entryExecuted: v}))} />
              <Field label="Slippage (pips)" value={form.slippagePips} onChange={v => setForm(f => ({...f, slippagePips: v}))} />
              <Field label="Stop (pips)"   value={form.stopPips}  onChange={v => setForm(f => ({...f, stopPips: v}))} />
              <Field label="Nivel stop"    value={form.stopLevel} onChange={v => setForm(f => ({...f, stopLevel: v}))} />
              <Field label="Nivel target"  value={form.tpLevel}   onChange={v => setForm(f => ({...f, tpLevel: v}))} />
              <Field label="R objetivo"    value={form.rMultipleTarget} onChange={v => setForm(f => ({...f, rMultipleTarget: v}))} />
              <Field label="Tamaño (% cap)" value={form.sizePercent} onChange={v => setForm(f => ({...f, sizePercent: v}))} />
              <Field label="Lotes ejecutados" value={form.lotSize} onChange={v => setForm(f => ({...f, lotSize: v}))} />
            </div>
            <div className="p-3 border-t border-[#222]">
              <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Tesis (200 palabras máx)</div>
              <textarea value={form.thesis} onChange={e => setForm(f => ({...f, thesis: e.target.value}))}
                rows={3} maxLength={1200}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-2 py-1.5 w-full focus:outline-none focus:border-[#ecd987] resize-none" />
            </div>
            <div className="px-3 py-2 border-t border-[#333] flex justify-end">
              <button onClick={saveNew}
                className="px-4 py-1.5 text-xs font-bold uppercase tracking-wider bg-[#ecd987] text-black hover:bg-white transition-colors">
                Guardar Trade
              </button>
            </div>
          </div>
        )}

        {/* Formulario cierre */}
        {closingId != null && (
          <div className="border-2 border-[#4ade80] mb-3">
            <div className="px-3 py-1.5 bg-[#0a1a0a] border-b border-[#333] flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-widest text-[#4ade80]">Cerrar Trade #{closingId} — Post-Cierre</span>
              <button onClick={() => setClosingId(null)} className="text-[10px] text-[#555] hover:text-[#ef4444] uppercase">Cancelar</button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <Field label="Fecha cierre"  value={closeForm.closeDate}  onChange={v => setCloseForm(f => ({...f, closeDate: v}))}  type="date" />
              <Field label="Precio cierre" value={closeForm.closePrice} onChange={v => setCloseForm(f => ({...f, closePrice: v}))} />
              <Field label="Razón cierre"  value={closeForm.closeReason} onChange={v => setCloseForm(f => ({...f, closeReason: v}))} options={['', ...CLOSE_REASONS]} />
              <Field label="P&L bruto ($)" value={closeForm.pnlGross}   onChange={v => setCloseForm(f => ({...f, pnlGross: v}))} />
              <Field label="Coste spread ($)" value={closeForm.costSpread}     onChange={v => setCloseForm(f => ({...f, costSpread: v}))} />
              <Field label="Coste swap ($)"   value={closeForm.costSwap}       onChange={v => setCloseForm(f => ({...f, costSwap: v}))} />
              <Field label="Comisión ($)"     value={closeForm.costCommission} onChange={v => setCloseForm(f => ({...f, costCommission: v}))} />
              <Field label="MFE (pips)" value={closeForm.mfePips} onChange={v => setCloseForm(f => ({...f, mfePips: v}))} />
              <Field label="MAE (pips)" value={closeForm.maePips} onChange={v => setCloseForm(f => ({...f, maePips: v}))} />
              <Field label="¿Tesis materializada?" value={closeForm.thesisMaterialized} onChange={v => setCloseForm(f => ({...f, thesisMaterialized: v}))} options={['','SÍ','NO','PARCIAL']} />
              <Field label="¿Timing óptimo?" value={closeForm.timingOptimal} onChange={v => setCloseForm(f => ({...f, timingOptimal: v}))} options={['','SÍ','NO']} />
            </div>
            <div className="p-3 border-t border-[#222]">
              <div className="text-[9px] text-[#555] uppercase tracking-wider mb-1">Lección clave (una frase)</div>
              <input type="text" value={closeForm.lesson} onChange={e => setCloseForm(f => ({...f, lesson: e.target.value}))}
                maxLength={200}
                className="bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-2 py-1.5 w-full focus:outline-none focus:border-[#4ade80]" />
            </div>
            <div className="px-3 py-2 border-t border-[#333] flex justify-end">
              <button onClick={() => saveClose(closingId)} disabled={!closeForm.closeReason}
                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider transition-colors ${closeForm.closeReason ? 'bg-[#4ade80] text-black hover:bg-[#22c55e]' : 'bg-[#333] text-[#777] cursor-not-allowed'}`}>
                Cerrar Trade
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-2">
          {['all','open','closed'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider border transition-colors ${
                filter === f ? 'border-[#ecd987] text-[#ecd987]' : 'border-[#333] text-[#555] hover:border-[#555]'
              }`}>
              {f === 'all' ? `Todos (${trades.length})` : f === 'open' ? `Abiertos (${trades.filter(t=>t.status==='OPEN').length})` : `Cerrados (${trades.filter(t=>t.status==='CLOSED').length})`}
            </button>
          ))}
        </div>

        {/* Lista de trades */}
        {filtered.length === 0 ? (
          <div className="border border-[#222] p-8 text-center text-[#444] text-xs uppercase tracking-wider">
            Sin trades registrados — haz click en &quot;+ Nuevo Trade&quot; para empezar
          </div>
        ) : (
          <div className="border-2 border-[#333]">
            <table className="w-full text-xs table-fixed">
              <thead>
                <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[6%]">ID</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[10%]">Fecha</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[10%]">Par</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[8%]">Dir</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[8%]">Conv</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[10%]">Estado</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[10%]">P&L Neto</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[8%]">R-mult</th>
                  <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest w-[30%]">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id} className={`border-b border-[#1a1a1a] hover:bg-[#0a0a0a] ${viewId === t.id ? 'bg-[#0f0f0f]' : ''}`}>
                    <td className="px-3 py-1.5 font-mono text-[#555]">#{t.id}</td>
                    <td className="px-3 py-1.5 font-mono text-[#555]">{t.openDate}</td>
                    <td className="px-3 py-1.5 font-mono font-bold text-[#a3a3a3]">{t.pair}</td>
                    <td className={`px-3 py-1.5 font-bold uppercase ${t.direction === 'LONG' ? 'text-[#4ade80]' : 'text-[#ef4444]'}`}>{t.direction}</td>
                    <td className={`px-3 py-1.5 font-bold uppercase ${t.conviction === 'FULL' ? 'text-[#4ade80]' : t.conviction === 'HALF' ? 'text-[#f59e0b]' : 'text-[#555]'}`}>{t.conviction}</td>
                    <td className={`px-3 py-1.5 font-bold uppercase ${t.status === 'OPEN' ? 'text-[#ecd987]' : 'text-[#555]'}`}>{t.status}</td>
                    <td className={`px-3 py-1.5 font-mono font-bold ${t.pnlNet > 0 ? 'text-[#4ade80]' : t.pnlNet < 0 ? 'text-[#ef4444]' : 'text-[#555]'}`}>
                      {t.pnlNet != null ? `$${t.pnlNet >= 0 ? '+' : ''}${t.pnlNet.toFixed(0)}` : '—'}
                    </td>
                    <td className={`px-3 py-1.5 font-mono ${t.rMultiple > 0 ? 'text-[#4ade80]' : t.rMultiple < 0 ? 'text-[#ef4444]' : 'text-[#555]'}`}>
                      {t.rMultiple != null ? `${t.rMultiple >= 0 ? '+' : ''}${t.rMultiple.toFixed(1)}R` : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <div className="flex gap-2">
                        <button onClick={() => setViewId(viewId === t.id ? null : t.id)}
                          className="text-[10px] text-[#555] hover:text-[#ecd987] uppercase tracking-wider">
                          {viewId === t.id ? 'Ocultar' : 'Ver'}
                        </button>
                        {t.status === 'OPEN' && (
                          <button onClick={() => startClose(t)}
                            className="text-[10px] text-[#4ade80] hover:text-white uppercase tracking-wider">
                            Cerrar
                          </button>
                        )}
                        {confirmDeleteId === t.id ? (
                          <span className="flex items-center gap-1">
                            <button onClick={() => deleteTrade(t.id)}
                              className="text-[10px] text-[#ef4444] border border-[#ef4444] px-1.5 uppercase tracking-wider">
                              Confirmar
                            </button>
                            <button onClick={() => setConfirmDeleteId(null)}
                              className="text-[10px] text-[#555] hover:text-white uppercase tracking-wider">
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button onClick={() => deleteTrade(t.id)}
                            className="text-[10px] text-[#333] hover:text-[#ef4444] uppercase tracking-wider">
                            Borrar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Vista detalle trade */}
        {viewTrade && (
          <div className="border-2 border-[#333] mt-3">
            <div className="px-3 py-1.5 bg-[#0f0f0f] border-b border-[#222]">
              <span className="text-xs font-bold uppercase tracking-widest text-[#a3a3a3]">Trade #{viewTrade.id} — {viewTrade.pair} {viewTrade.direction}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 text-[10px]">
              {[
                ['Señal FX', viewTrade.signalScore ?? '—'],
                ['Score Endo', viewTrade.scoreEndo ?? '—'],
                ['Score Exo', viewTrade.scoreExo ?? '—'],
                ['z_LF CFTC', viewTrade.zLF ?? '—'],
                ['Setup', viewTrade.setupTech ?? '—'],
                ['Régimen', viewTrade.regime ?? '—'],
                ['Vol régimen', viewTrade.volRegime ?? '—'],
                ['Horizonte', viewTrade.horizon ?? '—'],
                ['Entry obj.', viewTrade.entryTarget ?? '—'],
                ['Entry ejec.', viewTrade.entryExecuted ?? '—'],
                ['Slippage', viewTrade.slippagePips ? `${viewTrade.slippagePips} pips` : '—'],
                ['Stop', viewTrade.stopPips ? `${viewTrade.stopPips} pips @ ${viewTrade.stopLevel}` : '—'],
              ].map(([k, v]) => (
                <div key={k} className="p-2.5 border-r border-b border-[#1a1a1a]">
                  <div className="text-[#444] uppercase tracking-wider mb-0.5">{k}</div>
                  <div className="text-[#a3a3a3] font-mono">{v}</div>
                </div>
              ))}
            </div>
            {viewTrade.thesis && (
              <div className="p-3 border-t border-[#222]">
                <div className="text-[9px] text-[#444] uppercase tracking-wider mb-1">Tesis</div>
                <p className="text-xs text-[#777] leading-relaxed">{viewTrade.thesis}</p>
              </div>
            )}
            {viewTrade.lesson && (
              <div className="p-3 border-t border-[#222] bg-[#0a0a0a]">
                <div className="text-[9px] text-[#ecd987] uppercase tracking-wider mb-1">Lección clave</div>
                <p className="text-xs text-[#e5e5e5]">{viewTrade.lesson}</p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
