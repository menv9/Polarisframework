import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  Banknote,
  BarChart3,
  ChevronDown,
  Database,
  ExternalLink,
  Gauge,
  Globe2,
  History,
  Landmark,
  LineChart,
  ShieldAlert,
} from 'lucide-react'
import { getStatus } from '../data/dataSources'
import { useModelStore } from '../store/ModelDataContext'

const COUNTRIES = [
  { code: 'usa', label: 'United States', short: 'US', ccy: 'USD', wvGrowthId: 'wv_gdp_usa' },
  { code: 'eur', label: 'Euro Area', short: 'EU', ccy: 'EUR', wvGrowthId: 'wv_gdp_eur' },
  { code: 'jpn', label: 'Japan', short: 'JP', ccy: 'JPY', wvGrowthId: 'wv_gdp_jpn' },
  { code: 'gbr', label: 'United Kingdom', short: 'UK', ccy: 'GBP' },
  { code: 'che', label: 'Switzerland', short: 'CH', ccy: 'CHF' },
  { code: 'can', label: 'Canada', short: 'CA', ccy: 'CAD' },
  { code: 'aus', label: 'Australia', short: 'AU', ccy: 'AUD' },
  { code: 'nzl', label: 'New Zealand', short: 'NZ', ccy: 'NZD' },
  { code: 'swe', label: 'Sweden', short: 'SE', ccy: 'SEK' },
  { code: 'nor', label: 'Norway', short: 'NO', ccy: 'NOK' },
]

const TABS = [
  { id: 'indicators', label: 'Indicators' },
  { id: 'sources', label: 'Sources' },
  { id: 'history', label: 'History' },
]

const KEY_METRICS = [
  { key: 'real_2y', label: 'Real rate 2Y', icon: Banknote, tone: 'info' },
  { key: 'policy', label: 'Policy rate', icon: Landmark, tone: 'default' },
  { key: 'cpi', label: 'CPI YoY', icon: Activity, tone: 'warning' },
  { key: 'core_cpi', label: 'Core CPI YoY', icon: Gauge, tone: 'warning' },
  { key: 'pmi', label: 'PMI / ISM', icon: LineChart, tone: 'positive' },
  { key: 'nfp', label: 'Employment', icon: BarChart3, tone: 'default' },
  { key: 'debt', label: 'Govt debt/GDP', icon: ShieldAlert, tone: 'negative' },
  { key: 'ca_gdp', label: 'Current account/GDP', icon: Globe2, tone: 'info' },
]

function sourceIdFor(countryCode, metricKey) {
  const suffix = metricKey === 'nfp' && countryCode !== 'usa' ? 'empl' : metricKey
  return `endo_${countryCode}_${suffix}`
}

function fmtValue(value) {
  if (!Number.isFinite(value)) return 'NO DATA'
  const abs = Math.abs(value)
  if (abs >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (abs >= 100) return value.toFixed(1)
  return value.toFixed(2)
}

function fmtDate(value) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toISOString().slice(0, 10)
}

function latestPoint(entry) {
  const series = entry?.series
  if (!Array.isArray(series) || series.length === 0) return null
  return series[series.length - 1]
}

function MetricCard({ metric }) {
  const Icon = metric.icon
  const toneClass = {
    positive: 'text-[#4ade80]',
    warning: 'text-[#f59e0b]',
    negative: 'text-[#ef4444]',
    info: 'text-[#60a5fa]',
    default: 'text-white',
  }[metric.tone]

  return (
    <Link
      to={`/data/raw?highlight=${encodeURIComponent(metric.sourceId)}`}
      className="block min-h-[104px] border border-[#222] bg-[#050505] p-3 transition-colors hover:border-[#555] hover:bg-[#0a0a0a]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-[#555]">{metric.label}</div>
          <div className={`mt-1 font-mono text-xl font-bold ${metric.hasValue ? toneClass : 'text-[#333]'}`}>
            {metric.displayValue}
          </div>
        </div>
        <Icon size={18} className="text-[#555] shrink-0" />
      </div>
      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] uppercase tracking-wider">
        <span className={metric.status.color}>{metric.status.label}</span>
        <span className="text-[#555]">{metric.date}</span>
      </div>
      <div className="mt-1 truncate text-[10px] text-[#555]">{metric.sourceName}</div>
    </Link>
  )
}

