import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import WorldViewSources from '../components/worldview/WorldViewSources'

export default function WorldViewTheoryPage() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    if (location.hash) {
      const id = location.hash.replace('#', '')
      const el = document.getElementById(id)
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'instant', block: 'start' }), 0)
      }
    }
  }, [location])

  return (
    <div className="pt-12 min-h-screen">
      <main>
          <div className="max-w-4xl mx-auto px-4 py-6">
            {/* Header */}
            <div className="mb-6 pb-4 border-b-2 border-[#333]">
              <div className="text-sm text-[#777] uppercase tracking-widest mb-2">
                PARTE I — WORLD VIEW MODULE
              </div>
              <h1 className="text-3xl font-bold uppercase tracking-tighter text-white mb-2">WORLD VIEW</h1>
              <p className="text-sm text-[#888] max-w-2xl leading-relaxed">
                Define el regimen macro global y la direccion estructural del riesgo.
                Filtra y modula todo el analisis posterior. Sin ella, el modelo endogeno puede acertar
                la direccion por pais pero perder en FX porque el regimen global domina.
              </p>
            </div>

            {/* Pipeline */}
            <Section id="pipeline" title="ESTRUCTURA DEL MODULO">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0 border-2 border-[#333] mb-4">
                {[
                  { sec: '§2', comp: 'GDP forecasts y nowcasts', out: 'Score crecimiento global' },
                  { sec: '§3', comp: 'Regimen risk-on / risk-off', out: 'Estado: ON / OFF / Mixto' },
                  { sec: '§4', comp: 'Wisdom of the Crowd', out: 'Sentimiento agregado' },
                  { sec: '§5', comp: 'USD bias estructural', out: 'Sesgo dolar' },
                  { sec: '§6', comp: 'Inflacion global', out: 'INF / DESINF / Estable' },
                  { sec: '§7', comp: 'Sintesis', out: 'Vector de estado integrado' },
                ].map((item) => (
                  <div key={item.sec} className="p-2 border-r border-b border-[#333]">
                    <div className="text-sm text-[#ecd987] font-mono font-bold mb-1">{item.sec}</div>
                    <div className="text-sm font-bold text-white uppercase tracking-wider mb-0.5">{item.comp}</div>
                    <div className="text-sm text-[#777]">{item.out}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-0">
                <div className="p-3 border-2 border-[#ecd987]">
                  <span className="text-sm font-mono font-bold text-[#ecd987] uppercase tracking-wider mb-1 block">INPUT</span>
                  <p className="text-sm text-[#888]">
                    VIX, HY OAS, S&P 200dma, EMBI, GDP forecasts, CESI, SPF, Tankan, CFTC, EPFR, SSI, DXY, breakevens, CPI G7.
                  </p>
                </div>
                <div className="flex justify-center py-1"><span className="text-sm text-[#777]">v</span></div>
                <div className="p-3 border-2 border-[#333]">
                  <span className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1 block">CALCULO</span>
                  <p className="text-sm text-[#888]">
                    Regimen → GDP Score → WoC → USD Bias → Inflacion.
                    Cada componente modula los siguientes.
                  </p>
                </div>
                <div className="flex justify-center py-1"><span className="text-sm text-[#777]">v</span></div>
                <div className="p-3 border-2 border-white">
                  <span className="text-sm font-mono font-bold text-white uppercase tracking-wider mb-1 block">OUTPUT: WORLDVIEW_STATE</span>
                  <div className="text-sm text-[#888] font-mono space-y-0.5">
                    <div>regimen_riesgo: ON / OFF / MIXTO</div>
                    <div>momentum_global: score ∈ [-2, +2]</div>
                    <div>WoC_consenso: smart money bias</div>
                    <div>USD_bias: bullish / bearish / neutral</div>
                    <div>regimen_inflacion: INF / DESINF / ESTABLE</div>
                  </div>
                </div>
              </div>
            </Section>

            {/* Referencias a Obsidian */}
            <Section id="docs" title="DOCUMENTACION COMPLETA">
              <p className="text-sm text-[#888] mb-3">
                La teoria detallada de cada componente esta documentada en el vault de Obsidian.
                A continuacion, un indice con las referencias:
              </p>
              <div className="border-2 border-[#333]">
                {[
                  { sec: '§2', title: 'GDP Forecasts y Nowcasts', file: 'WorldView_Module §2 GDP_Forecasts.md', desc: 'Divergencia nowcast vs consensus, GDP gap, score agregado, proxy CESI' },
                  { sec: '§3', title: 'Regimen Risk-ON / Risk-OFF', file: 'WorldView_Module §3 Regimen.md', desc: 'VIX, HY OAS, S&P 200dma, EMBI. Reglas de clasificacion, persistencia, transiciones' },
                  { sec: '§4', title: 'Wisdom of the Crowd', file: 'WorldView_Module §4 WoC.md', desc: 'Smart money vs retail. SPF, CFTC, EPFR vs DailyFX SSI. Score WoC' },
                  { sec: '§5', title: 'USD Bias Estructural', file: 'WorldView_Module §5 USD_Bias.md', desc: 'DXY, tipos reales, posicion fiscal, de-dollarization. Modulacion de senal' },
                  { sec: '§6', title: 'Inflacion Global', file: 'WorldView_Module §6 Inflacion.md', desc: 'CPI G7, breakevens 5Y5Y. Reorientacion de signos por regimen' },
                  { sec: '§7', title: 'Sintesis World View', file: 'WorldView_Module §7 Sintesis.md', desc: 'Vector de estado, aplicacion por par, vetos, tabla de configuracion' },
                  { sec: '§8', title: 'Metricas', file: 'WorldView_Module §8 Metricas.md', desc: 'Hit rate por regimen, Sharpe condicional, tiempo en cada estado' },
                  { sec: '§9', title: 'Parametros', file: 'WorldView_Module §9 Parametros.md', desc: 'Defaults, rangos, calibracion' },
                ].map((doc) => (
                  <div key={doc.sec} className="flex items-start gap-3 p-3 border-b border-[#222] last:border-b-0">
                    <span className="text-sm text-[#ecd987] font-mono font-bold shrink-0 w-8">{doc.sec}</span>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white uppercase tracking-wider">{doc.title}</div>
                      <div className="text-xs text-[#777] font-mono mt-0.5">{doc.file}</div>
                      <div className="text-sm text-[#888] mt-1">{doc.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* Resumen operativo */}
            <Section id="cheatsheet" title="CHEATSHEET OPERATIVO">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-2 border-[#333] mb-4">
                <div className="p-3 border-b sm:border-b-0 sm:border-r border-[#333]">
                  <div className="text-sm font-bold text-[#4ade80] mb-2 uppercase tracking-wider">Risk-ON</div>
                  <ul className="space-y-1 text-sm text-[#888]">
                    <li>VIX &lt; P30, HY &lt; P30, S&P &gt; 200dma, EMBI &lt; P40</li>
                    <li>Favor: pro-ciclicas (AUD, NZD, CAD, NOK, SEK, EM)</li>
                    <li>Contra: refugios (USD, JPY, CHF)</li>
                  </ul>
                </div>
                <div className="p-3">
                  <div className="text-sm font-bold text-[#ef4444] mb-2 uppercase tracking-wider">Risk-OFF</div>
                  <ul className="space-y-1 text-sm text-[#888]">
                    <li>VIX &gt; P70 OR HY &gt; P70 OR S&P &lt; 200dma OR EMBI &gt; P70</li>
                    <li>Favor: refugios (USD, JPY, CHF)</li>
                    <li>Contra: pro-ciclicas, EM</li>
                  </ul>
                </div>
              </div>

              <div className="p-3 border-2 border-[#333] font-mono text-sm mb-4">
                <div className="text-[#888] space-y-1">
                  <div>Score_GDP = w_USA*gap(USA) + w_EUR*gap(EUR) + w_CHN*gap(CHN) + w_JPN*gap(JPN) + w_resto*gap(resto)</div>
                  <div>WoC = 0.7*smart_z - 0.3*retail_z</div>
                  <div>USD = f(DXY, 200dma, trend)</div>
                  <div>Inf = f(CPI_G7, breakevens)</div>
                </div>
              </div>

              <div className="p-3 border-2 border-[#ef4444]">
                <p className="text-sm text-[#ef4444] font-bold mb-2 uppercase">World View VETA si:</p>
                <ul className="space-y-1 text-sm text-[#888]">
                  <li>Risk-OFF severo (4/4 en P&gt;P80) + trade pro-ciclica</li>
                  <li>Risk-ON euforico (4/4 en P&lt;P20) + trade refugio largo</li>
                  <li>USD strong bullish (4σ) + short USD</li>
                  <li>Inflacion cambia bruscamente (&gt;1pp breakevens en 1 mes)</li>
                </ul>
                <p className="mt-2 text-sm text-[#ef4444] font-bold uppercase">Esperar normalizacion.</p>
              </div>
            </Section>

            {/* Fuentes */}
            <WorldViewSources />

            {/* Footer */}
            <div className="pt-4 border-t-2 border-[#333] mt-8">
              <p className="text-sm text-[#777]">
                World View no se opera directamente. Filtra y modula el resto.
                Documentacion completa en Obsidian vault.
              </p>
            </div>
          </div>
      </main>
    </div>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-8 scroll-mt-16">
      <h2 className="text-base font-bold mb-3 pb-1 border-b-2 border-[#333] uppercase tracking-widest">{title}</h2>
      {children}
    </section>
  )
}
