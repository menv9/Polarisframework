// Todos los indicadores del modelo Endogenous v2 — §15.2 documentación
// Suma total de betas (todos 24): 1.00
// Suma de betas implementados (15): 0.76

export const ALL_INDICATORS = [
  { num:  1, key: 'pmi',          label: 'ISM Manufacturing',          betaDoc: 0.04, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num:  2, key: 'nmi',          label: 'NMI Services',               betaDoc: 0.03, sign:  1, horizon: 'MEDIUM', implemented: false },
  { num:  3, key: 'umcsi',        label: 'UMCSI Consumer Sentiment',   betaDoc: 0.02, sign:  1, horizon: 'LONG',   implemented: true  },
  { num:  4, key: 'permits',      label: 'Building Permits YoY',       betaDoc: 0.02, sign:  1, horizon: 'LONG',   implemented: false },
  { num:  5, key: 'm2',           label: 'M2 YoY',                     betaDoc: 0.03, sign: -1, horizon: 'MEDIUM', implemented: false },
  { num:  6, key: 'policy',       label: 'Tipo Nominal Banco Central', betaDoc: 0.05, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num:  7, key: 'cpi',          label: 'CPI YoY',                    betaDoc: 0.04, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num:  8, key: 'core_cpi',     label: 'Core CPI YoY',               betaDoc: 0.05, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num:  9, key: 'ppi',          label: 'PPI All YoY',                betaDoc: 0.02, sign:  1, horizon: 'MEDIUM', implemented: false },
  { num: 10, key: 'core_ppi',     label: 'Core PPI YoY',               betaDoc: 0.02, sign:  1, horizon: 'MEDIUM', implemented: false },
  { num: 11, key: 'nfp',          label: 'NFP / Empleo YoY',           betaDoc: 0.04, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num: 12, key: 'debt',         label: 'Govt Debt/GDP',              betaDoc: 0.03, sign: -1, horizon: 'LONG',   implemented: true  },
  { num: 13, key: 'fiscal',       label: 'Govt Surplus/Deficit %GDP',  betaDoc: 0.03, sign:  1, horizon: 'LONG',   implemented: false },
  { num: 14, key: 'interest_gdp', label: 'Interest/GDP',               betaDoc: 0.02, sign: -1, horizon: 'LONG',   implemented: false },
  { num: 15, key: 'liquidity',    label: 'Liquidity Cover',            betaDoc: 0.02, sign:  1, horizon: 'LONG',   implemented: false },
  { num: 16, key: '10y_real',     label: '10Y Yield Real (TIPS)',      betaDoc: 0.06, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num: 17, key: 'cb_balance',   label: 'CB Balance/GDP YoY',         betaDoc: 0.04, sign: -1, horizon: 'LONG',   implemented: true  },
  { num: 18, key: 'real_2y',      label: 'Diferencial Tipos Reales 2Y',betaDoc: 0.14, sign:  1, horizon: 'MEDIUM', implemented: true  },
  { num: 19, key: 'ca_gdp',       label: 'Cuenta Corriente %GDP',      betaDoc: 0.07, sign:  1, horizon: 'LONG',   implemented: true  },
  { num: 20, key: 'niip',         label: 'NIIP %GDP',                  betaDoc: 0.05, sign:  1, horizon: 'LONG',   implemented: true  },
  { num: 21, key: 'tot',          label: 'Términos de Intercambio YoY',betaDoc: 0.06, sign:  1, horizon: 'LONG',   implemented: true  },
  { num: 22, key: 'breakevens',   label: 'Breakevens 5Y5Y',            betaDoc: 0.05, sign:  1, horizon: 'MEDIUM', implemented: false },
  { num: 23, key: 'cftc',         label: 'CFTC Posicionamiento',       betaDoc: 0.04, sign:  1, horizon: 'SHORT',  implemented: true  },
  { num: 24, key: 'reer',         label: 'REER Desviación 10Y',        betaDoc: 0.03, sign: -1, horizon: 'LONG',   implemented: true  },
]

// Solo los 15 implementados — los que tienen datos en dataSources
export const INDICATORS = ALL_INDICATORS.filter(i => i.implemented)

export const STORAGE_KEY_BETAS = 'polaris_endogenous_betas'

export const DEFAULT_BETAS = Object.fromEntries(
  ALL_INDICATORS.map(i => [i.key, i.betaDoc])
)

export function loadBetas() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_BETAS)
    if (saved) return { ...DEFAULT_BETAS, ...JSON.parse(saved) }
  } catch { /* ignore */ }
  return { ...DEFAULT_BETAS }
}

export function saveBetas(betas) {
  try {
    localStorage.setItem(STORAGE_KEY_BETAS, JSON.stringify(betas))
  } catch { /* ignore */ }
}

// Suma de betas para los indicadores implementados (normalización interna)
export function computeBetaTotal(betas) {
  return INDICATORS.reduce((s, ind) => s + (betas[ind.key] ?? ind.betaDoc), 0)
}
