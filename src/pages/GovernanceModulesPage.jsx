import { useState, useMemo, useEffect, Fragment } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BookOpen,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Database,
  FileText,
  ListChecks,
  Route,
  ShieldAlert,
  SlidersHorizontal,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────

const getToday = () => new Date().toISOString().slice(0, 10)

function LoadingState() {
  return (
    <div className="py-8 text-center text-[10px] uppercase tracking-widest text-[#444]">
      Cargando...
    </div>
  )
}

function SetupRequired({ sql, label, onRetry }) {
  return (
    <div className="space-y-3 border border-[#f59e0b]/30 bg-[#0d0900] p-4">
      <div className="flex items-center gap-2">
        <Database size={13} className="text-[#f59e0b]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#f59e0b]">
          Configuracion Supabase requerida
        </span>
      </div>
      <p className="text-xs text-[#aaa]">
        Ejecuta el siguiente SQL en el{' '}
        <a
          href="https://supabase.com/dashboard"
          target="_blank"
          rel="noreferrer"
          className="underline text-[#ecd987]"
        >
          Editor SQL de Supabase
        </a>{' '}
        para activar {label}:
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap border border-[#222] bg-[#050505] p-3 font-mono text-[10px] leading-relaxed text-[#777]">
        {sql}
      </pre>
      {onRetry && (
        <button
          onClick={onRetry}
          className="border border-[#f59e0b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

function isTableMissing(msg) {
  return msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('permission denied'))
}

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

function RefToggle({ open, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-4 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-[#555] transition-colors hover:text-[#ecd987]"
    >
      {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      {open ? 'Ocultar referencia' : 'Ver referencia completa'}
    </button>
  )
}

// ── G9 Behavioral Finance Tool ────────────────────────────────────────────────

const G9_CHECKLIST_KEY = 'polaris_g9_checklists'
const G9_BIAS_KEY = 'polaris_g9_bias_log'

const PRE_TRADE_ITEMS = [
  '≥7h de sueño, sin sustancias que alteren el juicio',
  'Estado emocional ≥6 sobre 10',
  'P&L semanal: DD acumulado <50% del límite semanal',
  'Setup presente: señal + filtros + timing confirmados',
  'Sizing calculado y documentado antes de lanzar la orden',
  'No hay posición abierta pendiente de decisión activa',
]

const BIAS_TYPES = [
  'Overconfidence', 'Revenge trading', 'Loss aversion',
  'Recency bias', 'FOMO', 'Anchoring', 'Confirmation bias', 'Otro',
]

const TRADE_CLASSIFICATIONS = ['', 'Ganador-sistema', 'Ganador-suerte', 'Perdedor-sistema', 'Perdedor-error']

function loadChecklists() {
  try { return JSON.parse(localStorage.getItem(G9_CHECKLIST_KEY) || '{}') } catch { return {} }
}
function loadBiasLog() {
  try { return JSON.parse(localStorage.getItem(G9_BIAS_KEY) || '[]') } catch { return [] }
}

function BehavioralTool() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [checklists, setChecklists] = useState(loadChecklists)
  const [biasLog, setBiasLog] = useState(loadBiasLog)
  const [showBiasForm, setShowBiasForm] = useState(false)
  const [biasForm, setBiasForm] = useState({ date: today, bias: BIAS_TYPES[0], tradeRef: '', notes: '' })
  const [confirmDeleteBias, setConfirmDeleteBias] = useState(null)

  const dayData = checklists[date] || { preTrade: {}, emotionScore: '', postTrade: {} }

  function updateDay(patch) {
    const updated = { ...checklists, [date]: { ...dayData, ...patch } }
    setChecklists(updated)
    localStorage.setItem(G9_CHECKLIST_KEY, JSON.stringify(updated))
  }

  function togglePreTrade(idx) {
    const preTrade = { ...dayData.preTrade, [idx]: !dayData.preTrade[idx] }
    updateDay({ preTrade })
  }

  function setEmotion(v) { updateDay({ emotionScore: v }) }

  function setPostTrade(k, v) {
    const postTrade = { ...dayData.postTrade, [k]: v }
    updateDay({ postTrade })
  }

  function saveBias() {
    if (!biasForm.bias) return
    const entry = { id: Date.now(), ...biasForm }
    const updated = [entry, ...biasLog]
    setBiasLog(updated)
    localStorage.setItem(G9_BIAS_KEY, JSON.stringify(updated))
    setShowBiasForm(false)
    setBiasForm({ date: today, bias: BIAS_TYPES[0], tradeRef: '', notes: '' })
  }

  function deleteBias(id) {
    if (confirmDeleteBias !== id) { setConfirmDeleteBias(id); return }
    const updated = biasLog.filter(b => b.id !== id)
    setBiasLog(updated)
    localStorage.setItem(G9_BIAS_KEY, JSON.stringify(updated))
    setConfirmDeleteBias(null)
  }

  const preTradeCount = PRE_TRADE_ITEMS.filter((_, i) => dayData.preTrade[i]).length
  const emotionNum = parseFloat(dayData.emotionScore) || 0
  const emotionOk = emotionNum >= 6
  const allChecked = preTradeCount === PRE_TRADE_ITEMS.length && emotionOk
  const emotionColor = emotionNum >= 8 ? 'text-[#4ade80]' : emotionNum >= 6 ? 'text-[#ecd987]' : emotionNum > 0 ? 'text-[#ef4444]' : 'text-[#555]'

  const monthKey = today.slice(0, 7)
  const monthBiases = useMemo(() => biasLog.filter(b => b.date?.startsWith(monthKey)), [biasLog, monthKey])
  const biasFreq = useMemo(() => {
    const freq = {}
    for (const b of monthBiases) freq[b.bias] = (freq[b.bias] || 0) + 1
    return Object.entries(freq).sort((a, b) => b[1] - a[1])
  }, [monthBiases])

  return (
    <div className="space-y-3">
      <div className="border-2 border-[#a78bfa]">
        <div className="bg-[#0f0a1a] border-b border-[#a78bfa]/40 px-3 py-1.5 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-[#a78bfa]">
            Checklist Diario
            {allChecked && <span className="ml-2 text-[#4ade80]">— APTO PARA OPERAR</span>}
            {!allChecked && preTradeCount > 0 && <span className="ml-2 text-[#f59e0b]">— INCOMPLETO</span>}
          </span>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            className="bg-[#111] border border-[#333] text-[#777] text-xs font-mono px-2 py-0.5 focus:outline-none focus:border-[#a78bfa]"
          />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] divide-y lg:divide-y-0 lg:divide-x divide-[#222]">
          <div className="p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-2">
              Pre-trade ({preTradeCount}/{PRE_TRADE_ITEMS.length})
            </div>
            <div className="space-y-2">
              {PRE_TRADE_ITEMS.map((item, i) => (
                <label key={i} className="flex items-start gap-2.5 cursor-pointer group">
                  <div
                    onClick={() => togglePreTrade(i)}
                    className={`mt-0.5 h-4 w-4 shrink-0 border flex items-center justify-center cursor-pointer transition-colors ${
                      dayData.preTrade[i] ? 'border-[#4ade80] bg-[#4ade80]/20' : 'border-[#444] group-hover:border-[#666]'
                    }`}
                  >
                    {dayData.preTrade[i] && <span className="text-[#4ade80] text-[10px] font-bold">✓</span>}
                  </div>
                  <span className={`text-xs leading-relaxed ${dayData.preTrade[i] ? 'text-[#555] line-through' : 'text-[#aaa]'}`}>
                    {item}
                  </span>
                </label>
              ))}
            </div>
          </div>
          <div className="p-3 min-w-[220px]">
            <div className="mb-3">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1">Estado emocional (1-10)</div>
              <div className="flex items-center gap-2">
                <input
                  type="number" min="1" max="10" step="1"
                  value={dayData.emotionScore}
                  onChange={e => setEmotion(e.target.value)}
                  className="bg-[#111] border border-[#333] text-[#e5e5e5] font-mono text-lg px-2 py-1 w-16 focus:outline-none focus:border-[#a78bfa]"
                  placeholder="—"
                />
                <span className={`text-sm font-bold ${emotionColor}`}>
                  {emotionNum >= 8 ? 'Bueno' : emotionNum >= 6 ? 'Apto' : emotionNum > 0 ? 'NO OPERAR' : '—'}
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#555] mb-1">Post-trade (último)</div>
              <label className="block">
                <span className="text-[9px] text-[#444] uppercase tracking-wider">Clasificación</span>
                <select
                  value={dayData.postTrade.classification || ''}
                  onChange={e => setPostTrade('classification', e.target.value)}
                  className="mt-0.5 bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-1.5 py-1 w-full focus:outline-none focus:border-[#a78bfa]"
                >
                  {TRADE_CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="text-[9px] text-[#444] uppercase tracking-wider">Sesgo detectado (si aplica)</span>
                <select
                  value={dayData.postTrade.bias || ''}
                  onChange={e => setPostTrade('bias', e.target.value)}
                  className="mt-0.5 bg-[#111] border border-[#333] text-[#e5e5e5] text-xs px-1.5 py-1 w-full focus:outline-none focus:border-[#a78bfa]"
                >
                  <option value="">—</option>
                  {BIAS_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
        <div className="border-2 border-[#333]">
          <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5 flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">
              Registro de Sesgos ({biasLog.length})
            </span>
            <button
              onClick={() => setShowBiasForm(v => !v)}
              className="text-[10px] font-bold uppercase tracking-wider bg-[#ecd987] text-black px-2 py-0.5 hover:bg-white"
            >
              {showBiasForm ? 'Cancelar' : '+ Registrar sesgo'}
            </button>
          </div>
          {showBiasForm && (
            <div className="border-b border-[#222] grid grid-cols-2 sm:grid-cols-4">
              {[['Fecha', 'date', 'date', biasForm.date], ['Trade ref.', 'tradeRef', 'text', biasForm.tradeRef]].map(([label, key, type, val]) => (
                <label key={key} className="block p-2 border-r border-b border-[#222]">
                  <span className="block text-[9px] text-[#555] uppercase tracking-wider mb-1">{label}</span>
                  <input type={type} value={val} onChange={e => setBiasForm(f => ({ ...f, [key]: e.target.value }))}
                    className="bg-[#0a0a0a] border border-[#333] text-[#e5e5e5] text-xs font-mono px-1.5 py-1 w-full focus:outline-none focus:border-[#a78bfa]" />
                </label>
              ))}
              <label className="block p-2 border-r border-b border-[#222]">
                <span className="block text-[9px] text-[#555] uppercase tracking-wider mb-1">Tipo de sesgo</span>
                <select value={biasForm.bias} onChange={e => setBiasForm(f => ({ ...f, bias: e.target.value }))}
                  className="bg-[#0a0a0a] border border-[#333] text-[#e5e5e5] text-xs px-1.5 py-1 w-full focus:outline-none focus:border-[#a78bfa]">
                  {BIAS_TYPES.map(b => <option key={b}>{b}</option>)}
                </select>
              </label>
              <label className="block p-2 border-r border-b border-[#222] col-span-2 sm:col-span-1">
                <span className="block text-[9px] text-[#555] uppercase tracking-wider mb-1">Notas</span>
                <input type="text" value={biasForm.notes} onChange={e => setBiasForm(f => ({ ...f, notes: e.target.value }))}
                  className="bg-[#0a0a0a] border border-[#333] text-[#e5e5e5] text-xs px-1.5 py-1 w-full focus:outline-none focus:border-[#a78bfa]" />
              </label>
              <div className="p-2 border-b border-[#222] flex items-end">
                <button onClick={saveBias} className="w-full px-2 py-1.5 text-xs font-bold uppercase bg-[#a78bfa] text-black hover:bg-[#c4b5fd]">
                  Guardar
                </button>
              </div>
            </div>
          )}
          {biasLog.length === 0 ? (
            <div className="p-6 text-center text-[#444] text-xs uppercase tracking-wider">Sin sesgos registrados</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-[#111] border-b border-[#222] text-[#555]">
                    <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Fecha</th>
                    <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Sesgo</th>
                    <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Trade</th>
                    <th className="px-3 py-1.5 text-left font-bold uppercase tracking-widest">Notas</th>
                    <th className="px-3 py-1.5 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {biasLog.map(b => (
                    <tr key={b.id} className="border-b border-[#111] hover:bg-[#0a0a0a]">
                      <td className="px-3 py-1.5 font-mono text-[#555]">{b.date}</td>
                      <td className="px-3 py-1.5 font-bold text-[#a78bfa]">{b.bias}</td>
                      <td className="px-3 py-1.5 font-mono text-[#666]">{b.tradeRef || '—'}</td>
                      <td className="px-3 py-1.5 text-[#777] truncate max-w-[200px]">{b.notes || '—'}</td>
                      <td className="px-3 py-1.5 text-right">
                        {confirmDeleteBias === b.id ? (
                          <span className="flex gap-1 justify-end">
                            <button onClick={() => deleteBias(b.id)} className="text-[9px] text-[#ef4444] border border-[#ef4444] px-1">OK</button>
                            <button onClick={() => setConfirmDeleteBias(null)} className="text-[9px] text-[#555]">No</button>
                          </span>
                        ) : (
                          <button onClick={() => deleteBias(b.id)} className="text-[9px] text-[#333] hover:text-[#ef4444]">✕</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="border-2 border-[#333]">
          <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Este mes</span>
          </div>
          <div className="p-3 space-y-3">
            <div>
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Sesgos registrados</div>
              <div className="font-mono text-2xl font-bold text-[#a78bfa]">{monthBiases.length}</div>
            </div>
            {biasFreq.length > 0 && (
              <div>
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Top sesgos</div>
                <div className="space-y-1">
                  {biasFreq.slice(0, 4).map(([bias, count]) => (
                    <div key={bias} className="flex justify-between text-xs">
                      <span className="text-[#aaa] truncate">{bias}</span>
                      <span className="font-mono text-[#a78bfa] ml-2">{count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {biasFreq.some(([, c]) => c >= 3) && (
              <div className="border border-[#ef4444]/40 bg-[#1a0000] px-2 py-1.5 text-[10px] text-[#ef4444]">
                ≥3 instancias del mismo sesgo — revisar protocolo
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── G16 Decision Log Tool ────────────────────────────────────────────────────

const G16_SQL = `CREATE TABLE IF NOT EXISTS decision_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  category text NOT NULL DEFAULT 'Cambio de parametro',
  module text DEFAULT '',
  title text NOT NULL,
  description text DEFAULT '',
  context text DEFAULT '',
  hypothesis text DEFAULT '',
  prev_value text DEFAULT '',
  new_value text DEFAULT '',
  review_criteria text DEFAULT '',
  review_date date,
  status text DEFAULT 'open',
  outcome text DEFAULT ''
);
ALTER TABLE decision_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON decision_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);`

const DL_CATEGORIES = [
  'Cambio de parametro', 'Activacion de modulo', 'Pausa de modulo',
  'Nueva hipotesis macro', 'Cambio de universe', 'Revision metodologica', 'Override discrecional',
]

const DL_STATUS = {
  open:       { label: 'Abierto',     color: 'text-[#4ade80]',  border: 'border-[#4ade80]' },
  monitoring: { label: 'En revision', color: 'text-[#f59e0b]',  border: 'border-[#f59e0b]' },
  closed:     { label: 'Cerrado',     color: 'text-[#555]',     border: 'border-[#555]' },
}

const EMPTY_DL = {
  date: '', category: DL_CATEGORIES[0], module: '', title: '',
  description: '', context: '', hypothesis: '',
  prev_value: '', new_value: '', review_criteria: '', review_date: '',
}

function DLRow({ entry, isExpanded, onToggle, onUpdateStatus, onSaveOutcome, onDelete }) {
  const [outcomeText, setOutcomeText] = useState(entry.outcome || '')
  const status = DL_STATUS[entry.status] || DL_STATUS.open

  return (
    <Fragment>
      <tr
        className={`border-t border-[#111] cursor-pointer hover:bg-[#0a0a12] ${isExpanded ? 'bg-[#0a0a12]' : ''}`}
        onClick={onToggle}
      >
        <td className="px-3 py-2 font-mono text-[10px] text-[#777]">{entry.date}</td>
        <td className="px-3 py-2 text-[10px] text-[#aaa]">{entry.category}</td>
        <td className="px-3 py-2 font-mono text-[10px] text-[#555]">{entry.module || '—'}</td>
        <td className="px-3 py-2 text-xs font-bold text-[#ddd]">{entry.title}</td>
        <td className="px-3 py-2 font-mono text-[10px] text-[#555]">{entry.review_date || '—'}</td>
        <td className="px-3 py-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.label}</span>
        </td>
        <td className="px-3 py-2 text-[#444]">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-[#818cf8]/20 bg-[#06061a]">
          <td colSpan={7} className="px-4 py-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 mb-4">
              {[
                ['Descripcion (A → B)', entry.description],
                ['Contexto', entry.context],
                ['Hipotesis', entry.hypothesis],
                ['Criterio de revision', entry.review_criteria],
              ].filter(([, v]) => v).map(([label, val]) => (
                <div key={label}>
                  <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</div>
                  <p className="text-xs leading-relaxed text-[#aaa]">{val}</p>
                </div>
              ))}
              {(entry.prev_value || entry.new_value) && (
                <div>
                  <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#555]">Cambio de valor</div>
                  <p className="text-xs text-[#aaa]">
                    <span className="text-[#f87171]">{entry.prev_value || '—'}</span>
                    {' → '}
                    <span className="text-[#4ade80]">{entry.new_value || '—'}</span>
                  </p>
                </div>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#555]">Resultado posterior</div>
              <div className="flex gap-2">
                <textarea
                  value={outcomeText}
                  onChange={e => setOutcomeText(e.target.value)}
                  rows={2}
                  placeholder="Rellenar en la fecha de revision con datos reales..."
                  className="flex-1 resize-none border border-[#333] bg-black px-2 py-1.5 text-xs text-white placeholder-[#333] focus:border-[#818cf8] focus:outline-none"
                />
                <button
                  onClick={() => onSaveOutcome(entry.id, outcomeText)}
                  className="self-start border border-[#818cf8] px-2 py-1.5 text-[10px] font-bold text-[#818cf8] hover:bg-[#818cf8] hover:text-black"
                >
                  Guardar
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {entry.status !== 'monitoring' && (
                <button onClick={() => onUpdateStatus(entry.id, 'monitoring')}
                  className="border border-[#f59e0b] px-2 py-1 text-[10px] font-bold text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black">
                  En revision
                </button>
              )}
              {entry.status !== 'closed' && (
                <button onClick={() => onUpdateStatus(entry.id, 'closed')}
                  className="border border-[#444] px-2 py-1 text-[10px] font-bold text-[#555] hover:border-[#aaa] hover:text-[#aaa]">
                  Cerrar
                </button>
              )}
              {entry.status !== 'open' && (
                <button onClick={() => onUpdateStatus(entry.id, 'open')}
                  className="border border-[#333] px-2 py-1 text-[10px] font-bold text-[#444] hover:border-[#aaa] hover:text-[#aaa]">
                  Reabrir
                </button>
              )}
              <button onClick={() => onDelete(entry.id)}
                className="ml-auto border border-[#333] px-2 py-1 text-[10px] font-bold text-[#444] hover:border-[#f87171] hover:text-[#f87171]">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function DecisionLogTool() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ...EMPTY_DL, date: getToday() })
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('decision_log')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    if (error) setDbError(error.message)
    else { setEntries(data || []); setDbError(null) }
    setLoading(false)
  }

  async function addEntry() {
    if (!form.title.trim() || !form.date) return
    setSaving(true)
    const { error } = await supabase.from('decision_log').insert([{
      ...form, review_date: form.review_date || null,
    }])
    if (error) setDbError(error.message)
    else { setShowForm(false); setForm({ ...EMPTY_DL, date: getToday() }); await load() }
    setSaving(false)
  }

  async function updateStatus(id, status) {
    const { error } = await supabase.from('decision_log').update({ status }).eq('id', id)
    if (error) setDbError(error.message)
    else await load()
  }

  async function saveOutcome(id, outcome) {
    const { error } = await supabase.from('decision_log').update({ outcome }).eq('id', id)
    if (error) setDbError(error.message)
    else await load()
  }

  async function deleteEntry(id) {
    const { error } = await supabase.from('decision_log').delete().eq('id', id)
    if (error) setDbError(error.message)
    else { setExpandedId(null); await load() }
  }

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const filtered = entries.filter(e => filter === 'all' || e.status === filter)
  const counts = {
    all: entries.length,
    open: entries.filter(e => e.status === 'open').length,
    monitoring: entries.filter(e => e.status === 'monitoring').length,
    closed: entries.filter(e => e.status === 'closed').length,
  }

  if (loading) return <LoadingState />
  if (dbError && isTableMissing(dbError)) return <SetupRequired sql={G16_SQL} label="G16 Decision Log" onRetry={load} />

  return (
    <div className="border-2 border-[#818cf8]/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#333] bg-[#0a0a1a] px-3 py-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-[#818cf8]">Decision Log Estrategico</span>
        <button
          onClick={() => setShowForm(v => !v)}
          className="bg-[#818cf8] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#a5b4fc]"
        >
          {showForm ? 'Cancelar' : '+ Nueva Decision'}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-[#222]">
        {[['all', 'Todos'], ['open', 'Abierto'], ['monitoring', 'En revision'], ['closed', 'Cerrado']].map(([k, label]) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`border-r border-[#222] px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${
              filter === k ? 'bg-[#111] text-[#818cf8]' : 'text-[#555] hover:text-[#aaa]'
            }`}
          >
            {label} ({counts[k]})
          </button>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="border-b border-[#333] bg-[#06061a] p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[['Fecha *', 'date', 'date'], ['Titulo *', 'title', 'text'], ['Modulo', 'module', 'text']].map(([label, key, type]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</span>
                <input type={type} value={form[key]} onChange={e => setF(key, e.target.value)}
                  className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#818cf8] focus:outline-none" />
              </label>
            ))}
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Categoria</span>
              <select value={form.category} onChange={e => setF('category', e.target.value)}
                className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#818cf8] focus:outline-none">
                {DL_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              ['Descripcion (que cambia de A a B)', 'description'],
              ['Contexto (que lo detono)', 'context'],
              ['Hipotesis (que se espera mejorar)', 'hypothesis'],
              ['Criterio de revision', 'review_criteria'],
            ].map(([label, key]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</span>
                <textarea value={form[key]} onChange={e => setF(key, e.target.value)} rows={2}
                  className="resize-none border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#818cf8] focus:outline-none" />
              </label>
            ))}
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {[['Valor anterior', 'prev_value', 'text'], ['Valor nuevo', 'new_value', 'text'], ['Fecha revision', 'review_date', 'date']].map(([label, key, type]) => (
              <label key={key} className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</span>
                <input type={type} value={form[key]} onChange={e => setF(key, e.target.value)}
                  className="w-36 border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#818cf8] focus:outline-none" />
              </label>
            ))}
            <button onClick={addEntry} disabled={saving || !form.title.trim()}
              className="border border-[#818cf8] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#818cf8] hover:bg-[#818cf8] hover:text-black disabled:opacity-40">
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>
      )}

      {/* Error banner */}
      {dbError && !isTableMissing(dbError) && (
        <div className="border-b border-[#f87171]/20 bg-[#150000] px-3 py-2 text-[10px] text-[#f87171]">
          Error: {dbError}
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-[#444] uppercase tracking-widest">
          {filter === 'all' ? 'Sin entradas. Crea la primera decision.' : `Sin entradas con estado "${filter}".`}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead>
              <tr className="bg-[#0a0a0a] text-left">
                {['Fecha', 'Categoria', 'Modulo', 'Titulo', 'Rev.', 'Estado', ''].map(h => (
                  <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <DLRow
                  key={e.id}
                  entry={e}
                  isExpanded={expandedId === e.id}
                  onToggle={() => setExpandedId(expandedId === e.id ? null : e.id)}
                  onUpdateStatus={updateStatus}
                  onSaveOutcome={saveOutcome}
                  onDelete={deleteEntry}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── G17 Knowledge Transfer Tool ──────────────────────────────────────────────

const G17_SQL = `CREATE TABLE IF NOT EXISTS runbooks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  title text NOT NULL,
  category text DEFAULT 'Operativa',
  description text DEFAULT '',
  steps text DEFAULT '',
  last_tested date,
  status text DEFAULT 'active'
);
ALTER TABLE runbooks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON runbooks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS incident_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  cause text DEFAULT '',
  action_taken text DEFAULT '',
  outcome text DEFAULT '',
  runbook_updated boolean DEFAULT false,
  related_module text DEFAULT '',
  severity text DEFAULT 'low'
);
ALTER TABLE incident_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_full" ON incident_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);`

const RB_CATEGORIES = ['Operativa', 'Emergencia', 'Broker', 'Datos', 'Seguridad', 'Otro']

const INC_SEVERITY = {
  low:      { label: 'Bajo',    color: 'text-[#555]' },
  medium:   { label: 'Medio',   color: 'text-[#f59e0b]' },
  high:     { label: 'Alto',    color: 'text-[#fb923c]' },
  critical: { label: 'Critico', color: 'text-[#f87171]' },
}

const RB_STATUS = {
  active:   { label: 'Activo',        color: 'text-[#4ade80]' },
  outdated: { label: 'Desactualizado', color: 'text-[#f59e0b]' },
  archived: { label: 'Archivado',     color: 'text-[#555]' },
}

function RunbookRow({ rb, isExpanded, onToggle, onUpdate, onDelete }) {
  const [editMode, setEditMode] = useState(false)
  const [draft, setDraft] = useState({ title: rb.title, category: rb.category, description: rb.description, steps: rb.steps, last_tested: rb.last_tested || '', status: rb.status })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await onUpdate(rb.id, { ...draft, updated_at: new Date().toISOString(), last_tested: draft.last_tested || null })
    setEditMode(false)
    setSaving(false)
  }

  const status = RB_STATUS[rb.status] || RB_STATUS.active

  return (
    <Fragment>
      <tr
        className={`border-t border-[#111] cursor-pointer hover:bg-[#0a0a0a] ${isExpanded ? 'bg-[#0a0a0a]' : ''}`}
        onClick={onToggle}
      >
        <td className="px-3 py-2 text-xs font-bold text-[#ddd]">{rb.title}</td>
        <td className="px-3 py-2 text-[10px] text-[#777]">{rb.category}</td>
        <td className="px-3 py-2 font-mono text-[10px] text-[#555]">{rb.last_tested || '—'}</td>
        <td className="px-3 py-2">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.label}</span>
        </td>
        <td className="px-3 py-2 text-[#444]">
          {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </td>
      </tr>
      {isExpanded && (
        <tr className="border-t border-[#60a5fa]/10 bg-[#05080f]">
          <td colSpan={5} className="px-4 py-4">
            {!editMode ? (
              <>
                {rb.description && (
                  <div className="mb-3">
                    <div className="mb-0.5 text-[9px] font-bold uppercase tracking-wider text-[#555]">Descripcion</div>
                    <p className="text-xs leading-relaxed text-[#aaa]">{rb.description}</p>
                  </div>
                )}
                {rb.steps && (
                  <div className="mb-3">
                    <div className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[#555]">Pasos</div>
                    <pre className="whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-[#aaa]">{rb.steps}</pre>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => setEditMode(true)}
                    className="border border-[#60a5fa] px-2 py-1 text-[10px] font-bold text-[#60a5fa] hover:bg-[#60a5fa] hover:text-black">
                    Editar
                  </button>
                  <button
                    onClick={() => onUpdate(rb.id, { status: rb.status === 'active' ? 'outdated' : 'active' })}
                    className="border border-[#333] px-2 py-1 text-[10px] font-bold text-[#555] hover:border-[#aaa] hover:text-[#aaa]">
                    {rb.status === 'active' ? 'Marcar desact.' : 'Marcar activo'}
                  </button>
                  <button onClick={() => onDelete(rb.id)}
                    className="ml-auto border border-[#333] px-2 py-1 text-[10px] font-bold text-[#444] hover:border-[#f87171] hover:text-[#f87171]">
                    Eliminar
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[['Titulo', 'title', 'text'], ['Ultima prueba', 'last_tested', 'date']].map(([label, key, type]) => (
                    <label key={key} className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</span>
                      <input type={type} value={draft[key]} onChange={e => setDraft(d => ({ ...d, [key]: e.target.value }))}
                        className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                    </label>
                  ))}
                  <label className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Categoria</span>
                    <select value={draft.category} onChange={e => setDraft(d => ({ ...d, category: e.target.value }))}
                      className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none">
                      {RB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </label>
                </div>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Descripcion</span>
                  <input value={draft.description} onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Pasos (texto libre, uno por linea)</span>
                  <textarea value={draft.steps} onChange={e => setDraft(d => ({ ...d, steps: e.target.value }))} rows={6}
                    className="resize-none border border-[#333] bg-black px-2 py-1.5 font-mono text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                </label>
                <div className="flex gap-2">
                  <button onClick={save} disabled={saving}
                    className="border border-[#60a5fa] px-3 py-1.5 text-[10px] font-bold text-[#60a5fa] hover:bg-[#60a5fa] hover:text-black disabled:opacity-40">
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setEditMode(false)}
                    className="border border-[#333] px-3 py-1.5 text-[10px] font-bold text-[#555] hover:border-[#aaa] hover:text-[#aaa]">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function KnowledgeTransferTool() {
  const [tab, setTab] = useState('runbooks')

  // Runbooks
  const [runbooks, setRunbooks] = useState([])
  const [loadingRb, setLoadingRb] = useState(true)
  const [dbErrorRb, setDbErrorRb] = useState(null)
  const [showAddRb, setShowAddRb] = useState(false)
  const [rbForm, setRbForm] = useState({ title: '', category: RB_CATEGORIES[0], description: '', steps: '', last_tested: '' })
  const [savingRb, setSavingRb] = useState(false)
  const [expandedRb, setExpandedRb] = useState(null)

  // Incidents
  const [incidents, setIncidents] = useState([])
  const [loadingInc, setLoadingInc] = useState(true)
  const [dbErrorInc, setDbErrorInc] = useState(null)
  const [showAddInc, setShowAddInc] = useState(false)
  const [incForm, setIncForm] = useState({
    date: getToday(), description: '', cause: '', action_taken: '',
    outcome: '', runbook_updated: false, related_module: '', severity: 'low',
  })
  const [savingInc, setSavingInc] = useState(false)

  useEffect(() => { loadRunbooks(); loadIncidents() }, [])

  async function loadRunbooks() {
    setLoadingRb(true)
    const { data, error } = await supabase.from('runbooks').select('*').order('created_at', { ascending: false })
    if (error) setDbErrorRb(error.message)
    else { setRunbooks(data || []); setDbErrorRb(null) }
    setLoadingRb(false)
  }

  async function loadIncidents() {
    setLoadingInc(true)
    const { data, error } = await supabase.from('incident_log').select('*').order('date', { ascending: false })
    if (error) setDbErrorInc(error.message)
    else { setIncidents(data || []); setDbErrorInc(null) }
    setLoadingInc(false)
  }

  async function addRunbook() {
    if (!rbForm.title.trim()) return
    setSavingRb(true)
    const { error } = await supabase.from('runbooks').insert([{
      ...rbForm, last_tested: rbForm.last_tested || null,
    }])
    if (error) setDbErrorRb(error.message)
    else { setShowAddRb(false); setRbForm({ title: '', category: RB_CATEGORIES[0], description: '', steps: '', last_tested: '' }); await loadRunbooks() }
    setSavingRb(false)
  }

  async function updateRunbook(id, patch) {
    const { error } = await supabase.from('runbooks').update(patch).eq('id', id)
    if (error) setDbErrorRb(error.message)
    else await loadRunbooks()
  }

  async function deleteRunbook(id) {
    const { error } = await supabase.from('runbooks').delete().eq('id', id)
    if (error) setDbErrorRb(error.message)
    else { setExpandedRb(null); await loadRunbooks() }
  }

  async function addIncident() {
    if (!incForm.description.trim()) return
    setSavingInc(true)
    const { error } = await supabase.from('incident_log').insert([incForm])
    if (error) setDbErrorInc(error.message)
    else {
      setShowAddInc(false)
      setIncForm({ date: getToday(), description: '', cause: '', action_taken: '', outcome: '', runbook_updated: false, related_module: '', severity: 'low' })
      await loadIncidents()
    }
    setSavingInc(false)
  }

  async function deleteIncident(id) {
    const { error } = await supabase.from('incident_log').delete().eq('id', id)
    if (error) setDbErrorInc(error.message)
    else await loadIncidents()
  }

  const showSetup = (isTableMissing(dbErrorRb) || isTableMissing(dbErrorInc))

  if (showSetup) {
    return <SetupRequired sql={G17_SQL} label="G17 Knowledge Transfer" onRetry={() => { loadRunbooks(); loadIncidents() }} />
  }

  return (
    <div className="border-2 border-[#60a5fa]/30">
      {/* Tab bar */}
      <div className="flex border-b border-[#333] bg-[#05080f]">
        <div className="flex-1 flex">
          {[['runbooks', `Runbooks (${runbooks.length})`], ['incidents', `Incidentes (${incidents.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-[10px] font-bold uppercase tracking-wider border-r border-[#333] ${tab === key ? 'bg-[#111] text-[#60a5fa]' : 'text-[#555] hover:text-[#aaa]'}`}>
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => tab === 'runbooks' ? setShowAddRb(v => !v) : setShowAddInc(v => !v)}
          className="bg-[#60a5fa] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-black hover:bg-[#93c5fd]"
        >
          {tab === 'runbooks' ? (showAddRb ? 'Cancelar' : '+ Runbook') : (showAddInc ? 'Cancelar' : '+ Incidente')}
        </button>
      </div>

      {/* Runbooks tab */}
      {tab === 'runbooks' && (
        <>
          {showAddRb && (
            <div className="border-b border-[#222] bg-[#05080f] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Titulo *</span>
                  <input value={rbForm.title} onChange={e => setRbForm(f => ({ ...f, title: e.target.value }))}
                    className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Categoria</span>
                  <select value={rbForm.category} onChange={e => setRbForm(f => ({ ...f, category: e.target.value }))}
                    className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none">
                    {RB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Ultima prueba</span>
                  <input type="date" value={rbForm.last_tested} onChange={e => setRbForm(f => ({ ...f, last_tested: e.target.value }))}
                    className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Descripcion</span>
                <input value={rbForm.description} onChange={e => setRbForm(f => ({ ...f, description: e.target.value }))}
                  className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Pasos (texto libre, uno por linea)</span>
                <textarea value={rbForm.steps} onChange={e => setRbForm(f => ({ ...f, steps: e.target.value }))} rows={5}
                  className="resize-none border border-[#333] bg-black px-2 py-1.5 font-mono text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
              </label>
              <button onClick={addRunbook} disabled={savingRb || !rbForm.title.trim()}
                className="border border-[#60a5fa] px-4 py-1.5 text-xs font-bold text-[#60a5fa] hover:bg-[#60a5fa] hover:text-black disabled:opacity-40">
                {savingRb ? 'Guardando...' : 'Guardar runbook'}
              </button>
            </div>
          )}
          {loadingRb ? <LoadingState /> : runbooks.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#444] uppercase tracking-widest">Sin runbooks. Crea el primero.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]">
                <thead>
                  <tr className="bg-[#0a0a0a] text-left">
                    {['Titulo', 'Categoria', 'Ultima prueba', 'Estado', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {runbooks.map(rb => (
                    <RunbookRow key={rb.id} rb={rb}
                      isExpanded={expandedRb === rb.id}
                      onToggle={() => setExpandedRb(expandedRb === rb.id ? null : rb.id)}
                      onUpdate={updateRunbook}
                      onDelete={deleteRunbook}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Incidents tab */}
      {tab === 'incidents' && (
        <>
          {showAddInc && (
            <div className="border-b border-[#222] bg-[#05080f] p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[['Fecha *', 'date', 'date'], ['Modulo relacionado', 'related_module', 'text']].map(([label, key, type]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</span>
                    <input type={type} value={incForm[key]} onChange={e => setIncForm(f => ({ ...f, [key]: e.target.value }))}
                      className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                  </label>
                ))}
                <label className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Severidad</span>
                  <select value={incForm.severity} onChange={e => setIncForm(f => ({ ...f, severity: e.target.value }))}
                    className="border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none">
                    {Object.entries(INC_SEVERITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </label>
                <label className="flex items-end gap-2 pb-1.5">
                  <input type="checkbox" checked={incForm.runbook_updated}
                    onChange={e => setIncForm(f => ({ ...f, runbook_updated: e.target.checked }))}
                    className="accent-[#60a5fa]" />
                  <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">Runbook actualizado</span>
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  ['Descripcion *', 'description'],
                  ['Causa', 'cause'],
                  ['Accion tomada', 'action_taken'],
                  ['Resultado', 'outcome'],
                ].map(([label, key]) => (
                  <label key={key} className="flex flex-col gap-1">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-[#555]">{label}</span>
                    <textarea value={incForm[key]} onChange={e => setIncForm(f => ({ ...f, [key]: e.target.value }))} rows={2}
                      className="resize-none border border-[#333] bg-black px-2 py-1.5 text-xs text-white focus:border-[#60a5fa] focus:outline-none" />
                  </label>
                ))}
              </div>
              <button onClick={addIncident} disabled={savingInc || !incForm.description.trim()}
                className="border border-[#60a5fa] px-4 py-1.5 text-xs font-bold text-[#60a5fa] hover:bg-[#60a5fa] hover:text-black disabled:opacity-40">
                {savingInc ? 'Guardando...' : 'Registrar incidente'}
              </button>
            </div>
          )}
          {loadingInc ? <LoadingState /> : incidents.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#444] uppercase tracking-widest">Sin incidentes registrados.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px]">
                <thead>
                  <tr className="bg-[#0a0a0a] text-left">
                    {['Fecha', 'Severidad', 'Descripcion', 'Modulo', 'Runbook act.', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {incidents.map(inc => {
                    const sev = INC_SEVERITY[inc.severity] || INC_SEVERITY.low
                    return (
                      <tr key={inc.id} className="border-t border-[#111] hover:bg-[#0a0a0a] group">
                        <td className="px-3 py-2 font-mono text-[10px] text-[#777]">{inc.date}</td>
                        <td className={`px-3 py-2 text-[10px] font-bold ${sev.color}`}>{sev.label}</td>
                        <td className="px-3 py-2 text-xs text-[#ddd] max-w-[280px] truncate">{inc.description}</td>
                        <td className="px-3 py-2 font-mono text-[10px] text-[#555]">{inc.related_module || '—'}</td>
                        <td className={`px-3 py-2 text-[10px] font-bold ${inc.runbook_updated ? 'text-[#4ade80]' : 'text-[#444]'}`}>
                          {inc.runbook_updated ? 'Si' : 'No'}
                        </td>
                        <td className="px-3 py-2 opacity-0 group-hover:opacity-100">
                          <button onClick={() => deleteIncident(inc.id)}
                            className="text-[10px] text-[#444] hover:text-[#f87171]">✕</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Module reference data ────────────────────────────────────────────────────

const MODULES = {
  behavioralFinance: {
    code: 'G9',
    title: 'Behavioral Finance / Psicologia del Operador',
    subtitle: 'Disciplina, sesgos y control del estado del operador como variable del sistema.',
    horizon: 'Continuo',
    accent: 'text-[#a78bfa]',
    border: 'border-[#a78bfa]',
    principle: 'El operador es una variable del sistema. Los mejores parametros y señales no sobreviven a un operador en modo reactivo, agotado o con P&L emocional. La disciplina no es opcional: es un circuit breaker mas, y el unico que el sistema no puede ejecutar automaticamente.',
    input: 'Journal, estado fisico y emocional, P&L actual vs limites semanales y mensuales, historial de errores recurrentes y drawdowns recientes.',
    output: 'Protocolos de autocontrol, bloqueos, cooldowns activos, metricas de disciplina y feed al protocolo de mejora continua de Self-Awareness.',
    biases: [
      ['Overconfidence', 'Sizing excesivo tras racha de ganadores', 'RPT > 1.5x default en 2 trades seguidos'],
      ['Revenge trading', 'Re-entrada rapida tras stop para recuperar', 'Nueva orden en <15 min post-stop'],
      ['Loss aversion', 'No cerrar posicion en stop porque "vuelve"', 'Stop superado >0.5R sin cierre'],
      ['Recency bias', 'Ignorar señal valida por perdida reciente similar', 'Override sin log documentado'],
      ['FOMO', 'Entrar sin setup por miedo a perder el movimiento', 'Ningun setup documentado en la entrada'],
      ['Anchoring', 'Decisiones referenciadas al precio de entrada, no al mercado', '"Precio de entrada" aparece en la justificacion'],
      ['Confirmation bias', 'Buscar solo fuentes que confirmen la tesis activa', 'Una sola fuente citada en el analisis'],
    ],
    cooldowns: [
      ['2 stops consecutivos en el dia', 'Pausa operativa', 'Resto del dia sin nuevas entradas'],
      ['DD semanal >50% del limite', 'Sizing −50%', 'Durante la semana siguiente completa'],
      ['Override sin log documentado', 'Revision inmediata obligatoria', 'Hasta justificar por escrito'],
      ['Estado emocional <6', 'No operar', 'Hasta recuperar nivel 7 o superior'],
      ['5 ganadores seguidos (overconfidence)', 'Revisar sizing antes del siguiente trade', 'Inmediata'],
      ['Trade de revenge identificado a posteriori', 'Pausa + log de sesgo', '24h minimo'],
    ],
    metrics: [
      ['Trades con setup documentado', '>95%', '<90% dispara alerta'],
      ['Override rate mensual', '<5%', '>10% dispara alerta'],
      ['Re-entries en <15 min post-stop', '0', '>2 en el mes dispara alerta'],
      ['Pre-trade checklist compliance', '>95%', '<85% dispara alerta'],
      ['Journal fill rate', '>95%', '<80% dispara alerta'],
      ['Dias operados con estado emocional <6', '0', '>1 en el mes dispara alerta'],
    ],
    pipeline: [
      'Check diario pre-mercado: estado fisico y emocional en escala 1-10.',
      'Revisar P&L actual vs limites semanal y mensual.',
      'Si condicion de cooldown activa: documentar y respetar sin excepciones.',
      'Completar pre-trade checklist antes de cada operacion.',
      'Ejecutar el trade segun la señal; no modificar el setup en caliente.',
      'Post-trade: registro inmediato en Journal con clasificacion y sesgo si aplica.',
      'Revision semanal: patron de errores y calculo de metricas de disciplina.',
    ],
    errors: [
      'Operar sin completar el pre-trade checklist.',
      'Justificar overrides como "intuicion" sin documentar el razonamiento.',
      'Ignorar el cooldown para "recuperar perdidas" — el cooldown existe exactamente para ese momento.',
      'Medir solo el P&L y olvidar las metricas de proceso (compliance, override rate, fill rate).',
      'Promediar una posicion perdedora porque "se que vuelve".',
      'No distinguir entre perdedor-sistema (correcto, el sistema fallo) y perdedor-error (evitable).',
    ],
  },

  decisionLog: {
    code: 'G16',
    title: 'Decision Log Estrategico',
    subtitle: 'Registro auditado de decisiones estructurales del framework con contexto, hipotesis y revision posterior.',
    horizon: 'Continuo',
    accent: 'text-[#818cf8]',
    border: 'border-[#818cf8]',
    principle: 'Toda decision que cambia el framework o la operativa debe quedar registrada con su contexto completo antes de ejecutarse. Sin log, el sistema pierde memoria institucional y no puede distinguir entre un cambio correcto y un ajuste reactivo a corto plazo que parecio buena idea en el momento.',
    input: 'Cambios de parametros, activaciones de modulo, pausas, nuevas hipotesis, overrides discrecionales y revisiones metodologicas.',
    output: 'Bitacora estrategica auditada con contexto, decision exacta, hipotesis, criterio de revision e impacto observado posterior.',
    categories: [
      ['Cambio de parametro', 'RPT, ATR multiplier, umbral sigma, pesos de scoring', 'Alta — log antes de ejecutar el cambio'],
      ['Activacion de modulo', 'Activar G10 Capa 2, G11 Capa 3, nuevo par elegible', 'Alta — log antes de operar'],
      ['Pausa de modulo', 'Pausar operativa por DD, regimen adverso o revision', 'Alta — log inmediato'],
      ['Nueva hipotesis macro', 'Nuevo driver en Endogenous, cambio de sesgo en World View', 'Media — antes de testear en vivo'],
      ['Cambio de universe', 'Agregar par, instrumento o contraparte elegible', 'Media — antes de operar'],
      ['Revision metodologica', 'Cambio en calculo z-score, scoring o pipeline', 'Alta — log + backtest previo requerido'],
      ['Override discrecional', 'No seguir la señal del sistema en un trade concreto', 'Alta — log antes del trade, no a posteriori'],
    ],
    templateFields: [
      'Timestamp exacto (fecha y hora)',
      'Categoria (de la tabla anterior)',
      'Modulo o componente afectado',
      'Descripcion exacta: que pasa de A a B (sin ambigüedad)',
      'Contexto: que lo detono, que estaba ocurriendo en el mercado o en el sistema',
      'Hipotesis: que se espera que mejore y por que (cuantificar si es posible)',
      'Valor anterior vs nuevo (si es cambio de parametro)',
      'Criterio de revision: cuando y como se evaluara (fecha y metrica)',
      'Estado: Activo / En revision / Cerrado',
      'Resultado posterior: rellenar en la fecha de revision, nunca al crear la entrada',
    ],
    reviewCadence: [
      ['Mensual', 'Revisar entradas del mes; actualizar estados; detectar patrones de cambio', 'Primer lunes del mes'],
      ['Trimestral', 'Revisar entradas "En revision" con fecha de criterio vencida', 'Inicio de trimestre'],
      ['Anual', 'Audit completo; archivar entradas cerradas; identificar patron anual de cambios', 'Primera semana de enero'],
    ],
    pipeline: [
      'Identificar que la decision es estructural (cambia algo permanente del sistema).',
      'Rellenar template completo antes de ejecutar el cambio; no al reves.',
      'Notificar en G17 Knowledge Transfer si el cambio afecta a runbooks operativos.',
      'Ejecutar el cambio con el log ya cerrado y timestamped.',
      'Marcar la fecha concreta del criterio de revision en el calendario.',
      'En la fecha de revision: rellenar resultado posterior con datos reales.',
      'Cerrar la entrada o escalar a G15 Model Governance si afecta a la metodologia.',
    ],
    errors: [
      'Hacer cambios de parametro "en caliente" sin log previo — aunque el cambio parezca trivial.',
      'Registrar solo los cambios exitosos y omitir los que fallaron o se revirtieron.',
      'No definir el criterio de revision al crear la entrada — sin criterio no hay aprendizaje.',
      'Confundir Decision Log (cambios del framework) con Trade Journal (operaciones individuales).',
      'Dejar entradas con estado "Activo" indefinidamente sin fecha de revision concreta.',
      'Usar lenguaje vago: "mejorar el sistema" no es una hipotesis; "reducir override rate de 12% a <5% en 3 meses" si lo es.',
    ],
  },

  knowledgeTransfer: {
    code: 'G17',
    title: 'Knowledge Transfer Protocol',
    subtitle: 'Documentacion, handoff y continuidad del conocimiento operativo del sistema.',
    horizon: 'Continuo',
    accent: 'text-[#60a5fa]',
    border: 'border-[#60a5fa]',
    principle: 'El sistema debe funcionar igual si el operador regresa despues de 3 meses de ausencia o si un segundo operador toma el relevo. Lo que no esta documentado no existe operativamente. Toda optimizacion de parametros que no esta en un runbook se pierde en la siguiente crisis o cambio de persona.',
    input: 'Runbooks, Decision Log (G16), parametros actuales, posiciones abiertas, accesos, calendario de eventos proximas 4 semanas y contactos de soporte.',
    output: 'Framework documentado y vivo, protocolo de onboarding estructurado, checklists de handoff y cadencia de mantenimiento documental.',
    documents: [
      ['Framework Master', 'Descripcion completa de modulos, logica y arquitectura del sistema', 'Cada cambio mayor de metodologia'],
      ['Runbook diario', 'Pasos exactos del ciclo operativo diario incluyendo decisiones', 'Cada cambio de proceso operativo'],
      ['Runbook de emergencia', 'Failover, broker caido, datos perdidos, accesos bloqueados', 'Tras cada incidente real; revision trimestral'],
      ['Parametros actuales', 'Tabla de todos los parametros en vigor con fecha del ultimo cambio', 'Inmediato tras cada cambio de parametro'],
      ['Decision Log (G16)', 'Registro de cambios estructurales del framework', 'Continuo'],
      ['Trade Journal', 'Registro de operaciones individuales con clasificacion', 'Continuo'],
      ['Backtest Registry', 'Resultados de validaciones formales con metodologia', 'Tras cada backtest ejecutado'],
      ['Onboarding Guide', 'Guia para nuevo operador o retorno de baja prolongada', 'Revision trimestral minimo'],
    ],
    runbookStructure: [
      'Objetivo: que cubre este runbook, cuando usarlo y quien es el responsable.',
      'Prerequisitos: accesos, herramientas, datos y estado del sistema requeridos antes de empezar.',
      'Pasos detallados y numerados sin ambigüedad — cada paso tiene un output verificable.',
      'Puntos de decision: si/no con criterio explicito (ej: "si DD >8%, ir al paso 9").',
      'Escalado: que hacer si algo falla o el output esperado no aparece.',
      'Contactos de emergencia: broker, datos, soporte tecnico con horarios disponibles.',
      'Version y fecha de ultima actualizacion al inicio del documento.',
    ],
    onboarding: [
      ['Semana 1', 'Lectura Framework Master completo + Decision Log de los ultimos 6 meses. Sin operar.'],
      ['Semana 2', 'Paper trading siguiendo el runbook operativo diario al pie de la letra. Log de dudas.'],
      ['Semana 3', 'Live con sizing al 25% del default. Revision diaria de cada decision tomada.'],
      ['Semana 4', 'Sizing al 50% si semana 3 sin errores de proceso. Revision semanal con el sistema.'],
      ['Mes 2+', 'Incremento gradual hasta full sizing. Criterio: 0 overrides sin log en 4 semanas consecutivas.'],
    ],
    handoffChecklist: [
      'Framework Master actualizado con fecha de ultima revision.',
      'Parametros actuales documentados con fecha del ultimo cambio.',
      'Decision Log sin entradas "Activo" sin fecha de revision asignada.',
      'Runbooks validados en los ultimos 3 meses.',
      'Accesos transferidos: broker, plataforma de datos, herramientas de la app.',
      'Posiciones abiertas documentadas con señal, stop, target y horizonte.',
      'Calendario de eventos proximas 4 semanas anotado con nivel de riesgo.',
      'Contactos de soporte actualizados y verificados.',
    ],
    maintenance: [
      ['Runbook diario', 'Revision mensual', 'Operador activo'],
      ['Runbook emergencia', 'Revision trimestral + simulacro real', 'Operador activo'],
      ['Framework Master', 'Revision semestral', 'Operador activo'],
      ['Onboarding Guide', 'Revision anual', 'Operador activo'],
      ['Parametros actuales', 'Inmediato tras cada cambio de parametro', 'Quien ejecuta el cambio'],
      ['Backtest Registry', 'Inmediato tras cada backtest', 'Quien ejecuta el backtest'],
    ],
    pipeline: [
      'Identificar cambio que requiere actualizacion documental (parametro, proceso, incidente).',
      'Actualizar el documento afectado el mismo dia del cambio; nunca diferir.',
      'Verificar que Decision Log (G16) tiene la entrada correspondiente si es cambio estructural.',
      'Si afecta al runbook diario: hacer un dry-run del runbook actualizado para verificar coherencia.',
      'En revision mensual: confirmar que Parametros Actuales coincide con el sistema real.',
      'En revision trimestral: simulacro de Runbook Emergencia para detectar pasos desactualizados.',
      'Antes de cualquier handoff: completar Handoff Checklist al 100% sin excepciones.',
    ],
    errors: [
      'Documentar el "que" de cada paso pero no el "por que" — el contexto es lo que se pierde con el tiempo.',
      'Asumir que el proximo operador tiene el mismo contexto implícito que el actual.',
      'No actualizar el runbook cuando se cambia un proceso — la documentacion desactualizada es peor que no tenerla.',
      'Tener documentacion dispersa en varios lugares sin un master claro y versionado.',
      'Confundir "esta documentado en el codigo de la app" con "esta en un runbook operativo".',
      'Hacer el handoff checklist de memoria en lugar de ejecutarlo punto por punto con el receptor.',
    ],
  },
}

// ── Reference content sections ────────────────────────────────────────────────

function BehavioralFinanceRef({ mod }) {
  return (
    <>
      <Section title="Inventario de sesgos" icon={Brain}>
        <DataTable headers={['Sesgo', 'Descripcion', 'Señal de alerta']} rows={mod.biases} />
      </Section>
      <Section title="Cooldown triggers" icon={ShieldAlert} className="mt-4">
        <DataTable headers={['Condicion', 'Accion', 'Duracion']} rows={mod.cooldowns} />
      </Section>
      <Section title="Metricas de disciplina" icon={SlidersHorizontal} className="mt-4">
        <DataTable headers={['Metrica', 'Objetivo', 'Nivel de alerta']} rows={mod.metrics} />
      </Section>
    </>
  )
}

function DecisionLogRef({ mod }) {
  return (
    <>
      <Section title="Categorias de decision" icon={ClipboardList}>
        <DataTable headers={['Categoria', 'Ejemplos', 'Prioridad']} rows={mod.categories} />
      </Section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.8fr]">
        <Section title="Template: campos obligatorios" icon={FileText}>
          <div className="p-3"><BulletList items={mod.templateFields} /></div>
        </Section>
        <Section title="Cadencia de revision" icon={Calendar}>
          <div className="grid gap-0">
            {mod.reviewCadence.map(([freq, action, moment]) => (
              <div key={freq} className="border-b border-[#222] p-3">
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{freq}</span>
                  <span className="font-mono text-[10px] text-[#555]">{moment}</span>
                </div>
                <p className="text-xs leading-relaxed text-[#aaa]">{action}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </>
  )
}

function KnowledgeTransferRef({ mod }) {
  return (
    <>
      <Section title="Inventario documental" icon={FileText}>
        <DataTable headers={['Documento', 'Descripcion', 'Actualizar cuando']} rows={mod.documents} />
      </Section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Estructura de runbook" icon={ListChecks}>
          <div className="p-3"><BulletList items={mod.runbookStructure} /></div>
        </Section>
        <Section title="Protocolo de onboarding" icon={Users}>
          <div className="grid gap-0">
            {mod.onboarding.map(([phase, desc]) => (
              <div key={phase} className="border-b border-[#222] p-3">
                <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{phase}</div>
                <p className="text-xs leading-relaxed text-[#aaa]">{desc}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Section title="Handoff checklist" icon={CheckCircle2}>
          <div className="grid gap-0 sm:grid-cols-2">
            {mod.handoffChecklist.map((item) => (
              <div key={item} className="flex gap-2 border-b border-r border-[#222] p-3">
                <span className="mt-0.5 shrink-0 font-mono text-xs text-[#444]">[ ]</span>
                <span className="text-xs leading-relaxed text-[#aaa]">{item}</span>
              </div>
            ))}
          </div>
        </Section>
        <Section title="Cadencia de mantenimiento" icon={Clock}>
          <DataTable headers={['Documento', 'Frecuencia', 'Responsable']} rows={mod.maintenance} />
        </Section>
      </div>
    </>
  )
}

// ── Page header ──────────────────────────────────────────────────────────────

function PageHeader({ mod, children }) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className={`font-mono text-[10px] font-bold uppercase tracking-widest ${mod.accent}`}>{mod.code}</p>
        <h1 className="mt-0.5 text-2xl font-bold uppercase tracking-widest">{mod.title}</h1>
        <p className="mt-1 max-w-4xl text-sm text-[#888]">{mod.subtitle}</p>
      </div>
      {children}
    </div>
  )
}

function PrincipleIO({ mod }) {
  return (
    <div className="mb-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="border-2 border-[#333] p-4">
        <div className={`mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest ${mod.accent}`}>
          <BookOpen size={15} /> Principio central
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
    </div>
  )
}

// ── Named exports ────────────────────────────────────────────────────────────

export function BehavioralFinancePage() {
  const mod = MODULES.behavioralFinance
  const [showRef, setShowRef] = useState(false)

  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod}>
          <div className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
            Operativo / {mod.horizon}
          </div>
        </PageHeader>
        <BehavioralTool />
        <RefToggle open={showRef} onToggle={() => setShowRef(v => !v)} />
        {showRef && (
          <div className="mt-4 space-y-4">
            <PrincipleIO mod={mod} />
            <BehavioralFinanceRef mod={mod} />
            <Section title="Pipeline operativo" icon={Route}>
              <Pipeline steps={mod.pipeline} accent={mod.accent} />
            </Section>
            <Section title="Errores especificos a evitar" icon={AlertTriangle}>
              <div className="p-3"><BulletList items={mod.errors} /></div>
            </Section>
          </div>
        )}
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Datos persistidos en localStorage del navegador.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export function DecisionLogPage() {
  const mod = MODULES.decisionLog
  const [showRef, setShowRef] = useState(false)

  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod}>
          <div className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
            Operativo — Supabase / {mod.horizon}
          </div>
        </PageHeader>
        <DecisionLogTool />
        <RefToggle open={showRef} onToggle={() => setShowRef(v => !v)} />
        {showRef && (
          <div className="mt-4 space-y-4">
            <PrincipleIO mod={mod} />
            <DecisionLogRef mod={mod} />
            <Section title="Pipeline operativo" icon={Route}>
              <Pipeline steps={mod.pipeline} accent={mod.accent} />
            </Section>
            <Section title="Errores especificos a evitar" icon={AlertTriangle}>
              <div className="p-3"><BulletList items={mod.errors} /></div>
            </Section>
          </div>
        )}
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Datos persistidos en Supabase.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export function KnowledgeTransferPage() {
  const mod = MODULES.knowledgeTransfer
  const [showRef, setShowRef] = useState(false)

  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod}>
          <div className={`shrink-0 border px-3 py-2 text-[10px] font-bold uppercase tracking-widest ${mod.border} ${mod.accent}`}>
            Operativo — Supabase / {mod.horizon}
          </div>
        </PageHeader>
        <KnowledgeTransferTool />
        <RefToggle open={showRef} onToggle={() => setShowRef(v => !v)} />
        {showRef && (
          <div className="mt-4 space-y-4">
            <PrincipleIO mod={mod} />
            <KnowledgeTransferRef mod={mod} />
            <Section title="Pipeline operativo" icon={Route}>
              <Pipeline steps={mod.pipeline} accent={mod.accent} />
            </Section>
            <Section title="Errores especificos a evitar" icon={AlertTriangle}>
              <div className="p-3"><BulletList items={mod.errors} /></div>
            </Section>
          </div>
        )}
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Runbooks e incidentes persistidos en Supabase.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Dashboard</Link>
        </div>
      </div>
    </div>
  )
}
