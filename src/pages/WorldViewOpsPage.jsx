import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import WorldViewSidebar from '../components/worldview/WorldViewSidebar'
import { useModelStore, WV_DATA_MAP } from '../store/ModelDataContext'

const STORAGE_KEY_SOURCES = 'polaris_data_sources'

// Escribe un valor de vuelta al store compartido con DataPage
function syncValueToSources(key, value) {
  try {
    const id = WV_DATA_MAP[key]
    if (!id) return
    const saved = localStorage.getItem(STORAGE_KEY_SOURCES)
    if (!saved) return
    const sources = JSON.parse(saved)
    const today = new Date().toISOString().split('T')[0]
    const updated = sources.map((s) =>
      s.id === id ? { ...s, _value: String(value), lastUpdate: today } : s
    )
    localStorage.setItem(STORAGE_KEY_SOURCES, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

export default function WorldViewOpsPage() {
  const { worldview: data, setWorldview: setData } = useModelStore()

  const handleChange = (key, value) => {
    setData((prev) => ({ ...prev, [key]: value }))
    syncValueToSources(key, value)
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
              <Link
                to="/data/raw?module=World+View"
                className="px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white"
              >
                ACTUALIZAR DATOS →
              </Link>
            </div>

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
              <div className="px-3 py-2 bg-[#1a1a0d] border-b-2 border-[#ecd987] flex items-center justify-between">
                <span className="text-base font-bold uppercase tracking-widest text-[#ecd987]">Parametros de Entrada</span>
                <Link to="/data/raw?module=World+View" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">
                  VER FUENTES EN /DATA →
                </Link>
              </div>
              <table className="w-full text-sm table-fixed">
                <thead>
                  <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[38%]">Parametro</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[50%]">Valor</th>
                    <th className="px-2 py-1.5 text-xs font-bold uppercase tracking-widest w-[12%]">Data</th>
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
                    { key: 'gdpUsa', label: 'USA', step: 0.1, min: -2, max: 2, dataId: 'wv_gdp_usa' },
                    { key: 'gdpEur', label: 'EUR', step: 0.1, min: -2, max: 2, dataId: 'wv_gdp_eur' },
                    { key: 'gdpChn', label: 'CHN', step: 0.1, min: -2, max: 2, dataId: 'wv_gdp_chn' },
                    { key: 'gdpJpn', label: 'JPN', step: 0.1, min: -2, max: 2, dataId: 'wv_gdp_jpn' },
                    { key: 'gdpResto', label: 'Resto', step: 0.1, min: -2, max: 2, dataId: 'wv_cesi' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                          onChange={(e) => handleChange(row.key, Number(e.target.value))}
                          className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/data/raw?highlight=${row.dataId}`} className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">↗</Link>
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
                    { key: 'vix', label: 'VIX', step: 1, min: 0, max: 100, dataId: 'wv_vix' },
                    { key: 'hyOas', label: 'HY OAS', step: 1, min: 0, max: 100, dataId: 'wv_hy_oas' },
                    { key: 'sp200dma', label: 'S&P vs 200dma', type: 'select', options: [{ value: 1, label: 'ABOVE' }, { value: 0, label: 'BELOW' }], dataId: 'wv_sp500' },
                    { key: 'embi', label: 'EM OAS', step: 1, min: 0, max: 100, dataId: 'wv_embi' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        {row.type === 'select' ? (
                          <div className="relative inline-block w-28">
                            <select value={data[row.key]} onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-28 appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-2 py-0.5 pr-6 outline-none focus:border-white">
                              {row.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                          </div>
                        ) : (
                          <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                            onChange={(e) => handleChange(row.key, Number(e.target.value))}
                            className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/data/raw?highlight=${row.dataId}`} className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">↗</Link>
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
                    { key: 'smartZ', label: 'Smart Consensus', step: 0.1, min: -3, max: 3, dataId: 'wv_cftc' },
                    { key: 'retailZ', label: 'Retail Extremo', step: 0.1, min: -3, max: 3, dataId: 'wv_retail' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                          onChange={(e) => handleChange(row.key, Number(e.target.value))}
                          className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                      </td>
                      <td className="px-2 py-1.5">
                        {row.dataId
                          ? <Link to={`/data/raw?highlight=${row.dataId}`} className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">↗</Link>
                          : <Link to="/data/raw?module=World+View" className="text-[10px] font-bold uppercase tracking-wider text-[#555] hover:text-[#ecd987]">↗</Link>
                        }
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
                    { key: 'dxy', label: 'DXY Spot', step: 0.1, min: 80, max: 120, dataId: 'wv_dxy' },
                    { key: 'dxy200dma', label: 'DXY 200dma', step: 0.1, min: 80, max: 120, dataId: 'wv_dxy_200dma' },
                    { key: 'dxyRising', label: 'Tendencia', type: 'select', options: [{ value: 1, label: 'RISING' }, { value: 0, label: 'FALLING' }], dataId: 'wv_dxy_200dma' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        {row.type === 'select' ? (
                          <div className="relative inline-block w-28">
                            <select value={data[row.key]} onChange={(e) => handleChange(row.key, Number(e.target.value))}
                              className="w-28 appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm font-bold text-white px-2 py-0.5 pr-6 outline-none focus:border-white">
                              {row.options.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                            </select>
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-xs pointer-events-none">v</span>
                          </div>
                        ) : (
                          <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                            onChange={(e) => handleChange(row.key, Number(e.target.value))}
                            className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                        )}
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/data/raw?highlight=${row.dataId}`} className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">↗</Link>
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
                    { key: 'cpiG7', label: 'CPI USA YoY', step: 0.1, min: 0, max: 10, dataId: 'wv_cpi_usa' },
                    { key: 'breakevens', label: '5Y5Y Inflation Expectations', step: 0.1, min: 0, max: 5, dataId: 'wv_breakevens' },
                  ].map((row) => (
                    <tr key={row.key} className="border-b border-[#222]">
                      <td className="px-2 py-1.5">
                        <span className="text-sm font-bold text-[#a3a3a3] uppercase tracking-wider">{row.label}</span>
                      </td>
                      <td className="px-2 py-1.5">
                        <input type="number" value={data[row.key]} min={row.min} max={row.max} step={row.step}
                          onChange={(e) => handleChange(row.key, Number(e.target.value))}
                          className="w-28 bg-[#111] border-b-2 border-[#ecd987] text-sm font-mono font-bold text-white px-2 py-0.5 text-right outline-none focus:border-white" />
                      </td>
                      <td className="px-2 py-1.5">
                        <Link to={`/data/raw?highlight=${row.dataId}`} className="text-[10px] font-bold uppercase tracking-wider text-[#ecd987] hover:text-white">↗</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

