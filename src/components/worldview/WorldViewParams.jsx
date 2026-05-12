import { motion } from 'motion/react'

export default function WorldViewParams() {
  return (
    <section id="params" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Parámetros Default</h3>

      <motion.div
        className="overflow-x-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-text-muted">
              <th className="pb-2 pr-4">Parámetro</th>
              <th className="pb-2 pr-4">Default</th>
              <th className="pb-2">Rango</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {[
              ['Percentil régimen risk-on', '< P30 (5Y)', 'P25-P35'],
              ['Percentil régimen risk-off', '> P70 (5Y)', 'P65-P75'],
              ['Confirmación cambio régimen', '5 sesiones', '3-7'],
              ['GDP gap umbral', '±0.5pp', '±0.3 a ±0.7'],
              ['Pesos GDP global', 'USA 25, EUR 18, CHN 18, JPN 5', 'snapshot ajustable'],
              ['Smart vs retail weight', '70/30', '60-80 / 20-40'],
              ['CESI umbral fuerte', '±50', '±40 a ±70'],
              ['DXY band bullish', '> 200dma rising + > 100', 'adjust'],
              ['Frequency re-eval', 'Mensual', 'Semanal-mensual'],
            ].map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2.5 pr-4 font-medium text-text-primary">{row[0]}</td>
                <td className="py-2.5 pr-4 font-mono text-accent-cyan">{row[1]}</td>
                <td className="py-2.5">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}





