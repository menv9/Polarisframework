import { motion } from 'motion/react'

export default function WorldViewWoC() {
  return (
    <section id="woc" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Wisdom of the Crowd</h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Smart money */}
        <motion.div
          className="p-5 rounded-xl border border-accent-emerald/20 bg-accent-emerald/5"
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-sm font-semibold text-accent-emerald mb-4">Smart Money (input direccional)</h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            {[
              'Encuestas profesionales: SPF Filadelfia, ECB SPF, Tankan, BCB Focus',
              'Consensus institucional: Bloomberg, Reuters',
              'CFTC asset managers (real money)',
              'EPFR fund flows (institutional)',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-emerald/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Retail */}
        <motion.div
          className="p-5 rounded-xl border border-accent-rose/20 bg-accent-rose/5"
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
        >
          <h4 className="text-sm font-semibold text-accent-rose mb-4">Retail Sentiment (input contrarian)</h4>
          <ul className="space-y-2 text-sm text-text-secondary">
            {[
              'Brokers retail positioning: DailyFX, IG, OANDA, FXCM',
              'AAII Sentiment Survey (equities proxy)',
              'Twitter/Reddit FX sentiment indices',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-rose/60 shrink-0" />
                {item}
              </li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Regla operativa */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Regla operativa</h4>
        <div className="space-y-2 text-sm text-text-secondary">
          <div className="flex items-center gap-3">
            <span className="text-accent-emerald font-semibold">Smart money LONG</span>
            <span>→ corroboración (puede operarse direccionalmente)</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-accent-rose font-semibold">Retail LONG 80%</span>
            <span>→ warning (extremo retail = contrarian)</span>
          </div>
        </div>
      </motion.div>

      {/* Score formula */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Score Wisdom of the Crowd</h4>
        <div className="font-mono text-sm bg-bg-secondary p-4 rounded-lg border border-white/5 mb-3">
          <div className="text-accent-cyan mb-2">WoC_Score = w_smart · (smart_consensus_z) − w_retail · (retail_extremo_z)</div>
          <div className="text-text-secondary">w_smart = 0.7, w_retail = 0.3</div>
        </div>
      </motion.div>
    </section>
  )
}





