import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, RefreshCw } from 'lucide-react'

const STORAGE_KEY = 'polaris-g12-nowcasting'

const BLOCKS = {
  activity:   { label: 'Actividad',  weight: 0.35, accent: 'text-[#22d3ee]', border: 'border-[#22d3ee]' },
  employment: { label: 'Empleo',     weight: 0.30, accent: 'text-[#4ade80]', border: 'border-[#4ade80]' },
  inflation:  { label: 'Inflacion',  weight: 0.25, accent: 'text-[#f59e0b]', border: 'border-[#f59e0b]' },
  other:      { label: 'Otros',      weight: 0.10, accent: 'text-[#a78bfa]', border: 'border-[#a78bfa]' },
}

// sign: +1 = higher actual is positive surprise; -1 = lower actual is positive surprise
// stdDev = historical stdev of (actual - consensus) for this indicator
const INDICATORS = [
  { id: 'pmi_mfg',   name: 'PMI Manufacturero',    block: 'activity',   weight: 0.14, stdDev: 2.0,  unit: 'pts', region: 'Global', sign:  1 },
  { id: 'pmi_svc',   name: 'PMI Servicios',         block: 'activity',   weight: 0.12, stdDev: 1.8,  unit: 'pts', region: 'Global', sign:  1 },
  { id: 'gdp_flash', name: 'GDP Flash QoQ',          block: 'activity',   weight: 0.05, stdDev: 0.3,  unit: '%',   region: 'EEUU',   sign:  1 },
  { id: 'indprod',   name: 'Industrial Production', block: 'activity',   weight: 0.04, stdDev: 0.4,  unit: '%',   region: 'EEUU',   sign:  1 },
  { id: 'nfp',       name: 'NFP / Nominas',         block: 'employment', weight: 0.15, stdDev: 100,  unit: 'k',   region: 'EEUU',   sign:  1 },
  { id: 'claims',    name: 'Jobless Claims',         block: 'employment', weight: 0.08, stdDev: 20,   unit: 'k',   region: 'EEUU',   sign: -1 },
  { id: 'unemp',     name: 'Tasa de Paro',           block: 'employment', weight: 0.07, stdDev: 0.1,  unit: '%',   region: 'EEUU',   sign: -1 },
  { id: 'cpi',       name: 'CPI (MoM)',              block: 'inflation',  weight: 0.11, stdDev: 0.10, unit: '%',   region: 'EEUU',   sign:  1 },
  { id: 'corecpi',   name: 'Core CPI (MoM)',         block: 'inflation',  weight: 0.10, stdDev: 0.08, unit: '%',   region: 'EEUU',   sign:  1 },
  { id: 'ppi',       name: 'PPI (MoM)',              block: 'inflation',  weight: 0.04, stdDev: 0.20, unit: '%',   region: 'EEUU',   sign:  1 },
  { id: 'retail',    name: 'Retail Sales (MoM)',     block: 'other',      weight: 0.10, stdDev: 0.30, unit: '%',   region: 'EEUU',   sign:  1 },
]

// ── Calculation ───────────────────────────────────────────────────────────────

function calcRow(ind, entry) {
  if (!entry || entry.actual === '' || entry.consensus === '') return null
  const a = parseFloat(entry.actual)
  const c = parseFloat(entry.consensus)
  if (isNaN(a) || isNaN(c)) return null
  const surprise = ind.sign * (a - c)   // economic surprise: positive = better than expected
  const zScore = surprise / ind.stdDev
  return { surprise, zScore, contribution: ind.weight * zScore }
}

function calcScores(entries) {
  let total = 0
  let filledWeight = 0
  const blockScores = Object.fromEntries(Object.keys(BLOCKS).map(k => [k, 0]))
  const blockFill   = Object.fromEntries(Object.keys(BLOCKS).map(k => [k, 0]))

  for (const ind of INDICATORS) {
    const row = calcRow(ind, entries[ind.id])
    if (!row) continue
    total += row.contribution
    filledWeight += ind.weight
    blockScores[ind.block] += row.contribution
    blockFill[ind.block]   += ind.weight
  }
  return { total, filledWeight, blockScores, blockFill }
}

