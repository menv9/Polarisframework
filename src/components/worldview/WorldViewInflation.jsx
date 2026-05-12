import { motion } from 'motion/react'

export default function WorldViewInflation() {
  return (
    <section id="inflation" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Régimen de Inflación Global</h3>

      <div className="mb-6 p-4 rounded-xl bg-bg-card border border-white/10">
        <p className="text-sm text-text-secondary leading-relaxed">
          Ortogonal al régimen risk-on/off. Determina si la narrativa macro es "inflación" o "deflación/desinflación", afectando cómo se interpretan datos macro.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <motion.div
          className="p-5 rounded-xl border border-accent-rose/20 bg-accent-rose/5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-sm font-semibold text-accent-rose mb-3">Inflacionario</h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>CPI G7 mediana &gt; 3% YoY</li>
            <li>Breakevens 5Y5Y G7 &gt; 2.5%</li>
            <li>BC en ciclo de subidas o pausa hawkish</li>
          </ul>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border border-accent-blue/20 bg-accent-blue/5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
        >
          <h4 className="text-sm font-semibold text-accent-blue mb-3">Desinflacionario</h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>CPI G7 mediana &lt; 2% YoY trend descendente</li>
            <li>Breakevens 5Y5Y descendiendo</li>
            <li>BC en ciclo bajadas o pausa dovish</li>
          </ul>
        </motion.div>

        <motion.div
          className="p-5 rounded-xl border border-text-muted/20 bg-text-muted/5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <h4 className="text-sm font-semibold text-text-muted mb-3">Mixto / Estable</h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li>CPI cerca de targets (~2%)</li>
            <li>Bancos centrales en hold prolongado</li>
          </ul>
        </motion.div>
      </div>

      {/* Tabla de reorientación */}
      <motion.div
        className="overflow-x-auto"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Reorientación de signos por régimen</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-text-muted">
              <th className="pb-2 pr-4">Indicador</th>
              <th className="pb-2 pr-4">Régimen inflación</th>
              <th className="pb-2">Régimen desinflación</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {[
              ['CPI alto', 'Más positivo para divisa (sube tipos)', 'Negativo (BC sin reacción)'],
              ['Yield 10Y subiendo', 'Menos negativo', 'Más negativo (asume risk-off)'],
              ['Diferencial tipos reales', 'Crítico', 'Importante pero menor'],
              ['Balance CB / GDP', 'Menos negativo', 'Muy negativo (estímulo)'],
            ].map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2.5 pr-4 font-medium text-text-primary">{row[0]}</td>
                <td className="py-2.5 pr-4">{row[1]}</td>
                <td className="py-2.5">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </motion.div>
    </section>
  )
}