function StatusPill({ source }) {
  const status = getStatus(source)
  return <span className={`text-[10px] font-bold uppercase tracking-wider ${status.color}`}>{status.label}</span>
}

export default function GeneralPage() {
  const { dataSources, features, history, zscores } = useModelStore()
  const [countryCode, setCountryCode] = useState('usa')
  const [activeTab, setActiveTab] = useState('indicators')

  const sourceById = useMemo(
    () => new Map(dataSources.map((source) => [source.id, source])),
    [dataSources],
  )

  const country = COUNTRIES.find((item) => item.code === countryCode) ?? COUNTRIES[0]

  const countrySources = useMemo(
    () => dataSources.filter((source) => source.id.startsWith(`endo_${countryCode}_`)),
    [dataSources, countryCode],
  )

  const metrics = useMemo(() => (
    KEY_METRICS.map((item) => {
      const sourceId = sourceIdFor(countryCode, item.key)
      const source = sourceById.get(sourceId)
      const value = features.valuesBySourceId[sourceId]
      const raw = features.rawBySourceId[sourceId]
      const point = latestPoint(history[sourceId])
      const zKey = `${countryCode}_${item.key}`
      const z = zscores[zKey]
      const status = source ? getStatus(source) : { label: 'MISSING', color: 'text-[#ef4444]' }
      return {
        ...item,
        sourceId,
        source,
        sourceName: source?.primarySource || source?.scraper || 'Missing source',
        value,
        raw,
        z,
        latestPoint: point,
        hasValue: Number.isFinite(value),
        displayValue: fmtValue(value),
        date: fmtDate(source?._lastScrape?.date || point?.date || source?.lastUpdate),
        status,
      }
    })
  ), [countryCode, sourceById, features, history, zscores])

  const availableCount = metrics.filter((metric) => metric.hasValue).length
  const historyCount = countrySources.filter((source) => history[source.id]?.series?.length > 0).length
  const refreshableCount = countrySources.filter((source) => source.apiPath || source.fredSeriesId).length
  const staleCount = countrySources.filter((source) => getStatus(source).code === 'stale').length
  const latestUpdate = countrySources
    .map((source) => source._lastScrape?.date || source.lastUpdate)
    .filter(Boolean)
    .sort()
    .at(-1)

  const tableRows = useMemo(() => (
    countrySources.map((source) => {
      const value = features.valuesBySourceId[source.id]
      const raw = features.rawBySourceId[source.id]
      const entry = history[source.id]
      const point = latestPoint(entry)
      const suffix = source.id.replace(`endo_${countryCode}_`, '')
      const zKey = `${countryCode}_${suffix === 'empl' ? 'nfp' : suffix}`
      return {
        source,
        value,
        raw,
        latestPoint: point,
        historyPoints: entry?.series?.length ?? 0,
        z: zscores[zKey],
        transform: features.metaBySourceId[source.id]?.transform || 'identity',
      }
    })
  ), [countrySources, countryCode, features, history, zscores])

  return (
    <div className="pt-12 min-h-screen">
      <div className="mx-auto max-w-7xl px-4 py-4">
        <div className="mb-4 flex flex-col gap-3 border-b-2 border-[#333] pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.28em] text-[#555]">
              Data-driven country view
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-widest">General</h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="relative">
              <span className="sr-only">Pais</span>
              <select
                value={countryCode}
                onChange={(event) => {
                  setCountryCode(event.target.value)
                  setActiveTab('indicators')
                }}
                className="h-9 min-w-[230px] appearance-none border border-[#333] bg-black px-3 pr-9 text-sm font-bold text-white outline-none focus:border-[#ecd987]"
              >
                {COUNTRIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    [{item.short}] {item.label}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#777]" />
            </label>
            <Link
              to={`/data/raw?module=Endogenous&highlight=${encodeURIComponent(sourceIdFor(countryCode, 'real_2y'))}`}
              className="border border-[#333] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#777] hover:border-[#ecd987] hover:text-[#ecd987]"
            >
              Actualizar datos
            </Link>
          </div>
        </div>

        <section className="mb-4 grid gap-4 xl:grid-cols-[280px_1fr]">
          <div className="border-2 border-[#333]">
            <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Pais</span>
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex h-14 w-14 items-center justify-center border-2 border-[#333] font-mono text-xl font-bold text-[#ecd987]">
                    {country.short}
                  </div>
                  <h2 className="mt-3 text-xl font-bold uppercase tracking-widest text-white">{country.label}</h2>
                  <div className="mt-1 text-xs uppercase tracking-widest text-[#777]">{country.ccy}</div>
                </div>
                <Database size={22} className="text-[#555]" />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-[11px]">
                <div className="border border-[#222] p-2">
                  <div className="uppercase tracking-widest text-[#555]">Valores</div>
                  <div className="mt-1 font-mono text-[#ecd987]">{availableCount}/{metrics.length}</div>
                </div>
                <div className="border border-[#222] p-2">
                  <div className="uppercase tracking-widest text-[#555]">Historico</div>
                  <div className="mt-1 font-mono text-[#ecd987]">{historyCount}/{countrySources.length}</div>
                </div>
                <div className="border border-[#222] p-2">
                  <div className="uppercase tracking-widest text-[#555]">Endpoints</div>
                  <div className="mt-1 font-mono text-[#ecd987]">{refreshableCount}</div>
                </div>
                <div className="border border-[#222] p-2">
                  <div className="uppercase tracking-widest text-[#555]">Stale</div>
                  <div className={`mt-1 font-mono ${staleCount > 0 ? 'text-[#ef4444]' : 'text-[#4ade80]'}`}>{staleCount}</div>
                </div>
              </div>

              <div className="mt-4 border border-[#222] p-3">
                <div className="text-[10px] uppercase tracking-widest text-[#555]">Ultima actualizacion</div>
                <div className="mt-1 font-mono text-sm text-white">{fmtDate(latestUpdate)}</div>
              </div>
            </div>
          </div>

          <div className="border-2 border-[#333]">
            <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Datos representativos reales</span>
            </div>
            <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
              {metrics.map((metric) => (
                <MetricCard key={metric.sourceId} metric={metric} />
              ))}
            </div>
          </div>
        </section>

        {availableCount === 0 && (
          <div className="mb-4 border border-[#ef4444] bg-[#1a0000] px-3 py-2 text-[11px] font-mono text-[#ef4444]">
            SIN VALORES REALES PARA {country.ccy}. Refresca fuentes automaticas o importa historicos; esta pantalla no usa fallback modelado.
          </div>
        )}

        <section className="border-2 border-[#333]">
          <div className="bg-[#1a1a0d] border-b border-[#333] px-3 py-1.5">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ecd987]">Detalle</span>
          </div>
          <div className="border-b border-[#222] p-2">
            <div className="grid max-w-xl grid-cols-3 gap-2">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-2 py-2 text-[10px] font-bold uppercase tracking-widest ${
                    activeTab === tab.id
                      ? 'border border-[#ecd987] text-[#ecd987]'
                      : 'border border-[#222] text-[#666] hover:border-[#555] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'indicators' && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] table-fixed text-sm">
                <thead>
                  <tr className="bg-[#111] text-left">
                    <th className="w-[22%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Indicator</th>
                    <th className="w-[12%] px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#555]">Value</th>
                    <th className="w-[10%] px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#555]">Raw</th>
                    <th className="w-[10%] px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-[#555]">Z</th>
                    <th className="w-[12%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Date</th>
                    <th className="w-[12%] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Status</th>
                    <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#555]">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.source.id} className="border-t border-[#111] hover:bg-[#0a0a0a]">
                      <td className="px-3 py-2">
                        <Link to={`/data/raw?highlight=${encodeURIComponent(row.source.id)}`} className="font-bold text-[#ddd] hover:text-[#ecd987]">
                          {row.source.indicator}
                        </Link>
                        <div className="mt-0.5 text-[10px] uppercase tracking-wider text-[#444]">{row.source.category} / {row.transform}</div>
                      </td>
                      <td className={`px-3 py-2 text-right font-mono ${Number.isFinite(row.value) ? 'text-white' : 'text-[#333]'}`}>{fmtValue(row.value)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${Number.isFinite(row.raw) ? 'text-[#aaa]' : 'text-[#333]'}`}>{fmtValue(row.raw)}</td>
                      <td className={`px-3 py-2 text-right font-mono ${Number.isFinite(row.z) ? row.z > 0 ? 'text-[#4ade80]' : row.z < 0 ? 'text-[#ef4444]' : 'text-[#555]' : 'text-[#333]'}`}>
                        {Number.isFinite(row.z) ? `${row.z >= 0 ? '+' : ''}${row.z.toFixed(2)}` : 'NO DATA'}
                      </td>
                      <td className="px-3 py-2 font-mono text-[#777]">{fmtDate(row.source._lastScrape?.date || row.latestPoint?.date || row.source.lastUpdate)}</td>
                      <td className="px-3 py-2"><StatusPill source={row.source} /></td>
                      <td className="px-3 py-2 text-xs text-[#777]">{row.source.primarySource || row.source.scraper || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'sources' && (
            <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
              {countrySources.map((source) => (
                <div key={source.id} className="border-b border-r border-[#222] p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">{source.indicator}</div>
                      <div className="mt-0.5 font-mono text-[10px] text-[#555]">{source.id}</div>
                    </div>
                    <StatusPill source={source} />
                  </div>
                  <div className="space-y-1 text-[11px] text-[#777]">
                    <div>Fit: <span className="font-mono text-[#ecd987]">{source.dataFit || '-'}</span></div>
                    <div>Access: <span className="font-mono text-[#aaa]">{source.accessMode || '-'}</span></div>
                    <div>Frequency: <span className="font-mono text-[#aaa]">{source.frequency || '-'}</span></div>
                    <div>Endpoint: <span className="font-mono text-[#aaa]">{source.apiPath || source.fredSeriesId || 'manual'}</span></div>
                  </div>
                  {source.scrapeUrl && (
                    <a href={source.scrapeUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">
                      Fuente <ExternalLink size={12} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="grid gap-0 md:grid-cols-2 xl:grid-cols-3">
              {tableRows.map((row) => (
                <div key={row.source.id} className="border-b border-r border-[#222] p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <History size={15} className="text-[#555]" />
                    <div className="text-xs font-bold text-white">{row.source.indicator}</div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="border border-[#222] p-2">
                      <div className="uppercase tracking-widest text-[#555]">Points</div>
                      <div className="mt-1 font-mono text-[#ecd987]">{row.historyPoints}</div>
                    </div>
                    <div className="border border-[#222] p-2">
                      <div className="uppercase tracking-widest text-[#555]">Latest</div>
                      <div className="mt-1 font-mono text-[#aaa]">{fmtValue(Number(row.latestPoint?.value))}</div>
                    </div>
                    <div className="border border-[#222] p-2">
                      <div className="uppercase tracking-widest text-[#555]">Date</div>
                      <div className="mt-1 font-mono text-[#aaa]">{fmtDate(row.latestPoint?.date)}</div>
                    </div>
                  </div>
                  <Link to={`/data/history/${row.source.id}`} className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">
                    Abrir serie <ExternalLink size={12} />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
