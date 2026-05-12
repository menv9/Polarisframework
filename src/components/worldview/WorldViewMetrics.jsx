import { motion } from 'motion/react'

export default function WorldViewMetrics() {
  return (
    <section id="metrics" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Métricas de Output</h3>

      <motion.div
        className="overflow-x-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-text-muted">
              <th className="pb-2 pr-4">Métrica</th>
              <th className="pb-2">Descripción</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {[
              ['% trades vetados por World View', 'Cuántas señales del modelo no se ejecutaron por régimen'],
              ['Performance trades vetados (paper)', 'P&L que habrían generado si se ejecutaban'],
              ['Hit rate por régimen', 'Hit rate condicional en ON / OFF / MIXTO'],
              ['Sharpe por régimen', 'Sharpe condicional'],
              ['Tiempo medio en cada régimen', '% del año en ON / OFF / MIXTO'],
              ['Cambios de régimen / año', 'Frecuencia de transición'],
              ['Drawdown por régimen', 'Max DD condicional'],
            ].map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2.5 pr-4 font-medium text-text-primary">{row[0]}</td>
                <td className="py-2.5">{row[1]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>

      <motion.div
        className="mt-6 p-4 rounded-xl border border-accent-amber/20 bg-accent-amber/5"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <p className="text-sm text-text-secondary">
          <strong className="text-text-primary">Métrica clave:</strong>{' '}
          si trades vetados habrían sido positivos consistentemente → World View es demasiado restrictivo, recalibrar.
          Si trades vetados habrían sido negativos → World View añade valor, mantener.
        </p>
      </motion.div>
    </section>
  )
}





