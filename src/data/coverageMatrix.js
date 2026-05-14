import { dataSources } from './dataSources'

export const coverageCountries = [
  { code: 'usa', label: 'USA' },
  { code: 'eur', label: 'EUR' },
  { code: 'jpn', label: 'JPY' },
  { code: 'gbr', label: 'GBP' },
  { code: 'che', label: 'CHF' },
  { code: 'can', label: 'CAD' },
  { code: 'aus', label: 'AUD' },
  { code: 'nzl', label: 'NZD' },
  { code: 'swe', label: 'SEK' },
  { code: 'nor', label: 'NOK' },
]

const MVP = 'MVP'
const RECOMMENDED = 'RECOMMENDED'
const FULL = 'FULL'

export const canonicalVariables = [
  {
    key: 'pmi_manufacturing',
    docNo: 1,
    beta: 0.04,
    horizon: 'MEDIO',
    priority: MVP,
    label: 'ISM / PMI Manufacturing',
    category: 'LEAD IND',
    comparable: 'limited',
    transform: 'level -> z-score',
    description: 'Docs #1. USA usa ISM; no-USA suele requerir PMI privado o proxy.',
    sourceIds: mapCountryIds('pmi'),
  },
  {
    key: 'pmi_services',
    docNo: 2,
    beta: 0.03,
    horizon: 'MEDIO',
    priority: RECOMMENDED,
    label: 'NMI / PMI Services',
    category: 'LEAD IND',
    comparable: 'limited',
    transform: 'level -> z-score',
    description: 'Docs #2. Complementa manufacturas; faltan filas dedicadas en Data.',
    sourceIds: mapCountryIds('pmi_services'),
  },
  {
    key: 'consumer_sentiment',
    docNo: 3,
    beta: 0.02,
    horizon: 'MEDIO',
    priority: FULL,
    label: 'Consumer Sentiment',
    category: 'LEAD IND',
    comparable: 'within-country',
    transform: 'z-score',
    description: 'Docs #3. Auxiliar y dependiente de regimen; comparar contra su propia historia.',
    sourceIds: mapCountryIds('umcsi'),
  },
  {
    key: 'building_permits',
    docNo: 4,
    beta: 0.02,
    horizon: 'MEDIO',
    priority: FULL,
    label: 'Building Permits YoY',
    category: 'LEAD IND',
    comparable: 'limited',
    transform: 'YoY -> z-score',
    description: 'Docs #4. Adelantado de construccion; faltan filas dedicadas en Data.',
    sourceIds: mapCountryIds('permits'),
  },
  {
    key: 'money_growth',
    docNo: 5,
    beta: 0.03,
    horizon: 'MEDIO-LARGO',
    priority: RECOMMENDED,
    label: 'M2 / Money Growth YoY',
    category: 'MONEY',
    comparable: 'limited',
    transform: 'YoY -> z-score',
    description: 'Docs #5. Usar agregado monetario local; no comparar niveles brutos.',
    sourceIds: mapCountryIds('m2'),
  },
  {
    key: 'policy_rate',
    docNo: 6,
    beta: 0.05,
    horizon: 'MEDIO',
    priority: MVP,
    label: 'Central Bank Policy Rate',
    category: 'RATES',
    comparable: 'cross-country',
    transform: 'level/change',
    description: 'Docs #6. Tipo oficial nominal o equivalente operativo.',
    sourceIds: mapCountryIds('policy'),
  },
  {
    key: 'headline_cpi',
    docNo: 7,
    beta: 0.04,
    horizon: 'MEDIO',
    priority: MVP,
    label: 'CPI YoY',
    category: 'INFLATION',
    comparable: 'cross-country',
    transform: 'YoY',
    description: 'Docs #7. Inflacion general, comparable si todo esta en YoY.',
    sourceIds: mapCountryIds('cpi'),
  },
  {
    key: 'core_cpi',
    docNo: 8,
    beta: 0.05,
    horizon: 'MEDIO',
    priority: MVP,
    label: 'Core CPI YoY',
    category: 'INFLATION',
    comparable: 'limited',
    transform: 'YoY',
    description: 'Docs #8. La definicion de core cambia por pais; normalizar con cautela.',
    sourceIds: mapCountryIds('core_cpi'),
  },
  {
    key: 'ppi_all',
    docNo: 9,
    beta: 0.02,
    horizon: 'MEDIO',
    priority: FULL,
    label: 'PPI All YoY',
    category: 'INFLATION',
    comparable: 'limited',
    transform: 'YoY -> z-score',
    description: 'Docs #9. Presion de precios upstream; faltan filas dedicadas en Data.',
    sourceIds: mapCountryIds('ppi'),
  },
  {
    key: 'core_ppi',
    docNo: 10,
    beta: 0.02,
    horizon: 'MEDIO',
    priority: FULL,
    label: 'Core PPI YoY',
    category: 'INFLATION',
    comparable: 'limited',
    transform: 'YoY -> z-score',
    description: 'Docs #10. Variante core del PPI; faltan filas dedicadas en Data.',
    sourceIds: mapCountryIds('core_ppi'),
  },
  {
    key: 'employment',
    docNo: 11,
    beta: 0.04,
    horizon: 'MEDIO',
    priority: MVP,
    label: 'NFP / Employment YoY',
    category: 'EMPLOYMENT',
    comparable: 'limited',
    transform: 'YoY/z-score',
    description: 'Docs #11. USA usa NFP; el resto usa empleo/LFS equivalente.',
    sourceIds: mapCountryIds('empl', { usa: 'endo_usa_nfp' }),
  },
  {
    key: 'debt_gdp',
    docNo: 12,
    beta: 0.03,
    horizon: 'LARGO',
    priority: MVP,
    label: 'Govt Debt / GDP',
    category: 'SOVEREIGN',
    comparable: 'cross-country',
    transform: '% GDP / annual diff',
    description: 'Docs #12. Riesgo soberano estructural; transformacion anual antes del z-score.',
    sourceIds: mapCountryIds('debt'),
  },
  {
    key: 'fiscal_balance_gdp',
    docNo: 13,
    beta: 0.03,
    horizon: 'LARGO',
    priority: RECOMMENDED,
    label: 'Govt Fiscal Balance / GDP',
    category: 'SOVEREIGN',
    comparable: 'cross-country',
    transform: '% GDP',
    description: 'Docs #13. Saldo fiscal/deficit; faltan filas dedicadas en Data.',
    sourceIds: mapCountryIds('fiscal_balance'),
  },
  {
    key: 'interest_gdp',
    docNo: 14,
    beta: 0.02,
    horizon: 'LARGO',
    priority: FULL,
    label: 'Interest Payments / GDP',
    category: 'SOVEREIGN',
    comparable: 'cross-country',
    transform: '% GDP',
    description: 'Docs #14. Carga de intereses; indicador de backlog completo.',
    sourceIds: mapCountryIds('interest_gdp'),
  },
  {
    key: 'liquidity_cover',
    docNo: 15,
    beta: 0.02,
    horizon: 'LARGO',
    priority: FULL,
    label: 'Liquidity Cover',
    category: 'SOVEREIGN',
    comparable: 'limited',
    transform: 'ratio -> z-score',
    description: 'Docs #15. FX reserves / short-term debt; mas importante para EM que G10.',
    sourceIds: mapCountryIds('liquidity_cover'),
  },
  {
    key: 'real_rate_10y',
    docNo: 16,
    beta: 0.06,
    horizon: 'MEDIO',
    priority: MVP,
    label: '10Y Real Yield',
    category: 'SOVEREIGN',
    comparable: 'limited',
    transform: 'real yield/proxy',
    description: 'Docs #16. En varios paises es proxy nominal menos inflacion esperada.',
    sourceIds: mapCountryIds('10y_real'),
  },
  {
    key: 'cb_balance',
    docNo: 17,
    beta: 0.04,
    horizon: 'MEDIO-LARGO',
    priority: FULL,
    label: 'CB Balance / GDP YoY',
    category: 'SOVEREIGN',
    comparable: 'within-country',
    transform: '% GDP YoY/diff',
    description: 'Docs #17. No comparar balances brutos; usar %GDP o variacion anual.',
    sourceIds: mapCountryIds('cb_balance'),
  },
  {
    key: 'real_rate_2y',
    docNo: 18,
    beta: 0.14,
    horizon: 'MEDIO',
    priority: MVP,
    label: 'Real Rate 2Y',
    category: 'CARRY',
    comparable: 'cross-country',
    transform: 'rate/spread',
    description: 'Docs #18. Factor dominante; en pares se calcula como diferencial directo.',
    sourceIds: mapCountryIds('real_2y'),
  },
  {
    key: 'current_account_gdp',
    docNo: 19,
    beta: 0.07,
    horizon: 'LARGO',
    priority: MVP,
    label: 'Current Account / GDP',
    category: 'STRUCTURAL',
    comparable: 'cross-country',
    transform: '% GDP',
    description: 'Docs #19. Balance externo estructural, comparable en %GDP.',
    sourceIds: mapCountryIds('ca_gdp'),
  },
  {
    key: 'niip_gdp',
    docNo: 20,
    beta: 0.05,
    horizon: 'LARGO',
    priority: FULL,
    label: 'NIIP / GDP',
    category: 'STRUCTURAL',
    comparable: 'cross-country',
    transform: '% GDP / annual diff',
    description: 'Docs #20. Posicion externa neta; transformar diferencia anual antes del z-score.',
    sourceIds: mapCountryIds('niip'),
  },
  {
    key: 'terms_of_trade',
    docNo: 21,
    beta: 0.06,
    horizon: 'MEDIO-LARGO',
    priority: MVP,
    label: 'Terms of Trade YoY',
    category: 'STRUCTURAL',
    comparable: 'within-country',
    transform: 'YoY -> z-score',
    description: 'Docs #21. Mejor como mejora/deterioro interno que como nivel absoluto.',
    sourceIds: mapCountryIds('tot'),
  },
  {
    key: 'breakevens_5y5y',
    docNo: 22,
    beta: 0.05,
    horizon: 'MEDIO',
    priority: RECOMMENDED,
    label: 'Breakevens 5Y5Y',
    category: 'FORWARD',
    comparable: 'limited',
    transform: 'rate/proxy',
    description: 'Docs #22. Inflacion forward; solo USA/EUR tienen fuente limpia normalmente.',
    sourceIds: mapCountryIds('breakeven_5y5y'),
  },
  {
    key: 'positioning',
    docNo: 23,
    beta: 0.04,
    horizon: 'CORTO',
    priority: MVP,
    label: 'CFTC Positioning',
    category: 'SENTIMENT',
    comparable: 'within-country',
    transform: '%OI/z-score/percentile',
    description: 'Docs #23. Normalizar; contratos brutos no son comparables entre divisas.',
    sourceIds: mapCountryIds('cftc'),
  },
  {
    key: 'reer_valuation',
    docNo: 24,
    beta: 0.03,
    horizon: 'LARGO',
    priority: MVP,
    label: 'REER Deviation 10Y',
    category: 'VALUATION',
    comparable: 'cross-country',
    transform: 'dev vs 10Y mean',
    description: 'Docs #24. Mean reversion: desviacion contra media movil de 10 anos.',
    sourceIds: mapCountryIds('reer'),
  },
]

