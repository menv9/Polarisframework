import { motion } from 'motion/react'

export default function WorldViewGDP() {
  return (
    <section id="gdp" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">GDP Forecasts y Nowcasts</h3>

      <div className="space-y-8">
        {/* Fuentes */}
        <div>
          <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-4">
            Fuentes de datos
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-text-muted">
                  <th className="pb-2 pr-4">Fuente</th>
                  <th className="pb-2 pr-4">Cobertura</th>
                  <th className="pb-2 pr-4">Frecuencia</th>
                  <th className="pb-2">Lag</th>
                </tr>
              </thead>
              <tbody className="text-text-secondary">
                {[
                  ['IMF WEO', 'Global', 'Semestral', '1 trimestre'],
                  ['OECD Economic Outlook', 'G20', 'Semestral', '1 trimestre'],
                  ['Bloomberg Consensus', 'G10 + EM', 'Mensual', '<1 mes'],
                  ['Atlanta Fed GDPNow', 'USA real-time', 'Continua', '0'],
                  ['NY Fed Nowcast', 'USA real-time', 'Semanal', '0'],
                  ['ECB BMPE', 'Eurozone', 'Trimestral', '1-2 meses'],
                  ['BoJ Tankan', 'Japón', 'Trimestral', '1 mes'],
                ].map((row, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="py-2.5 pr-4 font-medium text-text-primary">{row[0]}</td>
                    <td className="py-2.5 pr-4">{row[1]}</td>
                    <td className="py-2.5 pr-4">{row[2]}</td>
                    <td className="py-2.5">{row[3]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GDP gap */}
        <motion.div
          className="p-5 rounded-xl border border-white/10 bg-bg-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-sm font-semibold text-text-primary mb-3">Indicador operativo: GDP gap</h4>
          <div className="font-mono text-sm bg-bg-secondary p-4 rounded-lg border border-white/5 mb-3">
            <div className="text-accent-cyan mb-2">GDP_gap(país, t) = Nowcast(t) − Consensus_forecast(t)</div>
            <div className="text-text-secondary space-y-1">
              <div>gap &gt; +0.5pp → economía sorprende al alza → divisa fuerte</div>
              <div>gap &lt; −0.5pp → economía sorprende a la baja → divisa débil</div>
              <div>|gap| &lt; 0.5pp → en línea, sin información direccional fuerte</div>
            </div>
          </div>
          <p className="text-sm text-text-secondary">
            Esta señal anticipa <strong className="text-text-primary">revisiones de consenso</strong>, que son lo que mueve mercados de tipos y FX.
          </p>
        </motion.div>

        {/* Score global */}
        <motion.div
          className="p-5 rounded-xl border border-white/10 bg-bg-card"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-sm font-semibold text-text-primary mb-3">Score de crecimiento global agregado</h4>
          <div className="font-mono text-sm bg-bg-secondary p-4 rounded-lg border border-white/5 mb-4">
            <div className="text-text-secondary space-y-1">
              <div>Score = w_USA·GDP_gap(USA) + w_EUR·GDP_gap(EUR)</div>
              <div>       + w_CHN·GDP_gap(CHN) + w_JPN·GDP_gap(JPN)</div>
              <div>       + w_resto·GDP_gap(resto)</div>
            </div>
          </div>

          <h5 className="text-sm font-semibold uppercase tracking-wider text-text-muted mb-2">Pesos sugeridos (% PIB global)</h5>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
            {[
              { label: 'USA', value: 25 },
              { label: 'EUR', value: 18 },
              { label: 'CHN', value: 18 },
              { label: 'JPN', value: 5 },
              { label: 'Resto', value: 34 },
            ].map((w) => (
              <div key={w.label} className="text-center p-3 rounded-lg bg-bg-secondary border border-white/5">
                <div className="text-lg font-bold font-mono text-accent-cyan">{w.value}%</div>
                <div className="text-sm text-text-muted">{w.label}</div>
              </div>
            ))}
          </div>

          <div className="text-sm text-text-secondary space-y-1">
            <div><span className="text-accent-emerald font-semibold">&gt; +0.5</span> → momentum macro global positivo (favor pro-cíclicas)</div>
            <div><span className="text-accent-rose font-semibold">&lt; −0.5</span> → momentum macro global negativo (favor refugios)</div>
            <div><span className="text-text-muted font-semibold">En between</span> → neutro</div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}





