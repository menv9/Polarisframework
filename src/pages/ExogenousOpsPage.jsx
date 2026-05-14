import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useModelStore } from '../store/ModelDataContext'
import { getFreshness, FRESHNESS_DOT, FRESHNESS_TEXT } from '../lib/freshness'

// weight: relevancia relativa del driver (1=menor, 2=moderado, 3=mayor)
const SECTIONS = [
  {
    id: 'commodities',
    label: 'Commodities',
    color: 'text-[#f59e0b]',
    items: [
      { id: 'exo_brent',  label: 'Brent Crude',       unit: '$/bbl',  impact: 'CAD, NOK',      weight: 3, bullCcy: ['CAD','NOK'],      bearCcy: [] },
      { id: 'exo_wti',    label: 'WTI Crude',          unit: '$/bbl',  impact: 'CAD',           weight: 2, bullCcy: ['CAD'],            bearCcy: [] },
      { id: 'exo_iron',   label: 'Iron Ore 62%',       unit: '$/t',    impact: 'AUD',           weight: 2, bullCcy: ['AUD'],            bearCcy: [] },
      { id: 'exo_copper', label: 'Copper',              unit: '$/lb',   impact: 'AUD, NZD',      weight: 2, bullCcy: ['AUD','NZD'],      bearCcy: [] },
      { id: 'exo_gold',   label: 'Gold',                unit: '$/oz',   impact: 'JPY, CHF (RO)', weight: 2, bullCcy: ['CHF','JPY'],      bearCcy: [] },
      { id: 'exo_gdt',    label: 'GDT Dairy',           unit: 'index',  impact: 'NZD',           weight: 1, bullCcy: ['NZD'],            bearCcy: [] },
      { id: 'exo_coal',   label: 'Coal',                unit: '$/t',    impact: 'AUD, NZD',      weight: 1, bullCcy: ['AUD','NZD'],      bearCcy: [] },
      { id: 'exo_grains', label: 'Grains',              unit: 'index',  impact: 'AUD, NZD, CAD', weight: 1, bullCcy: ['AUD','NZD','CAD'],bearCcy: [] },
    ],
  },
  {
    id: 'china',
    label: 'China / Global Growth',
    color: 'text-[#ef4444]',
    items: [
      { id: 'exo_chn_pmi',      label: 'China NBS PMI Mfg',    unit: 'pts',  impact: 'AUD, NZD',    weight: 3, bullCcy: ['AUD','NZD'], bearCcy: [] },
      { id: 'exo_chn_caixin',   label: 'China Caixin PMI Mfg', unit: 'pts',  impact: 'AUD, NZD',    weight: 2, bullCcy: ['AUD','NZD'], bearCcy: [] },
      { id: 'exo_chn_credit',   label: 'China Credit Impulse', unit: '%YoY', impact: 'AUD (6m lag)', weight: 2, bullCcy: ['AUD'],       bearCcy: [] },
      { id: 'exo_eur_pmi_comp', label: 'Eurozone PMI Comp',    unit: 'pts',  impact: 'EUR, SEK',    weight: 2, bullCcy: ['EUR','SEK'], bearCcy: [] },
      { id: 'exo_global_pmi',   label: 'Global PMI Mfg',       unit: 'pts',  impact: 'Risk global', weight: 2, bullCcy: [],            bearCcy: [] },
    ],
  },
  {
    id: 'rates',
    label: 'US Rates',
    color: 'text-[#60a5fa]',
    items: [
      { id: 'exo_us10y',   label: 'US 10Y Treasury',  unit: '%', impact: 'JPY-, EM-',  weight: 3, bullCcy: ['USD'], bearCcy: ['JPY'] },
      { id: 'exo_us_real', label: 'US 10Y TIPS Real',  unit: '%', impact: 'USD, Gold-', weight: 2, bullCcy: ['USD'], bearCcy: []      },
      { id: 'exo_us_2y',   label: 'US 2Y Treasury',   unit: '%', impact: 'USD carry',  weight: 2, bullCcy: ['USD'], bearCcy: []      },
    ],
  },
  {
    id: 'risk',
    label: 'Risk Global',
    color: 'text-[#ef4444]',
    items: [
      { id: 'exo_vix',  label: 'VIX',         unit: 'pts', impact: 'Risk-OFF → JPY/CHF+', weight: 3, bullCcy: ['JPY','CHF','USD'], bearCcy: ['AUD','NZD','CAD','NOK'] },
      { id: 'exo_embi', label: 'EM Corp OAS', unit: 'bps', impact: 'EM stress',           weight: 2, bullCcy: ['USD'],            bearCcy: ['AUD','NZD','SEK']       },
    ],
  },
  {
    id: 'fx',
    label: 'FX Referencia',
    color: 'text-[#a3a3a3]',
    items: [
      { id: 'exo_eurusd', label: 'EUR/USD', unit: 'spot', impact: 'SEK, CHF beta',  weight: 0, bullCcy: [], bearCcy: [] },
      { id: 'exo_usdjpy', label: 'USD/JPY', unit: 'spot', impact: 'EM carry proxy', weight: 0, bullCcy: [], bearCcy: [] },
      { id: 'exo_gbpusd', label: 'GBP/USD', unit: 'spot', impact: 'UK cross ref',   weight: 0, bullCcy: [], bearCcy: [] },
    ],
  },
]