const sourceById = new Map(dataSources.map((source) => [source.id, source]))
const fitSeverity = {
  exact: 0,
  derived: 1,
  proxy: 2,
  manual: 3,
  pending: 4,
  missing: 5,
}

export const externalCoverageGroups = [
  {
    key: 'world_view',
    title: 'World View',
    docRef: 'FX_World_View_Module §§2-8',
    description: 'Inputs externos para regimen global, USD bias, inflacion global y wisdom of crowd.',
    rows: [
      externalRow('wv_risk_vix', 'VIX percentile 5Y', 'REGIMEN', 'World View §3', ['wv_vix'], 'percentile 5Y'),
      externalRow('wv_risk_hy', 'HY OAS percentile 5Y', 'REGIMEN', 'World View §3', ['wv_hy_oas'], 'percentile 5Y'),
      externalRow('wv_risk_sp500', 'S&P 500 vs 200dma', 'REGIMEN', 'World View §3', ['wv_sp500'], 'above/below 200dma'),
      externalRow('wv_risk_embi', 'EMBI / EM credit spread', 'REGIMEN', 'World View §3', ['wv_embi'], 'percentile 5Y'),
      externalRow('wv_risk_move', 'MOVE Index', 'REGIMEN+', 'World View §3.3', ['wv_move'], 'percentile 5Y'),
      externalRow('wv_risk_gold_sp', 'Gold vs S&P ratio', 'REGIMEN+', 'World View §3.3', ['wv_gold_sp'], 'trend/ratio'),
      externalRow('wv_gdp_core', 'GDP / nowcast core economies', 'GROWTH', 'World View §2/§8', ['wv_gdp_usa', 'wv_gdp_eur', 'wv_gdp_chn', 'wv_gdp_jpn'], 'weighted gap'),
      externalRow('wv_cesi', 'Economic Surprise Index', 'GROWTH', 'World View §8', ['wv_cesi'], 'z-score/3m'),
      externalRow('wv_cftc', 'CFTC Asset Managers', 'WOC', 'World View §4', ['wv_cftc'], 'z-score/percentile'),
      externalRow('wv_epfr', 'EPFR fund flows', 'WOC', 'World View §4/§8', ['wv_epfr'], 'flow z-score'),
      externalRow('wv_retail', 'Retail SSI sentiment', 'WOC', 'World View §4/§8', ['wv_retail'], 'contrarian'),
      externalRow('wv_dxy', 'DXY', 'USD BIAS', 'World View §5', ['wv_dxy'], 'level/trend'),
      externalRow('wv_dxy_200dma', 'DXY vs 200dma', 'USD BIAS', 'World View §5', ['wv_dxy_200dma'], 'above/below 200dma'),
      externalRow('wv_cpi_g7', 'CPI G7 median inputs', 'INFLATION', 'World View §6', ['wv_cpi_usa', 'wv_cpi_eur'], 'YoY median'),
      externalRow('wv_breakevens', '5Y5Y inflation expectations', 'INFLATION', 'World View §6', ['wv_breakevens'], 'level/trend'),
    ],
  },
  {
    key: 'exogenous',
    title: 'Exogenous',
    docRef: 'FX_Exogenous_Module §§2/5/8',
    description: 'Drivers externos por divisa: commodities, China, Eurozona, risk y tipos globales.',
    rows: [
      externalRow('exo_brent', 'Brent crude', 'COMMODITIES', 'Exogenous §5.1', ['exo_brent'], 'level/return'),
      externalRow('exo_wti', 'WTI crude', 'COMMODITIES', 'Exogenous §5.1', ['exo_wti'], 'level/return'),
      externalRow('exo_iron', 'Iron ore 62% Fe China', 'COMMODITIES', 'Exogenous §5.1', ['exo_iron'], 'level/return'),
      externalRow('exo_copper', 'Copper', 'COMMODITIES', 'Exogenous §5.1', ['exo_copper'], 'level/return'),
      externalRow('exo_gold', 'Gold', 'COMMODITIES', 'Exogenous §5.1', ['exo_gold'], 'level/return'),
      externalRow('exo_coal', 'Coal thermal/coking', 'COMMODITIES', 'Exogenous §5.1', ['exo_coal'], 'level/return'),
      externalRow('exo_grains', 'Soy/corn/wheat', 'COMMODITIES', 'Exogenous §5.1', ['exo_grains'], 'level/return'),
      externalRow('exo_gdt', 'Global Dairy Trade', 'COMMODITIES', 'Exogenous §5.1/§2.8', ['exo_gdt'], 'auction change'),
      externalRow('exo_china_pmi', 'China PMI NBS', 'CHINA', 'Exogenous §5.2/§2.7', ['exo_chn_pmi'], 'level/z-score'),
      externalRow('exo_china_caixin', 'China PMI Caixin', 'CHINA', 'Exogenous §5.2/§2.7', ['exo_chn_caixin'], 'level/z-score'),
      externalRow('exo_china_credit', 'China credit impulse', 'CHINA', 'Exogenous §5.2/§2.7', ['exo_chn_credit'], '6-9m lead'),
      externalRow('exo_eurozone_pmi', 'Eurozone PMI Composite', 'EUROZONE', 'Exogenous §5.2/§2.9', ['exo_eur_pmi_comp'], 'level/z-score'),
      externalRow('exo_global_pmi', 'Global PMI', 'GLOBAL', 'Exogenous §5.2', ['exo_global_pmi'], 'level/z-score'),
      externalRow('exo_us_rates', 'US 10Y / US 2Y / US real rate', 'RATES', 'Exogenous §5.3', ['exo_us10y', 'exo_us_2y', 'exo_us_real'], 'level/change'),
      externalRow('exo_cross_fx', 'Key cross FX spot', 'FX', 'Exogenous §2', ['exo_eurusd', 'exo_usdjpy', 'exo_gbpusd'], 'return/trend'),
      externalRow('exo_dxy', 'DXY general', 'FX', 'Exogenous §2', ['wv_dxy'], 'level/trend'),
      externalRow('exo_embi', 'EMBI / EM spread', 'RISK', 'Exogenous §5.2', ['exo_embi'], 'spread/percentile'),
      externalRow('exo_move', 'MOVE Index', 'RISK', 'Exogenous §5.2', ['wv_move'], 'percentile'),
    ],
  },
  {
    key: 'timing_risk',
    title: 'Timing + Risk',
    docRef: 'FX_Timing_Module §§2-6 + FX_Risk_Management_Module §§2/5',
    description: 'Datos externos de mercado necesarios para entradas, volatilidad, correlaciones y blackouts.',
    rows: [
      externalRow('timing_fx_ohlc', 'FX spot OHLC G10 pairs', 'PRICE', 'Timing §3', ['exo_eurusd', 'exo_usdjpy', 'exo_gbpusd'], 'OHLC -> MA/RSI/MACD'),
      externalRow('timing_cftc', 'CFTC positioning for timing', 'POSITIONING', 'Timing §2/§6', ['wv_cftc'], 'crowding z-score'),
      externalRow('timing_calendar', 'Level 1 event calendar', 'EVENTS', 'Timing §5', ['timing_event_calendar'], '48h blackout'),
      externalRow('risk_realized_vol', 'Realized vol 21d', 'VOL', 'Risk §2.1', ['exo_eurusd', 'exo_usdjpy', 'exo_gbpusd'], 'returns -> annual vol'),
      externalRow('risk_atr', 'ATR 14d', 'VOL', 'Risk §2.1', ['exo_eurusd', 'exo_usdjpy', 'exo_gbpusd'], 'OHLC -> ATR'),
      externalRow('risk_implied_vol', 'FX options 1M ATM IV', 'VOL', 'Risk §2.1/§2.3', ['risk_fx_iv_1m'], 'IV/RV ratio'),
      externalRow('risk_correlations', 'FX correlation matrix 1Y', 'PORTFOLIO', 'Risk §5.3/§5.4', ['exo_eurusd', 'exo_usdjpy', 'exo_gbpusd'], 'returns correlation'),
      externalRow('risk_spreads', 'Broker spreads / transaction costs', 'EXECUTION', 'Risk/Execution', ['risk_broker_spreads'], 'cost per pair'),
    ],
  },
]

