import { motion } from 'motion/react'

export default function WorldViewUSDBias() {
  return (
    <section id="usdbias" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">USD Bias Estructural</h3>

      <div className="mb-6 p-4 rounded-xl bg-bg-card border border-white/10">
        <p className="text-sm text-text-secondary leading-relaxed">
          El USD merece tratamiento especial porque es la unidad de cuenta global y el otro lado de ~85% de los pares FX.
        </p>
      </div>

      {/* DXY */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">DXY como termómetro</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-lg bg-bg-secondary border border-white/5 text-center">
            <div className="text-sm text-text-muted mb-1">Bull estructural</div>
            <div className="text-sm font-medium text-accent-emerald">200dma rising + DXY &gt; 100</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-secondary border border-white/5 text-center">
            <div className="text-sm text-text-muted mb-1">Bear estructural</div>
            <div className="text-sm font-medium text-accent-rose">200dma falling + DXY &lt; 95</div>
          </div>
          <div className="p-3 rounded-lg bg-bg-secondary border border-white/5 text-center">
            <div className="text-sm text-text-muted mb-1">Ranging</div>
            <div className="text-sm font-medium text-text-muted">Divisas por idiosincrasia</div>
          </div>
        </div>
        <div className="text-sm text-text-muted font-mono">
          EUR (57.6%), JPY (13.6%), GBP (11.9%), CAD (9.1%), SEK (4.2%), CHF (3.6%)
        </div>
      </motion.div>

      {/* Drivers */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Drivers del USD bias</h4>
        <ol className="space-y-2 text-sm text-text-secondary list-decimal list-inside">
          <li>Diferencial tipos reales US vs G7 <span className="text-text-muted">(peso alto)</span></li>
          <li>Posición fiscal US vs G7 <span className="text-text-muted">(deuda, déficit)</span></li>
          <li>Régimen risk-on/off <span className="text-text-muted">(USD sube en risk-off severo)</span></li>
          <li>Cambios estructurales en demanda USD reserva <span className="text-text-muted">(de-dollarization)</span></li>
          <li>Política comercial / aranceles</li>
        </ol>
      </motion.div>

      {/* Implicación */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Modulación de Señal_FX</h4>
        <div className="font-mono text-sm bg-bg-secondary p-4 rounded-lg border border-white/5">
          <div className="text-text-secondary">
            Señal_ajustada(A/B) = Señal_FX(A/B) + α · USD_bias_factor(A,B)
          </div>
        </div>
      </motion.div>
    </section>
  )
}





