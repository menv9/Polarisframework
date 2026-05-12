import { useState, useMemo } from 'react'
import { motion } from 'motion/react'
import { Calculator, RefreshCcw } from 'lucide-react'

export default function WorldViewCalculator() {
  // Inputs GDP
  const [gdpUsa, setGdpUsa] = useState(0.3)
  const [gdpEur, setGdpEur] = useState(-0.2)
  const [gdpChn, setGdpChn] = useState(0.5)
  const [gdpJpn, setGdpJpn] = useState(0.1)
  const [gdpResto, setGdpResto] = useState(0.0)

  // Inputs Régimen
  const [vix, setVix] = useState(45)
  const [hyOas, setHyOas] = useState(55)
  const [spAbove200dma, setSpAbove200dma] = useState(true)
  const [embi, setEmbi] = useState(60)

  // Inputs WoC
  const [smartZ, setSmartZ] = useState(0.5)
  const [retailZ, setRetailZ] = useState(-0.8)

  // Inputs USD Bias
  const [dxy, setDxy] = useState(103.5)
  const [dxy200dma, setDxy200dma] = useState(101.0)
  const [dxyRising, setDxyRising] = useState(true)

  // Inputs Inflación
  const [cpiG7, setCpiG7] = useState(2.8)
  const [breakevens5y5y, setBreakevens5y5y] = useState(2.3)

  // Cálculos
  const scoreCrecimiento = useMemo(() => {
    return (gdpUsa * 0.25 + gdpEur * 0.18 + gdpChn * 0.18 + gdpJpn * 0.05 + gdpResto * 0.34)
  }, [gdpUsa, gdpEur, gdpChn, gdpJpn, gdpResto])

  const regime = useMemo(() => {
    const vixOff = vix > 70
    const hyOff = hyOas > 70
    const spOff = !spAbove200dma
    const embiOff = embi > 70
    const vixOn = vix < 30
    const hyOn = hyOas < 30
    const spOn = spAbove200dma
    const embiOn = embi < 40
    const onCount = [vixOn, hyOn, spOn, embiOn].filter(Boolean).length
    const offCount = [vixOff, hyOff, spOff, embiOff].filter(Boolean).length
    if (onCount === 4) return 'Risk-ON'
    if (offCount >= 1) return 'Risk-OFF'
    return 'Mixto'
  }, [vix, hyOas, spAbove200dma, embi])

  const wocScore = useMemo(() => {
    return (0.7 * smartZ - 0.3 * retailZ)
  }, [smartZ, retailZ])

  const usdBias = useMemo(() => {
    if (dxyRising && dxy > 100) return 'Bullish'
    if (!dxyRising && dxy < 95) return 'Bearish'
    return 'Neutral'
  }, [dxy, dxyRising])

  const inflationRegime = useMemo(() => {
    if (cpiG7 > 3.0 || breakevens5y5y > 2.5) return 'Inflacionario'
    if (cpiG7 < 2.0 && breakevens5y5y < 2.0) return 'Desinflacionario'
    return 'Estable'
  }, [cpiG7, breakevens5y5y])

  const reset = () => {
    setGdpUsa(0.3); setGdpEur(-0.2); setGdpChn(0.5); setGdpJpn(0.1); setGdpResto(0.0)
    setVix(45); setHyOas(55); setSpAbove200dma(true); setEmbi(60)
    setSmartZ(0.5); setRetailZ(-0.8)
    setDxy(103.5); setDxy200dma(101.0); setDxyRising(true)
    setCpiG7(2.8); setBreakevens5y5y(2.3)
  }

  const regimeColor = {
    'Risk-ON': 'text-accent-emerald bg-accent-emerald/10 border-accent-emerald/20',
    'Risk-OFF': 'text-accent-rose bg-accent-rose/10 border-accent-rose/20',
    'Mixto': 'text-text-muted bg-text-muted/10 border-text-muted/20',
  }[regime]

  const InputNumber = ({ label, value, setValue, min, max, step, unit }) => (
    <div className="space-y-1">
      <label className="text-sm text-text-muted">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-24 px-2 py-1.5 rounded bg-bg-card border border-white/10 text-sm font-mono text-text-primary focus:border-accent-cyan outline-none"
        />
        {unit && <span className="text-sm text-text-muted">{unit}</span>}
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full h-1.5 accent-accent-cyan"
      />
    </div>
  )

  return (
    <section id="calculator" className="mb-16 scroll-mt-24">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="w-6 h-6 text-accent-cyan" />
          Calculadora World View
        </h3>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary border border-white/10 hover:border-white/20 bg-bg-card transition-colors"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Inputs Panel */}
        <div className="space-y-6">
          {/* GDP */}
          <div className="p-5 rounded-xl border border-white/10 bg-bg-card">
            <h4 className="text-sm font-semibold text-text-primary mb-4">GDP Gap por región (pp)</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputNumber label="USA (25%)" value={gdpUsa} setValue={setGdpUsa} min={-2} max={2} step={0.1} />
              <InputNumber label="EUR (18%)" value={gdpEur} setValue={setGdpEur} min={-2} max={2} step={0.1} />
              <InputNumber label="CHN (18%)" value={gdpChn} setValue={setGdpChn} min={-2} max={2} step={0.1} />
              <InputNumber label="JPN (5%)" value={gdpJpn} setValue={setGdpJpn} min={-2} max={2} step={0.1} />
              <InputNumber label="Resto (34%)" value={gdpResto} setValue={setGdpResto} min={-2} max={2} step={0.1} />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-white/5">
              <div className="text-sm text-text-muted">Score crecimiento global</div>
              <div className={`text-lg font-bold font-mono ${
                scoreCrecimiento > 0.5 ? 'text-accent-emerald' : scoreCrecimiento < -0.5 ? 'text-accent-rose' : 'text-text-muted'
              }`}>
                {scoreCrecimiento.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Regimen */}
          <div className="p-5 rounded-xl border border-white/10 bg-bg-card">
            <h4 className="text-sm font-semibold text-text-primary mb-4">Régimen Risk-ON/OFF (percentil 5Y)</h4>
            <div className="space-y-4">
              <InputNumber label="VIX" value={vix} setValue={setVix} min={0} max={100} step={1} unit="P" />
              <InputNumber label="HY OAS" value={hyOas} setValue={setHyOas} min={0} max={100} step={1} unit="P" />
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-white/5">
                <span className="text-sm text-text-muted">S&P 500 vs 200dma</span>
                <button
                  onClick={() => setSpAbove200dma(!spAbove200dma)}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    spAbove200dma
                      ? 'bg-accent-emerald/20 text-accent-emerald'
                      : 'bg-accent-rose/20 text-accent-rose'
                  }`}
                >
                  {spAbove200dma ? 'Above 200dma' : 'Below 200dma'}
                </button>
              </div>
              <InputNumber label="EMBI Spread" value={embi} setValue={setEmbi} min={0} max={100} step={1} unit="P" />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-white/5">
              <div className="text-sm text-text-muted">Régimen detectado</div>
              <div className={`inline-block px-3 py-1 rounded-lg text-sm font-bold border mt-1 ${regimeColor}`}>
                {regime}
              </div>
            </div>
          </div>

          {/* WoC */}
          <div className="p-5 rounded-xl border border-white/10 bg-bg-card">
            <h4 className="text-sm font-semibold text-text-primary mb-4">Wisdom of the Crowd (z-scores)</h4>
            <div className="space-y-4">
              <InputNumber label="Smart consensus z" value={smartZ} setValue={setSmartZ} min={-3} max={3} step={0.1} />
              <InputNumber label="Retail extremo z" value={retailZ} setValue={setRetailZ} min={-3} max={3} step={0.1} />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-white/5">
              <div className="text-sm text-text-muted">WoC Score (w_smart=0.7, w_retail=0.3)</div>
              <div className={`text-lg font-bold font-mono ${
                wocScore > 0 ? 'text-accent-emerald' : wocScore < 0 ? 'text-accent-rose' : 'text-text-muted'
              }`}>
                {wocScore.toFixed(2)}
              </div>
            </div>
          </div>

          {/* USD Bias */}
          <div className="p-5 rounded-xl border border-white/10 bg-bg-card">
            <h4 className="text-sm font-semibold text-text-primary mb-4">USD Bias</h4>
            <div className="space-y-4">
              <InputNumber label="DXY Spot" value={dxy} setValue={setDxy} min={80} max={120} step={0.1} />
              <InputNumber label="DXY 200dma" value={dxy200dma} setValue={setDxy200dma} min={80} max={120} step={0.1} />
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-secondary border border-white/5">
                <span className="text-sm text-text-muted">DXY tendencia</span>
                <button
                  onClick={() => setDxyRising(!dxyRising)}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-colors ${
                    dxyRising
                      ? 'bg-accent-emerald/20 text-accent-emerald'
                      : 'bg-accent-rose/20 text-accent-rose'
                  }`}
                >
                  {dxyRising ? 'Rising' : 'Falling'}
                </button>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-white/5">
              <div className="text-sm text-text-muted">USD Bias</div>
              <div className={`text-lg font-bold ${
                usdBias === 'Bullish' ? 'text-accent-emerald' : usdBias === 'Bearish' ? 'text-accent-rose' : 'text-text-muted'
              }`}>
                {usdBias}
              </div>
            </div>
          </div>

          {/* Inflación */}
          <div className="p-5 rounded-xl border border-white/10 bg-bg-card">
            <h4 className="text-sm font-semibold text-text-primary mb-4">Inflación Global</h4>
            <div className="space-y-4">
              <InputNumber label="CPI G7 mediana YoY" value={cpiG7} setValue={setCpiG7} min={0} max={10} step={0.1} unit="%" />
              <InputNumber label="Breakevens 5Y5Y G7" value={breakevens5y5y} setValue={setBreakevens5y5y} min={0} max={5} step={0.1} unit="%" />
            </div>
            <div className="mt-4 p-3 rounded-lg bg-bg-secondary border border-white/5">
              <div className="text-sm text-text-muted">Régimen inflación</div>
              <div className={`text-lg font-bold ${
                inflationRegime === 'Inflacionario' ? 'text-accent-rose' : inflationRegime === 'Desinflacionario' ? 'text-accent-blue' : 'text-text-muted'
              }`}>
                {inflationRegime}
              </div>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="xl:sticky xl:top-24 xl:self-start">
          <motion.div
            className="p-6 rounded-xl border border-accent-violet/20 bg-accent-violet/5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h4 className="text-sm font-semibold text-accent-violet mb-4 uppercase tracking-wider">
              WorldView State Vector
            </h4>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-white/10">
                <span className="text-sm text-text-secondary">Régimen riesgo</span>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${regimeColor}`}>
                  {regime}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-white/10">
                <span className="text-sm text-text-secondary">Momentum global</span>
                <span className={`font-mono font-bold ${
                  scoreCrecimiento > 0.5 ? 'text-accent-emerald' : scoreCrecimiento < -0.5 ? 'text-accent-rose' : 'text-text-muted'
                }`}>
                  {scoreCrecimiento.toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-white/10">
                <span className="text-sm text-text-secondary">WoC consenso</span>
                <span className={`font-mono font-bold ${
                  wocScore > 0 ? 'text-accent-emerald' : wocScore < 0 ? 'text-accent-rose' : 'text-text-muted'
                }`}>
                  {wocScore.toFixed(2)}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-white/10">
                <span className="text-sm text-text-secondary">USD bias</span>
                <span className={`text-sm font-bold ${
                  usdBias === 'Bullish' ? 'text-accent-emerald' : usdBias === 'Bearish' ? 'text-accent-rose' : 'text-text-muted'
                }`}>
                  {usdBias}
                </span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-bg-card border border-white/10">
                <span className="text-sm text-text-secondary">Régimen inflación</span>
                <span className={`text-sm font-bold ${
                  inflationRegime === 'Inflacionario' ? 'text-accent-rose' : inflationRegime === 'Desinflacionario' ? 'text-accent-blue' : 'text-text-muted'
                }`}>
                  {inflationRegime}
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-accent-violet/20">
              <h5 className="text-sm font-semibold text-accent-violet mb-2">Trades favorecidos</h5>
              <div className="text-sm text-text-secondary">
                {regime === 'Risk-ON' && scoreCrecimiento > 0.5 && usdBias === 'Bearish' && inflationRegime === 'Inflacionario' && (
                  <span className="text-accent-emerald">Long pro-cíclicas vs USD, long EM vs USD</span>
                )}
                {regime === 'Risk-ON' && scoreCrecimiento > 0.5 && usdBias === 'Bullish' && inflationRegime === 'Inflacionario' && (
                  <span className="text-accent-emerald">Long commodity currencies (AUD, CAD, NOK), evitar pares vs USD</span>
                )}
                {regime === 'Risk-OFF' && scoreCrecimiento < -0.5 && usdBias === 'Bullish' && inflationRegime === 'Inflacionario' && (
                  <span className="text-accent-rose">Long USD vs todo. Short EM. Short pro-cíclicas</span>
                )}
                {regime === 'Risk-OFF' && scoreCrecimiento < -0.5 && usdBias === 'Neutral' && inflationRegime === 'Desinflacionario' && (
                  <span className="text-accent-emerald">Long JPY/CHF vs pro-cíclicas</span>
                )}
                {regime === 'Mixto' && (
                  <span className="text-text-muted">Trades fundamentales sin filtro régimen</span>
                )}
                {!((regime === 'Risk-ON' && scoreCrecimiento > 0.5 && (usdBias === 'Bearish' || usdBias === 'Bullish') && inflationRegime === 'Inflacionario') ||
                   (regime === 'Risk-OFF' && scoreCrecimiento < -0.5 && (usdBias === 'Bullish' || usdBias === 'Neutral') && (inflationRegime === 'Inflacionario' || inflationRegime === 'Desinflacionario')) ||
                   regime === 'Mixto') && (
                  <span className="text-text-muted">Configuración no estándar — evaluar caso por caso</span>
                )}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-bg-card border border-accent-rose/20">
              <h5 className="text-sm font-semibold text-accent-rose mb-1">¿Vetar trades?</h5>
              <div className="text-sm text-text-secondary">
                {regime === 'Risk-OFF' && (
                  <div className="text-accent-rose">⚠️ Risk-OFF activo: vetar trades pro-cíclicas vs refugios</div>
                )}
                {usdBias === 'Bullish' && dxy > 105 && (
                  <div className="text-accent-rose">⚠️ USD muy fuerte: vetar shorts USD</div>
                )}
                {regime === 'Risk-ON' && (
                  <div className="text-accent-emerald">✓ Régimen favorable para pro-cíclicas</div>
                )}
                {regime !== 'Risk-OFF' && !(usdBias === 'Bullish' && dxy > 105) && (
                  <div className="text-text-muted">Sin vetos de régimen extremo</div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}