export function getCoverageRows() {
  return canonicalVariables.map((variable) => ({
    ...variable,
    cells: coverageCountries.map((country) => {
      const sourceId = variable.sourceIds[country.code]
      const source = sourceId ? sourceById.get(sourceId) : null
      return {
        country,
        sourceId,
        source,
        fit: source?.dataFit || 'missing',
        endpoint: source?.apiPath || source?.fredSeriesId || null,
        refreshable: Boolean(source?.apiPath || source?.fredSeriesId),
      }
    }),
  }))
}

export function getCoverageSummary(rows = getCoverageRows()) {
  return rows
    .flatMap((row) => row.cells)
    .reduce(
      (acc, cell) => {
        acc.total += 1
        acc[cell.fit] = (acc[cell.fit] || 0) + 1
        if (cell.refreshable) acc.refreshable += 1
        return acc
      },
      { total: 0, refreshable: 0 }
    )
}

export function getExternalCoverageGroups() {
  return externalCoverageGroups.map((group) => ({
    ...group,
    rows: group.rows.map((row) => enrichExternalRow(row)),
  }))
}

export function getExternalCoverageSummary(groups = getExternalCoverageGroups()) {
  return groups
    .flatMap((group) => group.rows)
    .reduce(
      (acc, row) => {
        acc.total += 1
        acc[row.fit] = (acc[row.fit] || 0) + 1
        if (row.refreshable) acc.refreshable += 1
        return acc
      },
      { total: 0, refreshable: 0 }
    )
}

export function getPrioritySummary(rows = getCoverageRows()) {
  return rows.reduce((acc, row) => {
    acc[row.priority] = (acc[row.priority] || 0) + 1
    return acc
  }, {})
}

function externalRow(key, label, category, docRef, sourceIds, transform) {
  return { key, label, category, docRef, sourceIds, transform }
}

function enrichExternalRow(row) {
  const sources = row.sourceIds.map((sourceId) => ({
    sourceId,
    source: sourceById.get(sourceId) || null,
  }))

  const fit = sources.reduce((worst, item) => {
    const fit = item.source?.dataFit || 'missing'
    return fitSeverity[fit] > fitSeverity[worst] ? fit : worst
  }, 'exact')

  return {
    ...row,
    sources,
    fit,
    refreshable: sources.some((item) => Boolean(item.source?.apiPath || item.source?.fredSeriesId)),
  }
}

function mapCountryIds(suffix, overrides = {}) {
  return coverageCountries.reduce((acc, country) => {
    acc[country.code] = overrides[country.code] || `endo_${country.code}_${suffix}`
    return acc
  }, {})
}
