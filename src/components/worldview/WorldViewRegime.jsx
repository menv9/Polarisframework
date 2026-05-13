import { useState } from 'react'
import { motion } from 'motion/react'

export default function WorldViewRegime() {
  const [vix, setVix] = useState(50)
  const [hy, setHy] = useState(50)
  const [sp, setSp] = useState(50)
  const [embi, setEmbi] = useState(50)

  const vixOn = vix < 30
  const vixOff = vix > 70
  const hyOn = hy < 30
  const hyOff = hy > 70
  const spOn = sp > 50
  const spOff = sp < 50
  const embiOn = embi < 40
  const embiOff = embi > 70

  const onCount = [vixOn, hyOn, spOn, embiOn].filter(Boolean).length
  const offCount = [vixOff, hyOff, spOff, embiOff].filter(Boolean).length

  let regime = 'Mixto'
  let regimeColor = 'text-text-muted'
  let regimeBg = 'bg-text-muted/10 border-text-muted/20'

  if (onCount === 4) {
    regime = 'Risk-ON'
    regimeColor = 'text-accent-emerald'
    regimeBg = 'bg-accent-emerald/10 border-accent-emerald/20'
  } else if (offCount >= 1) {
    regime = 'Risk-OFF'
    regimeColor = 'text-accent-rose'
    regimeBg = 'bg-accent-rose/10 border-accent-rose/20'
  }

  const Slider = ({ label, value, setValue, onThreshold, offThreshold, onLabel, offLabel }) => (
    <div className="p-4 rounded-xl bg-bg-card border border-white/10">
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm font-medium text-text-primary">{label}</span>
        <span className={`text-sm font-mono font-semibold ${
          value > offThreshold ? 'text-accent-rose' : value < onThreshold ? 'text-accent-emerald' : 'text-text-muted'
        }`}>
          P{value}
        </span>
      </div>
      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-bg-secondary accent-accent-cyan"
      />
      <div className="flex justify-between mt-2 text-sm text-text-muted font-mono">
        <span>{onLabel}</span>
        <span>{offLabel}</span>
      </div>
    </div>
  )

  return (
    <section id="regime" className="mb-16 scroll-mt-24">
      <h3 className="text-2xl font-bold mb-6">Régimen Risk-ON / Risk-OFF</h3>

      <div className="mb-6 p-4 rounded-xl bg-bg-card border border-white/10">
        <p className="text-sm text-text-secondary leading-relaxed">
          Cuatro indicadores compuestos a percentiles rolling 5Y. Ajusta los sliders para simular diferentes condiciones de mercado y ver cómo cambia el régimen.
        </p>
      </div>

      {/* Simulador interactivo */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-text-muted">Simulador de Régimen</h4>
          <div className={`px-4 py-2 rounded-lg border text-sm font-bold ${regimeBg} ${regimeColor}`}>
            {regime}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Slider
            label="A. Volatilidad equity (VIX)"
            value={vix}
            setValue={setVix}
            onThreshold={30}
            offThreshold={70}
            onLabel="ON: < P30"
            offLabel="OFF: > P70"
          />
          <Slider
            label="B. Crédito (HY OAS)"
            value={hy}
            setValue={setHy}
            onThreshold={30}
            offThreshold={70}
            onLabel="ON: < P30"
            offLabel="OFF: > P70"
          />
          <Slider
            label="C. Tendencia equity (S&P vs 200dma)"
            value={sp}
            setValue={setSp}
            onThreshold={50}
            offThreshold={50}
            onLabel="ON: > 200dma"
            offLabel="OFF: < 200dma"
          />
          <Slider
            label="D. Spread EM (OAS)"
            value={embi}
            setValue={setEmbi}
            onThreshold={40}
            offThreshold={70}
            onLabel="ON: < P40"
            offLabel="OFF: > P70"
          />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-white/5 text-sm text-text-secondary font-mono">
          <div className="flex gap-6">
            <span>Condiciones ON: <strong className="text-accent-emerald">{onCount}/4</strong></span>
            <span>Condiciones OFF: <strong className="text-accent-rose">{offCount}/4</strong></span>
          </div>
        </div>
      </div>

      {/* Reglas */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Reglas operativas</h4>
        <div className="space-y-2 text-sm text-text-secondary font-mono bg-bg-secondary p-4 rounded-lg border border-white/5">
          <div className="text-accent-emerald">Risk-ON: VIX &lt; P30 AND HY &lt; P30 AND S&amp;P &gt; 200dma AND EM OAS &lt; P40</div>
          <div className="text-accent-rose">Risk-OFF: VIX &gt; P70 OR HY &gt; P70 OR S&amp;P &lt; 200dma OR EM OAS &gt; P70</div>
          <div className="text-text-muted">Mixto: cualquier otro caso</div>
        </div>
      </motion.div>

      {/* Persistencia */}
      <motion.div
        className="p-5 rounded-xl border border-white/10 bg-bg-card mb-6"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
      >
        <h4 className="text-sm font-semibold text-text-primary mb-3">Persistencia y transiciones</h4>
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan/60 shrink-0" />
            Cambio de régimen requiere <strong className="text-text-primary">confirmación de 5 sesiones consecutivas</strong>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent-cyan/60 shrink-0" />
            Excepción: salto &gt; 3σ en cualquier indicador → cambio inmediato a risk-OFF
          </li>
        </ul>
      </motion.div>

      {/* Tabla implicaciones */}
      <div className="overflow-x-auto">
        <h4 className="text-sm font-semibold text-text-primary mb-3">Implicaciones por divisa</h4>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-text-muted">
              <th className="pb-2 pr-4">Régimen</th>
              <th className="pb-2 pr-4">Favor</th>
              <th className="pb-2">Contra</th>
            </tr>
          </thead>
          <tbody className="text-text-secondary">
            {[
              ['Risk-ON', 'Pro-cíclicas (AUD, NZD, CAD, NOK, SEK, EM)', 'Refugios (USD, JPY, CHF)'],
              ['Risk-OFF', 'Refugios (USD, JPY, CHF)', 'Pro-cíclicas, EM'],
              ['Mixto', 'Diferenciales fundamentales (sin sesgo régimen)', '—'],
            ].map((row, i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="py-2.5 pr-4 font-medium text-text-primary">{row[0]}</td>
                <td className="py-2.5 pr-4">{row[1]}</td>
                <td className="py-2.5">{row[2]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}





