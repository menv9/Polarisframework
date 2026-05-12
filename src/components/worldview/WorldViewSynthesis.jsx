import { useState } from 'react'
import { motion } from 'motion/react'

export default function WorldViewSynthesis() {
  const [regime, setRegime] = useState('OFF')
  const [momentum, setMomentum] = useState(-0.8)
  const [woc, setWoc] = useState('bearish')
  const [usdBias, setUsdBias] = useState('bullish')
  const [inflation, setInflation] = useState('DESINF')

  const configs = [
    { regime: 'ON', momentum: '+', usd: 'bearish', inflation: 'INF', trades: 'Long pro-cíclicas vs USD, long EM vs USD' },
    { regime: 'ON', momentum: '+', usd: 'bullish', inflation: 'INF', trades: 'Long commodity currencies (AUD, CAD, NOK), evitar pares vs USD' },
    { regime: 'OFF', momentum: '−', usd: 'bullish', inflation: 'INF', trades: 'Long USD vs todo. Short EM. Short pro-cíclicas' },
    { regime: 'OFF', momentum: '−', usd: 'neutral', inflation: 'DESINF', trades: 'Long JPY/CHF vs pro-cíclicas' },
    { regime: 'MIX', momentum: '~0', usd: 'neutral', inflation: 'ESTABLE', trades: 'Trades fundamentales sin filtro régimen' },
  ]

  const currentConfig = configs.find(
    (c) => c.regime === regime && c.usd === usdBias && c.inflation === inflation
  ) || { trades: 'Configuración no estándar — evaluar caso por caso' }

  return (
    <section id="synthesis" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Síntesis World View</h3>

      {/* Vector de estado */}
      <motion.div
        className="p-5 rounded-xl border border-accent-violet/20 bg-accent-violet/5 mb-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-accent-violet mb-4">Vector de estado global</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="p-3 rounded-lg bg-bg-card border border-white/10">
            <div className="text-sm text-text-muted uppercase tracking-wider mb-1">Régimen riesgo</div>
            <select
              value={regime}
              onChange={(e) => setRegime(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none cursor-pointer"
            >
              <option value="ON">Risk-ON</option>
              <option value="OFF">Risk-OFF</option>
              <option value="MIX">Mixto</option>
            </select>
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-white/10">
            <div className="text-sm text-text-muted uppercase tracking-wider mb-1">Momentum global</div>
            <div className="text-sm font-mono font-semibold text-text-primary">[{momentum.toFixed(1)}]</div>
            <input
              type="range" min="-2" max="2" step="0.1"
              value={momentum}
              onChange={(e) => setMomentum(Number(e.target.value))}
              className="w-full mt-2 h-1.5 rounded-lg appearance-none cursor-pointer bg-bg-secondary accent-accent-violet"
            />
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-white/10">
            <div className="text-sm text-text-muted uppercase tracking-wider mb-1">WoC consenso</div>
            <select
              value={woc}
              onChange={(e) => setWoc(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none cursor-pointer"
            >
              <option value="bullish">Bullish growth</option>
              <option value="bearish">Bearish growth</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-white/10">
            <div className="text-sm text-text-muted uppercase tracking-wider mb-1">USD bias</div>
            <select
              value={usdBias}
              onChange={(e) => setUsdBias(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none cursor-pointer"
            >
              <option value="bullish">Bullish</option>
              <option value="bearish">Bearish</option>
              <option value="neutral">Neutral</option>
            </select>
          </div>
          <div className="p-3 rounded-lg bg-bg-card border border-white/10">
            <div className="text-sm text-text-muted uppercase tracking-wider mb-1">Inflación</div>
            <select
              value={inflation}
              onChange={(e) => setInflation(e.target.value)}
              className="w-full bg-transparent text-sm font-semibold text-text-primary outline-none cursor-pointer"
            >
              <option value="INF">Inflacionario</option>
              <option value="DESINF">Desinflacionario</option>
              <option value="ESTABLE">Estable</option>
            </select>
          </div>
        </div>

        {/* Resultado */}
        <div className="mt-4 p-4 rounded-lg bg-bg-card border border-white/10">
          <div className="text-sm text-text-muted uppercase tracking-wider mb-1">Trades favorecidos</div>
          <div className="text-sm font-medium text-text-primary">{currentConfig.trades}</div>
        </div>
      </motion.div>

      {/* Cuándo vetar */}
      <motion.div
        className="p-5 rounded-xl border border-accent-rose/20 bg-accent-rose/5 mb-8"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-accent-rose mb-3">Cuándo World View veta el trade</h4>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-rose/60 shrink-0" />
            Risk-OFF severo (4 de 4 indicadores en P&gt;P80) Y trade es pro-cíclica
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-rose/60 shrink-0" />
            Risk-ON eufórico (4 de 4 en P&lt;P20) Y trade es refugio largo
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-rose/60 shrink-0" />
            USD_bias strong bullish (4σ) Y trade es short USD
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-rose/60 shrink-0" />
            Régimen inflación cambia bruscamente (gap &gt; 1pp en breakevens en 1 mes)
          </li>
        </ul>
        <p className="mt-3 text-sm text-accent-rose font-semibold">
          EN ESTOS CASOS: esperar normalización antes de operar la tesis.
        </p>
      </motion.div>

      {/* Tabla configuración */}
      <div className="overflow-x-auto">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Tabla de configuración completa</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-text-muted">
              <th className="pb-2 pr-4">Régimen</th>
              <th className="pb-2 pr-4">Momentum</th>
              <th className="pb-2 pr-4">USD bias</th>
              <th className="pb-2 pr-4">Inflación</th>
              <th className="pb-2">Trades favorecidos</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {configs.map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2.5 pr-4 font-medium text-text-primary">{row.regime}</td>
                <td className="py-2.5 pr-4">{row.momentum}</td>
                <td className="py-2.5 pr-4">{row.usd}</td>
                <td className="py-2.5 pr-4">{row.inflation}</td>
                <td className="py-2.5">{row.trades}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}





