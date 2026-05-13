import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import WorldViewSidebar from '../components/worldview/WorldViewSidebar'
import { fetchTradingEconomicsData, getLastUpdateTime } from '../services/tradingEconomicsService'

const STORAGE_KEY_WV = 'polaris_worldview_data'

const teCountryUrls = {
  usa: 'https://tradingeconomics.com/united-states/indicators',
  eur: 'https://tradingeconomics.com/euro-area/indicators',
  chn: 'https://tradingeconomics.com/china/indicators',
  jpn: 'https://tradingeconomics.com/japan/indicators',
}

function TeLink({ code }) {
  const url = teCountryUrls[code]
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="ml-2 text-xs text-[#777] hover:text-[#ecd987] border-b border-[#333] hover:border-[#ecd987]"
      title="Ver en Trading Economics"
    >
      [TE]
    </a>
  )
}

function loadWorldViewData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_WV)
    if (saved) return JSON.parse(saved)
  } catch {
    // ignore
  }
  return {
    gdpUsa: 0.3, gdpEur: -0.2, gdpChn: 0.5, gdpJpn: 0.1, gdpResto: 0.0,
    vix: 15, hyOas: 45, sp200dma: 1, embi: 55,
    smartZ: 0.5, retailZ: -0.8,
    dxy: 103.5, dxy200dma: 101.0, dxyRising: 1,
    cpiG7: 2.8, breakevens: 2.3,
  }
}