function getFlag(total, filledWeight) {
  if (filledWeight < 0.30) return 'sin_datos'
  const abs = Math.abs(total)
  if (abs >= 1.5) return 'rojo'
  if (abs >= 1.0) return 'amarillo'
  return 'verde'
}

// ── Formatting ────────────────────────────────────────────────────────────────

function sign(v) { return v >= 0 ? '+' : '' }

function fmtScore(v, decimals = 2) {
  return `${sign(v)}${v.toFixed(decimals)}`
}

function fmtSurprise(v, ind) {
  const decimals = ind.stdDev >= 10 ? 0 : ind.stdDev >= 1 ? 1 : 2
  return `${sign(v)}${v.toFixed(decimals)} ${ind.unit}`
}

function zColor(z) {
  if (z == null) return 'text-[#333]'
  if (z >=  1.5) return 'text-[#22d3ee]'
  if (z >=  1.0) return 'text-[#4ade80]'
  if (z <= -1.5) return 'text-[#f87171]'
  if (z <= -1.0) return 'text-[#fb923c]'
  return 'text-[#777]'
}

// ── Components ────────────────────────────────────────────────────────────────

const FLAG_CONFIG = {
  sin_datos: { color: 'text-[#555]',    border: 'border-[#333]',    label: 'Sin datos suficientes',                      dot: '○' },
  verde:     { color: 'text-[#4ade80]', border: 'border-[#4ade80]', label: 'Verde — sin accion requerida',               dot: '●' },
  amarillo:  { color: 'text-[#f59e0b]', border: 'border-[#f59e0b]', label: 'Amarillo — revisar en ciclo semanal',        dot: '▲' },
  rojo:      { color: 'text-[#f87171]', border: 'border-[#f87171]', label: 'Rojo — revision inmediata de World View',    dot: '■' },
}

