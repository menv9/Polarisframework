import { Link } from 'react-router-dom'
import { useModelStore, WV_DATA_MAP, WV_GDP_GAP_MAP, WV_CPI_G7_SOURCE_IDS, DEFAULT_WV_DATA } from '../store/ModelDataContext'
import { getFreshness, FRESHNESS_DOT, FRESHNESS_TEXT } from '../lib/freshness'
import { detectInflationRegime } from '../lib/scoring/regime'

const WV_FREQ = {
  gdpUsa: 90, gdpEur: 90, gdpChn: 90, gdpJpn: 90, gdpResto: 30,
  vix: 7, hyOas: 7, sp200dma: 7, embi: 7,
  smartZ: 7, retailZ: 7,
  dxy: 1, dxyRising: 1,
  cpiG7: 30, breakevens: 7, cbPolicyStance: 7,
}

function FreshDot({ lastUpdate, frequencyDays }) {
  const f = getFreshness(lastUpdate, frequencyDays)
  return (
    <span className="flex items-center gap-1">
      <span className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${FRESHNESS_DOT[f.status]}`} />
      <span className={`text-[9px] font-mono ${FRESHNESS_TEXT[f.status]}`}>{f.label}</span>
    </span>
  )
}

function fmt(value, key) {
  if (value == null) return '—'
  if (key === 'sp200dma' || key === 'dxyRising') return value === 1 ? 'ABOVE / RISING' : 'BELOW / FALLING'
  if (key === 'cbPolicyStance') return value >= 1 ? 'HAWKISH' : value <= -1 ? 'DOVISH' : 'NEUTRAL'
  return typeof value === 'number' ? value.toFixed(2) : String(value)
}

function getWorldViewDecision({ regime, scoreGDP, usdBias, inflation }) {
  const growthUp = scoreGDP > 0.5
  const growthDown = scoreGDP < -0.5
  const inflationary = inflation === 'INFLACIONARIO'
  const disinflationary = inflation === 'DESINFLACIONARIO'

  if (regime === 'RISK-ON' && growthUp && usdBias === 'BEARISH' && inflationary) return 'LONG PRO-CICLICAS VS USD, LONG EM'
  if (regime === 'RISK-ON' && growthUp && usdBias === 'BEARISH') return 'LONG PRO-CICLICAS VS USD'
  if (regime === 'RISK-ON' && growthUp && usdBias === 'BULLISH' && inflationary) return 'LONG COMMODITY CURRENCIES'
  if (regime === 'RISK-ON' && growthUp && usdBias === 'BULLISH') return 'PRO-CICLICAS SELECTIVAS; EVITAR SHORT USD DEBIL'
  if (regime === 'RISK-ON' && growthUp && usdBias === 'NEUTRAL') return 'LONG PRO-CICLICAS VS REFUGIO'
  if (regime === 'RISK-ON') return 'SESGO RISK-ON; EXIGIR CONFIRMACION DE CRECIMIENTO'

  if (regime === 'RISK-OFF' && growthDown && usdBias === 'BULLISH') return 'LONG USD VS TODO. SHORT EM'
  if (regime === 'RISK-OFF' && growthDown && usdBias === 'NEUTRAL' && disinflationary) return 'LONG JPY/CHF VS PRO-CICLICAS'
  if (regime === 'RISK-OFF' && growthDown && usdBias === 'NEUTRAL') return 'LONG REFUGIO VS PRO-CICLICAS'
  if (regime === 'RISK-OFF' && growthDown && usdBias === 'BEARISH') return 'LONG JPY/CHF; EVITAR USD COMO REFUGIO PRINCIPAL'
  if (regime === 'RISK-OFF') return 'REDUCIR RIESGO; SOLO REFUGIO CON CONFIRMACION'

  if (regime === 'MIXTO' && growthUp && usdBias === 'BEARISH') return 'PRO-CICLICAS VS USD CON TAMANO REDUCIDO'
  if (regime === 'MIXTO' && growthUp && usdBias === 'BULLISH') return 'COMMODITY FX / CARRY SELECTIVO; USD COMO FILTRO'
  if (regime === 'MIXTO' && growthDown && usdBias === 'BULLISH') return 'DEFENSIVO: USD/JPY/CHF VS PRO-CICLICAS'
  if (regime === 'MIXTO' && growthDown && usdBias === 'BEARISH') return 'REFUGIOS NO-USD; EVITAR EM'
  if (regime === 'MIXTO') return 'TRADES FUNDAMENTALES SIN FILTRO'

  return 'NO ESTANDAR - EVALUAR CASO POR CASO'
}

export default function WorldViewOpsPage() {
  const { worldview: data, regime, rawRegime, regimeState, dataSources } = useModelStore()
  const sourceMap = new Map(dataSources.map(s => [s.id, s]))

  const scoreGDP  = data.gdpUsa * 0.25 + data.gdpEur * 0.18 + data.gdpChn * 0.18 + data.gdpJpn * 0.05 + data.gdpResto * 0.34
  const wocRaw    = 0.7 * data.smartZ - 0.3 * data.retailZ
  const wocScore  = Number.isFinite(wocRaw) ? wocRaw : 0
  // Detect if raw CFTC/retail values were entered instead of z-scores
  const wocDataWarning = (() => {
    const cftcSrc  = dataSources.find(s => s.id === 'wv_cftc')
    const retailSrc = dataSources.find(s => s.id === 'wv_retail')
    const cftcRaw  = Number(cftcSrc?._value)
    const retailRaw = Number(retailSrc?._value)
    if (Number.isFinite(cftcRaw)  && Math.abs(cftcRaw)  > 10) return `wv_cftc = ${cftcRaw} rechazado (valor bruto, no z-score). Introduce un z-score entre −10 y +10.`
    if (Number.isFinite(retailRaw) && Math.abs(retailRaw) > 10) return `wv_retail = ${retailRaw} rechazado (valor bruto, no z-score). Introduce un z-score entre −10 y +10.`
    return null
  })()
  const usdBias   = data.dxyRising === 1 && data.dxy > 100 ? 'BULLISH' : data.dxyRising === 0 && data.dxy < 95 ? 'BEARISH' : 'NEUTRAL'
  const inflation = detectInflationRegime(data)
  const pendingRegime = rawRegime !== regime && regimeState?.candidate

  const decision = getWorldViewDecision({ regime, scoreGDP, usdBias, inflation }) || (
    regime === 'RISK-ON'  && scoreGDP > 0.5  && usdBias === 'BEARISH' && inflation === 'INFLACIONARIO' ? 'LONG PRO-CICLICAS VS USD, LONG EM' :
    regime === 'RISK-ON'  && scoreGDP > 0.5  && usdBias === 'BULLISH' && inflation === 'INFLACIONARIO' ? 'LONG COMMODITY CURRENCIES' :
    regime === 'RISK-OFF' && scoreGDP < -0.5 && usdBias === 'BULLISH' ? 'LONG USD VS TODO. SHORT EM' :
    regime === 'RISK-OFF' && scoreGDP < -0.5 && usdBias === 'NEUTRAL' ? 'LONG JPY/CHF VS PRO-CICLICAS' :
    regime === 'MIXTO' ? 'TRADES FUNDAMENTALES SIN FILTRO' :
    'NO ESTANDAR — EVALUAR CASO POR CASO'

  )

  const vetoRiskOff = regime === 'RISK-OFF'
  const vetoUSD     = usdBias === 'BULLISH' && data.dxy > 105
  const hasVeto     = vetoRiskOff || vetoUSD

  const ROWS = [
    { section: 'GDP Gap por region (pp)', items: [
      { key: 'gdpUsa',   label: 'USA Nowcast - Consensus' },
      { key: 'gdpEur',   label: 'EUR Nowcast - Consensus' },
      { key: 'gdpChn',   label: 'CHN Nowcast - Consensus' },
      { key: 'gdpJpn',   label: 'JPN Nowcast - Consensus' },
      { key: 'gdpResto', label: 'Resto Nowcast - Consensus' },
    ]},
    { section: 'Regimen (percentil 5Y)', items: [
      { key: 'vix',      label: 'VIX' },
      { key: 'hyOas',    label: 'HY OAS' },
      { key: 'sp200dma', label: 'S&P vs 200dma' },
      { key: 'embi',     label: 'EM OAS' },
    ]},
    { section: 'Wisdom of the Crowd (z)', items: [
      { key: 'smartZ',  label: 'Smart Consensus' },
      { key: 'retailZ', label: 'Retail Extremo' },
    ]},
    { section: 'USD Bias', items: [
      { key: 'dxy',       label: 'DXY Spot' },
      { key: 'dxyRising', label: 'Tendencia (above 200dma)' },
    ]},
    { section: 'Inflacion Global (%)', sectionColor: 'text-[#f59e0b]', items: [
      { key: 'cpiG7',      label: 'CPI G7 mediana' },
      { key: 'breakevens', label: '5Y5Y Inflation Expectations' },
      { key: 'cbPolicyStance', label: 'Postura bancos centrales' },
    ]},
  ]

  return (
    <div className="pt-12 min-h-screen">
      <main>
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
              <h1 className="text-2xl font-bold uppercase tracking-widest">OPERATIVA — WORLD VIEW</h1>
              <Link
                to="/data/raw?module=World+View"
                className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
              >
                ACTUALIZAR DATOS →
              </Link>
            </div>

            {/* ── Aviso dato WOC corrupto ── */}
            {wocDataWarning && (
              <div className="mb-3 px-3 py-2 border border-[#ef4444] bg-[#1a0000] text-[11px] font-mono text-[#ef4444]">
                ⚠ WOC DATO RECHAZADO — {wocDataWarning}
              </div>
            )}

            {/* ── Estado derivado ── */}
            <div className="border-2 border-[#333] mb-4">
              <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
                <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">WorldView State Vector</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0">
                {[
                  { label: 'REGIMEN',   value: regime,            color: regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'MOMENTUM',  value: scoreGDP.toFixed(2), color: scoreGDP > 0 ? 'text-[#4ade80]' : scoreGDP < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'WOC',       value: wocScore.toFixed(2), color: wocScore > 0 ? 'text-[#4ade80]' : wocScore < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'USD BIAS',  value: usdBias,           color: usdBias === 'BULLISH' ? 'text-[#4ade80]' : usdBias === 'BEARISH' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'INFLACION', value: inflation,         color: inflation === 'INFLACIONARIO' ? 'text-[#f59e0b]' : inflation === 'DESINFLACIONARIO' ? 'text-[#60a5fa]' : 'text-[#e5e5e5]' },
                ].map(item => (
                  <div key={item.label} className="p-3 border-r border-b border-[#222]">
                    <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{item.label}</div>
                    <div className={`text-xl font-mono font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
              {pendingRegime && (
                <div className="px-3 py-2 border-t border-[#222] text-[10px] text-[#f59e0b] uppercase tracking-wider">
                  Régimen bruto {rawRegime}; cambio pendiente {regimeState.candidateCount}/{regimeState.requiredCount} sesiones.
                </div>
              )}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                <div className="p-3 border-r border-[#222] lg:col-span-2">
                  <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Decision</div>
                  <div className="text-base font-bold text-white uppercase tracking-wide">{decision}</div>
                </div>
                <div className="p-3">
                  <div className="text-xs text-[#777] uppercase tracking-wider mb-1">Vetos</div>
                  {hasVeto ? (
                    <div className="space-y-0.5">
                      {vetoRiskOff && <div className="text-sm text-[#ef4444] font-bold">[!] RISK-OFF</div>}
                      {vetoUSD     && <div className="text-sm text-[#ef4444] font-bold">[!] USD FUERTE</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-[#4ade80] font-bold">[OK] SIN VETOS</div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Tabla de parámetros (solo lectura) ── */}
            <div className="border-2 border-[#333] overflow-hidden">
              <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987] flex items-center justify-between">
                <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Parametros de Entrada</span>
                <span className="text-[10px] text-[#555] uppercase tracking-wider">Solo lectura — editar en /data</span>
              </div>
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[38%]">Parametro</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[38%]">Valor</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[14%]">Freshness</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[10%]">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map(({ section, sectionColor, items }) => (
                    <>
                      <tr key={section} className="border-y border-[#333] bg-[#161616]">
                        <td colSpan={4} className="px-2 py-1.5">
                          <span className={`text-sm font-bold uppercase tracking-widest ${sectionColor || 'text-[#ecd987]'}`}>{section}</span>
                        </td>
                      </tr>
                      {items.map(({ key, label }) => {
                        const sourceId = key === 'cpiG7'
                          ? WV_CPI_G7_SOURCE_IDS.find(id => sourceMap.has(id)) || WV_DATA_MAP[key]
                          : WV_GDP_GAP_MAP[key]?.nowcast || WV_DATA_MAP[key]
                        const source   = sourceMap.get(sourceId)
                        const val = data[key]
                        const hasValue = val != null && val !== DEFAULT_WV_DATA[key]
                        return (
                          <tr key={key} className="border-b border-[#222] hover:bg-[#0a0a0a]">
                            <td className="px-2 py-1.5">
                              <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{label}</span>
                            </td>
                            <td className="px-2 py-1.5">
                              <span className={`text-sm font-mono font-bold ${hasValue ? 'text-white' : 'text-[#444]'}`}>
                                {fmt(val, key)}
                              </span>
                              {!hasValue && (
                                <span className="ml-2 text-[10px] text-[#555] uppercase tracking-wider">default</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <FreshDot lastUpdate={source?.lastUpdate} frequencyDays={source?.frequencyDays || WV_FREQ[key]} />
                            </td>
                            <td className="px-2 py-1.5">
                              <Link
                                to={`/data/raw?highlight=${sourceId}`}
                                className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white"
                                title={sourceId}
                              >
                                ↗
                              </Link>
                            </td>
                          </tr>
                        )
                      })}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
      </main>
    </div>
  )
}
