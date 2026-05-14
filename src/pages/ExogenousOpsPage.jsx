import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'

// ── Secciones de indicadores exógenos ────────────────────────────────────────
const SECTIONS = [
  {
    id: 'commodities',
    label: 'Commodities',
    color: 'text-[#f59e0b]',
    items: [
      { id: 'exo_brent',  label: 'Brent Crude',      unit: '$/bbl',  impact: 'CAD, NOK',      bullCcy: ['CAD','NOK'],      bearCcy: [] },
      { id: 'exo_wti',    label: 'WTI Crude',         unit: '$/bbl',  impact: 'CAD',           bullCcy: ['CAD'],            bearCcy: [] },
      { id: 'exo_iron',   label: 'Iron Ore 62%',      unit: '$/t',    impact: 'AUD',           bullCcy: ['AUD'],            bearCcy: [] },
      { id: 'exo_copper', label: 'Copper',             unit: '$/lb',   impact: 'AUD, NZD',      bullCcy: ['AUD','NZD'],      bearCcy: [] },
      { id: 'exo_gold',   label: 'Gold',               unit: '$/oz',   impact: 'JPY, CHF (RO)', bullCcy: ['CHF','JPY'],      bearCcy: [] },
      { id: 'exo_gdt',    label: 'GDT Dairy',          unit: 'index',  impact: 'NZD',           bullCcy: ['NZD'],            bearCcy: [] },
      { id: 'exo_coal',   label: 'Coal',               unit: '$/t',    impact: 'AUD, NZD',      bullCcy: ['AUD','NZD'],      bearCcy: [] },
      { id: 'exo_grains', label: 'Grains',             unit: 'index',  impact: 'AUD, NZD, CAD', bullCcy: ['AUD','NZD','CAD'],bearCcy: [] },
    ],
  },
  {
    id: 'china',
    label: 'China / Global Growth',
    color: 'text-[#ef4444]',
    items: [
      { id: 'exo_chn_pmi',      label: 'China NBS PMI Mfg',    unit: 'pts',  impact: 'AUD, NZD',   bullCcy: ['AUD','NZD'], bearCcy: [] },
      { id: 'exo_chn_caixin',   label: 'China Caixin PMI Mfg', unit: 'pts',  impact: 'AUD, NZD',   bullCcy: ['AUD','NZD'], bearCcy: [] },
      { id: 'exo_chn_credit',   label: 'China Credit Impulse', unit: '%YoY', impact: 'AUD (6m lag)',bullCcy: ['AUD'],       bearCcy: [] },
      { id: 'exo_eur_pmi_comp', label: 'Eurozone PMI Comp',    unit: 'pts',  impact: 'EUR, SEK',   bullCcy: ['EUR','SEK'], bearCcy: [] },
      { id: 'exo_global_pmi',   label: 'Global PMI Mfg',       unit: 'pts',  impact: 'Risk global',bullCcy: [],            bearCcy: [] },
    ],
  },
  {
    id: 'rates',
    label: 'US Rates',
    color: 'text-[#60a5fa]',
    items: [
      { id: 'exo_us10y',  label: 'US 10Y Treasury',    unit: '%', impact: 'JPY-, EM-',  bullCcy: ['USD'], bearCcy: ['JPY'] },
      { id: 'exo_us_real',label: 'US 10Y TIPS Real',   unit: '%', impact: 'USD, Gold-', bullCcy: ['USD'], bearCcy: []      },
      { id: 'exo_us_2y',  label: 'US 2Y Treasury',     unit: '%', impact: 'USD carry',  bullCcy: ['USD'], bearCcy: []      },
    ],
  },
  {
    id: 'risk',
    label: 'Risk Global',
    color: 'text-[#ef4444]',
    items: [
      { id: 'exo_vix',  label: 'VIX',         unit: 'pts', impact: 'Risk-OFF → JPY/CHF+', bullCcy: ['JPY','CHF','USD'], bearCcy: ['AUD','NZD','CAD','NOK'] },
      { id: 'exo_embi', label: 'EM Corp OAS', unit: 'bps', impact: 'EM stress',           bullCcy: ['USD'],            bearCcy: ['AUD','NZD','SEK']       },
    ],
  },
  {
    id: 'fx',
    label: 'FX Referencia',
    color: 'text-[#a3a3a3]',
    items: [
      { id: 'exo_eurusd', label: 'EUR/USD', unit: 'spot', impact: 'SEK, CHF beta', bullCcy: [], bearCcy: [] },
      { id: 'exo_usdjpy', label: 'USD/JPY', unit: 'spot', impact: 'EM carry proxy', bullCcy: [], bearCcy: [] },
      { id: 'exo_gbpusd', label: 'GBP/USD', unit: 'spot', impact: 'UK cross ref',  bullCcy: [], bearCcy: [] },
    ],
  },
]

// Divisas para la matriz de impacto
const CCYS = ['AUD','CAD','NOK','NZD','JPY','CHF','USD','EUR','GBP','SEK']

function fmt(val, unit) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (unit === 'pts' || unit === 'bps') return n.toFixed(1)
  if (unit === '%' || unit === '%YoY') return n.toFixed(2) + '%'
  if (unit === 'spot') return n.toFixed(4)
  return n.toFixed(2)
}