function BlockCard({ blockKey, block, score, fillRatio }) {
  return (
    <div className={`border-2 ${block.border} p-3`}>
      <p className={`text-[10px] font-bold uppercase tracking-widest ${block.accent}`}>{block.label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${block.accent}`}>
        {fillRatio > 0 ? `${fmtScore(score)}σ` : '—'}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <div className="h-1 flex-1 bg-[#1a1a1a]">
          <div
            className={`h-1 ${block.accent.replace('text-', 'bg-')}`}
            style={{ width: `${Math.min(fillRatio * 100, 100)}%` }}
          />
        </div>
        <span className="text-[10px] text-[#555]">{Math.round(fillRatio * 100)}%</span>
      </div>
      <p className="mt-1 text-[10px] text-[#555]">Peso {block.weight * 100}%</p>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MacroNowcastingPage() {
  const [entries, setEntries] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved ? JSON.parse(saved) : {}
    } catch {
      return {}
    }
  })

  const scores = useMemo(() => calcScores(entries), [entries])
  const flag = getFlag(scores.total, scores.filledWeight)
  const flagCfg = FLAG_CONFIG[flag]

  const lastUpdated = useMemo(() => {
    const dates = Object.values(entries)
      .filter(e => e.updatedAt)
      .map(e => new Date(e.updatedAt))
    return dates.length ? new Date(Math.max(...dates)) : null
  }, [entries])

  function updateEntry(id, field, value) {
    const next = {
      ...entries,
      [id]: { ...(entries[id] || {}), [field]: value, updatedAt: new Date().toISOString() },
    }
    setEntries(next)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  }

  function clearAll() {
    setEntries({})
    localStorage.removeItem(STORAGE_KEY)
  }

  return (
    <div className="min-h-screen pt-12">
      <div className="mx-auto max-w-7xl px-4 py-4">

        {/* Header */}
        <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Macro Nowcasting</h1>
            <p className="mt-1 max-w-3xl text-sm text-[#888]">
              Introduce actual y consenso para calcular sorpresas normalizadas y el Nowcast_Score agregado por bloque.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="text-[10px] text-[#555]">
                Actualizado: {lastUpdated.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}{' '}
                {lastUpdated.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 border border-[#333] px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#555] hover:border-[#f87171] hover:text-[#f87171]"
            >
              <RefreshCw size={12} />
              Limpiar
            </button>
          </div>
        </div>

        {/* Score summary */}
        <div className="mb-4 grid gap-3 lg:grid-cols-[160px_1fr]">

          {/* Overall score */}
          <div className={`border-2 ${flagCfg.border} p-5 text-center`}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#555]">Nowcast Score</p>
            <p className={`mt-2 font-mono text-5xl font-black leading-none ${flagCfg.color}`}>
              {scores.filledWeight > 0 ? fmtScore(scores.total) : '—'}
            </p>
            {scores.filledWeight > 0 && (
              <p className="mt-0.5 font-mono text-lg text-[#555]">sigma</p>
            )}
            <p className={`mt-2 text-[11px] font-bold leading-snug uppercase tracking-wider ${flagCfg.color}`}>
              {flagCfg.dot} {flagCfg.label}
            </p>
            <p className="mt-2 text-[10px] text-[#555]">
              Cobertura {Math.round(scores.filledWeight * 100)}%
            </p>
          </div>

          {/* Block scores */}
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
            {Object.entries(BLOCKS).map(([key, block]) => (
              <BlockCard
                key={key}
                blockKey={key}
                block={block}
                score={scores.blockScores[key]}
                fillRatio={scores.blockFill[key] / block.weight}
              />
            ))}
          </div>
        </div>

        {/* Threshold legend */}
        <div className="mb-4 flex flex-wrap gap-4 border border-[#1a1a1a] bg-[#050505] px-4 py-2 text-[10px]">
          <span className="text-[#555] uppercase tracking-widest">Umbrales:</span>
          <span className="text-[#4ade80]">● &lt;1.0σ — verde</span>
          <span className="text-[#f59e0b]">▲ ≥1.0σ — amarillo (revisar)</span>
          <span className="text-[#f87171]">■ ≥1.5σ — rojo (revision inmediata)</span>
          <span className="ml-auto text-[#333]">Sorpresa = signo × (actual − consenso) · positivo = mejor de lo esperado</span>
        </div>

        {/* Indicator table */}
        <div className="border-2 border-[#333]">
          <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Indicadores</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px]">
              <thead>
                <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a]">
                  <th className="px-3 py-2 text-left   text-[10px] font-bold uppercase tracking-widest text-[#444]">Indicador</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[#444]">Region</th>
                  <th className="px-3 py-2 text-right  text-[10px] font-bold uppercase tracking-widest text-[#444]">Actual</th>
                  <th className="px-3 py-2 text-right  text-[10px] font-bold uppercase tracking-widest text-[#444]">Consenso</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-widest text-[#444]">Ud.</th>
                  <th className="px-3 py-2 text-right  text-[10px] font-bold uppercase tracking-widest text-[#444]">Sorpresa</th>
                  <th className="px-3 py-2 text-right  text-[10px] font-bold uppercase tracking-widest text-[#444]">Z-score</th>
                  <th className="px-3 py-2 text-right  text-[10px] font-bold uppercase tracking-widest text-[#444]">Contrib.</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(BLOCKS).map(([blockKey, block]) => {
                  const blockInds = INDICATORS.filter(i => i.block === blockKey)
                  const fillRatio = scores.blockFill[blockKey] / block.weight
                  return (
                    <IndicatorBlock
                      key={blockKey}
                      block={block}
                      indicators={blockInds}
                      blockScore={scores.blockScores[blockKey]}
                      fillRatio={fillRatio}
                      entries={entries}
                      onUpdate={updateEntry}
                    />
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low coverage warning */}
        {scores.filledWeight > 0 && scores.filledWeight < 0.5 && (
          <div className="mt-3 flex items-center gap-2 border border-[#f59e0b]/30 bg-[#2a1d00] px-4 py-2 text-xs text-[#f59e0b]">
            <AlertTriangle size={14} />
            Cobertura baja ({Math.round(scores.filledWeight * 100)}%). Introduce mas indicadores para que el score sea representativo.
          </div>
        )}

        {/* Footer */}
        <div className="mt-4 border-2 border-[#333] p-3 text-xs text-[#555]">
          Datos guardados en este dispositivo (localStorage). StdDev = desviacion historica de la serie de sorpresas, no del nivel del indicador.
          Si el score cruza un umbral y cambia el sesgo de World View, registrarlo en{' '}
          <Link to="/decision-log" className="text-[#818cf8] hover:text-white">Decision Log</Link>.
          <Link to="/dashboard" className="ml-4 font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

// Extracted to avoid jsx-key issues with fragments in the same render fn
function IndicatorBlock({ block, indicators, blockScore, fillRatio, entries, onUpdate }) {
  return (
    <>
      <tr className="border-t border-[#222] bg-[#0d0d0d]">
        <td colSpan={8} className="px-3 py-1.5">
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-widest ${block.accent}`}>
              {block.label}
            </span>
            <div className="flex items-center gap-4">
              <span className="text-[10px] text-[#555]">Peso {block.weight * 100}%</span>
              {fillRatio > 0 && (
                <span className={`font-mono text-xs font-bold ${block.accent}`}>
                  {fmtScore(blockScore)}σ
                </span>
              )}
            </div>
          </div>
        </td>
      </tr>
      {indicators.map(ind => {
        const entry = entries[ind.id] || {}
        const row = calcRow(ind, entry)
        return (
          <tr key={ind.id} className="border-t border-[#111] hover:bg-[#080808]">
            <td className="px-3 py-2 text-xs text-[#ddd]">{ind.name}</td>
            <td className="px-3 py-2 text-center">
              <span className="font-mono text-[10px] text-[#444]">{ind.region}</span>
            </td>
            <td className="px-3 py-2 text-right">
              <input
                type="number"
                step="any"
                value={entry.actual ?? ''}
                onChange={e => onUpdate(ind.id, 'actual', e.target.value)}
                placeholder="—"
                className="w-20 border border-[#2a2a2a] bg-black px-2 py-1 text-right font-mono text-xs text-white placeholder-[#2a2a2a] focus:border-[#ecd987] focus:outline-none"
              />
            </td>
            <td className="px-3 py-2 text-right">
              <input
                type="number"
                step="any"
                value={entry.consensus ?? ''}
                onChange={e => onUpdate(ind.id, 'consensus', e.target.value)}
                placeholder="—"
                className="w-20 border border-[#2a2a2a] bg-black px-2 py-1 text-right font-mono text-xs text-white placeholder-[#2a2a2a] focus:border-[#ecd987] focus:outline-none"
              />
            </td>
            <td className="px-3 py-2 text-center font-mono text-[10px] text-[#444]">{ind.unit}</td>
            <td className={`px-3 py-2 text-right font-mono text-xs ${row ? zColor(row.zScore) : 'text-[#2a2a2a]'}`}>
              {row ? fmtSurprise(row.surprise, ind) : '—'}
            </td>
            <td className={`px-3 py-2 text-right font-mono text-sm font-bold ${row ? zColor(row.zScore) : 'text-[#2a2a2a]'}`}>
              {row ? fmtScore(row.zScore) : '—'}
            </td>
            <td className={`px-3 py-2 text-right font-mono text-xs ${row ? zColor(row.zScore) : 'text-[#2a2a2a]'}`}>
              {row ? fmtScore(row.contribution) : '—'}
            </td>
          </tr>
        )
      })}
    </>
  )
}
