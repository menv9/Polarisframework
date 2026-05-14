import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { coverageCountries, getCoverageRows, getCoverageSummary, getPrioritySummary } from '../data/coverageMatrix'

const fitConfig = {
  exact: { label: 'OK', color: 'border-[#4ade80] text-[#4ade80] bg-[#06140b]' },
  derived: { label: 'DERIV', color: 'border-[#60a5fa] text-[#60a5fa] bg-[#07111f]' },
  proxy: { label: 'PROXY', color: 'border-[#f59e0b] text-[#f59e0b] bg-[#1a1003]' },
  manual: { label: 'MANUAL', color: 'border-[#888] text-[#aaa] bg-[#111]' },
  pending: { label: 'REVISAR', color: 'border-[#ef4444] text-[#ef4444] bg-[#1a0505]' },
  missing: { label: 'FALTA', color: 'border-[#333] text-[#555] bg-[#080808]' },
}

const comparableConfig = {
  'cross-country': { label: 'COMPARABLE', color: 'text-[#4ade80]' },
  limited: { label: 'CON CAUTELA', color: 'text-[#f59e0b]' },
  'within-country': { label: 'SOLO HISTORIA PROPIA', color: 'text-[#60a5fa]' },
}

const priorityConfig = {
  MVP: { label: 'MVP', color: 'border-[#4ade80] text-[#4ade80]' },
  RECOMMENDED: { label: 'REC', color: 'border-[#60a5fa] text-[#60a5fa]' },
  FULL: { label: 'FULL', color: 'border-[#777] text-[#aaa]' },
}

const fitOrder = {
  exact: 0,
  derived: 1,
  proxy: 2,
  manual: 3,
  pending: 4,
  missing: 5,
}

const priorityOrder = {
  MVP: 0,
  RECOMMENDED: 1,
  FULL: 2,
}