const indicatorScrapeConfig = {
  gdpUsa: { url: 'https://tradingeconomics.com/united-states/gdp-growth', name: 'GDP Growth Rate' },
  gdpEur: { url: 'https://tradingeconomics.com/euro-area/gdp-growth', name: 'GDP Growth Rate' },
  gdpChn: { url: 'https://tradingeconomics.com/china/gdp-growth', name: 'GDP Growth Rate' },
  gdpJpn: { url: 'https://tradingeconomics.com/japan/gdp-growth', name: 'GDP Growth Rate' },
  vix: { url: 'https://www.cboe.com/tradable_products/vix/', name: 'VIX' },
  hyOas: { url: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2', name: 'HY OAS' },
  embi: { url: 'https://fred.stlouisfed.org/series/EMBIG', name: 'EMBI Global Spread' },
  cpiG7: { url: 'https://tradingeconomics.com/united-states/inflation-rate', name: 'CPI USA' },
  breakevens: { url: 'https://fred.stlouisfed.org/series/T5YIFRM', name: 'Breakevens 5Y5Y' },
  dxy: { url: 'https://www.theice.com/index', name: 'DXY' },
}

export default function WorldViewOpsPage() {
  const [data, setData] = useState(loadWorldViewData)
  const [loading, setLoading] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [scrapeLog, setScrapeLog] = useState(null)
  const [refreshingId, setRefreshingId] = useState(null)

  // Persistir cambios en localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_WV, JSON.stringify(data))
  }, [data])

  const handleChange = (key, value) => setData((prev) => ({ ...prev, [key]: value }))

  const refreshIndicator = async (key) => {
    const cfg = indicatorScrapeConfig[key]
    if (!cfg) {
      setScrapeLog({ key, error: 'No hay scraper configurado para este indicador. Edita manualmente o ve a /data' })
      return
    }

    setRefreshingId(key)
    setScrapeLog({ key, loading: true })

    try {
      const res = await fetch('/api/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: cfg.url, indicatorName: cfg.name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `HTTP ${res.status}`)
      }
      const result = await res.json()

      let newValue = data[key]
      if (result.matchedIndicator?.last) {
        const parsed = parseFloat(result.matchedIndicator.last.replace(/,/g, ''))
        if (!isNaN(parsed)) newValue = parsed
      } else if (result.indicators?.length > 0) {
        // Fallback: usa el primer indicador si no hay matchedIndicator
        const first = result.indicators[0]
        const parsed = parseFloat(first.last?.replace(/,/g, ''))
        if (!isNaN(parsed)) newValue = parsed
      }

      setData((prev) => ({ ...prev, [key]: newValue }))
      setScrapeLog({ key, result, value: newValue, ok: true })
    } catch (err) {
      setScrapeLog({ key, error: err.message, isNetworkError: err.message.includes('fetch') || err.message.includes('Network') })
    } finally {
      setRefreshingId(null)
    }
  }

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const freshData = await fetchTradingEconomicsData()
      setData(freshData)
      setLastUpdated(getLastUpdateTime())
    } catch (err) {
      console.error('Error fetching Trading Economics data:', err)
    } finally {
      setLoading(false)
    }
  }

  const scoreGDP = data.gdpUsa * 0.25 + data.gdpEur * 0.18 + data.gdpChn * 0.18 + data.gdpJpn * 0.05 + data.gdpResto * 0.34
  const regimeOn = data.vix < 30 && data.hyOas < 30 && data.sp200dma === 1 && data.embi < 40
  const regimeOff = data.vix > 70 || data.hyOas > 70 || data.sp200dma === 0 || data.embi > 70
  const regime = regimeOn ? 'RISK-ON' : regimeOff ? 'RISK-OFF' : 'MIXTO'
  const wocScore = 0.7 * data.smartZ - 0.3 * data.retailZ
  const usdBias = data.dxyRising === 1 && data.dxy > 100 ? 'BULLISH' : data.dxyRising === 0 && data.dxy < 95 ? 'BEARISH' : 'NEUTRAL'
  const inflation = data.cpiG7 > 3.0 || data.breakevens > 2.5 ? 'INFLACIONARIO' : data.cpiG7 < 2.0 && data.breakevens < 2.0 ? 'DESINFLACIONARIO' : 'ESTABLE'

  const decision =
    regime === 'RISK-ON' && scoreGDP > 0.5 && usdBias === 'BEARISH' && inflation === 'INFLACIONARIO' ? 'LONG PRO-CICLICAS VS USD, LONG EM' :
    regime === 'RISK-ON' && scoreGDP > 0.5 && usdBias === 'BULLISH' && inflation === 'INFLACIONARIO' ? 'LONG COMMODITY CURRENCIES' :
    regime === 'RISK-OFF' && scoreGDP < -0.5 && usdBias === 'BULLISH' ? 'LONG USD VS TODO. SHORT EM' :
    regime === 'RISK-OFF' && scoreGDP < -0.5 && usdBias === 'NEUTRAL' ? 'LONG JPY/CHF VS PRO-CICLICAS' :
    regime === 'MIXTO' ? 'TRADES FUNDAMENTALES SIN FILTRO' :
    'NO ESTANDAR — EVALUAR CASO POR CASO'

  const vetoRiskOff = regime === 'RISK-OFF'
  const vetoUSD = usdBias === 'BULLISH' && data.dxy > 105
  const hasVeto = vetoRiskOff || vetoUSD

  return (
    <div className="pt-12 min-h-screen">
      <div className="flex">
        <WorldViewSidebar mode="ops" />
        <main className="flex-1">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-[#333]">
              <h1 className="text-2xl font-bold uppercase tracking-widest">OPERATIVA — WORLD VIEW</h1>
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-xs text-[#777] uppercase tracking-wider">
                    ACTUALIZADO: {lastUpdated}
                  </span>
                )}
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
                    loading
                      ? 'border-[#333] text-[#555] cursor-not-allowed'
                      : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                  }`}
                >
                  {loading ? 'CARGANDO...' : 'REFRESH'}
                </button>
              </div>
            </div>

            {/* ===== SCRAPE LOG ===== */}
            {scrapeLog && (
              <div className={`border-2 mb-4 p-3 ${
                scrapeLog.error ? 'border-[#ef4444] bg-[#1a0a0a]' 
                : scrapeLog.loading ? 'border-[#f59e0b] bg-[#1a1500]'
                : 'border-[#4ade80] bg-[#0a1a0a]'
              }`}>
                <div className="text-xs font-bold uppercase tracking-wider mb-1">
                  {scrapeLog.loading ? (
                    <span className="text-[#f59e0b]">[...] SCRAPEANDO {scrapeLog.key.toUpperCase()}...</span>
                  ) : scrapeLog.error ? (
                    <span className="text-[#ef4444]">
                      [!] ERROR ({scrapeLog.key.toUpperCase()}): {scrapeLog.error}
                      {scrapeLog.isNetworkError && (
                        <span className="block mt-1 text-[#888] normal-case">
                          El backend no responde. En Vercel Hobby el scraping de Trading Economics esta bloqueado.
                          Usa localhost o introduce el valor manualmente.
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[#4ade80]">[OK] {scrapeLog.key.toUpperCase()} ACTUALIZADO: {scrapeLog.value}</span>
                  )}
                </div>
                {!scrapeLog.loading && scrapeLog.result && (
                  <div className="text-xs text-[#888] font-mono">
                    <div>URL: {scrapeLog.result.url}</div>
                    {scrapeLog.result.matchedIndicator && (
                      <div className="text-[#4ade80]">
                        {scrapeLog.result.matchedIndicator.name}: {scrapeLog.result.matchedIndicator.last} {scrapeLog.result.matchedIndicator.unit}
                      </div>
                    )}
                    {scrapeLog.result.indicators?.length > 0 && !scrapeLog.result.matchedIndicator && (
                      <div className="text-[#f59e0b]">
                        No match exacto. Usando primer valor: {scrapeLog.result.indicators[0].name}: {scrapeLog.result.indicators[0].last}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===== HERO: RESULTADOS DERIVADOS ===== */}
            <div className="border-2 border-[#333] mb-4">
              <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
                <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">WorldView State Vector</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-0">
                {[
                  { label: 'REGIMEN', value: regime, color: regime === 'RISK-ON' ? 'text-[#4ade80]' : regime === 'RISK-OFF' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'MOMENTUM', value: scoreGDP.toFixed(2), color: scoreGDP > 0 ? 'text-[#4ade80]' : scoreGDP < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'WOC', value: wocScore.toFixed(2), color: wocScore > 0 ? 'text-[#4ade80]' : wocScore < 0 ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'USD BIAS', value: usdBias, color: usdBias === 'BULLISH' ? 'text-[#4ade80]' : usdBias === 'BEARISH' ? 'text-[#ef4444]' : 'text-[#e5e5e5]' },
                  { label: 'INFLACION', value: inflation, color: inflation === 'INFLACIONARIO' ? 'text-[#f59e0b]' : inflation === 'DESINFLACIONARIO' ? 'text-[#60a5fa]' : 'text-[#e5e5e5]' },
                ].map((item) => (
                  <div key={item.label} className="p-3 border-r border-b border-[#222]">
                    <div className="text-xs text-[#777] uppercase tracking-wider mb-1">{item.label}</div>
                    <div className={`text-xl font-mono font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
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
                      {vetoUSD && <div className="text-sm text-[#ef4444] font-bold">[!] USD FUERTE</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-[#4ade80] font-bold">[OK] SIN VETOS</div>
                  )}
                </div>
              </div>
            </div>

            {/* ===== TABLA DE INPUTS ===== */}
            <div className="border-2 border-[#333] overflow-hidden">
              <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987]">
                <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Parametros de Entrada</span>
              </div>
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-1/3">Parametro</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-1/3">Valor</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-1/3">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {/* GDP */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-2 py-1.5">
                      <span className="text-sm font-bold uppercase tracking-widest text-[#ecd987]">GDP Gap por region (pp)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'gdpUsa', label: 'USA', step: 0.1, min: -2, max: 2, source: 'Atlanta Fed GDPNow', url: 'https://www.atlantafed.org/cqer/research/gdpnow', te: 'usa' },
                    { key: 'gdpEur', label: 'EUR', step: 0.1, min: -2, max: 2, source: 'ECB BMPE, Bloomberg Consensus', url: 'https://www.ecb.europa.eu/pub/economic-bulletin/html/ecb.economicbulletin2024~q2.en.html', te: 'eur' },
                    { key: 'gdpChn', label: 'CHN', step: 0.1, min: -2, max: 2, source: 'PBOC Beige Book', url: 'https://www.pbc.gov.cn/en/3688006/3688110/index.html', te: 'chn' },
                    { key: 'gdpJpn', label: 'JPN', step: 0.1, min: -2, max: 2, source: 'BoJ Tankan', url: 'https://www.boj.or.jp/en/statistics/tk/index.htm/', te: 'jpn' },
                    { key: 'gdpResto', label: 'Resto', step: 0.1, min: -2, max: 2, source: 'IMF WEO, OECD', url: 'https://www.imf.org/en/Publications/WEO' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative inline-flex items-center">
                            <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                              onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                          </div>
                          {indicatorScrapeConfig[row.key] && (
                            <button
                              onClick={() => refreshIndicator(row.key)}
                              disabled={refreshingId === row.key}
                              className={`text-[10px] font-bold uppercase tracking-wider border-b-2 px-1.5 py-0.5 ${
                                refreshingId === row.key
                                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                              }`}
                            >
                              {refreshingId === row.key ? '...' : '[REF]'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-sm text-[#888]">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ecd987] hover:underline">{row.source}</a>
                        ) : (
                          row.source
                        )}
                        {row.te && <TeLink code={row.te} />}
                      </td>
                    </tr>
                  ))}

                  {/* Regimen */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-2 py-1.5">
                      <span className="text-sm font-bold uppercase tracking-widest text-[#ecd987]">Regimen (percentil 5Y)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'vix', label: 'VIX', step: 1, min: 0, max: 100, source: 'CBOE', url: 'https://www.cboe.com/tradable_products/vix/' },
                    { key: 'hyOas', label: 'HY OAS', step: 1, min: 0, max: 100, source: 'Bloomberg / ICE BofA', url: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2' },
                    { key: 'sp200dma', label: 'S&P vs 200dma', type: 'select', options: [{ value: 1, label: 'ABOVE' }, { value: 0, label: 'BELOW' }], source: 'Bloomberg / Refinitiv', url: 'https://www.bloomberg.com/quote/SPX:IND' },
                    { key: 'embi', label: 'EMBI', step: 1, min: 0, max: 100, source: 'JPMorgan / Bloomberg', url: 'https://fred.stlouisfed.org/series/EMBIG' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          {row.type === 'select' ? (
                            <div className="relative inline-block w-28">
                              <select value={data[row.key]} onChange={(e) => handleChange(row.key, Number(e.target.value))}
                                className="w-28 appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-2 py-0.5 pr-6 outline-none focus:border-white">
                                {row.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                              </select>
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                            </div>
                          ) : (
                            <div className="relative inline-flex items-center">
                              <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                                onChange={(e) => handleChange(row.key, Number(e.target.value))}
                                className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                            </div>
                          )}
                          {indicatorScrapeConfig[row.key] && (
                            <button
                              onClick={() => refreshIndicator(row.key)}
                              disabled={refreshingId === row.key}
                              className={`text-[10px] font-bold uppercase tracking-wider border-b-2 px-1.5 py-0.5 ${
                                refreshingId === row.key
                                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                              }`}
                            >
                              {refreshingId === row.key ? '...' : '[REF]'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-sm text-[#888]">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ecd987] hover:underline">{row.source}</a>
                        ) : (
                          row.source
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* WoC */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-2 py-1.5">
                      <span className="text-sm font-bold uppercase tracking-widest text-[#ecd987]">Wisdom of the Crowd (z)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'smartZ', label: 'Smart Consensus', step: 0.1, min: -3, max: 3, source: 'CFTC Asset Managers', url: 'https://www.cftc.gov/marketreports/commitmentsoftraders/index.htm' },
                    { key: 'retailZ', label: 'Retail Extremo', step: 0.1, min: -3, max: 3, source: 'DailyFX SSI, IG Sentiment', url: 'https://www.dailyfx.com/sentiment' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative inline-flex items-center">
                            <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                              onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                          </div>
                          {indicatorScrapeConfig[row.key] && (
                            <button
                              onClick={() => refreshIndicator(row.key)}
                              disabled={refreshingId === row.key}
                              className={`text-[10px] font-bold uppercase tracking-wider border-b-2 px-1.5 py-0.5 ${
                                refreshingId === row.key
                                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                              }`}
                            >
                              {refreshingId === row.key ? '...' : '[REF]'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-sm text-[#888]">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ecd987] hover:underline">{row.source}</a>
                        ) : (
                          row.source
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* USD */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-2 py-1.5">
                      <span className="text-sm font-bold uppercase tracking-widest text-[#ecd987]">USD Bias</span>
                    </td>
                  </tr>
                  {[
                    { key: 'dxy', label: 'DXY Spot', step: 0.1, min: 80, max: 120, source: 'Bloomberg / ICE', url: 'https://www.theice.com/index' },
                    { key: 'dxy200dma', label: 'DXY 200dma', step: 0.1, min: 80, max: 120, source: 'Bloomberg / ICE', url: 'https://www.theice.com/index' },
                    { key: 'dxyRising', label: 'Tendencia', type: 'select', options: [{ value: 1, label: 'RISING' }, { value: 0, label: 'FALLING' }], source: 'Bloomberg / ICE', url: 'https://www.theice.com/index' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          {row.type === 'select' ? (
                            <div className="relative inline-block w-28">
                              <select value={data[row.key]} onChange={(e) => handleChange(row.key, Number(e.target.value))}
                                className="w-28 appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-2 py-0.5 pr-6 outline-none focus:border-white">
                                {row.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                              </select>
                              <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                            </div>
                          ) : (
                            <div className="relative inline-flex items-center">
                              <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                                onChange={(e) => handleChange(row.key, Number(e.target.value))}
                                className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                            </div>
                          )}
                          {indicatorScrapeConfig[row.key] && (
                            <button
                              onClick={() => refreshIndicator(row.key)}
                              disabled={refreshingId === row.key}
                              className={`text-[10px] font-bold uppercase tracking-wider border-b-2 px-1.5 py-0.5 ${
                                refreshingId === row.key
                                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                              }`}
                            >
                              {refreshingId === row.key ? '...' : '[REF]'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-sm text-[#888]">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ecd987] hover:underline">{row.source}</a>
                        ) : (
                          row.source
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Inflacion */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-2 py-1.5">
                      <span className="text-sm font-bold uppercase tracking-widest text-[#f59e0b]">Inflacion Global (%)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'cpiG7', label: 'CPI G7 YoY', step: 0.1, min: 0, max: 10, source: 'Varios NSO / Bloomberg', url: 'https://stats.oecd.org/' },
                    { key: 'breakevens', label: 'Breakevens 5Y5Y', step: 0.1, min: 0, max: 5, source: 'Bloomberg / Refinitiv', url: 'https://fred.stlouisfed.org/series/T5YIFRM' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="relative inline-flex items-center">
                            <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                              onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                          </div>
                          {indicatorScrapeConfig[row.key] && (
                            <button
                              onClick={() => refreshIndicator(row.key)}
                              disabled={refreshingId === row.key}
                              className={`text-[10px] font-bold uppercase tracking-wider border-b-2 px-1.5 py-0.5 ${
                                refreshingId === row.key
                                  ? 'border-[#333] text-[#555] cursor-not-allowed'
                                  : 'border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white'
                              }`}
                            >
                              {refreshingId === row.key ? '...' : '[REF]'}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-1.5 text-sm text-[#888]">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ecd987] hover:underline">{row.source}</a>
                        ) : (
                          row.source
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Link a fuentes */}
            <div className="mt-3">
              <Link to="/world-view#sources" className="text-sm text-[#ecd987] hover:underline uppercase tracking-wider">
                VER TABLA COMPLETA DE FUENTES {'->'}
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
