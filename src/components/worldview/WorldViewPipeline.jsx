import { motion } from 'motion/react'
import { ArrowDown } from 'lucide-react'

export default function WorldViewPipeline() {
  return (
    <section id="pipeline" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Pipeline World View</h3>
      
      <div className="space-y-4">
        {/* Input */}
        <motion.div
          className="p-5 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-mono font-semibold text-accent-cyan uppercase tracking-wider mb-3 block">
            Input
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-text-secondary">
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">VIX, HY OAS, S&P 200dma, EMBI</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">GDP forecasts (IMF, Bloomberg, nowcasts)</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">CESI por país</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">Encuestas profesionales (SPF, ECB SPF, Tankan)</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">CFTC, EPFR, retail SSI</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">DXY, breakevens 5Y5Y, CPI mediana G7</span>
          </div>
        </motion.div>

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-text-muted" />
        </div>

        {/* Cálculo */}
        <motion.div
          className="p-5 rounded-xl border border-accent-blue/20 bg-accent-blue/5"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-mono font-semibold text-accent-blue uppercase tracking-wider mb-3 block">
            Cálculo
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-text-secondary">
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">§3 Régimen risk-on/off (4 indicadores)</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">§2 Score crecimiento global</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">§4 WoC score (smart vs retail)</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">§5 USD bias estructural</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">§6 Régimen inflación</span>
          </div>
        </motion.div>

        <div className="flex justify-center">
          <ArrowDown className="w-5 h-5 text-text-muted" />
        </div>

        {/* Output */}
        <motion.div
          className="p-5 rounded-xl border border-accent-violet/20 bg-accent-violet/5"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <span className="text-sm font-mono font-semibold text-accent-violet uppercase tracking-wider mb-3 block">
            Output: WorldView_state vector
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-text-secondary">
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">→ Endogenous Module</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">→ Risk Management</span>
            <span className="px-3 py-1.5 rounded bg-bg-card border border-white/5">→ Timing</span>
          </div>
        </motion.div>
      </div>
    </section>
  )
}