export default function CoverageMatrixPage() {
  const rows = getCoverageRows()
  const [sort, setSort] = useState({ key: 'docNo', direction: 'asc' })
  const sortedRows = useMemo(() => sortRows(rows, sort), [rows, sort])
  const summary = getCoverageSummary(rows)
  const prioritySummary = getPrioritySummary(rows)

  const requestSort = (key) => {
    setSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">Coverage Matrix</h1>
            <div className="text-xs text-[#777] uppercase tracking-wider mt-1">
              24 indicadores Endogenous G10 segun docs 15.2/15.4. Data sigue siendo el aparcamiento.
            </div>
          </div>
          <Link
            to="/data"
            className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
          >
            DATA
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-0 border-2 border-[#333] mb-4">
          <Metric label="Celdas" value={summary.total} color="text-white" />
          <Metric label="Refreshable" value={summary.refreshable} color="text-[#4ade80]" />
          <Metric label="OK" value={summary.exact || 0} color="text-[#4ade80]" />
          <Metric label="Deriv" value={summary.derived || 0} color="text-[#60a5fa]" />
          <Metric label="Proxy/Manual" value={(summary.proxy || 0) + (summary.manual || 0)} color="text-[#f59e0b]" />
          <Metric label="Revisar/Falta" value={(summary.pending || 0) + (summary.missing || 0)} color="text-[#ef4444]" />
        </div>

        <div className="grid grid-cols-3 gap-0 border-2 border-[#333] mb-4">
          <PriorityMetric label="MVP modelo" value={prioritySummary.MVP || 0} config={priorityConfig.MVP} />
          <PriorityMetric label="Recomendado" value={prioritySummary.RECOMMENDED || 0} config={priorityConfig.RECOMMENDED} />
          <PriorityMetric label="Completo/backlog" value={prioritySummary.FULL || 0} config={priorityConfig.FULL} />
        </div>

        <div className="mb-4 border-2 border-[#333]">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-0 text-xs">
            <Legend fit="exact" text="Serie directa: entra al modelo con confianza alta." />
            <Legend fit="derived" text="Formula o transformacion correcta: YoY, percentil, spread, media." />
            <Legend fit="proxy" text="Sustituto operativo: util, pero no fuente exacta." />
            <Legend fit="manual" text="Dato bueno si se actualiza manualmente." />
            <Legend fit="pending" text="No entra aun: falta endpoint o validacion." />
          </div>
        </div>

        <div className="border-2 border-[#333] overflow-x-auto">
          <table className="w-full min-w-[1180px] text-sm table-fixed">
            <thead>
              <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[250px]">
                  <SortHeader label="Variable Canonica" sortKey="docNo" sort={sort} onSort={requestSort} />
                </th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[115px]">
                  <SortHeader label="Comparacion" sortKey="comparable" sort={sort} onSort={requestSort} />
                </th>
                <th className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[120px]">
                  <SortHeader label="Transform" sortKey="transform" sort={sort} onSort={requestSort} />
                </th>
                {coverageCountries.map((country) => (
                  <th key={country.code} className="px-2 py-2 text-xs font-bold uppercase tracking-widest w-[86px] text-center">
                    <SortHeader label={country.label} sortKey={`country:${country.code}`} sort={sort} onSort={requestSort} align="center" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((row) => (
                <tr key={row.key} className="border-b border-[#222] align-top">
                  <td className="px-2 py-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-bold text-white uppercase tracking-wider">{row.label}</div>
                      <span className={`shrink-0 border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${priorityConfig[row.priority]?.color || 'border-[#555] text-[#777]'}`}>
                        {priorityConfig[row.priority]?.label || row.priority}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#777] mt-1 leading-tight">{row.description}</div>
                    <div className="text-[10px] text-[#555] mt-1 uppercase tracking-wider">
                      #{row.docNo} / beta {row.beta.toFixed(2)} / {row.horizon} / {row.category}
                    </div>
                  </td>
                  <td className="px-2 py-2">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${comparableConfig[row.comparable]?.color || 'text-[#777]'}`}>
                      {comparableConfig[row.comparable]?.label || row.comparable}
                    </div>
                  </td>
                  <td className="px-2 py-2 text-[10px] text-[#a3a3a3] uppercase tracking-wider">
                    {row.transform}
                  </td>
                  {row.cells.map((cell) => (
                    <td key={`${row.key}-${cell.country.code}`} className="px-1.5 py-2">
                      <CoverageCell cell={cell} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function sortRows(rows, sort) {
  const direction = sort.direction === 'desc' ? -1 : 1

  return [...rows].sort((a, b) => {
    let result = 0

    if (sort.key.startsWith('country:')) {
      const countryCode = sort.key.split(':')[1]
      const aCell = a.cells.find((cell) => cell.country.code === countryCode)
      const bCell = b.cells.find((cell) => cell.country.code === countryCode)
      result = compareNumber(fitOrder[aCell?.fit] ?? 99, fitOrder[bCell?.fit] ?? 99)
    } else if (sort.key === 'docNo') {
      result = compareNumber(a.docNo, b.docNo)
    } else if (sort.key === 'comparable') {
      result = compareText(a.comparable, b.comparable)
    } else if (sort.key === 'transform') {
      result = compareText(a.transform, b.transform)
    }

    if (result === 0) {
      result = compareNumber(priorityOrder[a.priority] ?? 99, priorityOrder[b.priority] ?? 99)
    }

    if (result === 0) {
      result = compareNumber(a.docNo, b.docNo)
    }

    return result * direction
  })
}

function compareNumber(a, b) {
  return a === b ? 0 : a > b ? 1 : -1
}

function compareText(a, b) {
  return String(a).localeCompare(String(b))
}

function SortHeader({ label, sortKey, sort, onSort, align = 'left' }) {
  const active = sort.key === sortKey
  const marker = active ? (sort.direction === 'asc' ? '↑' : '↓') : ''

  return (
    <button
      type="button"
      onClick={() => onSort(sortKey)}
      className={`w-full text-xs font-bold uppercase tracking-widest hover:text-white ${active ? 'text-[#ecd987]' : 'text-[#777]'} ${
        align === 'center' ? 'text-center' : 'text-left'
      }`}
      title="Ordenar columna"
    >
      <span>{label}</span>
      {marker && <span className="ml-1">{marker}</span>}
    </button>
  )
}

function Metric({ label, value, color }) {
  return (
    <div className="p-3 border-r border-b md:border-b-0 border-[#222]">
      <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-xl font-mono font-bold ${color}`}>{value}</div>
    </div>
  )
}

function PriorityMetric({ label, value, config }) {
  return (
    <div className="p-3 border-r border-[#222]">
      <div className="text-[10px] text-[#777] uppercase tracking-widest mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <span className={`inline-block border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
          {config.label}
        </span>
        <span className="text-lg font-mono font-bold text-white">{value}</span>
      </div>
    </div>
  )
}

function Legend({ fit, text }) {
  const cfg = fitConfig[fit]
  return (
    <div className="p-3 border-r border-b md:border-b-0 border-[#222]">
      <span className={`inline-block px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${cfg.color}`}>
        {cfg.label}
      </span>
      <div className="text-[10px] text-[#888] mt-2 leading-tight">{text}</div>
    </div>
  )
}

function CoverageCell({ cell }) {
  const cfg = fitConfig[cell.fit] || fitConfig.missing

  if (!cell.source) {
    return (
      <div className={`min-h-[72px] border px-1.5 py-1.5 ${cfg.color}`}>
        <div className="text-[10px] font-bold uppercase tracking-wider">{cfg.label}</div>
        <div className="text-[10px] text-[#555] mt-1">Sin fila en Data</div>
      </div>
    )
  }

  return (
    <Link
      to={`/data?module=Endogenous&highlight=${cell.source.id}`}
      title={`${cell.source.indicator}: ${cell.source.dataCheck}`}
      className={`block min-h-[72px] border px-1.5 py-1.5 hover:border-white ${cfg.color}`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="text-[10px] font-bold uppercase tracking-wider">{cfg.label}</span>
        {cell.refreshable && <span className="text-[9px] text-[#4ade80]">AUTO</span>}
      </div>
      <div className="text-[10px] text-white mt-1 leading-tight line-clamp-2">{cell.source.indicator}</div>
      <div className="text-[9px] text-[#888] mt-1 leading-tight line-clamp-2">{cell.source.dataMeasure}</div>
    </Link>
  )
}
