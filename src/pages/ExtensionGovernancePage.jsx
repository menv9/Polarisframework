import { useState, useMemo, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileText,
  GitBranch,
  Layers,
  Plus,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  Users,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

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

function ParamTable({ rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] table-fixed text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            <th className="w-[42%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Regla</th>
            <th className="w-[20%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Default</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Razon</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([p, v, r]) => (
            <tr key={p} className="border-t border-[#111]">
              <td className="px-3 py-2 text-[#ddd]">{p}</td>
              <td className="px-3 py-2 font-mono text-white">{v}</td>
              <td className="px-3 py-2 text-xs text-[#777]">{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function MetricTable({ rows, accent }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-[#111] text-left">
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Metrica</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Minimo</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Objetivo</th>
            <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Señal de alerta</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([metric, min, target, alert]) => (
            <tr key={metric} className="border-t border-[#111]">
              <td className="px-3 py-2 font-bold text-[#ddd]">{metric}</td>
              <td className={`px-3 py-2 font-mono text-xs ${accent}`}>{min}</td>
              <td className={`px-3 py-2 font-mono text-xs font-bold ${accent}`}>{target}</td>
              <td className="px-3 py-2 text-xs text-[#f87171]">{alert}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

function SupabasePending({ label }) {
  return (
    <div className="flex items-start gap-3 border-2 border-[#333] bg-[#0a0a0a] p-4">
      <Database size={16} className="mt-0.5 shrink-0 text-[#555]" />
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-[#555]">Funcionalidad pendiente — Supabase</p>
        <p className="mt-1 text-xs leading-relaxed text-[#444]">
          {label} requiere persistencia en base de datos para ser util entre sesiones y dispositivos.
          Esta pantalla actualmente muestra la referencia documental. La funcionalidad operativa se conectara a Supabase en el Grupo 1.
        </p>
      </div>
    </div>
  )
}

const getToday = () => new Date().toISOString().slice(0, 10)

function isTableMissing(msg) {
  return msg && (msg.includes('does not exist') || msg.includes('relation') || msg.includes('permission denied'))
}

function LoadingState() {
  return (
    <div className="border-2 border-[#333] p-8 text-center text-[10px] uppercase tracking-widest text-[#444]">
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
        Ejecuta este SQL en Supabase para activar {label}:
      </p>
      <pre className="overflow-x-auto whitespace-pre-wrap border border-[#222] bg-[#050505] p-3 font-mono text-[10px] leading-relaxed text-[#777]">
        {sql}
      </pre>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border border-[#f59e0b] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#f59e0b] hover:bg-[#f59e0b] hover:text-black"
        >
          Reintentar
        </button>
      )}
    </div>
  )
}

// ── G13 Multi-Broker Tool ────────────────────────────────────────────────────

const G13_TOTAL_KEY = 'polaris_g13_total'
const G13_BROKERS_KEY = 'polaris_g13_brokers'

const BROKER_ROLES = ['Principal (Core)', 'Capa 2 / 3', 'Emergencia / Failover', 'Testing']

function fmt(n) {
  return n.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function MultiBrokerTool() {
  const [totalCapital, setTotalCapital] = useState(() => {
    return localStorage.getItem(G13_TOTAL_KEY) || ''
  })
  const [brokers, setBrokers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(G13_BROKERS_KEY)) || [] } catch { return [] }
  })
  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState(BROKER_ROLES[0])
  const [newTargetPct, setNewTargetPct] = useState('')

  const total = parseFloat(totalCapital) || 0

  const totalPct = useMemo(() => brokers.reduce((s, b) => s + b.targetPct, 0), [brokers])

  function saveBrokers(next) {
    setBrokers(next)
    localStorage.setItem(G13_BROKERS_KEY, JSON.stringify(next))
  }

  function saveTotal(val) {
    setTotalCapital(val)
    localStorage.setItem(G13_TOTAL_KEY, val)
  }

  function addBroker() {
    const pct = parseFloat(newTargetPct)
    if (!newName || isNaN(pct) || pct <= 0) return
    const entry = { id: Date.now(), name: newName, role: newRole, targetPct: pct }
    saveBrokers([...brokers, entry])
    setNewName('')
    setNewTargetPct('')
  }

  function deleteBroker(id) {
    saveBrokers(brokers.filter((b) => b.id !== id))
  }

  function brokerStatus(b) {
    if (!b.role.includes('Emergencia') && b.targetPct > 60) {
      return { ok: false, msg: `${b.targetPct}% > limite 60%` }
    }
    if (b.role.includes('Emergencia') && b.targetPct < 10) {
      return { ok: false, msg: `${b.targetPct}% < minimo emergencia 10%` }
    }
    return { ok: true, msg: 'OK' }
  }

  return (
    <div className="border-2 border-[#34d39933]">
      <div className="flex items-center gap-2 border-b border-[#333] bg-[#001a0d] px-3 py-1.5">
        <BarChart3 size={14} className="text-[#34d399]" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#34d399]">Asignacion de Capital Multi-Broker</span>
      </div>
      <div className="p-4">
        {/* Total capital */}
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-[#555]">Capital total del sistema (€ / $)</span>
            <input
              type="number"
              value={totalCapital}
              onChange={(e) => saveTotal(e.target.value)}
              placeholder="100000"
              className="w-44 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#34d399] focus:outline-none"
            />
          </label>
          {total > 0 && (
            <div className="pb-2 text-xs text-[#555]">
              Asignado: <span className={`font-mono font-bold ${totalPct > 100 ? 'text-[#f87171]' : totalPct === 100 ? 'text-[#4ade80]' : 'text-[#fbbf24]'}`}>{totalPct.toFixed(1)}%</span>
              {totalPct !== 100 && (
                <span className="ml-2 text-[#444]">({totalPct < 100 ? `${(100 - totalPct).toFixed(1)}% sin asignar` : `${(totalPct - 100).toFixed(1)}% exceso`})</span>
              )}
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
              className="w-48 border border-[#333] bg-black px-3 py-2 text-sm text-white placeholder-[#333] focus:border-[#34d399] focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-[#555]">Rol</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="border border-[#333] bg-black px-3 py-2 text-sm text-white focus:border-[#34d399] focus:outline-none"
            >
              {BROKER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-widest text-[#555]">Target %</span>
            <input
              type="number"
              value={newTargetPct}
              onChange={(e) => setNewTargetPct(e.target.value)}
              placeholder="55"
              min="1"
              max="100"
              className="w-24 border border-[#333] bg-black px-3 py-2 font-mono text-sm text-white placeholder-[#333] focus:border-[#34d399] focus:outline-none"
            />
          </label>
          <button
            type="button"
            onClick={addBroker}
            className="flex items-center gap-1 border border-[#34d399] px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#34d399] hover:bg-[#34d399] hover:text-black"
          >
            <Plus size={13} /> Agregar
          </button>
        </div>

        {/* Broker table */}
        {brokers.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-[#111] text-left">
                  {['Broker', 'Rol', 'Target %', 'Capital asignado', 'Estado', ''].map((h) => (
                    <th key={h} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {brokers.map((b) => {
                  const assigned = total > 0 ? total * (b.targetPct / 100) : null
                  const status = brokerStatus(b)
                  return (
                    <tr key={b.id} className="border-t border-[#111]">
                      <td className="px-3 py-2 font-bold text-[#ddd]">{b.name}</td>
                      <td className="px-3 py-2 text-xs text-[#aaa]">{b.role}</td>
                      <td className={`px-3 py-2 font-mono text-sm font-bold ${status.ok ? 'text-[#34d399]' : 'text-[#f87171]'}`}>
                        {b.targetPct}%
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-white">
                        {assigned !== null ? fmt(assigned) : '—'}
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
              <tfoot>
                <tr className="border-t-2 border-[#333] bg-[#0a0a0a]">
                  <td colSpan={2} className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Total</td>
                  <td className={`px-3 py-2 font-mono text-sm font-bold ${totalPct > 100 ? 'text-[#f87171]' : totalPct === 100 ? 'text-[#4ade80]' : 'text-[#fbbf24]'}`}>
                    {totalPct.toFixed(1)}%
                  </td>
                  <td className="px-3 py-2 font-mono text-xs font-bold text-white">
                    {total > 0 ? fmt(total * (totalPct / 100)) : '—'}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-xs text-[#444]">Sin brokers configurados. Agrega tus cuentas y su asignacion objetivo.</p>
        )}
      </div>
    </div>
  )
}

// ── Module reference data ────────────────────────────────────────────────────

// ── G15/G18 Supabase tools ───────────────────────────────────────────────────

const G15_SQL = `CREATE TABLE IF NOT EXISTS model_versions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  version_id text NOT NULL,
  title text NOT NULL,
  change_type text DEFAULT 'Cambio de parametro',
  status text DEFAULT 'shadow',
  activation_date date DEFAULT CURRENT_DATE,
  decision_log_id text DEFAULT '',
  backtest_result text DEFAULT '',
  shadow_result text DEFAULT '',
  notes text DEFAULT ''
);`

const G18_SQL = `CREATE TABLE IF NOT EXISTS external_validations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now(),
  date date DEFAULT CURRENT_DATE,
  validation_type text NOT NULL,
  benchmark text DEFAULT '',
  result text DEFAULT '',
  severity text DEFAULT 'media',
  action text DEFAULT '',
  status text DEFAULT 'open',
  owner text DEFAULT '',
  notes text DEFAULT ''
);`

const CHANGE_TYPES = [
  'Cambio de parametro',
  'Nuevo indicador',
  'Cambio de metodologia',
  'Nueva capa o modulo',
  'Reversion',
]

const VERSION_STATUSES = ['shadow', 'active', 'archived', 'rejected']
const VALIDATION_TYPES = ['Benchmark comparison', 'Challenger model', 'Stress test historico', 'Peer review', 'Audit formal']
const VALIDATION_SEVERITIES = ['baja', 'media', 'alta', 'critica']
const VALIDATION_STATUSES = ['open', 'monitoring', 'closed']

function ModelGovernanceTool() {
  const [versions, setVersions] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState('')
  const [form, setForm] = useState({
    version_id: '',
    title: '',
    change_type: CHANGE_TYPES[0],
    status: 'shadow',
    activation_date: getToday(),
    decision_log_id: '',
    backtest_result: '',
    shadow_result: '',
    notes: '',
  })

  async function loadVersions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('model_versions')
      .select('*')
      .order('activation_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      if (isTableMissing(error.message)) setSetupError(error.message)
      setVersions([])
    } else {
      setSetupError('')
      setVersions(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadVersions() }, [])

  async function addVersion() {
    if (!form.version_id || !form.title) return
    const { error } = await supabase.from('model_versions').insert([form])
    if (!error) {
      setForm({
        version_id: '',
        title: '',
        change_type: CHANGE_TYPES[0],
        status: 'shadow',
        activation_date: getToday(),
        decision_log_id: '',
        backtest_result: '',
        shadow_result: '',
        notes: '',
      })
      loadVersions()
    } else if (isTableMissing(error.message)) {
      setSetupError(error.message)
    }
  }

  async function updateVersion(id, patch) {
    const { error } = await supabase.from('model_versions').update(patch).eq('id', id)
    if (!error) loadVersions()
  }

  async function deleteVersion(id) {
    const { error } = await supabase.from('model_versions').delete().eq('id', id)
    if (!error) loadVersions()
  }

  if (loading) return <LoadingState />
  if (setupError) return <SetupRequired sql={G15_SQL} label="G15 Model Governance" onRetry={loadVersions} />

  return (
    <Section title="Audit trail de versiones" icon={GitBranch}>
      <div className="grid gap-0 border-b border-[#222] md:grid-cols-4">
        <input value={form.version_id} onChange={e => setForm(f => ({ ...f, version_id: e.target.value }))} placeholder="Version ID" className="border-b border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#818cf8]" />
        <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Titulo del cambio" className="border-b border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#818cf8] md:col-span-2" />
        <input type="date" value={form.activation_date} onChange={e => setForm(f => ({ ...f, activation_date: e.target.value }))} className="border-b border-[#222] bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#818cf8]" />
        <select value={form.change_type} onChange={e => setForm(f => ({ ...f, change_type: e.target.value }))} className="border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#818cf8]">
          {CHANGE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input value={form.decision_log_id} onChange={e => setForm(f => ({ ...f, decision_log_id: e.target.value }))} placeholder="Decision Log ID" className="border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#818cf8]" />
        <input value={form.backtest_result} onChange={e => setForm(f => ({ ...f, backtest_result: e.target.value }))} placeholder="Backtest result" className="border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#818cf8]" />
        <button type="button" onClick={addVersion} className="bg-[#818cf8] px-3 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-white">
          Registrar version
        </button>
      </div>
      <div className="divide-y divide-[#111]">
        {versions.length === 0 ? (
          <div className="p-6 text-center text-xs uppercase tracking-wider text-[#444]">Sin versiones registradas</div>
        ) : versions.map((version) => (
          <div key={version.id} className="grid gap-3 p-3 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#818cf8]">{version.version_id}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">{version.title}</span>
                <span className="border border-[#333] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#777]">{version.change_type}</span>
              </div>
              <p className="mt-1 text-xs text-[#777]">
                DL: {version.decision_log_id || 'n/a'} | Backtest: {version.backtest_result || 'n/a'} | Shadow: {version.shadow_result || 'n/a'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={version.status} onChange={e => updateVersion(version.id, { status: e.target.value })} className="border border-[#333] bg-black px-2 py-1 text-xs text-white">
                {VERSION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <input value={version.shadow_result || ''} onChange={e => updateVersion(version.id, { shadow_result: e.target.value })} placeholder="Shadow result" className="w-40 border border-[#333] bg-black px-2 py-1 text-xs text-white outline-none placeholder-[#444]" />
              <button type="button" onClick={() => deleteVersion(version.id)} className="border border-[#333] p-1.5 text-[#777] hover:border-[#ef4444] hover:text-[#ef4444]">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

function ExternalValidationTool() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [setupError, setSetupError] = useState('')
  const [form, setForm] = useState({
    date: getToday(),
    validation_type: VALIDATION_TYPES[0],
    benchmark: '',
    result: '',
    severity: 'media',
    action: '',
    status: 'open',
    owner: '',
    notes: '',
  })

  async function loadItems() {
    setLoading(true)
    const { data, error } = await supabase
      .from('external_validations')
      .select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      if (isTableMissing(error.message)) setSetupError(error.message)
      setItems([])
    } else {
      setSetupError('')
      setItems(data || [])
    }
    setLoading(false)
  }

  useEffect(() => { loadItems() }, [])

  async function addItem() {
    if (!form.validation_type || !form.result) return
    const { error } = await supabase.from('external_validations').insert([form])
    if (!error) {
      setForm({
        date: getToday(),
        validation_type: VALIDATION_TYPES[0],
        benchmark: '',
        result: '',
        severity: 'media',
        action: '',
        status: 'open',
        owner: '',
        notes: '',
      })
      loadItems()
    } else if (isTableMissing(error.message)) {
      setSetupError(error.message)
    }
  }

  async function updateItem(id, patch) {
    const { error } = await supabase.from('external_validations').update(patch).eq('id', id)
    if (!error) loadItems()
  }

  async function deleteItem(id) {
    const { error } = await supabase.from('external_validations').delete().eq('id', id)
    if (!error) loadItems()
  }

  if (loading) return <LoadingState />
  if (setupError) return <SetupRequired sql={G18_SQL} label="G18 External Validation" onRetry={loadItems} />

  return (
    <Section title="Registro de validacion externa" icon={ShieldCheck}>
      <div className="grid gap-0 border-b border-[#222] md:grid-cols-4">
        <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="border-b border-r border-[#222] bg-black px-3 py-2 font-mono text-xs text-white outline-none focus:border-[#67e8f9]" />
        <select value={form.validation_type} onChange={e => setForm(f => ({ ...f, validation_type: e.target.value }))} className="border-b border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#67e8f9]">
          {VALIDATION_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
        <input value={form.benchmark} onChange={e => setForm(f => ({ ...f, benchmark: e.target.value }))} placeholder="Benchmark" className="border-b border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#67e8f9]" />
        <select value={form.severity} onChange={e => setForm(f => ({ ...f, severity: e.target.value }))} className="border-b border-[#222] bg-black px-3 py-2 text-xs text-white outline-none focus:border-[#67e8f9]">
          {VALIDATION_SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <input value={form.result} onChange={e => setForm(f => ({ ...f, result: e.target.value }))} placeholder="Resultado / hallazgo" className="border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#67e8f9] md:col-span-2" />
        <input value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} placeholder="Accion requerida" className="border-r border-[#222] bg-black px-3 py-2 text-xs text-white outline-none placeholder-[#444] focus:border-[#67e8f9]" />
        <button type="button" onClick={addItem} className="bg-[#67e8f9] px-3 py-2 text-xs font-bold uppercase tracking-wider text-black hover:bg-white">
          Registrar validacion
        </button>
      </div>
      <div className="divide-y divide-[#111]">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs uppercase tracking-wider text-[#444]">Sin validaciones registradas</div>
        ) : items.map((item) => (
          <div key={item.id} className="grid gap-3 p-3 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-[#67e8f9]">{item.date}</span>
                <span className="text-xs font-bold uppercase tracking-wider text-white">{item.validation_type}</span>
                <span className="border border-[#333] px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-[#777]">{item.severity}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[#aaa]">{item.result}</p>
              <p className="mt-1 text-xs text-[#777]">Benchmark: {item.benchmark || 'n/a'} | Accion: {item.action || 'n/a'}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select value={item.status} onChange={e => updateItem(item.id, { status: e.target.value })} className="border border-[#333] bg-black px-2 py-1 text-xs text-white">
                {VALIDATION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
              <input value={item.owner || ''} onChange={e => updateItem(item.id, { owner: e.target.value })} placeholder="Owner" className="w-32 border border-[#333] bg-black px-2 py-1 text-xs text-white outline-none placeholder-[#444]" />
              <button type="button" onClick={() => deleteItem(item.id)} className="border border-[#333] p-1.5 text-[#777] hover:border-[#ef4444] hover:text-[#ef4444]">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

const MODULES = {
  multiBroker: {
    code: 'G13',
    title: 'Multi-Broker / Multi-Account Management',
    subtitle: 'Gestion agregada de capital, exposicion y operativa a traves de varios brokers y cuentas.',
    status: 'Operativo',
    horizon: 'Continuo',
    accent: 'text-[#34d399]',
    border: 'border-[#34d399]',
    principle: 'Operar con varios brokers no es complejidad innecesaria; es resiliencia operativa y separacion de riesgos. Un sistema con un solo broker tiene un punto unico de fallo. Con varios puedes segmentar capital por estrategia y capa, separar el riesgo de contraparte y mantener siempre un failover operativo.',
    input: 'Cuentas activas, saldos por broker, posiciones abiertas por cuenta, margen disponible, costes de ejecucion por broker y reglas de asignacion de estrategias.',
    output: 'Vista agregada de exposicion total, asignacion de capital por estrategia y broker, reglas de reequilibrio y reporting unificado del sistema.',
    brokerRoles: [
      ['Principal (Core)', 'Mayor parte del capital operativo para la estrategia principal', 'FCA/BaFin/FINMA, spreads optimos en pares core, mejor swap'],
      ['Capa 2 / 3', 'Capital para estrategias G10 FX Trend o G11 Equities Macro', 'Acceso a equity ETFs, opciones o instrumentos de capa adicional'],
      ['Emergencia / Failover', 'Capital minimo para hedge de emergencia y failover de G6', 'Segundo regulador distinto al principal; siempre liquido'],
      ['Testing', 'Nuevos pares, mercados o estrategias con sizing minimo', 'Comisiones bajas, acceso amplio; sin comprometer capital core'],
    ],
    allocationRules: [
      ['Max por broker (% capital total)', '60%', 'Diversificacion de contraparte minima'],
      ['Min broker de emergencia', '10%', 'Suficiente para gestionar un failover real'],
      ['Max en broker no-core por estrategia', '30%', 'Limitar exposicion en brokers secundarios'],
      ['Umbral de reequilibrio', '>10% desviacion del target', 'No reequilibrar por cada trade; solo cuando hay desviacion significativa'],
      ['Frecuencia de revision de asignacion', 'Mensual', 'Coincide con revision de G8 Counterparty Risk'],
    ],
    aggregatedTracking: [
      'Exposicion por par (suma de posiciones abiertas en el mismo par a traves de todos los brokers).',
      'Margen utilizado total vs capital total del sistema — no por broker individual.',
      'Drawdown del sistema = drawdown sobre capital total, no sobre cada cuenta por separado.',
      'P&L por broker para detectar diferencias de ejecucion entre brokers en el mismo par.',
      'Verificar que no hay posiciones duplicadas en el mismo par en distintos brokers sin intencion.',
      'Si el P&L redistribuye capital entre brokers, revisar que los porcentajes no superen los limites de G8.',
    ],
    pipeline: [
      'Inicio de sesion: verificar que todos los brokers estan accesibles y los saldos son correctos.',
      'Al abrir posicion: asignar al broker correcto segun la estrategia activa y la regla de asignacion.',
      'Semanal: calcular exposicion agregada por par y drawdown del sistema completo.',
      'Mensual: revisar distribucion de capital vs targets; reequilibrar si hay desviacion >10%.',
      'Si un broker alcanza limite de exposicion (G8): redistribuir capital antes de operar en ese broker.',
      'Si fallo de broker: ejecutar protocolo failover de G6 con el broker de emergencia.',
    ],
    errors: [
      'Operar en varios brokers sin calcular la exposicion agregada total en tiempo real.',
      'Tener posiciones duplicadas en el mismo par en distintos brokers sin haberlo decidido explicitamente.',
      'Dejar el broker de emergencia con capital insuficiente porque "nunca lo necesite".',
      'Reequilibrar capital entre brokers durante periodos de alta volatilidad.',
      'Medir el drawdown por cuenta individual y no sobre el capital total del sistema.',
      'Confundir P&L por broker con P&L de la estrategia: el broker no es la unidad de evaluacion.',
    ],
  },

  modelGovernance: {
    code: 'G15',
    title: 'Model Governance / Audit Trail',
    subtitle: 'Control de versiones, proceso de cambio auditado y trazabilidad completa de cada decision de diseño del sistema.',
    status: 'Documented / Supabase pendiente',
    horizon: 'Continuo',
    accent: 'text-[#818cf8]',
    border: 'border-[#818cf8]',
    principle: 'Un modelo que no tiene historial auditado de sus cambios no puede aprender de si mismo. La gobernanza no es burocracia; es la diferencia entre un sistema que mejora de forma controlada y uno que oscila aleatoriamente por ajustes reactivos sin memoria institucional.',
    input: 'Parametros del sistema en vigor, Decision Log (G16), resultados de backtests, resultados en vivo del periodo y aprobaciones de cambios documentadas.',
    output: 'Audit trail completo, registro de versiones con parametros exactos, evidencia de validacion pre-live y trazabilidad de cada cambio desde su origen.',
    versionFields: [
      ['Version ID', 'Numero semantico (mayor.menor.patch)', 'v2.3.1'],
      ['Fecha de activacion', 'Cuando entro en produccion', '2026-03-15'],
      ['Cambios vs version anterior', 'Lista exacta de modificaciones', 'Peso PMI 14%→12%, peso claims 6%→8%'],
      ['Decision Log ID', 'Referencia al log que origino el cambio', 'DL-2026-047'],
      ['Backtest realizado', 'Si/No y resultado vs version anterior', 'Si — Sharpe 0.82 vs 0.79'],
      ['Shadow period resultado', 'Metricas durante los primeros 30 dias live', 'DD max 3.2% vs backtest 2.8%'],
      ['Estado', 'Activo / En shadow / Archivado', 'Activo'],
    ],
    validationRequirements: [
      ['Cambio de parametro menor (<10% del valor)', 'Walk-forward 12 meses', '15 dias', 'Sizing reducido al 50%'],
      ['Cambio de parametro mayor (>10%)', 'Walk-forward 24 meses', '30 dias', 'Sizing reducido al 50%'],
      ['Nuevo indicador o driver', 'Walk-forward 36 meses', '60 dias', 'Sizing al 25%'],
      ['Cambio de metodologia', 'Walk-forward 36 meses + stress test', '90 dias', 'Sizing al 25%'],
      ['Nueva capa o modulo', 'Walk-forward 48 meses', '6 meses', 'Sizing al 10%'],
    ],
    approvalCriteria: [
      'El backtest del cambio propuesto mejora en ≥2 de estas 4 metricas: Sharpe, max DD, hit rate, profit factor.',
      'Ninguna de las 4 metricas se deteriora de forma significativa (>15% de empeoramiento).',
      'El resultado del shadow period es consistente con el backtest (DD live <1.5x DD backtest).',
      'El cambio tiene un Decision Log ID activo que documenta la motivacion.',
      'Si el shadow period falla el criterio de consistencia: revertir a la version anterior y reabrir Decision Log.',
    ],
    reviewCadence: [
      ['Trimestral', 'Revision de parametros vs metricas esperadas; identificar si hay deriva', 'Compara rolling 3m vs backtest'],
      ['Semestral', 'Revision completa del modelo; evaluar si hay cambios pendientes justificados', 'Decision Log + backtest si aplica'],
      ['Anual', 'Audit con G18 External Validation; comparacion con challenger models', 'Involucra revision externa'],
    ],
    pipeline: [
      'Cambio identificado via Decision Log (G16); nunca cambios sin DL previo.',
      'Ejecutar backtest walk-forward con el cambio propuesto y comparar vs version actual.',
      'Si backtest supera criterio de aprobacion: definir shadow period con sizing reducido.',
      'Activar en produccion con sizing reducido durante el shadow period establecido.',
      'Monitorizar metricas del shadow period vs backtest; aprobar o revertir al finalizar.',
      'Documentar la nueva version en el audit trail con todos los campos requeridos.',
      'Archivar la version anterior con sus parametros completos y fecha de cierre.',
    ],
    errors: [
      'Activar cambios en produccion sin backtest previo — aunque el cambio parezca "obvio".',
      'Hacer backtest sobre los mismos datos que se usaron para calibrar los parametros (overfitting encubierto).',
      'No mantener la version anterior archivada con sus parametros completos.',
      'Aprobar un cambio que mejora el Sharpe historico pero deteriora el max drawdown.',
      'Saltarse el shadow period en cambios "pequeños" — el tamaño del cambio no predice el impacto live.',
      'Confundir "el backtest es bueno" con "el modelo es correcto" — el backtest solo dice que fue bueno en el pasado.',
    ],
  },

  externalValidation: {
    code: 'G18',
    title: 'External Validation Framework',
    subtitle: 'Revision externa, benchmarks y validacion independiente del sistema para detectar sesgos que el propio operador no puede ver.',
    status: 'Documented / Supabase pendiente',
    horizon: 'Trimestral / anual',
    accent: 'text-[#67e8f9]',
    border: 'border-[#67e8f9]',
    principle: 'Un sistema que solo se valida a si mismo tiene un sesgo de confirmacion estructural. La validacion externa no es dudar del sistema; es el mecanismo que detecta lo que el propio operador no puede ver por estar demasiado cerca. Todo modelo financiero tiende a sobreajustarse a los datos con los que fue diseñado.',
    input: 'Resultados reales en vivo (minimo 12 meses), metodologia del sistema, supuestos de diseño, benchmarks relevantes y resultados de backtests documentados.',
    output: 'Informe de validacion con hallazgos, comparacion vs benchmarks, riesgos metodologicos identificados y acciones concretas con seguimiento en Decision Log.',
    validationTypes: [
      ['Benchmark comparison', 'Comparar resultados vs benchmark pasivo relevante para el universo operado', 'Trimestral', 'Operador con datos publicos'],
      ['Challenger model', 'Comparar vs modelo alternativo simplificado (ej. solo PMI + NFP sin framework completo)', 'Semestral', 'Operador con backtester'],
      ['Stress test historico', 'Aplicar el modelo a periodos extremos: 2008, 2015 CHF, 2020, 2022', 'Anual', 'Operador + Decision Log'],
      ['Peer review', 'Revision de metodologia por otra persona con conocimiento de mercados pero sin sesgo de diseño', 'Anual', 'Colega externo o mentor'],
      ['Audit formal', 'Revision completa del G15 Model Governance por un tercero independiente', 'Cada 2 años', 'Externo especializado'],
    ],
    benchmarks: [
      ['FX G10 macro (sistema principal)', 'FX Carry Index (ej. DBCR)', 'El carry es el alpha "gratis" de FX; hay que superarlo para justificar el sistema'],
      ['FX G10 con componente trend (G10)', 'FX Momentum Index', 'Si hay componente tendencial, comparar con trend puro sin filtro macro'],
      ['Equities macro (G11)', 'Buy & hold SPY o MSCI World', 'Base de comparacion para exposicion equity sistematica'],
      ['Sistema completo', 'T-bills 3m (risk-free)', 'El suelo absoluto: si no superas el risk-free con volatilidad, no hay alpha'],
    ],
    metrics: [
      ['Sharpe ratio (live, rolling 12m)', '>0.5', '>0.8', '<0.3 durante 2 trimestres consecutivos'],
      ['Sharpe vs benchmark (outperformance)', '>0.0', '>+0.2 sobre benchmark', 'Underperform vs benchmark 2 trimestres'],
      ['Max DD live vs max DD backtest', '<1.5x', '<1.0x', '>2.0x backtest DD'],
      ['Hit rate', '>40%', '>50%', '<35% durante 3 meses'],
      ['Profit factor', '>1.2', '>1.5', '<1.0 durante 2 meses'],
      ['Beta vs mercado (correlacion)', '<0.3', '<0.15', '>0.5 sostenido (el sistema deja de ser independiente)'],
    ],
    actionThresholds: [
      ['Underperformance vs benchmark >2 trimestres', 'Alta', 'Iniciar revision metodologica en G15; Decision Log obligatorio'],
      ['Live DD > 2x backtest DD', 'Alta', 'Pausar incrementos de capital; revisar supuestos de riesgo del modelo'],
      ['Beta > 0.5 sostenido', 'Media', 'Revisar exposicion agregada y correlaciones entre posiciones abiertas'],
      ['Challenger model supera al sistema', 'Media', 'Investigar que captura el challenger que el sistema no captura; evaluar incorporar driver'],
      ['Peer review identifica sesgo estructural', 'Alta', 'Decision Log + revision G15 con timeline concreto'],
      ['Stress test: DD > 30% en periodo historico extremo', 'Media', 'Revisar circuit breakers y tail risk (G7); evaluar si el sizing sobrevive a ese escenario'],
    ],
    pipeline: [
      'Trimestral: recoger metricas de los ultimos 3 meses y ejecutar benchmark comparison.',
      'Si aparece señal de alerta en benchmark comparison: escalar a revision G15 sin esperar el ciclo semestral.',
      'Semestral: correr challenger model con datos del periodo y comparar Sharpe y max DD.',
      'Anual: identificar el periodo historico extremo mas relevante para el sistema y aplicar stress test.',
      'Coordinar peer review anual: preparar resumen de metodologia y resultados sin sesgo de presentacion.',
      'Documentar todos los hallazgos en Decision Log (G16) con fecha, accion asignada y criterio de cierre.',
    ],
    errors: [
      'Seleccionar benchmarks que el sistema puede superar facilmente (cherry-picking de benchmark).',
      'No actuar sobre los hallazgos de la validacion por "el metodo sigue siendo correcto".',
      'Hacer el stress test solo con periodos historicos que el sistema ya manejo bien.',
      'Confundir "el peer reviewer esta de acuerdo" con validacion independiente si conoce el diseño en detalle.',
      'No separar el conjunto de datos de calibracion del conjunto de validacion out-of-sample.',
      'Espaciar la validacion externa mas de 2 años — los regimenes de mercado cambian mas rapido.',
    ],
  },
}

// ── Reference content sections ───────────────────────────────────────────────

function MultiBrokerRef({ mod }) {
  return (
    <>
      <Section title="Roles de broker en el sistema" icon={Layers}>
        <DataTable
          headers={['Rol', 'Descripcion', 'Criterio de seleccion']}
          rows={mod.brokerRoles}
        />
      </Section>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Section title="Reglas de asignacion de capital" icon={SlidersHorizontal}>
          <ParamTable rows={mod.allocationRules} />
        </Section>
        <Section title="Tracking de exposicion agregada" icon={BarChart3}>
          <div className="p-3"><BulletList items={mod.aggregatedTracking} /></div>
        </Section>
      </div>
    </>
  )
}

function ModelGovernanceContent({ mod }) {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <Section title="Campos del registro de version" icon={GitBranch}>
          <DataTable
            headers={['Campo', 'Descripcion', 'Ejemplo']}
            rows={mod.versionFields}
          />
        </Section>
        <Section title="Criterios de aprobacion de cambio" icon={CheckCircle2}>
          <div className="p-3"><BulletList items={mod.approvalCriteria} /></div>
        </Section>
      </div>
      <Section title="Requisitos de validacion por tipo de cambio" icon={ClipboardCheck} className="mt-4">
        <DataTable
          headers={['Tipo de cambio', 'Backtest requerido', 'Shadow period', 'Sizing durante shadow']}
          rows={mod.validationRequirements}
        />
      </Section>
      <Section title="Cadencia de revision" icon={FileText} className="mt-4">
        <div className="grid gap-0 md:grid-cols-3">
          {mod.reviewCadence.map(([freq, action, note]) => (
            <div key={freq} className="border-b border-r border-[#222] p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-[#ecd987]">{freq}</div>
              <p className="text-xs leading-relaxed text-[#aaa]">{action}</p>
              <p className="mt-1 font-mono text-[10px] text-[#555]">{note}</p>
            </div>
          ))}
        </div>
      </Section>
    </>
  )
}

function ExternalValidationContent({ mod }) {
  return (
    <>
      <Section title="Tipos de validacion" icon={ShieldCheck}>
        <DataTable
          headers={['Tipo', 'Descripcion', 'Frecuencia', 'Quien']}
          rows={mod.validationTypes}
        />
      </Section>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Section title="Seleccion de benchmarks" icon={BarChart3}>
          <DataTable
            headers={['Universo', 'Benchmark', 'Por que']}
            rows={mod.benchmarks}
          />
        </Section>
        <Section title="Metricas clave de validacion" icon={SlidersHorizontal}>
          <MetricTable rows={mod.metrics} accent={mod.accent} />
        </Section>
      </div>
      <Section title="Umbrales de accion ante hallazgos" icon={AlertTriangle} className="mt-4">
        <DataTable
          headers={['Hallazgo', 'Urgencia', 'Accion requerida']}
          rows={mod.actionThresholds}
        />
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

export function MultiBrokerPage() {
  const mod = MODULES.multiBroker
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <MultiBrokerTool />
        <RefToggle>
          <MultiBrokerRef mod={mod} />
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

export function ModelGovernancePage() {
  const mod = MODULES.modelGovernance
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <ModelGovernanceTool />
        <RefToggle>
          <ModelGovernanceContent mod={mod} />
          <Section title="Pipeline operativo" icon={Route} className="mt-4">
            <Pipeline steps={mod.pipeline} accent={mod.accent} />
          </Section>
          <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
            <div className="p-3"><BulletList items={mod.errors} /></div>
          </Section>
        </RefToggle>
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Versiones persistidas en Supabase.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Volver al dashboard</Link>
        </div>
      </div>
    </div>
  )
}

export function ExternalValidationPage() {
  const mod = MODULES.externalValidation
  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <PageHeader mod={mod} />
        <PrincipleIO mod={mod} />
        <ExternalValidationTool />
        <RefToggle>
          <ExternalValidationContent mod={mod} />
          <Section title="Pipeline operativo" icon={Route} className="mt-4">
            <Pipeline steps={mod.pipeline} accent={mod.accent} />
          </Section>
          <Section title="Errores especificos a evitar" icon={AlertTriangle} className="mt-4">
            <div className="p-3"><BulletList items={mod.errors} /></div>
          </Section>
        </RefToggle>
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#777]">
          Validaciones persistidas en Supabase.
          <Link to="/dashboard" className="ml-2 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">Volver al dashboard</Link>
        </div>
      </div>
    </div>
  )
}
