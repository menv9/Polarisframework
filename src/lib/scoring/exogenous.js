import { computeRollingZScore } from './zScore'
import { deriveFeatureStore } from './features'

export const EXO_CCYS = ['AUD', 'CAD', 'NOK', 'NZD', 'JPY', 'CHF', 'USD', 'EUR', 'GBP', 'SEK']

export const EXO_WEIGHTS = {
  USD: 0.25,
  EUR: 0.35,
  JPY: 0.50,
  GBP: 0.40,
  CHF: 0.55,
  CAD: 0.50,
  AUD: 0.60,
  NZD: 0.55,
  SEK: 0.50,
  NOK: 0.55,
}

export const EXO_SECTIONS = [
  {
    id: 'commodities',
    label: 'Commodities',
    color: 'text-[#f59e0b]',
    items: [
      { id: 'exo_brent',  label: 'Brent Crude',       unit: '$/bbl', weight: 3, impact: 'CAD, NOK',      bullCcy: ['CAD', 'NOK'],       bearCcy: [] },
      { id: 'exo_wti',    label: 'WTI Crude',         unit: '$/bbl', weight: 2, impact: 'CAD',           bullCcy: ['CAD'],              bearCcy: [] },
      { id: 'exo_iron',   label: 'Iron Ore 62%',      unit: '$/t',   weight: 2, impact: 'AUD',           bullCcy: ['AUD'],              bearCcy: [] },
      { id: 'exo_copper', label: 'Copper',            unit: '$/lb',  weight: 2, impact: 'AUD, NZD',      bullCcy: ['AUD', 'NZD'],       bearCcy: [] },
      { id: 'exo_gold',   label: 'Gold',              unit: '$/oz',  weight: 2, impact: 'JPY, CHF (RO)', bullCcy: ['CHF', 'JPY'],       bearCcy: [] },
      { id: 'exo_gdt',    label: 'GDT Dairy',         unit: 'index', weight: 1, impact: 'NZD',           bullCcy: ['NZD'],              bearCcy: [] },
      { id: 'exo_coal',   label: 'Coal',              unit: '$/t',   weight: 1, impact: 'AUD, NZD',      bullCcy: ['AUD', 'NZD'],       bearCcy: [] },
      { id: 'exo_grains', label: 'Grains',            unit: 'index', weight: 1, impact: 'AUD, NZD, CAD', bullCcy: ['AUD', 'NZD', 'CAD'], bearCcy: [] },
    ],
  },
  {
    id: 'china',
    label: 'China / Global Growth',
    color: 'text-[#ef4444]',
    items: [
      { id: 'exo_chn_pmi',      label: 'China NBS PMI Mfg',    unit: 'pts',  weight: 3, impact: 'AUD, NZD',    bullCcy: ['AUD', 'NZD'], bearCcy: [] },
      { id: 'exo_chn_caixin',   label: 'China Caixin PMI Mfg', unit: 'pts',  weight: 2, impact: 'AUD, NZD',    bullCcy: ['AUD', 'NZD'], bearCcy: [] },
      { id: 'exo_chn_credit',   label: 'China Credit Impulse', unit: '%YoY', weight: 2, impact: 'AUD (6m lag)', bullCcy: ['AUD'],        bearCcy: [] },
      { id: 'exo_eur_pmi_comp', label: 'Eurozone PMI Comp',    unit: 'pts',  weight: 2, impact: 'EUR, SEK',    bullCcy: ['EUR', 'SEK'], bearCcy: [] },
      { id: 'exo_global_pmi',   label: 'Global PMI Mfg',       unit: 'pts',  weight: 2, impact: 'Risk global', bullCcy: [],             bearCcy: [] },
    ],
  },
  {
    id: 'rates',
    label: 'US Rates',
    color: 'text-[#60a5fa]',
    items: [
      { id: 'exo_us10y',   label: 'US 10Y Treasury',  unit: '%', weight: 3, impact: 'JPY-, EM-',  bullCcy: ['USD'], bearCcy: ['JPY'] },
      { id: 'exo_us_real', label: 'US 10Y TIPS Real', unit: '%', weight: 2, impact: 'USD, Gold-', bullCcy: ['USD'], bearCcy: [] },
      { id: 'exo_us_2y',   label: 'US 2Y Treasury',   unit: '%', weight: 2, impact: 'USD carry',  bullCcy: ['USD'], bearCcy: [] },
    ],
  },
  {
    id: 'risk',
    label: 'Risk Global',
    color: 'text-[#ef4444]',
    items: [
      { id: 'exo_vix',  label: 'VIX',         unit: 'pts', weight: 3, impact: 'Risk-OFF -> JPY/CHF+', bullCcy: ['JPY', 'CHF', 'USD'], bearCcy: ['AUD', 'NZD', 'CAD', 'NOK'] },
      { id: 'exo_embi', label: 'EM Corp OAS', unit: 'bps', weight: 2, impact: 'EM stress',            bullCcy: ['USD'],               bearCcy: ['AUD', 'NZD', 'SEK'] },
    ],
  },
  {
    id: 'fx',
    label: 'FX Referencia',
    color: 'text-[#a3a3a3]',
    items: [
      { id: 'exo_eurusd', label: 'EUR/USD', unit: 'spot', weight: 0, impact: 'SEK, CHF beta',  bullCcy: [], bearCcy: [] },
      { id: 'exo_usdjpy', label: 'USD/JPY', unit: 'spot', weight: 0, impact: 'EM carry proxy', bullCcy: [], bearCcy: [] },
      { id: 'exo_gbpusd', label: 'GBP/USD', unit: 'spot', weight: 0, impact: 'UK cross ref',   bullCcy: [], bearCcy: [] },
    ],
  },
]

export function getAllExogenousItems() {
  return EXO_SECTIONS.flatMap(section => section.items)
}

export function computeExogenousCurrencyScore(ccy, items, featureValues, history) {
  let num = 0
  let den = 0
  for (const item of items) {
    if (item.weight === 0) continue
    const bullDir = item.bullCcy.includes(ccy) ? 1 : 0
    const bearDir = item.bearCcy.includes(ccy) ? 1 : 0
    if (bullDir === 0 && bearDir === 0) continue
    if (!Number.isFinite(featureValues[item.id])) continue
    const dir = bullDir ? 1 : -1
    const hist = history?.[item.id]
    const mag = hist?.series?.length >= 3
      ? computeRollingZScore(hist.series, { key: item.id }).z * dir
      : dir
    num += item.weight * mag
    den += item.weight
  }
  return den > 0 ? num / den : 0
}

export function computeExogenousCurrencyScores(dataSources, history, items = getAllExogenousItems()) {
  const featureValues = deriveFeatureStore(dataSources, history).valuesBySourceId
  return Object.fromEntries(
    EXO_CCYS.map(ccy => [ccy, computeExogenousCurrencyScore(ccy, items, featureValues, history)])
  )
}

export function combineEndogenousExogenous(endoScore, exoScore, ccy) {
  const weight = EXO_WEIGHTS[ccy] ?? 0
  return (1 - weight) * endoScore + weight * exoScore
}
