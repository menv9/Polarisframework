// Timing pipeline: 5 checks → READY / WAIT / ABORT
// Based on: Documentation/03_CAPA_1_FX_Macro/FX_Timing_Module/06_6._Pipeline_de_Timing.md

export const TIMING_CHECKS = [
  {
    id: 'signal_valid',
    label: 'Señal FX vigente',
    description: '|Señal| ≥ 1.0σ, horizonte identificado, convicción ≥ media',
    required: true,
  },
  {
    id: 'mtf_alignment',
    label: 'Multi-timeframe alignment',
    description: 'Tendencia del filtro (semanal o mensual) compatible con la dirección de la señal',
    required: true,
  },
  {
    id: 'cftc_clean',
    label: 'CFTC no crowded',
    description: 'z_LF no en extremo contrario a la señal (z < +2 si long, z > -2 si short)',
    required: false,
  },
  {
    id: 'market_structure',
    label: 'Estructura de mercado intacta',
    description: 'Sin Change of Structure (CoS) reciente contra la tesis; estructura en la dirección correcta',
    required: false,
  },
  {
    id: 'technical_setup',
    label: 'Setup técnico de entry',
    description: 'Setup A+: pullback a 50/100dma + RSI, ruptura + retest, pin bar/engulfing ≥2 confluencias, o divergencia',
    required: false,
  },
  {
    id: 'no_event_blackout',
    label: 'Sin evento Nivel 1 en 48h',
    description: 'No hay NFP, CPI, FOMC, ni evento de alto impacto en las próximas 48 horas',
    required: false,
  },
  {
    id: 'confluence',
    label: 'Confluencia ≥ 2 factores en entry',
    description: 'El nivel de entrada tiene al menos 2 confluencias técnicas (MA, nivel, pivote, RSI extremo...)',
    required: false,
  },
  {
    id: 'stop_defined',
    label: 'Stop técnico definido',
    description: 'Nivel de stop claro, más restrictivo que el stop ATR si existe nivel técnico obvio',
    required: false,
  },
  {
    id: 'adx_coherent',
    label: 'ADX coherente con tipo de trade',
    description: 'ADX > 25 si trade momentum; ADX < 25 si mean-reversion',
    required: false,
  },
  {
    id: 'rsi_not_extreme',
    label: 'RSI no en extremo opuesto',
    description: 'RSI no está sobrecomprado/sobrevendido en la dirección contraria al trade',
    required: false,
  },
  {
    id: 'correct_timeframe',
    label: 'Setup en timeframe correcto',
    description: 'No usar chart diario para señal de horizonte largo; ajustar TF al horizonte del trade',
    required: false,
  },
]

// Returns { verdict: 'READY'|'WAIT'|'ABORT', failing, score }
//
// ABORT:  any required check explicitly marked false
// WAIT:   any required check not yet marked true (pending), OR 2+ optional checks marked false
// READY:  all required checks explicitly true AND ≤1 optional check false
export function computeTimingVerdict(checks) {
  const requiredAbort    = TIMING_CHECKS.filter(c => c.required  && checks[c.id] === false)
  const requiredPending  = TIMING_CHECKS.filter(c => c.required  && checks[c.id] !== true)
  const optionalFailing  = TIMING_CHECKS.filter(c => !c.required && checks[c.id] === false)

  if (requiredAbort.length > 0)   return { verdict: 'ABORT', failing: requiredAbort.length + optionalFailing.length, score: 0 }
  if (requiredPending.length > 0) return { verdict: 'WAIT',  failing: requiredPending.length, score: 0 }
  if (optionalFailing.length >= 2) return { verdict: 'WAIT', failing: optionalFailing.length, score: 0 }

  const passed = TIMING_CHECKS.filter(c => checks[c.id] === true).length
  const score = Math.round((passed / TIMING_CHECKS.length) * 100)
  return { verdict: 'READY', failing: optionalFailing.length, score }
}
