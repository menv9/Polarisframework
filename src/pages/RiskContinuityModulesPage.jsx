import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileText,
  Phone,
  Plus,
  Route,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TrendingDown,
  Trash2,
  Zap,
} from 'lucide-react'

// ── Shared UI components ─────────────────────────────────────────────────────

function Section({ title, icon: Icon, children, className = '' }) {
  return (
    <section className={`border-2 border-[#333] ${className}`}>
      <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5 flex items-center gap-2">
        <Icon size={15} className="text-[#ecd987]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">{title}</span>
      </div>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#aaa]">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-[#ecd987]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Pipeline({ steps, accent }) {
  return (
    <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
      {steps.map((step, i) => (
        <div key={step} className="min-h-[88px] border-b border-r border-[#222] p-3">
          <div className={`mb-2 font-mono text-[10px] font-bold ${accent}`}>{String(i + 1).padStart(2, '0')}</div>
          <div className="text-xs leading-relaxed text-[#aaa]">{step}</div>
        </div>
      ))}
    </div>
  )
}

function ParamTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[580px] table-fixed text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            <th className="w-[42%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Parametro</th>
            <th className="w-[24%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Default</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Nota</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([p, v, r]) => (
            <tr key={p} className="border-t border-[#111]">
              <td className="px-3 py-2 text-[#ddd]">{p}</td>
              <td className="px-3 py-2 font-mono text-white">{v}</td>
              <td className="px-3 py-2 font-mono text-[#777] text-xs">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DataTable({ headers, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-[#111]">
              {row.map((cell, j) => (
                <td key={j} className={`px-3 py-2 text-xs leading-relaxed ${j === 0 ? 'font-bold text-[#ddd]' : 'text-[#aaa]'}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TriggerTable({ rows, accent }) {
  return (
    <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
      {rows.map(([indicator, level, action]) => (
        <div key={`${indicator}-${level}`} className="border-b border-r border-[#222] p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className={`font-mono text-sm font-bold ${accent}`}>{level}</span>
            <span className="text-[10px] uppercase tracking-widest text-[#555]">{indicator}</span>
          </div>
          <div className="text-xs leading-relaxed text-[#888]">{action}</div>
        </div>
      ))}
    </div>
  )
}

function RefToggle({ children }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border border-[#333] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#777] hover:border-[#ecd987] hover:text-[#ecd987]"
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {open ? 'Ocultar referencia documental' : 'Ver referencia documental'}
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  )
}

// ── IRPF ahorro Spain 2024 ───────────────────────────────────────────────────

function calcIRPF(base) {
  if (base <= 0) return 0
  const brackets = [
    [6000, 0.19],
    [44000, 0.21],
    [150000, 0.23],
    [100000, 0.27],
    [Infinity, 0.28],
  ]
  let tax = 0
  let remaining = base
  for (const [limit, rate] of brackets) {
    const chunk = Math.min(remaining, limit)
    tax += chunk * rate
    remaining -= chunk
    if (remaining <= 0) break
  }
  return tax
}

function fmt(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

// ── G3 Fiscal Tool ───────────────────────────────────────────────────────────

const G3_EVENTS_KEY = 'polaris_g3_events'

function FiscalTool() {
  const [gross, setGross] = useState('')
  const [costs, setCosts] = useState('')
  const [events, setEvents] = useState(() => {
    try { return JSON.parse(localStorage.getItem(G3_EVENTS_KEY)) || [] } catch { return [] }
  })
  const [newDate, setNewDate] = useState(today())
  const [newDesc, setNewDesc] = useState('')
  const [newGross, setNewGross] = useState('')
  const [newCosts, setNewCosts] = useState('')

  const calc = useMemo(() => {
    const g = parseFloat(gross) || 0
    const c = parseFloat(costs) || 0
    const net = g - c
    const tax = calcIRPF(Math.max(0, net))
    const afterTax = net - tax
    const effectiveRate = net > 0 ? (tax / net) * 100 : 0
    return { net, tax, afterTax, effectiveRate }
  }, [gross, costs])

  const totals = useMemo(() => {
    let totalGross = 0, totalCosts = 0, totalTax = 0, totalAfterTax = 0
    for (const e of events) {
      const net = e.gross - e.costs
      const tax = calcIRPF(Math.max(0, net))
      totalGross += e.gross
      totalCosts += e.costs
      totalTax += tax
      totalAfterTax += net - tax
    }
    return { totalGross, totalCosts, totalTax, totalAfterTax }
  }, [events])

  function saveEvents(next) {
    setEvents(next)
    localStorage.setItem(G3_EVENTS_KEY, JSON.stringify(next))
  }

  function addEvent() {
    const g = parseFloat(newGross)
    const c = parseFloat(newCosts) || 0
    if (!newDate || isNaN(g)) return
    const entry = { id: Date.now(), date: newDate, desc: newDesc || '—', gross: g, costs: c }
    saveEvents([entry, ...events])
    setNewDesc('')
    setNewGross('')
    setNewCosts('')
  }

  function deleteEvent(id) {
    saveEvents(events.filter((e) => e.id !== id))
  }

  const accent = 'text-[#f59e0b]'

  return (
    <div className="space-y-4">
      {/* Calculator */}
      <div className="border-2 border-[#f59e0b33]">
        <div className="flex items-center gap-2 border-b border-[#333] bg-[#1a1200] px-3 py-1.5">
          <Calculator size={14} className="text-[#f59e0b]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#f59e0b]">Calculadora After-Tax (IRPF Ahorro España 2024)</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">P&L Bruto (€)</span>
              <input
                type="number"
                value={gross}
                onChange={(e) => setGross(e.target.value)}
                placeholder="0.00"
                className="w-40 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#f59e0b] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Costes Operativos (€)</span>
              <input
                type="number"
                value={costs}
                onChange={(e) => setCosts(e.target.value)}
                placeholder="0.00"
                className="w-40 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#f59e0b] focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              ['Neto (antes impuesto)', calc.net, calc.net < 0 ? 'text-[#f87171]' : 'text-white'],
              ['IRPF estimado', calc.tax, 'text-[#f59e0b]'],
              ['After-Tax', calc.afterTax, calc.afterTax < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'],
              ['Tipo efectivo', null, ''],
            ].map(([label, val, cls], i) => (
              <div key={label} className="border border-[#222] bg-[#080808] p-3">
                <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">{label}</div>
                {i < 3 ? (
                  <div className={`font-mono text-lg font-bold ${cls}`}>{fmt(val)} €</div>
                ) : (
                  <div className={`font-mono text-lg font-bold ${calc.effectiveRate > 27 ? 'text-[#f59e0b]' : 'text-white'}`}>
                    {fmt(calc.effectiveRate)}%
                  </div>
                )}
              </div>
            ))}
          </div>
          {calc.net <= 0 && (parseFloat(gross) || 0) !== 0 && (
            <p className="mt-2 text-[10px] text-[#777]">
              Perdida — compensable con ganancias del mismo año o en los 4 ejercicios siguientes.
            </p>
          )}
        </div>
      </div>

      {/* Event log */}
      <div className="border-2 border-[#333]">
        <div className="flex items-center gap-2 border-b border-[#333] bg-[#1a1200] px-3 py-1.5">
          <FileText size={14} className="text-[#f59e0b]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#f59e0b]">Registro Anual de Eventos P&L</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Fecha</span>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white focus:border-[#f59e0b] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Descripcion</span>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Ej: Trade EUR/USD"
                className="w-48 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#f59e0b] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Bruto (€)</span>
              <input
                type="number"
                value={newGross}
                onChange={(e) => setNewGross(e.target.value)}
                placeholder="0.00"
                className="w-32 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#f59e0b] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Costes (€)</span>
              <input
                type="number"
                value={newCosts}
                onChange={(e) => setNewCosts(e.target.value)}
                placeholder="0.00"
                className="w-32 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#f59e0b] focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={addEvent}
              className="flex items-center gap-1 border border-[#f59e0b] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black"
            >
              <Plus size={13} /> Registrar
            </button>
          </div>

          {events.length > 0 ? (
            <>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="bg-[#111] text-left">
                      {['Fecha', 'Descripcion', 'Bruto', 'Costes', 'Neto', 'After-Tax', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((e) => {
                      const net = e.gross - e.costs
                      const tax = calcIRPF(Math.max(0, net))
                      const afterTax = net - tax
                      return (
                        <tr key={e.id} className="border-t border-[#111]">
                          <td className="px-3 py-2 font-mono text-xs text-[#777]">{e.date}</td>
                          <td className="px-3 py-2 text-xs text-[#ddd]">{e.desc}</td>
                          <td className="px-3 py-2 font-mono text-xs text-white">{fmt(e.gross)}</td>
                          <td className="px-3 py-2 font-mono text-xs text-[#777]">{fmt(e.costs)}</td>
                          <td className={`px-3 py-2 font-mono text-xs ${net < 0 ? 'text-[#f87171]' : 'text-white'}`}>{fmt(net)}</td>
                          <td className={`px-3 py-2 font-mono text-xs font-bold ${afterTax < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>{fmt(afterTax)}</td>
                          <td className="px-3 py-2">
                            <button
                              type="button"
                              onClick={() => deleteEvent(e.id)}
                              className="text-[#444] hover:text-[#f87171]"
                              aria-label="Eliminar"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#333] bg-[#0a0a0a]">
                      <td colSpan={2} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Total acumulado</td>
                      <td className="px-3 py-2 font-mono text-xs font-bold text-white">{fmt(totals.totalGross)}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#777]">{fmt(totals.totalCosts)}</td>
                      <td className={`px-3 py-2 font-mono text-xs font-bold ${(totals.totalGross - totals.totalCosts) < 0 ? 'text-[#f87171]' : 'text-white'}`}>
                        {fmt(totals.totalGross - totals.totalCosts)}
                      </td>
                      <td className={`px-3 py-2 font-mono text-xs font-bold ${totals.totalAfterTax < 0 ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                        {fmt(totals.totalAfterTax)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </>
          ) : (
            <p className="mt-4 text-xs text-[#444]">Sin eventos registrados. Añade el primer evento P&L del año.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── G7 Tail Risk Tool ────────────────────────────────────────────────────────

const G7_HEDGES_KEY = 'polaris_g7_hedges'

function getProtocol(vix, dd) {
  const protocols = []
  if (vix >= 50) protocols.push({ level: 'CRITICO', color: 'text-[#f87171]', border: 'border-[#f87171]', bg: 'bg-[#1a0505]', msg: `VIX ${vix} ≥ 50 — Cierre total excepto stops muy ajustados (<0.5R)` })
  else if (vix >= 35) protocols.push({ level: 'ALERTA', color: 'text-[#fb923c]', border: 'border-[#fb923c]', bg: 'bg-[#140900]', msg: `VIX ${vix} ≥ 35 — Solo cierres y gestión de abiertas. Sin nuevas entradas hasta VIX < 30` })
  else if (vix >= 25) protocols.push({ level: 'PRECAUCION', color: 'text-[#fbbf24]', border: 'border-[#fbbf24]', bg: 'bg-[#141000]', msg: `VIX ${vix} ≥ 25 — Reducir sizing total al 50%. Revisar correlaciones` })
  if (dd >= 12) protocols.push({ level: 'ALERTA DD', color: 'text-[#fb923c]', border: 'border-[#fb923c]', bg: 'bg-[#140900]', msg: `DD ${dd}% ≥ 12% — Solo gestionar abiertas. Sin nuevas entradas en ningún par` })
  else if (dd >= 8) protocols.push({ level: 'PRECAUCION DD', color: 'text-[#fbbf24]', border: 'border-[#fbbf24]', bg: 'bg-[#141000]', msg: `DD ${dd}% ≥ 8% — Reducir sizing al 50%. Revisar validez de posiciones abiertas` })
  if (protocols.length === 0) protocols.push({ level: 'NORMAL', color: 'text-[#4ade80]', border: 'border-[#4ade80]', bg: 'bg-[#011a05]', msg: `VIX ${vix || '—'} / DD ${dd || '—'}% — Sin protocolos activos. Operativa normal` })
  return protocols
}

function TailRiskTool() {
  const [vix, setVix] = useState('')
  const [dd, setDd] = useState('')
  const [hedges, setHedges] = useState(() => {
    try { return JSON.parse(localStorage.getItem(G7_HEDGES_KEY)) || [] } catch { return [] }
  })
  const [newInstrument, setNewInstrument] = useState('')
  const [newNotional, setNewNotional] = useState('')
  const [newReason, setNewReason] = useState('')

  const protocols = useMemo(() => getProtocol(parseFloat(vix) || 0, parseFloat(dd) || 0), [vix, dd])

  function saveHedges(next) {
    setHedges(next)
    localStorage.setItem(G7_HEDGES_KEY, JSON.stringify(next))
  }

  function addHedge() {
    if (!newInstrument) return
    const entry = {
      id: Date.now(),
      instrument: newInstrument,
      notional: newNotional || '—',
      reason: newReason || '—',
      activatedAt: today(),
      active: true,
    }
    saveHedges([entry, ...hedges])
    setNewInstrument('')
    setNewNotional('')
    setNewReason('')
  }

  function toggleHedge(id) {
    saveHedges(hedges.map((h) => h.id === id ? { ...h, active: !h.active } : h))
  }

  function deleteHedge(id) {
    saveHedges(hedges.filter((h) => h.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* Protocol checker */}
      <div className="border-2 border-[#fb718533]">
        <div className="flex items-center gap-2 border-b border-[#333] bg-[#140505] px-3 py-1.5">
          <ShieldAlert size={14} className="text-[#fb7185]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#fb7185]">Estado del Protocolo Tail Risk</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">VIX actual</span>
              <input
                type="number"
                value={vix}
                onChange={(e) => setVix(e.target.value)}
                placeholder="0"
                className="w-28 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#fb7185] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">DD Portfolio (%)</span>
              <input
                type="number"
                value={dd}
                onChange={(e) => setDd(e.target.value)}
                placeholder="0.0"
                className="w-28 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#fb7185] focus:outline-none"
              />
            </label>
          </div>
          <div className="mt-4 space-y-2">
            {protocols.map((p) => (
              <div key={p.level} className={`border ${p.border} ${p.bg} p-3`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm font-black ${p.color}`}>{p.level}</span>
                  <span className="text-xs text-[#ccc]">{p.msg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hedge tracker */}
      <div className="border-2 border-[#333]">
        <div className="flex items-center gap-2 border-b border-[#333] bg-[#140505] px-3 py-1.5">
          <ShieldCheck size={14} className="text-[#fb7185]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#fb7185]">Coberturas Activas</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Instrumento</span>
              <input
                type="text"
                value={newInstrument}
                onChange={(e) => setNewInstrument(e.target.value)}
                placeholder="Long JPY / Reduccion sizing"
                className="w-52 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#fb7185] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Tamaño / Notional</span>
              <input
                type="text"
                value={newNotional}
                onChange={(e) => setNewNotional(e.target.value)}
                placeholder="50,000 / −50% sizing"
                className="w-40 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#fb7185] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Razon</span>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                placeholder="VIX 28 > 25"
                className="w-40 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#fb7185] focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={addHedge}
              className="flex items-center gap-1 border border-[#fb7185] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#fb7185] hover:bg-[#fb7185] hover:text-black"
            >
              <Plus size={13} /> Agregar
            </button>
          </div>

          {hedges.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="bg-[#111] text-left">
                    {['Instrumento', 'Tamaño', 'Razon', 'Activado', 'Estado', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hedges.map((h) => (
                    <tr key={h.id} className={`border-t border-[#111] ${!h.active ? 'opacity-40' : ''}`}>
                      <td className="px-3 py-2 font-bold text-[#ddd]">{h.instrument}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#aaa]">{h.notional}</td>
                      <td className="px-3 py-2 text-xs text-[#aaa]">{h.reason}</td>
                      <td className="px-3 py-2 font-mono text-xs text-[#777]">{h.activatedAt}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggleHedge(h.id)}
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 border ${h.active ? 'border-[#4ade80] text-[#4ade80] hover:bg-[#4ade80] hover:text-black' : 'border-[#555] text-[#555] hover:border-[#aaa] hover:text-[#aaa]'}`}
                        >
                          {h.active ? 'Activa' : 'Inactiva'}
                        </button>
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => deleteHedge(h.id)}
                          className="text-[#444] hover:text-[#f87171]"
                          aria-label="Eliminar"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#444]">Sin coberturas registradas. Agrega una cuando actives un protocolo.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── G8 Counterparty Risk Tool ────────────────────────────────────────────────

const G8_TOTAL_KEY = 'polaris_g8_total'
const G8_BROKERS_KEY = 'polaris_g8_brokers'

function CounterpartyTool() {
  const [totalCapital, setTotalCapital] = useState(() => {
    return localStorage.getItem(G8_TOTAL_KEY) || ''
  })
  const [brokers, setBrokers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(G8_BROKERS_KEY)) || [] } catch { return [] }
  })
  const [newName, setNewName] = useState('')
  const [newRegulator, setNewRegulator] = useState('')
  const [newAssigned, setNewAssigned] = useState('')
  const [newInUse, setNewInUse] = useState('')
  const [newSegregated, setNewSegregated] = useState(true)

  const total = parseFloat(totalCapital) || 0

  const totalAssigned = useMemo(() => brokers.reduce((s, b) => s + b.assigned, 0), [brokers])

  function saveBrokers(next) {
    setBrokers(next)
    localStorage.setItem(G8_BROKERS_KEY, JSON.stringify(next))
  }

  function saveTotal(val) {
    setTotalCapital(val)
    localStorage.setItem(G8_TOTAL_KEY, val)
  }

  function addBroker() {
    const assigned = parseFloat(newAssigned)
    const inUse = parseFloat(newInUse) || 0
    if (!newName || isNaN(assigned)) return
    const entry = { id: Date.now(), name: newName, regulator: newRegulator || '—', assigned, inUse, segregated: newSegregated }
    saveBrokers([...brokers, entry])
    setNewName('')
    setNewRegulator('')
    setNewAssigned('')
    setNewInUse('')
    setNewSegregated(true)
  }

  function deleteBroker(id) {
    saveBrokers(brokers.filter((b) => b.id !== id))
  }

  function brokerStatus(b) {
    if (!b.segregated) return { ok: false, msg: 'Sin segregacion — limite 0%' }
    if (total > 0 && (b.assigned / total) > 0.6) return { ok: false, msg: `${((b.assigned / total) * 100).toFixed(1)}% > limite 60%` }
    return { ok: true, msg: 'OK' }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-[#fb923c33]">
        <div className="flex items-center gap-2 border-b border-[#333] bg-[#140a00] px-3 py-1.5">
          <CheckCircle2 size={14} className="text-[#fb923c]" />
          <span className="text-xs font-bold uppercase tracking-widest text-[#fb923c]">Exposicion por Broker / Contraparte</span>
        </div>
        <div className="p-4">
          {/* Total capital input */}
          <div className="flex items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Capital total del sistema (€ / $)</span>
              <input
                type="number"
                value={totalCapital}
                onChange={(e) => saveTotal(e.target.value)}
                placeholder="100000"
                className="w-44 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#fb923c] focus:outline-none"
              />
            </label>
            {total > 0 && (
              <div className="pb-2 text-xs text-[#555]">
                Asignado: <span className={`font-mono font-bold ${totalAssigned > total ? 'text-[#f87171]' : 'text-white'}`}>{fmt(totalAssigned)}</span>
                {' / '}
                <span className="text-[#777]">{fmt(total)}</span>
              </div>
            )}
          </div>

          {/* Add broker form */}
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Broker</span>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Interactive Brokers"
                className="w-44 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#fb923c] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Regulador</span>
              <input
                type="text"
                value={newRegulator}
                onChange={(e) => setNewRegulator(e.target.value)}
                placeholder="FCA / BaFin"
                className="w-28 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#fb923c] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Asignado</span>
              <input
                type="number"
                value={newAssigned}
                onChange={(e) => setNewAssigned(e.target.value)}
                placeholder="60000"
                className="w-28 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#fb923c] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">En uso (margen)</span>
              <input
                type="number"
                value={newInUse}
                onChange={(e) => setNewInUse(e.target.value)}
                placeholder="0"
                className="w-28 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#fb923c] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-widest text-[#555]">Segregado</span>
              <div className="flex h-[38px] items-center gap-3 border border-[#333] bg-black px-3">
                <button
                  type="button"
                  onClick={() => setNewSegregated(true)}
                  className={`text-xs font-bold uppercase tracking-wider ${newSegregated ? 'text-[#4ade80]' : 'text-[#555]'}`}
                >
                  Si
                </button>
                <span className="text-[#333]">/</span>
                <button
                  type="button"
                  onClick={() => setNewSegregated(false)}
                  className={`text-xs font-bold uppercase tracking-wider ${!newSegregated ? 'text-[#f87171]' : 'text-[#555]'}`}
                >
                  No
                </button>
              </div>
            </label>
            <button
              type="button"
              onClick={addBroker}
              className="flex items-center gap-1 border border-[#fb923c] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#fb923c] hover:bg-[#fb923c] hover:text-black"
            >
              <Plus size={13} /> Agregar
            </button>
          </div>

          {/* Broker table */}
          {brokers.length > 0 ? (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="bg-[#111] text-left">
                    {['Broker', 'Regulador', 'Asignado', '% Total', 'En uso', 'Segregado', 'Estado', ''].map((h) => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {brokers.map((b) => {
                    const pct = total > 0 ? (b.assigned / total) * 100 : 0
                    const status = brokerStatus(b)
                    return (
                      <tr key={b.id} className="border-t border-[#111]">
                        <td className="px-3 py-2 font-bold text-[#ddd]">{b.name}</td>
                        <td className="px-3 py-2 text-xs text-[#aaa]">{b.regulator}</td>
                        <td className="px-3 py-2 font-mono text-xs text-white">{fmt(b.assigned)}</td>
                        <td className={`px-3 py-2 font-mono text-xs font-bold ${pct > 60 ? 'text-[#f87171]' : 'text-[#fb923c]'}`}>
                          {pct.toFixed(1)}%
                        </td>
                        <td className="px-3 py-2 font-mono text-xs text-[#777]">{fmt(b.inUse)}</td>
                        <td className={`px-3 py-2 text-xs font-bold ${b.segregated ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                          {b.segregated ? 'Si' : 'No'}
                        </td>
                        <td className={`px-3 py-2 text-xs font-bold ${status.ok ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                          {status.msg}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => deleteBroker(b.id)}
                            className="text-[#444] hover:text-[#f87171]"
                            aria-label="Eliminar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                {total > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#333] bg-[#0a0a0a]">
                      <td colSpan={2} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Total asignado</td>
                      <td className={`px-3 py-2 font-mono text-xs font-bold ${totalAssigned > total ? 'text-[#f87171]' : 'text-white'}`}>{fmt(totalAssigned)}</td>
                      <td className={`px-3 py-2 font-mono text-xs font-bold ${totalAssigned > total ? 'text-[#f87171]' : 'text-[#fb923c]'}`}>
                        {((totalAssigned / total) * 100).toFixed(1)}%
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          ) : (
            <p className="mt-4 text-xs text-[#444]">Sin brokers registrados. Agrega tus cuentas activas.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Module reference data ────────────────────────────────────────────────────

const MODULES = {
  fiscal: {
    code: 'G3',
    title: 'Modulo Fiscal',
    subtitle: 'Fiscalidad, P&L after-tax, obligaciones de reporte y criterios de optimizacion para el operador en España.',
    status: 'Operativo',
    horizon: 'Anual + continuo',
    accent: 'text-[#f59e0b]',
    border: 'border-[#f59e0b]',
    principle: 'El P&L que importa es el neto fiscal. Un sistema con Sharpe 0.8 bruto puede tener Sharpe 0.5 neto despues de impuestos. El modulo fiscal no es contabilidad a posteriori; es una capa de decision que afecta sizing, horizonte de mantenimiento y eleccion de vehiculo operativo.',
    input: 'Trades con fecha apertura/cierre, P&L bruto, costes operativos, residencia fiscal, vehiculo operativo y tipo de instrumento.',
    output: 'P&L after-tax, obligaciones de reporte, calendario tributario y criterios de optimizacion fiscal aplicables a la operativa.',
    instruments: [
      ['CFDs', 'Ganancia patrimonial', 'No (broker no retiene)', 'Compensa con otras ganancias/perdidas de capital'],
      ['Futuros FX / indices', 'Ganancia patrimonial', 'No (broker no retiene)', 'Compensa con otras ganancias/perdidas de capital'],
      ['Acciones (dividendo)', 'Rendimiento capital mobiliario', '19% retencion en origen', 'Compensa con otros rendimientos CM'],
      ['Acciones (plus-valia)', 'Ganancia patrimonial', 'No retencion si exterior', 'Compensa con otras ganancias/perdidas de capital'],
      ['Opciones', 'Ganancia patrimonial', 'No (si exterior)', 'Compensa con otras ganancias/perdidas de capital'],
    ],
    taxBrackets: [
      ['0 — 6,000 €', '19%'],
      ['6,000 — 50,000 €', '21%'],
      ['50,000 — 200,000 €', '23%'],
      ['200,000 — 300,000 €', '27%'],
      ['> 300,000 €', '28%'],
    ],
    aftertaxFormula: [
      'Ganancia_Neta = P&L_Bruto − Costes_Operativos (spread + swap + comisiones)',
      'Base_Imponible = Ganancia_Neta (si positiva; si negativa, compensa años siguientes hasta 4)',
      'IRPF = Base_Imponible × Tipo_Marginal_Ahorro',
      'P&L_AfterTax = Ganancia_Neta − IRPF',
      'Sharpe_Neto = Sharpe_Bruto × (1 − Tipo_Marginal_Efectivo)',
      'Las perdidas de capital compensan ganancias de capital hasta el 100% en el mismo año',
      'El exceso de perdidas compensa en los 4 años fiscales siguientes',
    ],
    keyDecisions: [
      'Hold period: en España no hay ventaja fiscal por mantener >1 año (al contrario que EEUU). El timing fiscal no debe forzar aguantar posiciones perdedoras.',
      'Compensacion de perdidas: cerrar posiciones con perdidas antes de fin de año puede compensar ganancias y reducir la factura fiscal del ejercicio.',
      'Vehiculo operativo: si el P&L supera ~60-80k€/año, una SL tributando al 25% IS puede ser mas eficiente que IRPF ahorro al 27-28%.',
      'Modelo 720: obligatorio si en algun momento del año el saldo en cuentas exteriores supera los 50,000€ por tipo de bien.',
      'Brokers extranjeros no retienen IRPF en CFDs/futuros: toda la carga fiscal la declara el operador en Modelo 100.',
    ],
    pipeline: [
      'Cierre de cada trade: registrar P&L bruto, costes operativos y fechas de apertura/cierre.',
      'Mensual: calcular P&L_AfterTax acumulado con tipo marginal estimado segun resultado proyectado.',
      'Mensual: verificar si hay perdidas compensables de los 4 años anteriores pendientes de aplicar.',
      'Trimestral: revisar si el P&L acumulado cambia de tramo fiscal y ajustar sizing si es relevante.',
      'Q4: proyeccion del resultado anual; evaluar si conviene cerrar posiciones con perdidas para compensar.',
      'Cierre de ejercicio: preparar documentacion para Modelo 100 y verificar obligacion Modelo 720.',
      'Anual: revisar si el vehiculo operativo actual sigue siendo el mas eficiente para el volumen generado.',
    ],
    parameters: [
      ['Tipo marginal estimado (base)', '23%', 'Ajustar si resultado proyectado cambia de tramo'],
      ['Umbral Modelo 720', '50,000 €', 'Saldo en cuentas exteriores por tipo de bien'],
      ['Plazo compensacion perdidas', '4 años', 'Maximo legal IRPF España'],
      ['Umbral revision vehiculo operativo', '60,000 € P&L/año', 'Por encima, evaluar SL vs persona fisica'],
      ['Ajuste sizing por tramo fiscal', 'No automatico', 'Decision discrecional en Q4'],
    ],
    errors: [
      'Medir el sistema solo en P&L bruto ignorando el coste fiscal real — el Sharpe neto es el que importa.',
      'No registrar las perdidas para compensarlas en años siguientes: se pierden hasta 4 años de compensacion.',
      'Olvidar el Modelo 720 asumiendo que "ya se declarara cuando se retire el dinero".',
      'Asumir que el broker retiene el impuesto en CFDs/futuros extranjeros: no lo hace, la carga es del operador.',
      'Aguantar posiciones perdedoras por "no querer cerrar con perdidas" sin entender la ventaja fiscal de compensar.',
      'No revisar el vehiculo operativo cuando el volumen de P&L justifica una reestructuracion.',
    ],
  },

  disasterRecovery: {
    code: 'G6',
    title: 'Disaster Recovery / Business Continuity',
    subtitle: 'Plan de continuidad operativa ante fallos criticos de infraestructura, acceso y conectividad.',
    status: 'Documented / not automated',
    horizon: 'Continuo',
    accent: 'text-[#f87171]',
    border: 'border-[#f87171]',
    principle: 'Un sistema de trading sin plan de continuidad se rompe en el peor momento posible — cuando hay posiciones abiertas en movimiento. La preparacion no es para el dia normal; es para el dia en que el broker cae, internet falla, el dispositivo se pierde o hay un problema de seguridad. Sin plan, cualquier fallo menor se convierte en una crisis de gestion de posiciones.',
    input: 'Brokers activos, cuentas, conectividad, dispositivos, credenciales de acceso y posiciones abiertas con stops documentados.',
    output: 'Plan de continuidad con failover por escenario, runbook de emergencia, contactos operativos y calendario de simulacros.',
    failureModes: [
      ['Broker inaccesible (caida/mantenimiento)', 'Alto', 'Alta', '<30 min via broker alternativo o llamada directa'],
      ['Internet caido', 'Alto', 'Media', '<15 min via hotspot movil probado'],
      ['Plataforma de datos caida', 'Medio', 'Media', '<1h via fuente alternativa (FRED, TradingView)'],
      ['Hardware principal falla', 'Alto', 'Baja', '<2h via dispositivo backup con plataforma instalada'],
      ['Cuenta bloqueada / acceso perdido', 'Muy alto', 'Muy baja', 'Contacto directo con broker por telefono'],
      ['Corte electrico (power outage)', 'Alto', 'Baja', 'Inmediato via movil con datos; UPS si es critico'],
      ['Brecha de seguridad / acceso no autorizado', 'Critico', 'Muy baja', 'Cambio inmediato credenciales + contacto broker'],
    ],
    failoverProtocols: [
      'Broker caido: tener segundo broker con capital suficiente para abrir hedge de emergencia en el par afectado.',
      'Internet caido: hotspot movil configurado y probado previamente con la plataforma del broker principal.',
      'Hardware falla: segundo dispositivo (portatil o tablet) con plataforma del broker instalada y credenciales activas.',
      'Datos caidos: bookmarks de fuentes alternativas verificadas — FRED, TradingView, charts del broker.',
      'Acceso bloqueado: numero de telefono de emergencia del broker guardado offline y en papel.',
      'Brecha de seguridad: lista pre-preparada de pasos para cambio de credenciales en cada broker y 2FA.',
    ],
    emergencyContacts: [
      ['Broker principal', 'Tel + email soporte + chat 24h', '24/5 (en horario de mercado)', 'Cierres emergencia, bloqueos, incidencias'],
      ['Broker backup', 'Tel + email soporte', '24/5', 'Failover operativo, hedge de emergencia'],
      ['ISP / operadora movil', 'Tel soporte tecnico', '24h', 'Caida de internet, problemas de datos'],
      ['Soporte 2FA / auth', 'Backup codes offline', 'Siempre disponible offline', 'Perdida de acceso a app de autenticacion'],
    ],
    emergencyRunbook: [
      'Evaluar si la posicion abierta necesita accion inmediata (stop superado, evento en marcha, gap significativo).',
      'Si accion inmediata: intentar acceso desde dispositivo alternativo via hotspot movil.',
      'Si acceso logrado: cerrar o ajustar la posicion segun el stop predefinido en el plan de trade.',
      'Si no hay acceso: llamar al broker (numero de emergencia de la ficha, guardado offline).',
      'Describir la posicion exacta al broker y solicitar cierre a mercado o activacion de stop loss manual.',
      'Una vez resuelto: documentar el incidente (hora, causa, accion, resultado) en Knowledge Transfer (G17).',
      'Revisar si el failover funciono correctamente o si el runbook necesita actualizacion.',
    ],
    simulacros: [
      ['Trimestral', 'Acceder a broker desde dispositivo backup con hotspot', 'Registro de resultado en G17'],
      ['Semestral', 'Cerrar una posicion de test (0.01 lotes) desde dispositivo secundario', 'Confirmar que el proceso funciona end-to-end'],
      ['Anual', 'Simulacro completo: broker caido + hardware falla simultaneos', 'Revision y actualizacion de todos los runbooks'],
    ],
    pipeline: [
      'Mantener dispositivo backup con plataforma instalada y credenciales actualizadas (verificar trimestral).',
      'Mantener hotspot movil con plan de datos activo; probar la conexion con la plataforma al menos una vez.',
      'Guardar offline (papel o gestor sin conexion) el runbook de emergencia y los contactos del broker.',
      'Revisar trimestralmente que las credenciales del broker backup esten en vigor y el capital sea suficiente.',
      'Tras cada incidente real: actualizar el runbook con lo que fallo y lo que funciono.',
      'Simulacro trimestral: registrar resultado y cualquier mejora identificada en G17 Knowledge Transfer.',
    ],
    errors: [
      'Asumir que "el broker nunca cae" porque no ha caido hasta ahora.',
      'Tener el runbook de emergencia solo en el dispositivo que podria fallar.',
      'No tener credenciales del broker backup actualizadas ni capital suficiente para operar.',
      'Confiar en el hotspot del movil sin haberlo probado con la plataforma del broker especificamente.',
      'No documentar los incidentes: cada incidente sin registro es una mejora del runbook que no ocurre.',
      'No hacer simulacros porque "no ha habido necesidad" — el momento del incidente real no es el momento de aprender.',
    ],
  },

  tailRisk: {
    code: 'G7',
    title: 'Hedging / Tail Risk Module',
    subtitle: 'Coberturas y proteccion frente a eventos extremos, gaps y shocks de volatilidad.',
    status: 'Operativo',
    horizon: 'Continuo',
    accent: 'text-[#fb7185]',
    border: 'border-[#fb7185]',
    principle: 'El tail risk no se gestiona cuando ocurre; se gestiona antes. Una cobertura que parece cara en condiciones normales se vuelve extraordinariamente barata cuando el VIX dobla. El objetivo no es eliminar el riesgo de cola: es sobrevivir a el con capital suficiente para seguir operando despues.',
    input: 'Exposicion agregada por par y divisa, VIX actual, correlaciones entre posiciones, calendario de eventos de alto riesgo y coste de instrumentos de cobertura.',
    output: 'Estado de cobertura activo, triggers de activacion/desactivacion, sizing del hedge y registro de activaciones en Decision Log.',
    tailEvents: [
      ['Crisis de liquidez global', '2008, mar-2020', 'Vol x3-5, spreads x5-10', 'VIX >30, credit spreads amplios, repo stress'],
      ['Shock geopolitico', 'Ukraine feb-2022, Brexit', 'Gap overnight 2-5%, vol alta 1-2 semanas', 'Noticias, tensiones diplomaticas previas'],
      ['Flash crash', '2015 CHF, 2019 JPY', 'Gap instantaneo 3-15%, recovery parcial', 'Ninguna (imprevisible por definicion)'],
      ['Crisis de deuda soberana', '2012 eurozona, 2022 GBP', 'Divisa afectada -10-30%, contagio', 'CDS soberanos subiendo, spread OIS'],
      ['Crisis bancaria', 'SVB 2023, Credit Suisse 2023', 'Contagio risk-off, JPY/CHF/oro al alza', 'Noticias bancarias, CDS banco especifico'],
    ],
    hedgeInstruments: [
      ['Long JPY / CHF (safe havens)', 'Hedge generico risk-off', 'Bajo (a veces positivo en risk-off)', 'VIX >25 o regimen risk-off activo'],
      ['Long XAU/USD (oro)', 'Hedge inflacion + incertidumbre geopolitica', 'Bajo carry', 'Incertidumbre geopolitica alta o inflacion persistente'],
      ['Reduccion de sizing (−50%)', 'Mas simple y siempre disponible', 'Coste de oportunidad', 'VIX >25 o DD portfolio >8%'],
      ['Cierre total (cash)', 'Hedge total del sistema', 'Alto: coste de oportunidad total', 'Evento Nivel 1 inminente o VIX >35'],
      ['Puts / opciones (si disponibles)', 'Hedge definido con prima maxima conocida', 'Prima pagada upfront', 'Eventos de alta certeza con fecha conocida'],
    ],
    triggers: [
      ['VIX', '>25', 'Reducir sizing total al 50%; revisar correlaciones entre posiciones abiertas'],
      ['VIX', '>35', 'Solo cierres y gestion de abiertas; no nuevas entradas hasta VIX <30'],
      ['VIX', '>50', 'Cierre total excepto posiciones con stop muy ajustado (<0.5R en riesgo)'],
      ['DD portfolio', '>8%', 'Reducir sizing al 50%; revisar validez de posiciones abiertas segun señal'],
      ['DD portfolio', '>12%', 'Solo gestionar posiciones abiertas; no nuevas entradas en ningun par'],
      ['Evento geopolitico Nivel 1', 'Activo', 'No nuevas entradas; mantener stops ajustados hasta resolucion'],
      ['Correlacion posiciones', '>0.8 entre 3+', 'Reducir exposicion hasta que correlacion baje o diversificar'],
    ],
    pipeline: [
      'Revisar VIX diariamente al inicio del ciclo de analisis macro.',
      'Si VIX cruza nivel de trigger: aplicar el protocolo correspondiente sin excepcion ni "esta vez es diferente".',
      'Antes de eventos de alto riesgo (FOMC, NFP, elecciones): revisar exposicion y ajustar sizing preventivamente.',
      'Si DD portfolio alcanza 8%: revisar si las posiciones abiertas siguen siendo validas segun señal del framework.',
      'Documentar cada activacion de protocolo de tail risk en Decision Log (G16) con contexto.',
      'Al desactivar el protocolo: documentar tambien la desactivacion con el criterio cumplido.',
    ],
    parameters: [
      ['VIX trigger sizing −50%', '25', '20 - 30'],
      ['VIX trigger solo cierres', '35', '30 - 40'],
      ['VIX trigger cierre total', '50', '45 - 60'],
      ['DD trigger sizing −50%', '8%', '6% - 10%'],
      ['DD trigger no nuevas entradas', '12%', '10% - 15%'],
      ['Max exposicion safe haven como hedge', '15% notional', '10% - 20%'],
      ['Correlacion maxima entre posiciones abiertas', '0.8', '0.7 - 0.85'],
    ],
    errors: [
      'Implementar el hedge cuando ya ha ocurrido el evento — en ese momento es tarde y caro.',
      'Usar el hedge como excusa para mantener posiciones perdedoras mas tiempo del que el sistema indicaria.',
      'Ignorar el coste del carry del hedge al calcular la rentabilidad del sistema.',
      'Tener triggers en papel pero no aplicarlos porque "esta vez el VIX alto es temporal".',
      'Confundir diversificacion de pares con proteccion de tail risk: en crisis las correlaciones suben a 1.',
      'No registrar las activaciones en Decision Log, perdiendo el historico de cuantas veces los triggers se activaron.',
    ],
  },

  counterpartyRisk: {
    code: 'G8',
    title: 'Counterparty Risk Framework',
    subtitle: 'Riesgo de broker, custodio y contraparte: exposicion, limites, señales de alerta y diversificacion.',
    status: 'Operativo',
    horizon: 'Continuo',
    accent: 'text-[#fb923c]',
    border: 'border-[#fb923c]',
    principle: 'La mejor señal del mundo no vale nada si el broker quiebra con tu capital dentro. El riesgo de contraparte no es teorico: MF Global (2011, $1.6B de clientes), Alpari UK (2015, crisis CHF) y varios brokers retail han demostrado que es real. La diversificacion de contraparte es un seguro, no paralisis operativa.',
    input: 'Brokers activos, saldos por cuenta, margen utilizado, garantias, condiciones contractuales de segregacion y concentracion de capital por entidad.',
    output: 'Mapa de exposicion por contraparte, limites de concentracion, alertas de deterioro operativo y criterios de diversificacion y rotacion de brokers.',
    evaluationCriteria: [
      ['Regulacion', 'FCA (UK), BaFin (DE), FINMA (CH), ASIC (AU)', 'Muy alto', 'Brokers offshore no regulados = limite 0%'],
      ['Segregacion de fondos', 'Fondos en cuenta segregada confirmado en contrato', 'Muy alto', 'Sin segregacion = limite 0% sin excepcion'],
      ['Capital del broker', 'Capital regulatorio, ratio de solvencia publicado', 'Alto', 'Revisar informe anual del broker'],
      ['Esquema de compensacion', 'FSCS £85k (UK), ICF €20k (Cyprus), FCS AU$250k', 'Medio', 'Conocer el limite de cobertura de cada esquema'],
      ['Historial operativo', 'Anos en negocio, incidentes previos, prensa', 'Medio', 'Investigar antes de depositar capital'],
      ['Calidad de ejecucion', 'Slippage historico, politica de rollover, requotes', 'Medio', 'Relevante para costes, no para riesgo de quiebra'],
    ],
    exposureLimits: [
      ['Max por broker (capital total)', '60%', 'Diversificacion minima operativa'],
      ['Max por broker (cuenta <20k$)', '80%', 'Pragmatico: segundo broker puede ser solo backup'],
      ['Max por jurisdiccion (ej. solo Cyprus)', '40%', 'Concentracion regulatoria'],
      ['Broker sin segregacion de fondos', '0%', 'No negociable bajo ninguna circunstancia'],
      ['Broker no regulado (offshore puro)', '0%', 'No negociable bajo ninguna circunstancia'],
      ['Minimo capital en broker backup', 'Suficiente para gestionar posicion del principal', 'Operativo para failover'],
    ],
    warningSignals: [
      'Retrasos inexplicables en retiradas de fondos — señal de riesgo de liquidez del broker.',
      'Cambios abruptos en condiciones de margen, spread o politica de rollover sin comunicacion previa.',
      'Noticias sobre litigios regulatorios, investigaciones, cambio de propietario o desinversion.',
      'Slippage sistematicamente mayor que el historico personal en ese broker.',
      'Problemas frecuentes de acceso a plataforma sin comunicacion oficial de mantenimiento.',
      'Transferencia de cuentas a otra entidad — puede indicar reestructuracion o problemas del broker.',
      'Cambios en la estructura de proteccion de fondos o en el esquema de compensacion aplicable.',
    ],
    diversificationRules: [
      'Capital >10k$: minimo 2 brokers activos, aunque el segundo sea solo de backup.',
      'Capital >50k$: minimo 2 brokers regulados por FCA, BaFin, FINMA o ASIC.',
      'Broker principal: maximo 60% del capital total del sistema.',
      'Broker de emergencia/backup: capital suficiente para abrir hedge o gestionar posiciones del principal.',
      'Revisar la exposicion por broker mensualmente, especialmente si el P&L redistribuye capital.',
      'Al incorporar nuevo broker: completar checklist de evaluacion antes de depositar capital.',
    ],
    pipeline: [
      'Al incorporar un nuevo broker: completar checklist de criterios de evaluacion antes de depositar.',
      'Mensual: revisar exposicion por broker vs limites y ajustar si algun broker supera el umbral.',
      'Mensual: verificar que los fondos esten efectivamente segregados (extracto o confirmacion del broker).',
      'Si aparece señal de alerta: revision inmediata independientemente del ciclo mensual.',
      'Si un broker supera el limite de exposicion: planificar redistribucion de capital al broker backup.',
      'Anual: reevaluar el roster de brokers con criterios actualizados (regulacion, capital, historial).',
    ],
    errors: [
      'Concentrar el 100% del capital en un solo broker por comodidad operativa.',
      'Asumir que "regulado = seguro" sin verificar el esquema de compensacion y la segregacion real.',
      'No tener un segundo broker operativo porque "solo es por si acaso" — ese es exactamente el punto.',
      'Ignorar señales de alerta porque las condiciones de ejecucion son buenas en ese momento.',
      'No revisar la exposicion cuando el P&L redistribuye capital entre brokers a lo largo del año.',
      'Depositar en brokers offshore no regulados atraido por mayor apalancamiento o spreads mas bajos.',
    ],
  },
}

// ── Reference-only content sections ─────────────────────────────────────────

function FiscalRef({ mod }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Section title="Instrumentos y tratamiento fiscal" icon={FileText}>
          <DataTable
            headers={['Instrumento', 'Tipo de ganancia', 'Retencion', 'Compensacion']}
            rows={mod.instruments}
          />
        </Section>
        <Section title="Tramos IRPF ahorro (España 2024)" icon={Calculator}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#111] text-left">
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Base liquidable</th>
                  <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Tipo</th>
                </tr>
              </thead>
              <tbody>
                {mod.taxBrackets.map(([range, rate]) => (
                  <tr key={range} className="border-t border-[#111]">
                    <td className="px-3 py-2 text-xs text-[#ddd]">{range}</td>
                    <td className="px-3 py-2 font-mono text-sm font-bold text-[#f59e0b]">{rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Calculo P&L after-tax" icon={Calculator}>
          <div className="p-3"><BulletList items={mod.aftertaxFormula} /></div>
        </Section>
        <Section title="Decisiones de operativa afectadas por fiscal" icon={SlidersHorizontal}>
          <div className="p-3"><BulletList items={mod.keyDecisions} /></div>
        </Section>
      </div>
    </>
  )
}

function DisasterRecoveryContent({ mod }) {
  return (
    <>
      <Section title="Mapa de fallos y objetivos de recuperacion" icon={AlertTriangle}>
        <DataTable
          headers={['Escenario de fallo', 'Impacto', 'Probabilidad', 'Tiempo objetivo de recuperacion']}
          rows={mod.failureModes}
        />
      </Section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Protocolos de failover" icon={Zap}>
          <div className="p-3"><BulletList items={mod.failoverProtocols} /></div>
        </Section>
        <Section title="Contactos de emergencia" icon={Phone}>
          <DataTable
            headers={['Entidad', 'Canal de contacto', 'Disponibilidad', 'Para que']}
            rows={mod.emergencyContacts}
          />
        </Section>
      </div>
      <Section title="Runbook de emergencia — posicion abierta en riesgo" icon={FileText} className="mt-4">
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-4">
          {mod.emergencyRunbook.map((step, i) => (
            <div key={step} className="min-h-[88px] border-b border-r border-[#222] p-3">
              <div className={`mb-2 font-mono text-[10px] font-bold ${mod.accent}`}>{String(i + 1).padStart(2, '0')}</div>
              <div className="text-xs leading-relaxed text-[#aaa]">{step}</div>
            </div>
          ))}
        </div>
      </Section>
      <Section title="Cadencia de simulacros" icon={Calendar} className="mt-4">
        <DataTable
          headers={['Frecuencia', 'Que se prueba', 'Resultado esperado']}
          rows={mod.simulacros}
        />
      </Section>
    </>
  )
}

function TailRiskRef({ mod }) {
  return (
    <>
      <Section title="Taxonomia de eventos extremos" icon={TrendingDown}>
        <DataTable
          headers={['Tipo de evento', 'Ejemplos historicos', 'Impacto tipico FX', 'Señales previas']}
          rows={mod.tailEvents}
        />
      </Section>
      <Section title="Instrumentos de cobertura" icon={ShieldCheck} className="mt-4">
        <DataTable
          headers={['Instrumento', 'Uso', 'Coste tipico', 'Cuando activar']}
          rows={mod.hedgeInstruments}
        />
      </Section>
      <Section title="Niveles de trigger" icon={ShieldAlert} className="mt-4">
        <TriggerTable rows={mod.triggers} accent={mod.accent} />
      </Section>
    </>
  )
}

function CounterpartyRef({ mod }) {
  return (
    <>
      <Section title="Criterios de evaluacion de broker" icon={CheckCircle2}>
        <DataTable
          headers={['Criterio', 'Indicadores', 'Peso', 'Nota']}
          rows={mod.evaluationCriteria}
        />
      </Section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Limites de exposicion" icon={SlidersHorizontal}>
          <DataTable
            headers={['Limite', 'Default', 'Razon']}
            rows={mod.exposureLimits}
          />
        </Section>
        <Section title="Señales de alerta a monitorizar" icon={AlertTriangle}>
          <div className="p-3"><BulletList items={mod.warningSignals} /></div>
        </Section>
      </div>
      <Section title="Reglas de diversificacion" icon={ShieldCheck} className="mt-4">
        <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
          {mod.diversificationRules.map((rule) => (
            <div key={rule} className="border-b border-r border-[#222] p-3 text-xs leading-relaxed text-[#aaa]">{rule}</div>
          ))}
        </div>
      </Section>
    </>
  )
}

// ── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ mod }) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className={`font-mono text-[10px] font-bold uppercase tracking-widest ${mod.accent}`}>{mod.code}</p>
        <h1 className="mt-0.5 text-2xl font-bold uppercase tracking-widest">{mod.title}</h1>
        <p className="mt-1 max-w-4xl text-sm text-[#888]">{mod.subtitle}</p>
      </div>
      <div className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
        {mod.status} / {mod.horizon}
      </div>
    </div>
  )
}

function PrincipleIO({ mod }) {
  return (
    <section className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="border-2 border-[#333] p-4">
        <div className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${mod.accent}`}>
          <BookOpen size={15} />
          Principio central
        </div>
        <p className="text-sm leading-relaxed text-white">{mod.principle}</p>
      </div>
      <div className="grid grid-rows-2 border-2 border-[#333]">
        <div className="border-b border-[#222] p-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Input</div>
          <div className="text-xs leading-relaxed text-[#aaa]">{mod.input}</div>
        </div>
        <div className="p-3">
          <div className="mb-1 text-[10px] uppercase tracking-widest text-[#555]">Output</div>
          <div className="text-xs leading-relaxed text-[#aaa]">{mod.output}</div>
        </div>
      </div>
    </section>
  )
}

// ── Named exports ────────────────────────────────────────────────────────────

export function FiscalPage() {
  const mod = MODULES.fiscal
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <FiscalTool />
        <RefToggle>
          <FiscalRef mod={mod} />
          <Section title="Pipeline operativo" icon={Route} className="mt-4">
            <Pipeline steps={mod.pipeline} accent={mod.accent} />
          </Section>
          <Section title="Parametros default" icon={SlidersHorizontal} className="mt-4">
            <ParamTable rows={mod.parameters} />
          </Section>
          <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
            <div className="p-3"><BulletList items={mod.errors} /></div>
          </Section>
        </RefToggle>
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Datos persistidos en localStorage del navegador.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Volver al dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export function DisasterRecoveryPage() {
  const mod = MODULES.disasterRecovery
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <DisasterRecoveryContent mod={mod} />
        <Section title="Pipeline operativo" icon={Route} className="mt-4">
          <Pipeline steps={mod.pipeline} accent={mod.accent} />
        </Section>
        <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
          <div className="p-3"><BulletList items={mod.errors} /></div>
        </Section>
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Pantalla de referencia operativa.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Volver al dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export function TailRiskPage() {
  const mod = MODULES.tailRisk
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <TailRiskTool />
        <RefToggle>
          <TailRiskRef mod={mod} />
          <Section title="Pipeline operativo" icon={Route} className="mt-4">
            <Pipeline steps={mod.pipeline} accent={mod.accent} />
          </Section>
          <Section title="Parametros default" icon={SlidersHorizontal} className="mt-4">
            <ParamTable rows={mod.parameters} />
          </Section>
          <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
            <div className="p-3"><BulletList items={mod.errors} /></div>
          </Section>
        </RefToggle>
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Datos persistidos en localStorage del navegador.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Volver al dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export function CounterpartyRiskPage() {
  const mod = MODULES.counterpartyRisk
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <CounterpartyTool />
        <RefToggle>
          <CounterpartyRef mod={mod} />
          <Section title="Pipeline operativo" icon={Route} className="mt-4">
            <Pipeline steps={mod.pipeline} accent={mod.accent} />
          </Section>
          <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
            <div className="p-3"><BulletList items={mod.errors} /></div>
          </Section>
        </RefToggle>
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Datos persistidos en localStorage del navegador.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Volver al dashboard</Link>
        </div>
      </div>
    </div>
  )
}
