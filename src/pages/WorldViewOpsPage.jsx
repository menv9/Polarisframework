import { useState } from 'react'
import { Link } from 'react-router-dom'
import WorldViewSidebar from '../components/worldview/WorldViewSidebar'

export default function WorldViewOpsPage() {
  const [data, setData] = useState({
    gdpUsa: 0.3, gdpEur: -0.2, gdpChn: 0.5, gdpJpn: 0.1, gdpResto: 0.0,
    vix: 45, hyOas: 55, sp200dma: 1, embi: 60,
    smartZ: 0.5, retailZ: -0.8,
    dxy: 103.5, dxy200dma: 101.0, dxyRising: 1,
    cpiG7: 2.8, breakevens: 2.3,
  })

  const handleChange = (key, value) => setData((prev) => ({ ...prev, [key]: value }))

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
            <h1 className="text-2xl font-bold uppercase tracking-widest mb-3 pb-2 border-b-2 border-[#333]">OPERATIVA — WORLD VIEW</h1>

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
                    <th className="px-3 py-2 text-xs font-bold uppercase tracking-widest w-1/3">Parametro</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase tracking-widest w-1/3">Valor</th>
                    <th className="px-3 py-2 text-xs font-bold uppercase tracking-widest w-1/3">Fuente</th>
                  </tr>
                </thead>
                <tbody>
                  {/* GDP */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-3 py-2">
                      <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">GDP Gap por region (pp)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'gdpUsa', label: 'USA', step: 0.1, min: -2, max: 2, source: 'Atlanta Fed GDPNow', url: 'https://www.atlantafed.org/cqer/research/gdpnow' },
                    { key: 'gdpEur', label: 'EUR', step: 0.1, min: -2, max: 2, source: 'ECB BMPE, Bloomberg Consensus' },
                    { key: 'gdpChn', label: 'CHN', step: 0.1, min: -2, max: 2, source: 'PBOC Beige Book' },
                    { key: 'gdpJpn', label: 'JPN', step: 0.1, min: -2, max: 2, source: 'BoJ Tankan' },
                    { key: 'gdpResto', label: 'Resto', step: 0.1, min: -2, max: 2, source: 'IMF WEO, OECD' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-3 py-2">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative inline-flex items-center">
                          <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                            onChange={(e) => handleChange(row.key, Number(e.target.value))}
                            className="w-32 bg-[#111] border-b-2 border-[#ecd987] text-base font-mono font-bold text-white px-2 py-1 text-right outline-none focus:border-white" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-[#888]">
                        {row.url ? (
                          <a href={row.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#ecd987] hover:underline">{row.source}</a>
                        ) : (
                          row.source
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* Regimen */}
                  <tr className="border-y border-[#333] bg-[#161616]">
                    <td colSpan={3} className="px-3 py-2">
                      <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Regimen (percentil 5Y)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'vix', label: 'VIX', step: 1, min: 0, max: 100, source: 'CBOE', url: 'https://www.cboe.com/tradable_products/vix/' },
                    { key: 'hyOas', label: 'HY OAS', step: 1, min: 0, max: 100, source: 'Bloomberg / ICE BofA' },
                    { key: 'sp200dma', label: 'S&P vs 200dma', type: 'select', options: [{ value: 1, label: 'ABOVE' }, { value: 0, label: 'BELOW' }], source: 'Bloomberg / Refinitiv' },
                    { key: 'embi', label: 'EMBI', step: 1, min: 0, max: 100, source: 'JPMorgan / Bloomberg' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-3 py-2">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        {row.type === 'select' ? (
                          <div className="relative inline-block w-32">
                            <select value={data[row.key]} onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-32 appearance-none bg-[#111] border-b-2 border-[#ecd987] text-base font-bold text-white px-2 py-1 pr-6 outline-none focus:border-white">
                              {row.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                          </div>
                        ) : (
                          <div className="relative inline-flex items-center">
                            <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                              onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-32 bg-[#111] border-b-2 border-[#ecd987] text-base font-mono font-bold text-white px-2 py-1 text-right outline-none focus:border-white" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-[#888]">
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
                    <td colSpan={3} className="px-3 py-2">
                      <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Wisdom of the Crowd (z)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'smartZ', label: 'Smart Consensus', step: 0.1, min: -3, max: 3, source: 'CFTC Asset Managers', url: 'https://www.cftc.gov/marketreports/commitmentsoftraders/index.htm' },
                    { key: 'retailZ', label: 'Retail Extremo', step: 0.1, min: -3, max: 3, source: 'DailyFX SSI, IG Sentiment' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-3 py-2">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative inline-flex items-center">
                          <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                            onChange={(e) => handleChange(row.key, Number(e.target.value))}
                            className="w-32 bg-[#111] border-b-2 border-[#ecd987] text-base font-mono font-bold text-white px-2 py-1 text-right outline-none focus:border-white" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-[#888]">
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
                    <td colSpan={3} className="px-3 py-2">
                      <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">USD Bias</span>
                    </td>
                  </tr>
                  {[
                    { key: 'dxy', label: 'DXY Spot', step: 0.1, min: 80, max: 120, source: 'Bloomberg / ICE' },
                    { key: 'dxy200dma', label: 'DXY 200dma', step: 0.1, min: 80, max: 120, source: 'Bloomberg / ICE' },
                    { key: 'dxyRising', label: 'Tendencia', type: 'select', options: [{ value: 1, label: 'RISING' }, { value: 0, label: 'FALLING' }], source: 'Bloomberg / ICE' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-3 py-2">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        {row.type === 'select' ? (
                          <div className="relative inline-block w-32">
                            <select value={data[row.key]} onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-32 appearance-none bg-[#111] border-b-2 border-[#ecd987] text-base font-bold text-white px-2 py-1 pr-6 outline-none focus:border-white">
                              {row.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                          </div>
                        ) : (
                          <div className="relative inline-flex items-center">
                            <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                              onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-32 bg-[#111] border-b-2 border-[#ecd987] text-base font-mono font-bold text-white px-2 py-1 text-right outline-none focus:border-white" />
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-sm text-[#888]">
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
                    <td colSpan={3} className="px-3 py-2">
                      <span className="text-base font-bold uppercase tracking-widest text-[#f59e0b]">Inflacion Global (%)</span>
                    </td>
                  </tr>
                  {[
                    { key: 'cpiG7', label: 'CPI G7 YoY', step: 0.1, min: 0, max: 10, source: 'Varios NSO / Bloomberg' },
                    { key: 'breakevens', label: 'Breakevens 5Y5Y', step: 0.1, min: 0, max: 5, source: 'Bloomberg / Refinitiv' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-3 py-2">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="relative inline-flex items-center">
                          <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                            onChange={(e) => handleChange(row.key, Number(e.target.value))}
                            className="w-32 bg-[#111] border-b-2 border-[#ecd987] text-base font-mono font-bold text-white px-2 py-1 text-right outline-none focus:border-white" />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-sm text-[#888]">
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
