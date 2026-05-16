export const CAPITAL_ALLOCATION_STORAGE_KEY = 'polaris_capital_allocation_inputs'

export const DEFAULT_CAPITAL_ALLOCATION = {
  totalCapital: 100000,
  monthsLive: 6,
  closedTrades: 20,
  sharpe6m: 0.4,
  sharpe12m: 0.5,
  profitFactor: 1.3,
  maxDrawdownPct: 8,
  hitRate6m: 48,
  realizedIc6m: 0.04,
  implementationErrors: 0,
  discretionaryOverrides6m: 0,
  costsVsEstimatePct: 110,
  slippageOk: true,
  layer2Ready: false,
  layer3Ready: false,
}

export const RAMP_STAGES = [
  {
    id: 'STAGE_1',
    label: 'Tramo 1',
    desc: 'Validacion inicial',
    activePct: 20,
    riskPct: 0.5,
    cashPct: 80,
    minMonths: 0,
  },
  {
    id: 'STAGE_2',
    label: 'Tramo 2',
    desc: 'Validacion estadistica',
    activePct: 50,
    riskPct: 0.75,
    cashPct: 50,
    minMonths: 6,
  },
  {
    id: 'STAGE_3',
    label: 'Tramo 3',
    desc: 'Operativa plena',
    activePct: 100,
    riskPct: 1,
    cashPct: 0,
    minMonths: 12,
  },
]

function num(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function evaluateRampStage(input) {
  const m = { ...DEFAULT_CAPITAL_ALLOCATION, ...input }
  const blockers = []

  if (num(m.implementationErrors) > 0) blockers.push('errores de implementacion pendientes')
  if (num(m.discretionaryOverrides6m) >= 3) blockers.push('3+ overrides discrecionales en 6m')
  if (num(m.maxDrawdownPct) > 15) blockers.push('DD > 15% sobre capital activo')
  if (num(m.sharpe6m) < 0) blockers.push('Sharpe 6m negativo')
  if (num(m.realizedIc6m) < 0) blockers.push('IC realizado 6m negativo')
  if (num(m.costsVsEstimatePct) > 130) blockers.push('costes reales > 130% del estimado')
  if (!m.slippageOk) blockers.push('slippage fuera de banda')

  const canStage2 = blockers.length === 0
    && num(m.monthsLive) >= 6
    && num(m.closedTrades) >= 15
    && num(m.sharpe6m) >= 0.4
    && num(m.profitFactor) >= 1.3

  const canStage3 = canStage2
    && num(m.monthsLive) >= 12
    && num(m.sharpe12m) >= 0.5
    && num(m.maxDrawdownPct) <= 15

  let stage = RAMP_STAGES[0]
  if (canStage3) stage = RAMP_STAGES[2]
  else if (canStage2) stage = RAMP_STAGES[1]

  const regression = []
  if (num(m.maxDrawdownPct) > 20) regression.push('bajar un tramo: DD > 20%')
  if (num(m.sharpe12m) < 0.3 && num(m.monthsLive) >= 12) regression.push('bajar un tramo: Sharpe 12m < 0.3')
  if (num(m.hitRate6m) < 40) regression.push('bajar un tramo: hit rate 6m < 40%')

  return {
    stage,
    blockers,
    regression,
    canAddCapital: blockers.length === 0 && regression.length === 0 && (canStage2 || canStage3),
    activeCapital: num(m.totalCapital) * stage.activePct / 100,
    reserveCapital: num(m.totalCapital) * stage.cashPct / 100,
  }
}

export function computeLayerAllocation(input) {
  const ramp = evaluateRampStage(input)
  const m = { ...DEFAULT_CAPITAL_ALLOCATION, ...input }
  const active = ramp.activeCapital

  const layer2Allowed = ramp.stage.id === 'STAGE_3'
    && num(m.monthsLive) >= 12
    && num(m.sharpe12m) >= 0.5
    && num(m.discretionaryOverrides6m) === 0
    && Boolean(m.layer2Ready)

  const layer3Allowed = layer2Allowed
    && num(m.monthsLive) >= 18
    && num(m.sharpe12m) >= 0.7
    && Boolean(m.layer3Ready)

  const weights = layer3Allowed
    ? { layer1: 70, layer2: 20, layer3: 10 }
    : layer2Allowed
      ? { layer1: 85, layer2: 15, layer3: 0 }
      : { layer1: 100, layer2: 0, layer3: 0 }

  return {
    ramp,
    weights,
    layer2Allowed,
    layer3Allowed,
    rows: [
      { id: 'layer1', label: 'Capa 1 FX Macro G10', weight: weights.layer1, capital: active * weights.layer1 / 100, status: 'ACTIVA' },
      { id: 'layer2', label: 'Capa 2 FX Trend', weight: weights.layer2, capital: active * weights.layer2 / 100, status: layer2Allowed ? 'ACTIVA REDUCIDA' : 'BLOQUEADA' },
      { id: 'layer3', label: 'Capa 3 Equities Macro', weight: weights.layer3, capital: active * weights.layer3 / 100, status: layer3Allowed ? 'ACTIVA PILOTO' : 'BLOQUEADA' },
      { id: 'reserve', label: 'Reserva tactica / T-bills', weight: null, capital: ramp.reserveCapital, status: ramp.reserveCapital > 0 ? 'RESERVA' : 'SIN RESERVA' },
    ],
  }
}
