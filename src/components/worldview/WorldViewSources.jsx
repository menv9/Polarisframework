import { useState } from 'react'

const defaultSources = [
  { id: 'gdp_atlanta_gdpnow', indicator: 'Atlanta Fed GDPNow', category: 'GDP', tier: 'mvp', source: 'Federal Reserve Bank of Atlanta', url: 'https://www.atlantafed.org/cqer/research/gdpnow', frequency: 'Continua', status: 'activo', notes: 'USA real-time nowcast. Lag: 0' },
  { id: 'gdp_cesi', indicator: 'Citi Economic Surprise Index', category: 'GDP', tier: 'mvp', source: 'Citi / Bloomberg', url: '', frequency: 'Diaria', status: 'activo', notes: 'G10 + EM. Proxy practico de GDP gap. Ventana ~3 meses' },
  { id: 'reg_vix', indicator: 'VIX', category: 'REGIMEN', tier: 'mvp', source: 'CBOE', url: 'https://www.cboe.com/tradable_products/vix/', frequency: 'Diaria', status: 'activo', notes: 'Volatilidad equity. ON: < P30(5Y) | OFF: > P70(5Y)' },
  { id: 'reg_hy_oas', indicator: 'HY OAS', category: 'REGIMEN', tier: 'mvp', source: 'Bloomberg / ICE BofA', url: '', frequency: 'Diaria', status: 'activo', notes: 'Credito high yield. ON: < P30(5Y) | OFF: > P70(5Y)' },
  { id: 'reg_sp500', indicator: 'S&P 500 vs 200dma', category: 'REGIMEN', tier: 'mvp', source: 'Bloomberg / Refinitiv', url: '', frequency: 'Diaria', status: 'activo', notes: 'Tendencia equity. ON: Above rising | OFF: Below falling' },
  { id: 'reg_embi', indicator: 'EMBI Global Spread', category: 'REGIMEN', tier: 'mvp', source: 'JPMorgan / Bloomberg', url: '', frequency: 'Diaria', status: 'activo', notes: 'Spread EM. ON: < P40(5Y) | OFF: > P70(5Y)' },
  { id: 'woc_cftc_asset_managers', indicator: 'CFTC Asset Managers', category: 'WoC', tier: 'mvp', source: 'CFTC', url: 'https://www.cftc.gov/marketreports/commitmentsoftraders/index.htm', frequency: 'Semanal', status: 'activo', notes: 'Real money posicionamiento. Ventana 6-12 meses' },
  { id: 'woc_dailyfx_ssi', indicator: 'DailyFX SSI', category: 'WoC', tier: 'mvp', source: 'DailyFX / IG', url: '', frequency: 'Diaria', status: 'activo', notes: 'Retail sentiment. >70% long -> bias short sistema' },
  { id: 'usd_dxy', indicator: 'DXY', category: 'USD', tier: 'mvp', source: 'Bloomberg / ICE', url: '', frequency: 'Diaria', status: 'activo', notes: 'EUR 57.6%, JPY 13.6%, GBP 11.9%, CAD 9.1%, SEK 4.2%, CHF 3.6%' },
  { id: 'usd_diff_tipos_reales', indicator: 'Diferencial tipos reales US vs G7', category: 'USD', tier: 'mvp', source: 'Bloomberg / Haver', url: '', frequency: 'Mensual', status: 'activo', notes: 'Peso alto en score USD bias' },
  { id: 'inf_cpi_g7_mediana', indicator: 'CPI G7 mediana YoY', category: 'INFLACION', tier: 'mvp', source: 'Varios NSO / Bloomberg', url: '', frequency: 'Mensual', status: 'activo', notes: 'INF: > 3% | DESINF: < 2%' },
  { id: 'inf_breakevens_5y5y', indicator: 'Breakevens 5Y5Y G7', category: 'INFLACION', tier: 'mvp', source: 'Bloomberg / Refinitiv', url: '', frequency: 'Diaria', status: 'activo', notes: 'INF: > 2.5% | DESINF: < 2.0%' },

  { id: 'gdp_imf_weo', indicator: 'IMF WEO', category: 'GDP', tier: 'nice', source: 'IMF', url: 'https://www.imf.org/weo', frequency: 'Semestral', status: 'activo', notes: 'Global. Lag: 1 trimestre. Util para anclaje estructural' },
  { id: 'gdp_oecd', indicator: 'OECD Economic Outlook', category: 'GDP', tier: 'nice', source: 'OECD', url: '', frequency: 'Semestral', status: 'activo', notes: 'Global G20. Lag: 1 trimestre' },
  { id: 'gdp_bloomberg_consensus', indicator: 'Bloomberg Consensus Survey', category: 'GDP', tier: 'nice', source: 'Bloomberg', url: '', frequency: 'Mensual', status: 'activo', notes: 'G10 + EM. Lag: <1 mes' },
  { id: 'gdp_ny_nowcast', indicator: 'NY Fed Nowcast', category: 'GDP', tier: 'nice', source: 'Federal Reserve Bank of NY', url: '', frequency: 'Semanal', status: 'activo', notes: 'USA real-time alternativa a Atlanta' },
  { id: 'gdp_ecb_bmpe', indicator: 'ECB BMPE', category: 'GDP', tier: 'nice', source: 'ECB', url: '', frequency: 'Trimestral', status: 'activo', notes: 'Eurozone. Lag: 1-2 meses' },
  { id: 'gdp_boj_tankan', indicator: 'BoJ Tankan', category: 'GDP', tier: 'nice', source: 'Bank of Japan', url: '', frequency: 'Trimestral', status: 'activo', notes: 'Japon. Proxy de growth. Util para politica BoJ' },
  { id: 'gdp_pboc_beige', indicator: 'PBOC Beige Book equivalents', category: 'GDP', tier: 'nice', source: 'PBOC', url: '', frequency: 'Mensual', status: 'activo', notes: 'China. Lag: 2-4 semanas' },
  { id: 'reg_move', indicator: 'MOVE Index', category: 'REGIMEN', tier: 'nice', source: 'CBOE / Bloomberg', url: '', frequency: 'Diaria', status: 'activo', notes: 'Vol bonos US. Confirma OFF si > P70(5Y)' },
  { id: 'reg_gold_sp', indicator: 'Gold vs S&P ratio', category: 'REGIMEN', tier: 'nice', source: 'Bloomberg / Refinitiv', url: '', frequency: 'Diaria', status: 'activo', notes: 'Flight to safety. Subiendo -> confirma OFF' },
  { id: 'reg_jpy', indicator: 'JPY 7d return', category: 'REGIMEN', tier: 'nice', source: 'Bloomberg / Refinitiv', url: '', frequency: 'Diaria', status: 'activo', notes: 'Refugio funcional. >+1% en 1 semana -> OFF' },
  { id: 'reg_copper_gold', indicator: 'Copper / Gold ratio', category: 'REGIMEN', tier: 'nice', source: 'Bloomberg / Refinitiv', url: '', frequency: 'Diaria', status: 'activo', notes: 'Crecimiento global. Falling -> desaceleracion' },
  { id: 'woc_spf_philly', indicator: 'SPF Filadelfia', category: 'WoC', tier: 'nice', source: 'Federal Reserve Bank of Philadelphia', url: '', frequency: 'Trimestral', status: 'activo', notes: 'Forecast consenso macro USA (GDP, CPI, NFP, tipos)' },
  { id: 'woc_ecb_spf', indicator: 'ECB SPF', category: 'WoC', tier: 'nice', source: 'ECB', url: '', frequency: 'Trimestral', status: 'activo', notes: 'Equivalente europeo' },
  { id: 'woc_boj_tankan', indicator: 'BoJ Tankan', category: 'WoC', tier: 'nice', source: 'Bank of Japan', url: '', frequency: 'Trimestral', status: 'activo', notes: 'Encuesta empresarial. Anticipa politica BoJ' },
  { id: 'woc_bcb_focus', indicator: 'BCB Focus Survey', category: 'WoC', tier: 'nice', source: 'Banco Central do Brasil', url: '', frequency: 'Semanal', status: 'activo', notes: 'BRL y EM mas amplios' },
  { id: 'woc_bloomberg_consensus', indicator: 'Bloomberg Consensus', category: 'WoC', tier: 'nice', source: 'Bloomberg', url: '', frequency: 'Mensual', status: 'activo', notes: 'Consensus institucional' },
  { id: 'woc_reuters_consensus', indicator: 'Reuters Consensus', category: 'WoC', tier: 'nice', source: 'Reuters', url: '', frequency: 'Mensual', status: 'activo', notes: 'Consensus institucional' },
  { id: 'woc_cftc_leveraged', indicator: 'CFTC Leveraged Funds', category: 'WoC', tier: 'nice', source: 'CFTC', url: 'https://www.cftc.gov/marketreports/commitmentsoftraders/index.htm', frequency: 'Semanal', status: 'activo', notes: 'G10. Tratado en FX_Timing_Module §2' },
  { id: 'woc_epfr', indicator: 'EPFR Global Fund Flows', category: 'WoC', tier: 'nice', source: 'EPFR / Informa', url: '', frequency: 'Semanal', status: 'activo', notes: 'Flujos a fondos por pais. Util para EM' },
  { id: 'woc_state_street', indicator: 'State Street Investor Confidence', category: 'WoC', tier: 'nice', source: 'State Street', url: '', frequency: 'Mensual', status: 'activo', notes: '>100 = risk-on; <100 = risk-off institucional' },
  { id: 'woc_ig_sentiment', indicator: 'IG Sentiment', category: 'WoC', tier: 'nice', source: 'IG', url: '', frequency: 'Diaria', status: 'activo', notes: 'Retail positioning alternativa' },
  { id: 'woc_oanda', indicator: 'OANDA Retail Positioning', category: 'WoC', tier: 'nice', source: 'OANDA', url: '', frequency: 'Diaria', status: 'activo', notes: 'Retail positioning alternativa' },
  { id: 'woc_fxcm', indicator: 'FXCM Retail Positioning', category: 'WoC', tier: 'nice', source: 'FXCM', url: '', frequency: 'Diaria', status: 'activo', notes: 'Retail positioning alternativa' },
  { id: 'woc_aaii', indicator: 'AAII Sentiment Survey', category: 'WoC', tier: 'nice', source: 'AAII', url: '', frequency: 'Semanal', status: 'activo', notes: 'Equities proxy de sentimiento general' },
  { id: 'woc_twitter_sentiment', indicator: 'Twitter/Reddit FX Sentiment', category: 'WoC', tier: 'nice', source: 'Varios providers', url: '', frequency: 'Diaria', status: 'inactivo', notes: 'Social media sentiment. Menos fiable' },
  { id: 'usd_posicion_fiscal', indicator: 'Posicion fiscal US vs G7', category: 'USD', tier: 'nice', source: 'IMF / OECD / Bloomberg', url: '', frequency: 'Trimestral', status: 'activo', notes: 'Deuda, deficit. De-dollarization tracker' },
  { id: 'usd_politica_comercial', indicator: 'Politica comercial / aranceles', category: 'USD', tier: 'nice', source: 'USTR / Bloomberg', url: '', frequency: 'Event-driven', status: 'activo', notes: 'Impacto sentimental + flujos' },
  { id: 'inf_cpi_usa', indicator: 'CPI USA', category: 'INFLACION', tier: 'nice', source: 'BLS', url: '', frequency: 'Mensual', status: 'activo', notes: 'Componente de CPI G7 mediana' },
  { id: 'inf_cpi_eur', indicator: 'CPI Eurozone', category: 'INFLACION', tier: 'nice', source: 'Eurostat', url: '', frequency: 'Mensual', status: 'activo', notes: 'Eurozone HICP' },
  { id: 'inf_bc_policy', indicator: 'BC Policy Stance', category: 'INFLACION', tier: 'nice', source: 'Bloomberg / BIS', url: '', frequency: 'Event-driven', status: 'activo', notes: 'Ciclo subidas / bajadas / hold. Confirma regimen' },
]

