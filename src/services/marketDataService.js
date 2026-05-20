// Market data client
// FRED es la fuente automatica principal para los datos USA y proxies globales.

const API_BASE = '' // URLs relativas: /api/... funciona en dev (proxy Vite) y en producción (Vercel)

export async function fetchMarketData() {
  const res = await fetch(`${API_BASE}/api/polaris/worldview`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    console.warn('Proxy error, using fallback mock data:', err.message || res.statusText)
    return fetchMockData()
  }

  const data = await res.json()

  // Si el proxy devuelve fallback por scraping fallido
  if (data.fallback) {
    console.warn('Proxy returned fallback, using mock data')
    return fetchMockData()
  }

  return {
    gdpUsa: data.gdpUsa ?? 0.3,
    gdpEur: data.gdpEur ?? -0.2,
    gdpChn: data.gdpChn ?? 0.5,
    gdpJpn: data.gdpJpn ?? 0.1,
    gdpResto: data.gdpResto ?? 0.0,
    vix: data.vix ?? 15,
    hyOas: data.hyOas ?? 45,
    sp200dma: data.sp200dma ?? 1,
    embi: data.embi ?? 55,
    smartZ: data.smartZ ?? 0.5,
    retailZ: data.retailZ ?? -0.8,
    dxy: data.dxy ?? 103.5,
    dxy200dma: data.dxy200dma ?? 101.0,
    dxyRising: data.dxyRising ?? 1,
    cpiG7: data.cpiG7 ?? 2.8,
    breakevens: data.breakevens ?? 2.3,
  }
}

export async function fetchFredLatestValue(seriesId) {
  const res = await fetch(`${API_BASE}/api/fred/latest/${seriesId}`)
  if (!res.ok) throw new Error(`FRED fetch failed for ${seriesId}`)
  return res.json()
}

export async function fetchFredYoY(seriesId) {
  const res = await fetch(`${API_BASE}/api/fred/yoy/${seriesId}`)
  if (!res.ok) throw new Error(`FRED YoY fetch failed for ${seriesId}`)
  return res.json()
}

export async function fetchCountryIndicators(countryCode) {
  const res = await fetch(`${API_BASE}/api/indicators/${countryCode}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch indicators for ${countryCode}`)
  }

  return res.json()
}

export function getLastUpdateTime() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Nasdaq Data Link helpers
// Docs: https://docs.data.nasdaq.com/docs/getting-started
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch a time-series dataset from Nasdaq Data Link.
 * @param {string} database  e.g. "FRED", "WIKI", "CBOE"
 * @param {string} dataset   e.g. "GDP", "VIX"
 * @param {{ rows?: number, start_date?: string, end_date?: string, column_index?: number }} [opts]
 * @returns {Promise<{ database: string, dataset: string, column_names: string[], data: any[][] }>}
 */
export async function fetchNasdaqDataset(database, dataset, opts = {}) {
  const params = new URLSearchParams()
  if (opts.rows) params.set('rows', String(opts.rows))
  if (opts.start_date) params.set('start_date', opts.start_date)
  if (opts.end_date) params.set('end_date', opts.end_date)
  if (opts.column_index) params.set('column_index', String(opts.column_index))
  const qs = params.toString()
  const res = await fetch(`${API_BASE}/api/nasdaq/${database}/${dataset}${qs ? `?${qs}` : ''}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Nasdaq fetch failed for ${database}/${dataset}`)
  }
  return res.json()
}

/**
 * Fetch only the most recent value from a Nasdaq Data Link time-series.
 * @param {string} database
 * @param {string} dataset
 * @param {number} [columnIndex=1]  1-based column index (after the date column)
 * @returns {Promise<{ database: string, dataset: string, date: string, value: number, column_names: string[] }>}
 */
export async function fetchNasdaqLatest(database, dataset, columnIndex = 1) {
  const res = await fetch(
    `${API_BASE}/api/nasdaq/${database}/${dataset}/latest?column_index=${columnIndex}`,
  )
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Nasdaq latest failed for ${database}/${dataset}`)
  }
  return res.json()
}

/**
 * Query a Nasdaq Datatables endpoint (tick data, fundamentals, options, etc.).
 * @param {string} datatable  e.g. "SHARADAR/SF1"
 * @param {Record<string, string>} [filters]  any datatable-specific filter params
 * @returns {Promise<{ datatable: string, columns: any[], data: any[][], meta: object }>}
 */
export async function fetchNasdaqTable(datatable, filters = {}) {
  const params = new URLSearchParams(filters)
  const qs = params.toString()
  const res = await fetch(`${API_BASE}/api/nasdaq-table/${datatable}${qs ? `?${qs}` : ''}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || `Nasdaq table failed for ${datatable}`)
  }
  return res.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback mock data con variaciones aleatorias
function fetchMockData() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        gdpUsa: addNoise(0.3, 0.1),
        gdpEur: addNoise(-0.2, 0.1),
        gdpChn: addNoise(0.5, 0.1),
        gdpJpn: addNoise(0.1, 0.1),
        gdpResto: addNoise(0.0, 0.05),
        vix: addNoise(15, 0.2),
        hyOas: addNoise(45, 0.15),
        sp200dma: 1,
        embi: addNoise(55, 0.15),
        smartZ: addNoise(0.5, 0.1),
        retailZ: addNoise(-0.8, 0.1),
        dxy: addNoise(103.5, 0.02),
        dxy200dma: 101.0,
        dxyRising: 1,
        cpiG7: addNoise(2.8, 0.05),
        breakevens: addNoise(2.3, 0.05),
      })
    }, 800)
  })
}

function addNoise(value, magnitude = 0.05) {
  if (typeof value === 'number') {
    const noise = (Math.random() - 0.5) * 2 * magnitude * Math.abs(value || 1)
    return Number((value + noise).toFixed(value % 1 === 0 ? 0 : 1))
  }
  return value
}
