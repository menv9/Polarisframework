// Centro de Control de Datos — Polaris Framework
// Metadatos de todas las fuentes de datos: scraping targets, frecuencias, calendario de publicacion

export const dataSources = [
  // ============================================================
  // GDP — Crecimiento
  // ============================================================
  {
    id: 'gdp_usa',
    indicator: 'GDP Growth Rate — USA',
    category: 'GDP',
    module: 'World View',
    scraper: 'trading-economics',
    scrapeUrl: 'https://tradingeconomics.com/united-states/indicators',
    frequency: 'Trimestral',
    frequencyDays: 90,
    lastUpdate: '2026-04-25',
    notes: 'Atlanta Fed GDPNow como proxy real-time',
  },
  {
    id: 'gdp_eur',
    indicator: 'GDP Growth Rate — Euro Area',
    category: 'GDP',
    module: 'World View',
    scraper: 'trading-economics',
    scrapeUrl: 'https://tradingeconomics.com/euro-area/indicators',
    frequency: 'Trimestral',
    frequencyDays: 90,
    lastUpdate: '2026-04-30',
    notes: 'ECB BMPE + Bloomberg Consensus',
  },
  {
    id: 'gdp_chn',
    indicator: 'GDP Growth Rate — China',
    category: 'GDP',
    module: 'World View',
    scraper: 'trading-economics',
    scrapeUrl: 'https://tradingeconomics.com/china/indicators',
    frequency: 'Trimestral',
    frequencyDays: 90,
    lastUpdate: '2026-04-15',
    notes: 'PBOC Beige Book equivalents',
  },
  {
    id: 'gdp_jpn',
    indicator: 'GDP Growth Rate — Japan',
    category: 'GDP',
    module: 'World View',
    scraper: 'trading-economics',
    scrapeUrl: 'https://tradingeconomics.com/japan/indicators',
    frequency: 'Trimestral',
    frequencyDays: 90,
    lastUpdate: '2026-05-10',
    notes: 'BoJ Tankan',
  },

  // ============================================================
  // REGIMEN — Risk-ON / Risk-OFF
  // ============================================================
  {
    id: 'reg_vix',
    indicator: 'VIX',
    category: 'REGIMEN',
    module: 'World View',
    scraper: 'api',
    scrapeUrl: 'https://www.cboe.com/tradable_products/vix/',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'CBOE. ON: < P30(5Y) | OFF: > P70(5Y)',
  },
  {
    id: 'reg_hy_oas',
    indicator: 'HY OAS',
    category: 'REGIMEN',
    module: 'World View',
    scraper: 'api',
    scrapeUrl: 'https://fred.stlouisfed.org/series/BAMLH0A0HYM2',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'Bloomberg / ICE BofA',
  },
  {
    id: 'reg_sp500',
    indicator: 'S&P 500 vs 200dma',
    category: 'REGIMEN',
    module: 'World View',
    scraper: 'manual',
    scrapeUrl: 'https://www.bloomberg.com/quote/SPX:IND',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'Bloomberg / Refinitiv. Select: ABOVE/BELOW',
  },
  {
    id: 'reg_embi',
    indicator: 'EMBI Global Spread',
    category: 'REGIMEN',
    module: 'World View',
    scraper: 'api',
    scrapeUrl: 'https://fred.stlouisfed.org/series/EMBIG',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'JPMorgan / Bloomberg',
  },

  // ============================================================
  // WoC — Wisdom of the Crowd
  // ============================================================
  {
    id: 'woc_smart',
    indicator: 'Smart Consensus (z)',
    category: 'WOC',
    module: 'World View',
    scraper: 'manual',
    scrapeUrl: 'https://www.cftc.gov/marketreports/commitmentsoftraders/index.htm',
    frequency: 'Semanal',
    frequencyDays: 7,
    lastUpdate: '2026-05-09',
    notes: 'CFTC Asset Managers. Ventana 6-12 meses',
  },
  {
    id: 'woc_retail',
    indicator: 'Retail Extremo (z)',
    category: 'WOC',
    module: 'World View',
    scraper: 'api',
    scrapeUrl: 'https://www.dailyfx.com/sentiment',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'DailyFX SSI, IG Sentiment',
  },

  // ============================================================
  // USD Bias
  // ============================================================
  {
    id: 'usd_dxy',
    indicator: 'DXY Spot',
    category: 'USD',
    module: 'World View',
    scraper: 'api',
    scrapeUrl: 'https://www.theice.com/index',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'Bloomberg / ICE',
  },
  {
    id: 'usd_dxy_200dma',
    indicator: 'DXY 200dma',
    category: 'USD',
    module: 'World View',
    scraper: 'manual',
    scrapeUrl: 'https://www.theice.com/index',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'Bloomberg / ICE',
  },

  // ============================================================
  // INFLACION
  // ============================================================
  {
    id: 'inf_cpi_g7',
    indicator: 'CPI G7 YoY',
    category: 'INFLACION',
    module: 'World View',
    scraper: 'trading-economics',
    scrapeUrl: 'https://stats.oecd.org/',
    frequency: 'Mensual',
    frequencyDays: 30,
    lastUpdate: '2026-04-15',
    notes: 'Varios NSO / Bloomberg. INF: > 3% | DESINF: < 2%',
  },
  {
    id: 'inf_breakevens',
    indicator: 'Breakevens 5Y5Y',
    category: 'INFLACION',
    module: 'World View',
    scraper: 'api',
    scrapeUrl: 'https://fred.stlouisfed.org/series/T5YIFRM',
    frequency: 'Diaria',
    frequencyDays: 1,
    lastUpdate: '2026-05-12',
    notes: 'Bloomberg / Refinitiv',
  },
]

/**
 * Calcula la fecha de proxima actualizacion basada en lastUpdate + frequencyDays.
 */
export function getNextUpdate(lastUpdateStr, frequencyDays) {
  const last = new Date(lastUpdateStr)
  const next = new Date(last)
  next.setDate(next.getDate() + frequencyDays)
  return next.toISOString().split('T')[0]
}

/**
 * Determina el estado de un indicador:
 * - 'ok'      : actualizado (hoy o dentro del margen)
 * - 'warning' : proximo a vencer (<= 2 dias)
 * - 'stale'   : desactualizado (pasado nextUpdate)
 */
export function getStatus(source) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const last = new Date(source.lastUpdate)
  last.setHours(0, 0, 0, 0)

  const nextStr = getNextUpdate(source.lastUpdate, source.frequencyDays)
  const next = new Date(nextStr)
  next.setHours(0, 0, 0, 0)

  const diffNext = Math.ceil((next - today) / (1000 * 60 * 60 * 24))

  if (diffNext < 0) return { code: 'stale', label: 'DESACTUALIZADO', color: 'text-[#ef4444]' }
  if (diffNext <= 2) return { code: 'warning', label: 'PROXIMO', color: 'text-[#f59e0b]' }
  return { code: 'ok', label: 'OK', color: 'text-[#4ade80]' }
}

/**
 * Cuenta indicadores por estado.
 */
export function countByStatus(sources) {
  const counts = { ok: 0, warning: 0, stale: 0 }
  sources.forEach((s) => {
    const st = getStatus(s)
    counts[st.code]++
  })
  return counts
}