const CCYS = ['AUD','CAD','NOK','NZD','JPY','CHF','USD','EUR','GBP','SEK']

// Frecuencias esperadas por sección (días)
const SECTION_FREQ = { commodities: 7, china: 30, rates: 1, risk: 1, fx: 1 }

function fmt(val, unit) {
  if (val == null || val === '') return '—'
  const n = Number(val)
  if (isNaN(n)) return String(val)
  if (unit === 'pts' || unit === 'bps') return n.toFixed(1)
  if (unit === '%' || unit === '%YoY')  return n.toFixed(2) + '%'
  if (unit === 'spot') return n.toFixed(4)
  return n.toFixed(2)
}

// Punto de freshness inline
function FreshDot({ lastUpdate, frequencyDays }) {
  const f = getFreshness(lastUpdate, frequencyDays)
  return (
    <span className="inline-flex items-center gap-1" title={lastUpdate ?? 'sin fecha'}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${FRESHNESS_DOT[f.status]}`} />
      <span className={`text-[9px] font-mono ${FRESHNESS_TEXT[f.status]}`}>{f.label}</span>
    </span>
  )
}

// Score neto ponderado para una divisa: rango -1 a +1
function weightedScore(ccy, allItems, sourceMap) {
  let num = 0, den = 0
  for (const item of allItems) {
    if (item.weight === 0) continue
    const bullDir = item.bullCcy.includes(ccy) ? 1 : 0
    const bearDir = item.bearCcy.includes(ccy) ? 1 : 0
    if (bullDir === 0 && bearDir === 0) continue
    const src = sourceMap.get(item.id)
    const hasData = src?._value != null && src._value !== ''
    if (!hasData) continue
    const dir = bullDir ? 1 : -1
    num += item.weight * dir
    den += item.weight
  }
  return den > 0 ? num / den : 0
}

function scoreBar(score) {
  const pct = Math.abs(score) * 100
  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <div className="w-16 h-1 bg-[#1a1a1a] relative flex-shrink-0">
        {score >= 0
          ? <div className="absolute left-1/2 top-0 h-full bg-[#4ade80]" style={{ width: `${pct / 2}%` }} />
          : <div className="absolute right-1/2 top-0 h-full bg-[#ef4444]" style={{ width: `${pct / 2}%` }} />
        }
        <div className="absolute left-1/2 top-0 w-px h-full bg-[#333]" />
      </div>
    </div>
  )
}

export default function ExogenousOpsPage() {
  const { dataSources } = useModelStore()

  const sourceMap = useMemo(() =>
    new Map(dataSources.map(s => [s.id, s])),
    [dataSources]
  )

  const allItems = useMemo(() => SECTIONS.flatMap(s => s.items), [])

  // Señal neta ponderada por divisa
  const currencyScores = useMemo(() =>
    Object.fromEntries(CCYS.map(ccy => [ccy, weightedScore(ccy, allItems, sourceMap)])),
    [allItems, sourceMap]
  )

  const allExoIds = allItems.map(i => i.id)
  const withData  = allExoIds.filter(id => {
    const src = sourceMap.get(id)
    return src?._value != null && src._value !== ''
  }).length

  // Staleness summary
  const staleCount = allExoIds.filter(id => {
    const src = sourceMap.get(id)
    if (!src?.lastUpdate) return false
    const sec = SECTIONS.find(s => s.items.some(i => i.id === id))
    const f = getFreshness(src.lastUpdate, SECTION_FREQ[sec?.id] ?? 7)
    return f.status === 'stale' || f.status === 'warn'
  }).length

  return (
    <div className="pt-12 min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-4">

        {/* ── HEADER ── */}
        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
          <div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">EXOGENOUS</h1>
            <p className="text-xs text-[#555] mt-0.5 uppercase tracking-wider">Módulo III — Drivers externos · Commodities · Rates · Risk</p>
          </div>
          <Link to="/data/raw?module=Exogenous"
            className="px-3 py-1.5 text-xs font-bold uppercase tracking-wider border border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white transition-colors">
            Actualizar →
          </Link>
        </div>

        {/* ── COBERTURA ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="grid grid-cols-3">
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Con dato</div>
              <div className={`text-xl font-mono font-bold ${withData >= allExoIds.length * 0.8 ? 'text-[#4ade80]' : withData >= allExoIds.length * 0.5 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                {withData}/{allExoIds.length}
              </div>
              <div className="mt-1 h-1 bg-[#1a1a1a]">
                <div className={`h-full ${withData >= allExoIds.length * 0.8 ? 'bg-[#4ade80]' : 'bg-[#f59e0b]'}`}
                  style={{ width: `${withData / allExoIds.length * 100}%` }} />
              </div>
            </div>
            <div className="p-3 border-r border-[#222]">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Desactualizados</div>
              <div className={`text-xl font-mono font-bold ${staleCount === 0 ? 'text-[#4ade80]' : staleCount <= 3 ? 'text-[#f59e0b]' : 'text-[#ef4444]'}`}>
                {staleCount}
              </div>
              <div className="text-[10px] text-[#444] mt-0.5">datos con retraso</div>
            </div>
            <div className="p-3">
              <div className="text-[10px] text-[#555] uppercase tracking-wider mb-1">Leyenda freshness</div>
              <div className="flex flex-col gap-0.5 text-[9px]">
                <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#4ade80] mr-1" />OK — dentro del plazo</span>
                <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#f59e0b] mr-1" />Warn — 1-2× plazo</span>
                <span><span className="inline-block w-1.5 h-1.5 rounded-full bg-[#ef4444] mr-1" />Stale — &gt;2× plazo</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── SESGO PONDERADO POR DIVISA ── */}
        <div className="border-2 border-[#333] mb-3">
          <div className="px-3 py-1.5 bg-[#1a1a0d] border-b border-[#333]">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Sesgo Exógeno Ponderado por Divisa</span>
            <span className="text-[10px] text-[#555] ml-3">Score −1 (muy bearish) a +1 (muy bullish) · ponderado por relevancia del driver</span>
          </div>
          <div className="grid grid-cols-5 sm:grid-cols-10">
            {CCYS.map(ccy => {
              const score = currencyScores[ccy]
              const color = score > 0.1 ? 'text-[#4ade80]' : score < -0.1 ? 'text-[#ef4444]' : 'text-[#555]'
              const noSignal = score === 0
              return (
                <div key={ccy} className="p-2.5 border-r border-b border-[#1a1a1a] text-center">
                  <div className="text-[9px] text-[#444] uppercase tracking-wider mb-1">{ccy}</div>
                  <div className={`text-base font-mono font-bold ${noSignal ? 'text-[#333]' : color}`}>
                    {noSignal ? '—' : (score >= 0 ? '+' : '') + score.toFixed(2)}
                  </div>
                  {scoreBar(score)}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── TABLAS POR SECCIÓN ── */}
        {SECTIONS.map(section => (
          <div key={section.id} className="border-2 border-[#333] mb-3 overflow-hidden">
            <div className="px-3 py-1.5 bg-[#0f0f0f] border-b border-[#222] flex items-center justify-between">
              <span className={`text-xs font-bold uppercase tracking-widest ${section.color}`}>{section.label}</span>
            </div>
            <table className="w-full text-sm table-fixed">
              <thead>
                <tr className="bg-[#0a0a0a] border-b border-[#222] text-left text-[#444]">
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[30%]">Indicador</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[18%]">Valor</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[14%]">Frescura</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[30%]">Impacto FX</th>
                  <th className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest w-[8%]">↗</th>
                </tr>
              </thead>
              <tbody>
                {section.items.map(item => {
                  const src      = sourceMap.get(item.id)
                  const val      = src?._value
                  const hasValue = val != null && val !== ''
                  const freq     = SECTION_FREQ[section.id] ?? 7
                  const fresh    = getFreshness(src?.lastUpdate, freq)

                  return (
                    <tr key={item.id} className={`border-b border-[#111] hover:bg-[#0a0a0a] transition-colors ${!hasValue ? 'opacity-50' : ''}`}>
                      <td className="px-3 py-2">
                        <span className="text-xs font-bold text-[#e5e5e5]">{item.label}</span>
                        <span className="ml-1.5 text-[9px] text-[#333]">{item.unit}</span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-sm font-mono font-bold ${hasValue ? 'text-white' : 'text-[#333]'}`}>
                          {fmt(val, item.unit)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <FreshDot lastUpdate={src?.lastUpdate} frequencyDays={freq} />
                      </td>
                      <td className="px-3 py-2">
                        {item.bullCcy.length > 0 || item.bearCcy.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {item.bullCcy.map(c => (
                              <span key={c} className="text-[9px] font-bold text-[#4ade80] border border-[#4ade80]/30 px-1">{c}+</span>
                            ))}
                            {item.bearCcy.map(c => (
                              <span key={c} className="text-[9px] font-bold text-[#ef4444] border border-[#ef4444]/30 px-1">{c}−</span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[10px] text-[#444]">{item.impact}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Link to={`/data/raw?highlight=${item.id}`}
                          className="text-[10px] text-[#555] hover:text-[#ecd987] transition-colors">↗</Link>
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