export default function WorldViewSources() {
  const [sources, setSources] = useState(defaultSources)
  const [activeTier, setActiveTier] = useState('mvp')
  const [filter, setFilter] = useState('todas')

  const categories = ['todas', ...new Set(sources.map((s) => s.category))]

  const filtered = sources
    .filter((s) => s.tier === activeTier)
    .filter((s) => filter === 'todas' || s.category === filter)

  const mvpCount = sources.filter((s) => s.tier === 'mvp' && s.status === 'activo').length
  const niceCount = sources.filter((s) => s.tier === 'nice' && s.status === 'activo').length
  const mvpTotal = sources.filter((s) => s.tier === 'mvp').length
  const niceTotal = sources.filter((s) => s.tier === 'nice').length

  const updateField = (id, field, value) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)))
  }

  const toggleStatus = (id) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, status: s.status === 'activo' ? 'inactivo' : 'activo' } : s)))
  }

  const moveTier = (id) => {
    setSources((prev) => prev.map((s) => (s.id === id ? { ...s, tier: s.tier === 'mvp' ? 'nice' : 'mvp' } : s)))
  }

  const addRow = () => {
    const newId = `custom_${Date.now()}`
    setSources((prev) => [
      ...prev,
      { id: newId, indicator: '', category: 'GDP', tier: activeTier, source: '', url: '', frequency: '', status: 'activo', notes: '' },
    ])
  }

  const deleteRow = (id) => {
    setSources((prev) => prev.filter((s) => s.id !== id))
  }

  return (
    <section id="sources" className="mb-8 scroll-mt-16">
      {/* Key */}
      <div className="flex items-center gap-4 mb-3 text-sm text-[#777]">
        <span className="flex items-center gap-1"><span className="w-3 h-0 border-b-2 border-[#ecd987] inline-block" /> EDITABLE</span>
        <span className="flex items-center gap-1"><span className="w-3 h-0 border-b-2 border-[#333] inline-block" /> SOLO LECTURA</span>
      </div>

      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTier('mvp')}
            className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
              activeTier === 'mvp'
                ? 'text-[#ecd987] border-[#ecd987]'
                : 'text-[#777] border-[#333] hover:text-white'
            }`}
          >
            MINIMO VIABLE (MVP)
            <span className="ml-2 text-sm font-normal text-[#777]">{mvpCount}/{mvpTotal}</span>
          </button>
          <button
            onClick={() => setActiveTier('nice')}
            className={`px-3 py-1.5 text-sm font-bold uppercase tracking-wider border-2 ${
              activeTier === 'nice'
                ? 'text-white border-white'
                : 'text-[#777] border-[#333] hover:text-white'
            }`}
          >
            NICE TO HAVE
            <span className="ml-2 text-sm font-normal text-[#777]">{niceCount}/{niceTotal}</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="appearance-none bg-[#111] border-b-2 border-[#ecd987] text-sm text-white px-3 py-1 pr-8 outline-none uppercase tracking-wider focus:border-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{c === 'todas' ? 'TODAS LAS CATEGORIAS' : c}</option>
              ))}
            </select>
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[#ecd987] text-sm pointer-events-none">v</span>
          </div>
          <button
            onClick={addRow}
            className="px-3 py-1 border-b-2 border-[#ecd987] text-[#ecd987] text-sm font-bold uppercase tracking-wider hover:text-white hover:border-white"
          >
            + ANADIR FILA
          </button>
        </div>
      </div>

      <p className="text-sm text-[#888] mb-3">
        {activeTier === 'mvp'
          ? 'Fuentes imprescindibles para operar el modulo World View. Sin estas, el sistema no puede calcular el vector de estado.'
          : 'Fuentes adicionales que mejoran la calidad del analisis pero no son criticas para la operativa.'}
      </p>

      <div className="border-2 border-[#333] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#111] border-b-2 border-[#333] text-left text-[#777]">
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider w-8"></th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">Indicador</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">Categoria</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">Fuente</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">URL</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">Freq.</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">Estado</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider">Notas</th>
                <th className="px-2 py-1.5 font-bold uppercase tracking-wider w-8"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-[#222]">
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => moveTier(s.id)}
                      title={`Mover a ${s.tier === 'mvp' ? 'Nice to Have' : 'Minimo Viable'}`}
                      className="text-sm px-1.5 py-0.5 border-b-2 border-[#ecd987] text-[#ecd987] hover:text-white hover:border-white font-bold"
                    >
                      {s.tier === 'mvp' ? 'v' : '^'}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="text-white font-bold">{s.indicator}</span>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="relative inline-block">
                      <select
                        value={s.category}
                        onChange={(e) => updateField(s.id, 'category', e.target.value)}
                        className="appearance-none bg-[#111] border-b border-[#ecd987] text-white outline-none uppercase text-sm tracking-wider px-2 py-0.5 pr-6 focus:border-white"
                      >
                        {categories.filter((c) => c !== 'todas').map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[#ecd987] text-[10px] pointer-events-none">v</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={s.source}
                      onChange={(e) => updateField(s.id, 'source', e.target.value)}
                      className="w-full bg-[#111] border-b border-[#ecd987] text-white outline-none text-sm px-1 py-0.5 focus:border-white"
                      placeholder="Fuente"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={s.url}
                        onChange={(e) => updateField(s.id, 'url', e.target.value)}
                        className="flex-1 bg-[#111] border-b border-[#ecd987] text-white font-mono outline-none text-sm px-1 py-0.5 focus:border-white"
                        placeholder="URL"
                      />
                      {s.url && (
                        <a href={s.url} target="_blank" rel="noopener noreferrer" title="Abrir fuente" className="text-[#777] hover:text-[#ecd987] text-sm">
                          [EXT]
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={s.frequency}
                      onChange={(e) => updateField(s.id, 'frequency', e.target.value)}
                      className="w-20 bg-[#111] border-b border-[#ecd987] text-white outline-none text-sm px-1 py-0.5 focus:border-white"
                      placeholder="Freq."
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => toggleStatus(s.id)}
                      className={`px-2 py-0.5 text-sm font-bold uppercase tracking-wider border-2 ${
                        s.status === 'activo'
                          ? 'text-[#ecd987] border-[#ecd987]'
                          : 'text-[#ef4444] border-[#ef4444]'
                      }`}
                    >
                      {s.status}
                    </button>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      type="text"
                      value={s.notes}
                      onChange={(e) => updateField(s.id, 'notes', e.target.value)}
                      className="w-full bg-[#111] border-b border-[#ecd987] text-white outline-none text-sm px-1 py-0.5 focus:border-white"
                      placeholder="Notas"
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <button
                      onClick={() => deleteRow(s.id)}
                      className="text-sm px-1.5 py-0.5 border-b-2 border-[#ef4444] text-[#ef4444] hover:text-white hover:border-white font-bold"
                    >
                      X
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-3 text-sm text-[#777]">
        <span>{filtered.filter((s) => s.status === 'activo').length} ACTIVAS / {filtered.length} EN VISTA</span>
        <span className="text-[#333]">|</span>
        <span className="text-[#ecd987]">{mvpCount} MVP ACTIVAS</span>
        <span className="text-[#333]">|</span>
        <span className="text-white">{niceCount} NICE ACTIVAS</span>
      </div>
    </section>
  )
}