function fmtDate(d) {
  if (!d) return '—'
  return String(d).substring(0, 10)
}

export default function ExogenousOpsPage() {
  const { dataSources } = useModelStore()

  // Mapa rápido sourceId → source
  const sourceMap = useMemo(() =>
    new Map(dataSources.map(s => [s.id, s])),
    [dataSources]
  )

  // ── Matriz de impacto por divisa ──────────────────────────────────────────
  // Cuenta cuántos drivers activos son bullish vs bearish para cada divisa
  const currencyBias = useMemo(() => {
    const bias = Object.fromEntries(CCYS.map(c => [c, { bull: 0, bear: 0 }]))
    for (const section of SECTIONS) {
      for (const item of section.items) {
        const src = sourceMap.get(item.id)
        const val = src?._value
        if (val == null || val === '') continue
        // Solo contamos si hay dato actualizado (no default)
        for (const c of item.bullCcy) bias[c].bull++
        for (const c of item.bearCcy) bias[c].bear++
      }
    }
    return bias
  }, [sourceMap])

  // Cuenta total de fuentes con dato vs sin dato
  const allExoIds = SECTIONS.flatMap(s => s.items.map(i => i.id))
  const withData  = allExoIds.filter(id => {
    const src = sourceMap.get(id)
    return src?._value != null && src._value !== ''
  }).length

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ===== HEADER ===== */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <h1 className="text-2xl font-bold uppercase tracking-widest">OPERATIVA — EXOGENOUS</h1>
          <Link
            to="/data/raw?module=Exogenous"
            className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
          >
            ACTUALIZAR DATOS →
          </Link>
        </div>

        {/* ===== ESTADO COBERTURA ===== */}
        <div className="border-2 border-[#333] mb-4">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Cobertura de Datos</span>
          </div>
          <div className="grid grid-cols-3 gap-0">
            <div className="p-3 border-r border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Indicadores con dato</div>
              <div className={`text-2xl font-mono font-bold ${withData >= allExoIds.length * 0.8 ? 'text-[#4ade80]' : withData >= allExoIds.length * 0.5 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                {withData}/{allExoIds.length}
              </div>
            </div>
            <div className="p-3 border-r border-[#222]">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Cobertura</div>
              <div className={`text-2xl font-mono font-bold ${withData >= allExoIds.length * 0.8 ? 'text-[#4ade80]' : 'text-[#f59e0b]'}`}>
                {Math.round(withData / allExoIds.length * 100)}%
              </div>
            </div>
            <div className="p-3">
              <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Nota</div>
              <div className="text-xs text-[#555] uppercase tracking-wider leading-relaxed">
                Solo lectura — editar en /data
              </div>
            </div>
          </div>
        </div>

        {/* ===== MATRIZ DE IMPACTO POR DIVISA ===== */}
        <div className="border-2 border-[#333] mb-4 overflow-x-auto">
          <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
            <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Sesgo Exógeno por Divisa</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-0 min-w-[480px]">
            {CCYS.map(ccy => {
              const { bull, bear } = currencyBias[ccy]
              const net = bull - bear
              const color = net > 0 ? 'text-[#4ade80]' : net < 0 ? 'text-[#ef4444]' : 'text-[#555]'
              const label = net > 1 ? '▲▲' : net === 1 ? '▲' : net === -1 ? '▼' : net < -1 ? '▼▼' : '—'
              return (
                <div key={ccy} className="p-3 border-r border-b border-[#222] text-center">
                  <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{ccy}</div>
                  <div className={`text-xl font-mono font-bold ${color}`}>{label}</div>
                  {(bull > 0 || bear > 0) && (
                    <div className="text-[9px] text-[#444] mt-0.5">{bull}↑ {bear}↓</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ===== TABLAS POR SECCIÓN ===== */}
        {SECTIONS.map(section => (
          <div key={section.id} className="border-2 border-[#333] mb-4 overflow-hidden">
            <div className="px-3 py-2 bg-[#161616] border-b-2 border-[#333]">
              <span className={`text-sm font-bold uppercase tracking-widest ${section.color}`}>{section.label}</span>
            </div>
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-[#111] border-b border-[#333] text-left text-[#555]">
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[28%]">Indicador</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[18%]">Valor</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[16%]">Actualizado</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[30%]">Impacto FX</th>
                  <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[8%]">Fuente</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map(item => {
                  const src      = sourceMap.get(item.id)
                  const val      = src?._value
                  const hasValue = val != null && val !== ''
                  return (
                    <tr key={item.id} className="border-b border-[#222] hover:bg-[#0a0a0a]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{item.label}</span>
                        <span className="ml-1.5 text-[10px] text-[#444]">{item.unit}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className={`text-sm font-mono font-bold ${hasValue ? 'text-white' : 'text-[#444]'}`}>
                          {fmt(val, item.unit)}
                        </span>
                        {!hasValue && (
                          <span className="ml-1.5 text-[10px] text-[#444] uppercase tracking-wider">sin dato</span>
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-xs font-mono text-[#555]">{fmtDate(src?.lastUpdate)}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <span className="text-xs text-[#777] uppercase tracking-wider">{item.impact}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <Link
                          to={`/data/raw?highlight=${item.id}`}
                          className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white"
                          title={item.id}
                        >
                          ↗
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ))}

      </div>
    </div>
  )
}
