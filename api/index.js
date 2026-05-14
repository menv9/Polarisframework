require('dotenv').config()
const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const cors = require('cors')
const AdmZip = require('adm-zip')
const XLSX = require('xlsx')
const fs = require('fs/promises')
const path = require('path')
const { createClient } = require('@supabase/supabase-js')

const app = express()
const PORT = process.env.PORT || 3001

// CORS: permitir cualquier origen
app.use(cors({ origin: '*' }))
app.use(express.json({ limit: '5mb' }))

// Mapeo de codigos de pais para futuras fuentes oficiales
const countrySlugs = {
  usa: 'united-states',
  eur: 'euro-area',
  chn: 'china',
  jpn: 'japan',
  gbr: 'united-kingdom',
  can: 'canada',
  aus: 'australia',
  bra: 'brazil',
  mex: 'mexico',
  ind: 'india',
  rus: 'russia',
  zaf: 'south-africa',
}

// Cache en memoria (TTL: 5 minutos)
const cache = new Map()
const CACHE_TTL_MS = 5 * 60 * 1000

function getCached(key) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key)
    return null
  }
  return entry.data
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() })
}

async function getWithRetry(url, config = {}, attempts = 3, label = 'GET') {
  let lastError = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await axios.get(url, config)
    } catch (err) {
      lastError = err
      const status = err.response?.status
      if (status && status < 500) throw err
      if (attempt < attempts) {
        const delayMs = 400 * attempt
        console.warn(`${label} failed attempt ${attempt}/${attempts}: ${err.message}`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
  throw lastError
}

// ScrapingAnt config
const SCRAPINGANT_API_KEY = process.env.SCRAPINGANT_API_KEY || ''
const SCRAPINGANT_BASE = 'https://api.scrapingant.com/v2/general'

// FRED API config
const FRED_API_KEY = process.env.FRED_API_KEY || ''
const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations'
const ECB_BASE = 'https://data-api.ecb.europa.eu/service/data'
const EUROSTAT_BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const IMF_BASE = 'https://dataservices.imf.org/REST/SDMX_JSON.svc/CompactData'
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null

// Headers para simular navegador real
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Cache-Control': 'max-age=0',
  'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"Windows"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

async function fetchViaScrapingAnt(targetUrl, opts = {}) {
  if (!SCRAPINGANT_API_KEY) {
    throw new Error('ScrapingAnt API key not configured')
  }
  const params = new URLSearchParams({
    url: targetUrl,
    proxy_type: 'residential',
    wait_for_selector: opts.wait_for_selector || 'table',
    browser: 'true',
  })
  if (opts.js_snippet) {
    params.set('js_snippet', opts.js_snippet)
  }
  const apiUrl = `${SCRAPINGANT_BASE}?${params.toString()}`
  console.log(`[SCRAPINGANT] Proxying: ${targetUrl}${opts.js_snippet ? ' (with js_snippet)' : ''}`)
  console.log(`[SCRAPINGANT] Full URL: ${apiUrl}`)
  const { data: html } = await axios.get(apiUrl, {
    headers: { 'x-api-key': SCRAPINGANT_API_KEY },
    timeout: opts.timeout || 45000,
  })
  console.log(`[SCRAPINGANT] Success, HTML length: ${html.length}`)
  return html
}

async function fetchFredObservations(seriesId, limit = 1) {
  if (!FRED_API_KEY) {
    throw new Error('FRED API key not configured')
  }
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: FRED_API_KEY,
    file_type: 'json',
    sort_order: 'desc',
    limit: String(limit),
  })
  const url = `${FRED_BASE}?${params.toString()}`
  console.log(`[FRED] Fetching series ${seriesId}, limit ${limit}`)
  const { data } = await getWithRetry(url, { timeout: 15000 }, 3, `[FRED] ${seriesId}`)
  if (!data || !data.observations) {
    throw new Error('Invalid FRED response')
  }
  return data.observations
}

async function fetchFredLatestValue(seriesId) {
  const observations = await fetchFredObservations(seriesId, 12)
  if (!observations.length) return null
  const latest = observations.find((obs) => {
    const v = parseFloat(obs.value)
    return !isNaN(v)
  })
  if (!latest) return null
  return {
    seriesId,
    date: latest.date,
    value: parseFloat(latest.value),
    raw: latest.value,
  }
}

function toFredNumber(observation) {
  const value = Number.parseFloat(observation?.value)
  if (!Number.isFinite(value)) return null
  return { date: observation.date, value, raw: observation.value }
}

async function fetchFredNumericObservations(seriesId, limit = 1000) {
  const observations = await fetchFredObservations(seriesId, limit)
  return observations.map(toFredNumber).filter(Boolean)
}

async function fetchFredPercentile(seriesId, limit = 1300) {
  const observations = await fetchFredNumericObservations(seriesId, limit)
  if (observations.length < 20) return null
  const latest = observations[0]
  const rank = observations.filter((obs) => obs.value <= latest.value).length
  const percentile = (rank / observations.length) * 100
  return {
    seriesId,
    date: latest.date,
    value: Number(percentile.toFixed(1)),
    raw: latest.raw,
    meta: { latestValue: latest.value, sampleSize: observations.length },
  }
}

async function fetchFredSpread(leftSeriesId, rightSeriesId, limit = 30) {
  const [left, right] = await Promise.all([
    fetchFredNumericObservations(leftSeriesId, limit),
    fetchFredNumericObservations(rightSeriesId, limit),
  ])
  const rightByDate = new Map(right.map((obs) => [obs.date, obs]))
  const leftMatch = left.find((obs) => rightByDate.has(obs.date))
  if (!leftMatch) return null
  const rightMatch = rightByDate.get(leftMatch.date)
  const value = leftMatch.value - rightMatch.value
  return {
    seriesId: `${leftSeriesId}-${rightSeriesId}`,
    date: leftMatch.date,
    value: Number(value.toFixed(2)),
    raw: value,
    meta: {
      left: { seriesId: leftSeriesId, value: leftMatch.value },
      right: { seriesId: rightSeriesId, value: rightMatch.value },
    },
  }
}

async function fetchFredAboveMovingAverage(seriesId, window = 200, limit = 260) {
  const observations = await fetchFredNumericObservations(seriesId, Math.max(limit, window + 20))
  if (observations.length < window) return null
  const ascending = observations.slice().reverse()
  const latest = ascending.at(-1)
  const windowValues = ascending.slice(-window).map((obs) => obs.value)
  const sma = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
  return {
    seriesId,
    date: latest.date,
    value: latest.value > sma ? 1 : 0,
    raw: latest.value,
    meta: { latestValue: latest.value, movingAverage: Number(sma.toFixed(2)), window },
  }
}

// Calculate YoY % change from FRED monthly observations
async function fetchFredYoYChange(seriesId) {
  const observations = await fetchFredObservations(seriesId, 14)
  if (observations.length < 13) return null
  const current = parseFloat(observations[0].value)
  const yearAgo = parseFloat(observations[12].value)
  if (isNaN(current) || isNaN(yearAgo) || yearAgo === 0) return null
  const yoy = ((current - yearAgo) / yearAgo) * 100
  return {
    seriesId,
    date: observations[0].date,
    value: Number(yoy.toFixed(2)),
    current,
    yearAgo,
  }
}

// Calculate YoY % change from FRED quarterly observations (index[0] vs index[4])
async function fetchFredYoYChangeQuarterly(seriesId) {
  const observations = await fetchFredObservations(seriesId, 5)
  if (observations.length < 5) return null
  const current = parseFloat(observations[0].value)
  const yearAgo = parseFloat(observations[4].value)
  if (isNaN(current) || isNaN(yearAgo) || yearAgo === 0) return null
  const yoy = ((current - yearAgo) / yearAgo) * 100
  return {
    seriesId,
    date: observations[0].date,
    value: Number(yoy.toFixed(2)),
    current,
    yearAgo,
  }
}

function normalizeLatest({ provider, seriesId, date, value, raw, meta = {} }) {
  return {
    provider,
    seriesId,
    date: date || null,
    value: Number.isFinite(value) ? value : null,
    raw: raw ?? null,
    meta,
    fetchedAt: new Date().toISOString(),
  }
}

function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/)
  if (!lines.length) return []
  const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, '').trim())
  return lines.slice(1).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)/g).filter((_, i) => i % 2 === 0).map((cell) => cell.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
    return headers.reduce((row, header, index) => {
      row[header] = cells[index] ?? ''
      return row
    }, {})
  })
}

function parseCsvLine(line) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        cell += '"'
        index += 1
      } else if (char === '"') {
        quoted = false
      } else {
        cell += char
      }
    } else if (char === '"') {
      quoted = true
    } else if (char === ',') {
      cells.push(cell)
      cell = ''
    } else {
      cell += char
    }
  }
  cells.push(cell)
  return cells
}

async function fetchYahooLatest(symbol) {
  const encoded = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=5d&interval=1d`
  const { data } = await axios.get(url, { timeout: 15000, headers: browserHeaders })
  const result = data?.chart?.result?.[0]
  const quote = result?.indicators?.quote?.[0]
  const closes = quote?.close || []
  const timestamps = result?.timestamp || []
  for (let i = closes.length - 1; i >= 0; i -= 1) {
    if (closes[i] === null || closes[i] === undefined) continue
    const value = Number(closes[i])
    if (Number.isFinite(value)) {
      return normalizeLatest({
        provider: 'yahoo',
        seriesId: symbol,
        date: timestamps[i] ? new Date(timestamps[i] * 1000).toISOString().slice(0, 10) : null,
        value,
        raw: closes[i],
        meta: { currency: result?.meta?.currency, exchangeName: result?.meta?.exchangeName },
      })
    }
  }
  throw new Error(`No Yahoo close available for ${symbol}`)
}

async function fetchYahooHistory(symbol, range = '1y', interval = '1d') {
  const encoded = encodeURIComponent(symbol)
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encoded}?range=${encodeURIComponent(range)}&interval=${encodeURIComponent(interval)}`
  const { data } = await axios.get(url, { timeout: 15000, headers: browserHeaders })
  const result = data?.chart?.result?.[0]
  const quote = result?.indicators?.quote?.[0]
  const closes = quote?.close || []
  const timestamps = result?.timestamp || []
  return closes
    .map((close, index) => ({
      date: timestamps[index] ? new Date(timestamps[index] * 1000).toISOString().slice(0, 10) : null,
      value: Number(close),
    }))
    .filter((row) => row.date && Number.isFinite(row.value) && row.value > 0)
}

async function fetchYahooAboveMovingAverage(symbol, window = 200) {
  const observations = await fetchYahooHistory(symbol, '1y', '1d')
  if (observations.length < window) throw new Error(`Not enough Yahoo data for ${symbol} ${window}dma`)
  const latest = observations.at(-1)
  const windowValues = observations.slice(-window).map((obs) => obs.value)
  const sma = windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
  return normalizeLatest({
    provider: 'yahoo',
    seriesId: `${symbol}_${window}DMA_SIGNAL`,
    date: latest.date,
    value: latest.value > sma ? 1 : 0,
    raw: latest.value,
    meta: { symbol, latestValue: latest.value, movingAverage: Number(sma.toFixed(2)), window },
  })
}

async function fetchYahooRatio(leftSymbol, rightSymbol) {
  const [left, right] = await Promise.all([
    fetchYahooLatest(leftSymbol),
    fetchYahooLatest(rightSymbol),
  ])
  if (!Number.isFinite(left.value) || !Number.isFinite(right.value) || right.value === 0) {
    throw new Error(`Invalid Yahoo ratio ${leftSymbol}/${rightSymbol}`)
  }
  return normalizeLatest({
    provider: 'yahoo',
    seriesId: `${leftSymbol}/${rightSymbol}`,
    date: left.date || right.date,
    value: Number((left.value / right.value).toFixed(6)),
    raw: left.value / right.value,
    meta: { left, right },
  })
}

async function fetchEcbLatest(seriesKey) {
  const url = `${ECB_BASE}/${seriesKey}?format=csvdata&detail=dataonly&lastNObservations=1`
  const { data } = await getWithRetry(url, { timeout: 20000 }, 3, `[ECB] ${seriesKey}`)
  const rows = parseCsv(data)
  const row = rows.find((r) => r.OBS_VALUE || r.TIME_PERIOD) || rows[0]
  if (!row) throw new Error(`No ECB data for ${seriesKey}`)
  return normalizeLatest({
    provider: 'ecb',
    seriesId: seriesKey,
    date: row.TIME_PERIOD,
    value: Number.parseFloat(row.OBS_VALUE),
    raw: row.OBS_VALUE,
    meta: row,
  })
}

function jsonStatTimeLabels(data) {
  const timeDimId = data.id?.find((id) => id === 'time' || id === 'TIME_PERIOD')
  const timeDim = timeDimId ? data.dimension?.[timeDimId] : null
  const index = timeDim?.category?.index || {}
  const labels = timeDim?.category?.label || {}
  return Object.entries(index)
    .sort((a, b) => a[1] - b[1])
    .map(([id]) => labels[id] || id)
}

function jsonStatRows(data) {
  const ids = data.id || []
  const sizes = data.size || []
  const timeDimIndex = ids.findIndex((id) => id === 'time' || id === 'TIME_PERIOD')
  const times = jsonStatTimeLabels(data)
  if (timeDimIndex < 0 || !times.length) return []

  const strideFor = (dimensionIndex) => sizes
    .slice(dimensionIndex + 1)
    .reduce((product, size) => product * size, 1)

  return Object.entries(data.value || {})
    .map(([flatIndex, rawValue]) => {
      const value = Number(rawValue)
      if (!Number.isFinite(value)) return null
      const index = Number(flatIndex)
      const stride = strideFor(timeDimIndex)
      const timeIndex = Math.floor(index / stride) % sizes[timeDimIndex]
      const date = times[timeIndex]
      return date ? { date, value, flatIndex: index } : null
    })
    .filter(Boolean)
    .sort((a, b) => a.date.localeCompare(b.date) || a.flatIndex - b.flatIndex)
}

function latestJsonStatValue(data) {
  const latest = jsonStatRows(data).at(-1)
  if (!latest) throw new Error('No numeric Eurostat values')
  return latest
}

async function fetchEurostatLatest(dataset, filters = {}) {
  const params = new URLSearchParams({ lang: 'en' })
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  })
  const url = `${EUROSTAT_BASE}/${dataset}?${params.toString()}`
  const { data } = await getWithRetry(url, { timeout: 20000 }, 3, `[EUROSTAT] ${dataset}`)
  const latest = latestJsonStatValue(data)
  return normalizeLatest({
    provider: 'eurostat',
    seriesId: dataset,
    date: latest.date,
    value: latest.value,
    raw: latest.value,
    meta: { filters, flatIndex: latest.flatIndex },
  })
}

async function fetchOecdLatest(url) {
  const parsed = new URL(url)
  if (!parsed.hostname.endsWith('oecd.org')) {
    throw new Error('Only OECD official URLs are allowed')
  }
  const { data } = await axios.get(url, { timeout: 30000, headers: { Accept: 'application/json' } })

  // SDMX-JSON format (stats.oecd.org or sdmx.oecd.org)
  if (typeof data === 'object' && data.dataSets) {
    const series = Object.values(data.dataSets[0]?.series || {})[0]
    const observations = series?.observations || {}
    const timeValues = data.structure?.dimensions?.observation?.[0]?.values || []
    for (let i = timeValues.length - 1; i >= 0; i--) {
      const obs = observations[String(i)]
      const val = obs?.[0]
      if (val !== null && val !== undefined && Number.isFinite(Number(val))) {
        return normalizeLatest({
          provider: 'oecd',
          seriesId: parsed.pathname,
          date: timeValues[i]?.id ?? null,
          value: Number(val),
          raw: String(val),
          meta: { url },
        })
      }
    }
    throw new Error('No OECD observations in SDMX-JSON')
  }

  // CSV fallback
  const rows = typeof data === 'string' ? parseCsv(data) : []
  if (!rows.length) throw new Error('OECD response is not parseable (not CSV or SDMX-JSON)')
  const valueKeys = ['OBS_VALUE', 'ObsValue', 'Value', 'value']
  const timeKeys = ['TIME_PERIOD', 'Time', 'TIME', 'time']
  const row = rows
    .filter((item) => valueKeys.some((key) => Number.isFinite(Number.parseFloat(item[key]))))
    .at(-1)
  if (!row) throw new Error('No OECD numeric observations')
  const valueKey = valueKeys.find((key) => Number.isFinite(Number.parseFloat(row[key])))
  const timeKey = timeKeys.find((key) => row[key])
  return normalizeLatest({
    provider: 'oecd',
    seriesId: parsed.pathname,
    date: timeKey ? row[timeKey] : null,
    value: Number.parseFloat(row[valueKey]),
    raw: row[valueKey],
    meta: { url },
  })
}

const bisReerCurrencyCodes = {
  USD: 'RBUS',
  EUR: 'RBXM',
  JPY: 'RBJP',
  GBP: 'RBGB',
  CHF: 'RBCH',
  CAD: 'RBCA',
  AUD: 'RBAU',
  NZD: 'RBNZ',
  SEK: 'RBSE',
  NOK: 'RBNO',
}

function bisReerCode(currency) {
  return bisReerCurrencyCodes[String(currency || '').toUpperCase()] || String(currency || '').toUpperCase()
}

function buildReerDeviationVsMean(series, window = 120) {
  return normalizeHistorySeries(series)
    .map((row, index, rows) => {
      const sample = rows.slice(Math.max(0, index - window + 1), index + 1)
      if (sample.length < Math.min(window, rows.length)) return null
      const mean = sample.reduce((sum, item) => sum + item.value, 0) / sample.length
      if (!Number.isFinite(mean) || mean === 0) return null
      return {
        date: row.date,
        value: Number((((row.value / mean) - 1) * 100).toFixed(6)),
        raw: row.value,
      }
    })
    .filter(Boolean)
}

async function fetchFredBisReerHistory(currency) {
  const targetCode = bisReerCode(currency)
  const result = await fetchFredHistorySeries(`${targetCode}BIS`, null, HISTORY_FRED_LIMIT)
  return {
    provider: 'fred-bis',
    transform: 'reer_deviation_vs_10y_mean',
    series: buildReerDeviationVsMean(result.series, 120),
  }
}

async function fetchBisReerLatest(currency) {
  if (FRED_API_KEY) {
    try {
      const result = await fetchFredBisReerHistory(currency)
      const latest = result.series.at(-1)
      if (latest) {
        return normalizeLatest({
          provider: result.provider,
          seriesId: `${bisReerCode(currency)}BIS:reer_deviation_vs_10y_mean`,
          date: latest.date,
          value: latest.value,
          raw: latest.raw,
          meta: { transform: result.transform, window: 120 },
        })
      }
    } catch (err) {
      console.warn(`[BIS REER] FRED fallback for ${currency}: ${err.message}`)
    }
  }

  const targetCode = bisReerCode(currency)
  const url = 'https://www.bis.org/statistics/eer/broad.xlsx'
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
  const workbook = XLSX.read(data, { type: 'buffer' })
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === 'real') || workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true })
  const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell).trim().toUpperCase() === targetCode))
  if (headerIndex < 0) throw new Error(`BIS currency not found: ${currency}`)
  const headers = rows[headerIndex].map((cell) => String(cell || '').trim().toUpperCase())
  const colIndex = headers.findIndex((cell) => cell === targetCode)
  const latestRow = rows.slice(headerIndex + 1).filter((row) => row[colIndex] !== undefined && row[colIndex] !== null && row[colIndex] !== '').at(-1)
  if (!latestRow) throw new Error(`No BIS REER value for ${currency}`)
  const excelDate = Number(latestRow[0])
  const date = Number.isFinite(excelDate)
    ? new Date(Date.UTC(1899, 11, 30) + excelDate * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    : String(latestRow[0])
  return normalizeLatest({
    provider: 'bis',
    seriesId: `BIS_REER_${String(currency).toUpperCase()}`,
    date,
    value: Number.parseFloat(latestRow[colIndex]),
    raw: latestRow[colIndex],
    meta: { sheetName, currency: currency.toUpperCase(), bisCode: targetCode },
  })
}

async function fetchCftcLatest(market) {
  const year = new Date().getUTCFullYear()
  const url = `https://www.cftc.gov/files/dea/history/fut_fin_txt_${year}.zip`
  const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
  const zip = new AdmZip(Buffer.from(data))
  const entry = zip.getEntries().find((item) => item.entryName.toLowerCase().endsWith('.txt'))
  if (!entry) throw new Error('No CFTC txt file in zip')
  const rows = parseCsv(entry.getData().toString('utf8'))
  const needle = market.toLowerCase()
  const row = rows
    .filter((r) => {
      const name = String(r.Market_and_Exchange_Names || r['Market and Exchange Names'] || '').toLowerCase()
      return name.startsWith(`${needle} -`) || name === needle
    })
    .at(-1)
  if (!row) throw new Error(`No CFTC market match for ${market}`)
  const longValue = Number.parseFloat(row.Asset_Mgr_Positions_Long_All || row['Asset Mgr Longs'] || '0')
  const shortValue = Number.parseFloat(row.Asset_Mgr_Positions_Short_All || row['Asset Mgr Shorts'] || '0')
  const value = longValue - shortValue
  const compactDate = row.As_of_Date_In_Form_YYMMDD
  const parsedDate = row.Report_Date_as_YYYY_MM_DD || (
    /^\d{6}$/.test(compactDate || '')
      ? `20${compactDate.slice(0, 2)}-${compactDate.slice(2, 4)}-${compactDate.slice(4, 6)}`
      : compactDate
  )
  return normalizeLatest({
    provider: 'cftc',
    seriesId: market,
    date: parsedDate,
    value,
    raw: value,
    meta: { long: longValue, short: shortValue, market: row.Market_and_Exchange_Names || row['Market and Exchange Names'] },
  })
}

async function fetchImfLatest(dataset, seriesKey, startPeriod = '2000') {
  const url = `${IMF_BASE}/${dataset}/${seriesKey}?startPeriod=${encodeURIComponent(startPeriod)}`
  const { data } = await axios.get(url, { timeout: 20000 })
  const observations = data?.CompactData?.DataSet?.Series?.Obs
  const list = Array.isArray(observations) ? observations : observations ? [observations] : []
  const latest = list.filter((obs) => obs['@OBS_VALUE']).at(-1)
  if (!latest) throw new Error(`No IMF observations for ${dataset}/${seriesKey}`)
  return normalizeLatest({
    provider: 'imf',
    seriesId: `${dataset}/${seriesKey}`,
    date: latest['@TIME_PERIOD'],
    value: Number.parseFloat(latest['@OBS_VALUE']),
    raw: latest['@OBS_VALUE'],
    meta: { dataset, seriesKey },
  })
}

async function fetchOecdNiipUsdRows(country, lastN = null) {
  const params = new URLSearchParams({ dimensionAtObservation: 'AllDimensions' })
  if (lastN) params.set('lastNObservations', String(lastN))
  const url = `https://sdmx.oecd.org/public/rest/data/OECD.SDD.TPS,DSD_BOP@DF_IIP,1.0/${encodeURIComponent(country)}.WXD.FA.N.LE.A.USD_EXC.N?${params.toString()}`
  const { data } = await getWithRetry(url, {
    timeout: 30000,
    headers: { Accept: 'application/vnd.sdmx.data+json' },
  }, 3, `[OECD NIIP] ${country}`)
  const struct = data?.data?.structures?.[0]
  const dims = struct?.dimensions?.observation || []
  const timeIdx = dims.findIndex((d) => d.id === 'TIME_PERIOD')
  const timeValues = dims[timeIdx]?.values || []
  const observations = data?.data?.dataSets?.[0]?.observations || {}
  return Object.entries(observations)
    .map(([key, val]) => {
      const indices = key.split(':').map((n) => parseInt(n, 10))
      const tIdx = indices[timeIdx]
      const value = Number(val?.[0])
      const date = timeValues[tIdx]?.id || null
      return date && Number.isFinite(value) ? { date, value } : null
    })
    .filter(Boolean)
    .sort((a, b) => String(a.date).localeCompare(String(b.date)))
}

async function fetchOecdNiipHistory(country) {
  const [niipRows, gdpResult] = await Promise.all([
    fetchOecdNiipUsdRows(country),
    fetchWorldBankHistory(country, 'NY.GDP.MKTP.CD'),
  ])
  const gdpRows = gdpResult.series || []
  const gdpByYear = new Map(gdpRows.map((row) => [String(row.date).slice(0, 4), row.value]))
  const series = niipRows
    .map((row) => {
      const year = String(row.date).slice(0, 4)
      const gdp = gdpByYear.get(year)
      if (!Number.isFinite(gdp) || gdp === 0) return null
      return {
        date: `${year}-01-01`,
        value: Number((((row.value * 1_000_000) / gdp) * 100).toFixed(6)),
        raw: row.value,
      }
    })
    .filter(Boolean)
  return { provider: 'oecd-sdmx/worldbank', transform: 'niip_usd_to_pct_gdp', series }
}

async function fetchOecdNiipLatest(country) {
  const result = await fetchOecdNiipHistory(country)
  const latest = result.series.at(-1)
  if (!latest) throw new Error(`No OECD IIP observations for ${country}`)
  return normalizeLatest({
    provider: result.provider,
    seriesId: `IIP_PCT_GDP/${country}`,
    date: latest.date,
    value: latest.value,
    raw: latest.raw,
    meta: { country, unit: 'percent of GDP', dataflow: 'DSD_BOP@DF_IIP', transform: result.transform },
  })
}

async function fetchImfDataMapperLatest(indicator, country) {
  const url = `https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(indicator)}/${encodeURIComponent(country)}`
  const { data } = await axios.get(url, { timeout: 20000 })
  const series = data?.values?.[indicator]?.[country]
  if (!series || typeof series !== 'object') {
    throw new Error(`No IMF DataMapper data for ${indicator}/${country}`)
  }
  const entries = Object.entries(series)
    .map(([year, value]) => ({ year, value: Number(value) }))
    .filter((entry) => Number.isFinite(entry.value))
    .sort((a, b) => Number(a.year) - Number(b.year))
  const latest = entries.at(-1)
  if (!latest) throw new Error(`No IMF DataMapper observations for ${indicator}/${country}`)
  return normalizeLatest({
    provider: 'imf-datamapper',
    seriesId: `${indicator}/${country}`,
    date: latest.year,
    value: latest.value,
    raw: latest.value,
    meta: { indicator, country },
  })
}

async function fetchWorldBankLatest(country, indicator) {
  const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=20&date=2010:2026`
  const { data } = await axios.get(url, { timeout: 20000 })
  const observations = Array.isArray(data) ? data[1] : null
  if (!Array.isArray(observations)) throw new Error(`No World Bank data for ${country}/${indicator}`)
  const latest = observations.find((obs) => obs && obs.value !== null && obs.value !== undefined)
  if (!latest) throw new Error(`No World Bank observations for ${country}/${indicator}`)
  return normalizeLatest({
    provider: 'worldbank',
    seriesId: `${indicator}/${country}`,
    date: latest.date,
    value: Number(latest.value),
    raw: latest.value,
    meta: { indicator, country, countryName: latest.country?.value },
  })
}

async function fetchWorldBankTotHistory(country) {
  const result = await fetchWorldBankHistory(country, 'TT.PRI.MRCH.XD.WD')
  return {
    provider: 'worldbank',
    transform: 'terms_of_trade_yoy',
    series: annualPercentChange(result.series, 1),
  }
}

async function fetchWorldBankTotLatest(country) {
  const result = await fetchWorldBankTotHistory(country)
  const latest = result.series.at(-1)
  if (!latest) throw new Error(`No World Bank Terms of Trade observations for ${country}`)
  return normalizeLatest({
    provider: result.provider,
    seriesId: `TT.PRI.MRCH.XD.WD/${country}`,
    date: latest.date,
    value: latest.value,
    raw: latest.value,
    meta: { country, indicator: 'TT.PRI.MRCH.XD.WD', transform: result.transform },
  })
}

function quarterToDate(period) {
  const match = String(period || '').match(/^(\d{4})-Q([1-4])$/)
  if (!match) return normalizeHistoryDate(period)
  const month = String((Number(match[2]) - 1) * 3 + 1).padStart(2, '0')
  return `${match[1]}-${month}-01`
}

async function loadBisCbtaRowsByRefArea() {
  if (bisCbtaCache.rowsByRefArea && Date.now() - bisCbtaCache.timestamp < 24 * 60 * 60 * 1000) {
    return bisCbtaCache.rowsByRefArea
  }

  const { data } = await getWithRetry(BIS_CBTA_BULK_URL, { responseType: 'arraybuffer', timeout: 60000 }, 3, '[BIS CBTA] bulk')
  const zip = new AdmZip(Buffer.from(data))
  const entry = zip.getEntries().find((item) => item.entryName.toLowerCase().endsWith('.csv'))
  if (!entry) throw new Error('No BIS CBTA CSV file in zip')

  const lines = entry.getData().toString('utf8').split(/\r?\n/)
  const headers = parseCsvLine(lines.shift() || '')
  const idx = Object.fromEntries(headers.map((header, index) => [header, index]))
  const rowsByRefArea = new Map()

  for (const line of lines) {
    if (!line) continue
    const cells = parseCsvLine(line)
    const frequency = cells[idx['FREQ:Frequency']]
    const refArea = cells[idx['REF_AREA:Reference area']]
    const compMethod = cells[idx['COMP_METHOD:Compilation methodology']]
    const unit = cells[idx['UNIT_MEASURE:Unit of measure']]
    const transformation = cells[idx['TRANSFORMATION:Transformation']]
    if (!frequency?.startsWith('Q:')) continue
    if (!compMethod?.startsWith('B:')) continue
    if (!unit?.startsWith('XDC:')) continue
    if (!transformation?.startsWith('B:')) continue

    const code = refArea?.split(':')[0]
    const value = Number(cells[idx['OBS_VALUE:Observation Value']])
    const date = quarterToDate(cells[idx['TIME_PERIOD:Time period or range']])
    if (!code || !date || !Number.isFinite(value)) continue
    if (!rowsByRefArea.has(code)) rowsByRefArea.set(code, [])
    rowsByRefArea.get(code).push({ date, value, raw: value })
  }

  for (const rows of rowsByRefArea.values()) {
    rows.sort((a, b) => a.date.localeCompare(b.date))
  }

  bisCbtaCache = { timestamp: Date.now(), rowsByRefArea }
  return rowsByRefArea
}

async function fetchBisCbtaHistory(refArea) {
  const rowsByRefArea = await loadBisCbtaRowsByRefArea()
  const rows = rowsByRefArea.get(String(refArea || '').toUpperCase()) || []
  if (!rows.length) throw new Error(`No BIS CBTA observations for ${refArea}`)
  return {
    provider: 'bis-cbta',
    transform: 'central_bank_assets_yoy',
    series: annualPercentChange(rows, 4),
  }
}

async function fetchBisCbtaLatest(refArea) {
  const result = await fetchBisCbtaHistory(refArea)
  const latest = result.series.at(-1)
  if (!latest) throw new Error(`No BIS CBTA YoY observations for ${refArea}`)
  return normalizeLatest({
    provider: result.provider,
    seriesId: `BIS_CBTA/${String(refArea || '').toUpperCase()}`,
    date: latest.date,
    value: latest.value,
    raw: latest.raw,
    meta: { refArea, transform: result.transform, unit: 'domestic currency, YoY %' },
  })
}

async function fetchBankOfCanadaPolicyRate() {
  const url = 'https://www.bankofcanada.ca/valet/observations/V39079/json'
  const { data } = await getWithRetry(url, { timeout: 15000 }, 3, '[BOC] V39079 latest')
  const latest = data?.observations?.at(-1)
  const value = Number.parseFloat(latest?.V39079?.v)
  if (!latest || !Number.isFinite(value)) throw new Error('No Bank of Canada policy rate')
  return normalizeLatest({
    provider: 'central-bank',
    seriesId: 'BOC_POLICY_RATE',
    date: latest.d,
    value,
    raw: latest.V39079.v,
    meta: { bank: 'boc' },
  })
}

async function fetchBankOfCanadaPolicyRateHistory() {
  const url = 'https://www.bankofcanada.ca/valet/observations/V39079/json'
  const { data } = await getWithRetry(url, { timeout: 30000 }, 3, '[BOC] V39079 history')
  const series = (data?.observations || [])
    .map((row) => ({ date: row.d, value: Number.parseFloat(row.V39079?.v), raw: row.V39079?.v }))
    .filter((row) => row.date && Number.isFinite(row.value))
  return { provider: 'bank-of-canada', series }
}

async function fetchOfficialCountryIndicators(countrySlug) {
  throw new Error(`No official fetcher configured yet for ${countrySlug}`)
}

function findIndicator(indicators, searchTerms) {
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms]
  return indicators.find((ind) =>
    terms.some((term) => ind.name.toLowerCase().includes(term.toLowerCase()))
  )
}

const HISTORY_ROOT = path.join(process.cwd(), 'data', 'history')
const HISTORY_SERIES_DIR = path.join(HISTORY_ROOT, 'series')
const HISTORY_STATUS_PATH = path.join(HISTORY_ROOT, 'status.json')
const HISTORY_FRED_LIMIT = 5000
const BIS_CBTA_BULK_URL = 'https://data.bis.org/static/bulk/WS_CBTA_csv_flat.zip'
let bisCbtaCache = { timestamp: 0, rowsByRefArea: null }

async function ensureHistoryDirs() {
  await fs.mkdir(HISTORY_SERIES_DIR, { recursive: true })
}

function safeFileName(id) {
  return String(id).replace(/[^a-zA-Z0-9._-]/g, '_')
}

async function readHistoryStatus() {
  if (supabaseAdmin) {
    const { data, error } = await supabaseAdmin
      .from('history_status')
      .select('*')
      .order('source_id', { ascending: true })
    if (error) throw new Error(`Supabase history_status read failed: ${error.message}`)
    return (data || []).reduce((acc, row) => {
      acc[row.source_id] = fromSupabaseStatus(row)
      return acc
    }, {})
  }

  try {
    const raw = await fs.readFile(HISTORY_STATUS_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeHistoryStatus(status) {
  await ensureHistoryDirs()
  await fs.writeFile(HISTORY_STATUS_PATH, JSON.stringify(status, null, 2))
}

function toSupabaseStatus(row) {
  return {
    source_id: row.sourceId,
    indicator: row.indicator || null,
    module: row.module || null,
    provider: row.provider || null,
    status: row.status,
    count: row.count || 0,
    start_date: row.start || null,
    end_date: row.end || null,
    fetched_at: row.fetchedAt || new Date().toISOString(),
    error: row.error || null,
  }
}

function fromSupabaseStatus(row) {
  return {
    sourceId: row.source_id,
    indicator: row.indicator,
    module: row.module,
    status: row.status,
    provider: row.provider,
    count: row.count || 0,
    start: row.start_date,
    end: row.end_date,
    fetchedAt: row.fetched_at,
    file: null,
    error: row.error,
    storage: 'supabase',
  }
}

async function upsertSupabaseHistory(source, result, series, statusRow) {
  const { error: statusError } = await supabaseAdmin
    .from('history_status')
    .upsert(toSupabaseStatus(statusRow), { onConflict: 'source_id' })
  if (statusError) throw new Error(`Supabase history_status upsert failed: ${statusError.message}`)

  const { error: deleteError } = await supabaseAdmin
    .from('history_observations')
    .delete()
    .eq('source_id', source.id)
  if (deleteError) throw new Error(`Supabase history_observations delete failed: ${deleteError.message}`)

  const fetchedAt = statusRow.fetchedAt
  const rows = series.map((row) => ({
    source_id: source.id,
    date: row.date,
    value: row.value,
    raw: row.raw === undefined ? null : row.raw,
    fetched_at: fetchedAt,
  }))

  for (let index = 0; index < rows.length; index += 1000) {
    const chunk = rows.slice(index, index + 1000)
    const { error } = await supabaseAdmin
      .from('history_observations')
      .upsert(chunk, { onConflict: 'source_id,date' })
    if (error) throw new Error(`Supabase history_observations upsert failed: ${error.message}`)
  }

  return { ...statusRow, storage: 'supabase', file: null }
}

async function upsertSupabaseHistoryFailure(row) {
  const { error } = await supabaseAdmin
    .from('history_status')
    .upsert(toSupabaseStatus(row), { onConflict: 'source_id' })
  if (error) throw new Error(`Supabase history_status failure upsert failed: ${error.message}`)
  return { ...row, storage: 'supabase' }
}

function normalizeHistoryDate(value) {
  const text = String(value || '').trim()
  if (!text) return null

  const year = text.match(/^(\d{4})$/)
  if (year) return `${year[1]}-01-01`

  const month = text.match(/^(\d{4})-(\d{2})$/)
  if (month) return `${month[1]}-${month[2]}-01`

  const quarter = text.match(/^(\d{4})-?Q([1-4])$/i)
  if (quarter) {
    const quarterStartMonth = String((Number(quarter[2]) - 1) * 3 + 1).padStart(2, '0')
    return `${quarter[1]}-${quarterStartMonth}-01`
  }

  const date = text.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null
}

function normalizeHistorySeries(series) {
  const byDate = new Map()
  const today = new Date().toISOString().slice(0, 10)
  for (const row of series || []) {
    const value = Number(row.value)
    const date = normalizeHistoryDate(row.date)
    if (!date || date > today || !Number.isFinite(value)) continue
    byDate.set(date, { date, value })
  }
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function annualPercentChange(series, lag = 12) {
  return series
    .map((row, index) => {
      const prev = series[index - lag]
      if (!prev || !Number.isFinite(prev.value) || prev.value === 0) return null
      return { date: row.date, value: Number((((row.value - prev.value) / prev.value) * 100).toFixed(6)) }
    })
    .filter(Boolean)
}

async function saveHistoryResult(source, result) {
  const series = normalizeHistorySeries(result.series)
  const now = new Date().toISOString()
  const statusRow = {
    sourceId: source.id,
    indicator: source.indicator,
    module: source.module,
    status: 'ok',
    provider: result.provider,
    count: series.length,
    start: series[0]?.date || null,
    end: series.at(-1)?.date || null,
    fetchedAt: now,
    file: null,
    error: null,
  }
  if (supabaseAdmin) {
    return upsertSupabaseHistory(source, result, series, statusRow)
  }

  await ensureHistoryDirs()
  const fileName = `${safeFileName(source.id)}.json`
  const payload = {
    sourceId: source.id,
    indicator: source.indicator,
    module: source.module,
    provider: result.provider,
    transform: result.transform || null,
    fetchedAt: now,
    count: series.length,
    start: statusRow.start,
    end: statusRow.end,
    series,
  }
  await fs.writeFile(path.join(HISTORY_SERIES_DIR, fileName), JSON.stringify(payload, null, 2))
  const status = await readHistoryStatus()
  status[source.id] = { ...statusRow, file: `data/history/series/${fileName}` }
  await writeHistoryStatus(status)
  return status[source.id]
}

async function saveHistoryFailure(source, statusName, message) {
  const row = {
    sourceId: source.id,
    indicator: source.indicator,
    module: source.module,
    status: statusName,
    provider: null,
    count: 0,
    start: null,
    end: null,
    fetchedAt: new Date().toISOString(),
    file: null,
    error: message,
  }
  if (supabaseAdmin) {
    return upsertSupabaseHistoryFailure(row)
  }

  const status = await readHistoryStatus()
  status[source.id] = row
  await writeHistoryStatus(status)
  return status[source.id]
}

async function readHistorySeries(sourceId, { limit = 500, offset = 0, order = 'asc' } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 500, 5000))
  const safeOffset = Math.max(0, Number(offset) || 0)
  const ascending = order !== 'desc'

  if (supabaseAdmin) {
    const [{ count, error: countError }, { data, error }] = await Promise.all([
      supabaseAdmin
        .from('history_observations')
        .select('*', { count: 'exact', head: true })
        .eq('source_id', sourceId),
      supabaseAdmin
        .from('history_observations')
        .select('source_id,date,value,raw,fetched_at')
        .eq('source_id', sourceId)
        .order('date', { ascending })
        .range(safeOffset, safeOffset + safeLimit - 1),
    ])
    if (countError) throw new Error(`Supabase history count failed: ${countError.message}`)
    if (error) throw new Error(`Supabase history read failed: ${error.message}`)
    return {
      sourceId,
      storage: 'supabase',
      total: count || 0,
      limit: safeLimit,
      offset: safeOffset,
      order: ascending ? 'asc' : 'desc',
      observations: data || [],
    }
  }

  const filePath = path.join(HISTORY_SERIES_DIR, `${safeFileName(sourceId)}.json`)
  const raw = await fs.readFile(filePath, 'utf8')
  const payload = JSON.parse(raw)
  const series = order === 'desc' ? payload.series.slice().reverse() : payload.series
  return {
    sourceId,
    storage: 'filesystem',
    total: payload.series.length,
    limit: safeLimit,
    offset: safeOffset,
    order: ascending ? 'asc' : 'desc',
    observations: series.slice(safeOffset, safeOffset + safeLimit).map((row) => ({
      source_id: sourceId,
      date: row.date,
      value: row.value,
      raw: row.raw || null,
      fetched_at: payload.fetchedAt,
    })),
  }
}

async function readAllHistoryObservations(sourceId) {
  if (supabaseAdmin) {
    const rows = []
    const pageSize = 1000
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await supabaseAdmin
        .from('history_observations')
        .select('source_id,date,value,raw,fetched_at')
        .eq('source_id', sourceId)
        .order('date', { ascending: true })
        .range(offset, offset + pageSize - 1)
      if (error) throw new Error(`Supabase history read failed: ${error.message}`)
      rows.push(...(data || []))
      if (!data || data.length < pageSize) break
    }
    return rows.map((row) => ({ date: row.date, value: Number(row.value), raw: row.raw })).filter((row) => Number.isFinite(row.value))
  }

  const filePath = path.join(HISTORY_SERIES_DIR, `${safeFileName(sourceId)}.json`)
  const raw = await fs.readFile(filePath, 'utf8')
  const payload = JSON.parse(raw)
  return normalizeHistorySeries(payload.series)
}

function rollingStats(values) {
  const n = values.length
  if (!n) return null
  const mean = values.reduce((sum, value) => sum + value, 0) / n
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / n
  return { mean, std: Math.sqrt(variance) }
}

function buildRawFeature(series) {
  return series.map((row) => ({ date: row.date, value: Number(row.value.toFixed(8)) }))
}

function buildYoYFeature(series, lag = 12) {
  return annualPercentChange(series, lag)
}

function buildRollingZScoreFeature(series, window = 120) {
  return series
    .map((row, index) => {
      const sample = series.slice(Math.max(0, index - window + 1), index + 1).map((item) => item.value)
      if (sample.length < Math.min(window, 24)) return null
      const stats = rollingStats(sample)
      if (!stats || stats.std === 0) return null
      const z = Math.max(-4, Math.min(4, (row.value - stats.mean) / stats.std))
      return { date: row.date, value: Number(z.toFixed(6)) }
    })
    .filter(Boolean)
}

function buildRollingPercentileFeature(series, window = 1300) {
  return series
    .map((row, index) => {
      const sample = series.slice(Math.max(0, index - window + 1), index + 1).map((item) => item.value)
      if (sample.length < Math.min(window, 60)) return null
      const rank = sample.filter((value) => value <= row.value).length
      return { date: row.date, value: Number(((rank / sample.length) * 100).toFixed(6)) }
    })
    .filter(Boolean)
}

function buildFeatureSeries(series, method, window) {
  if (method === 'raw') return buildRawFeature(series)
  if (method === 'yoy') return buildYoYFeature(series, 12)
  if (method === 'rolling_zscore') return buildRollingZScoreFeature(series, window || 120)
  if (method === 'rolling_percentile') return buildRollingPercentileFeature(series, window || 1300)
  throw new Error(`Unsupported feature method: ${method}`)
}

async function upsertModelFeatureRows(sourceId, method, featureRows, window = null) {
  if (!supabaseAdmin) throw new Error('Supabase is required for model_features')
  const featureId = `${sourceId}:${method}${window ? `:${window}` : ''}`
  const now = new Date().toISOString()

  const { error: deleteError } = await supabaseAdmin
    .from('model_features')
    .delete()
    .eq('feature_id', featureId)
  if (deleteError) throw new Error(`Supabase model_features delete failed: ${deleteError.message}`)

  const rows = featureRows.map((row) => ({
    feature_id: featureId,
    source_id: sourceId,
    date: row.date,
    value: row.value,
    method,
    window_size: window,
    fetched_at: now,
  }))

  for (let index = 0; index < rows.length; index += 1000) {
    const chunk = rows.slice(index, index + 1000)
    const { error } = await supabaseAdmin
      .from('model_features')
      .upsert(chunk, { onConflict: 'feature_id,date' })
    if (error) throw new Error(`Supabase model_features upsert failed: ${error.message}`)
  }

  return {
    featureId,
    sourceId,
    method,
    windowSize: window,
    count: rows.length,
    start: rows[0]?.date || null,
    end: rows.at(-1)?.date || null,
    fetchedAt: now,
  }
}

async function buildFeaturesForSource(sourceId, methods = ['raw', 'rolling_zscore'], windowByMethod = {}) {
  const series = normalizeHistorySeries(await readAllHistoryObservations(sourceId))
  if (!series.length) throw new Error(`No history observations for ${sourceId}`)
  const results = []
  for (const method of methods) {
    const window = windowByMethod[method] || (method === 'rolling_zscore' ? 120 : method === 'rolling_percentile' ? 1300 : null)
    const featureRows = buildFeatureSeries(series, method, window)
    results.push(await upsertModelFeatureRows(sourceId, method, featureRows, window))
  }
  return results
}

async function fetchFredHistorySeries(seriesId, transform = null, limit = 5000) {
  const series = normalizeHistorySeries(await fetchFredNumericObservations(seriesId, limit).then((rows) => rows.reverse()))
  return {
    provider: 'fred',
    transform,
    series: transform === 'yoy' ? annualPercentChange(series, 12) : series,
  }
}

async function fetchFredSpreadHistory(leftSeriesId, rightSeriesId, limit = 5000) {
  const [left, right] = await Promise.all([
    fetchFredNumericObservations(leftSeriesId, limit),
    fetchFredNumericObservations(rightSeriesId, limit),
  ])
  const rightByDate = new Map(normalizeHistorySeries(right.reverse()).map((row) => [row.date, row]))
  const series = normalizeHistorySeries(left.reverse())
    .map((row) => {
      const match = rightByDate.get(row.date)
      if (!match) return null
      return { date: row.date, value: Number((row.value - match.value).toFixed(6)) }
    })
    .filter(Boolean)
  return { provider: 'fred', transform: 'spread', series }
}

async function fetchFredRealRateHistory(policySeriesId, cpiSeriesId, cpiRaw = false) {
  const [policyResult, cpiResult] = await Promise.all([
    fetchFredHistorySeries(policySeriesId),
    fetchFredHistorySeries(cpiSeriesId),
  ])
  const cpiSeries = cpiRaw ? cpiResult.series : annualPercentChange(cpiResult.series, 12)
  const cpiByDate = new Map(cpiSeries.map((row) => [row.date.slice(0, 7), row]))
  const series = policyResult.series
    .map((row) => {
      const match = cpiByDate.get(row.date.slice(0, 7))
      if (!match) return null
      return { date: row.date, value: Number((row.value - match.value).toFixed(6)) }
    })
    .filter(Boolean)
  return { provider: 'fred', transform: 'real_rate', series }
}

async function fetchYahooRatioHistory(leftSymbol, rightSymbol) {
  const [left, right] = await Promise.all([
    fetchYahooHistory(leftSymbol, '10y', '1d'),
    fetchYahooHistory(rightSymbol, '10y', '1d'),
  ])
  const rightByDate = new Map(right.map((row) => [row.date, row]))
  const series = left
    .map((row) => {
      const match = rightByDate.get(row.date)
      if (!match || match.value === 0) return null
      return { date: row.date, value: Number((row.value / match.value).toFixed(8)) }
    })
    .filter(Boolean)
  return { provider: 'yahoo', transform: 'ratio', series }
}

async function fetchYahooAboveMaHistory(symbol, window = 200) {
  const history = await fetchYahooHistory(symbol, '10y', '1d')
  const series = history
    .map((row, index) => {
      const slice = history.slice(Math.max(0, index - window + 1), index + 1)
      if (slice.length < window) return null
      const sma = slice.reduce((sum, item) => sum + item.value, 0) / slice.length
      return { date: row.date, value: row.value > sma ? 1 : 0 }
    })
    .filter(Boolean)
  return { provider: 'yahoo', transform: `above_${window}dma`, series }
}

async function fetchEcbHistory(seriesKey) {
  const url = `${ECB_BASE}/${seriesKey}?format=csvdata&detail=dataonly`
  const { data } = await axios.get(url, { timeout: 30000 })
  const rows = parseCsv(data)
  const series = rows
    .map((row) => ({ date: row.TIME_PERIOD, value: Number.parseFloat(row.OBS_VALUE) }))
    .filter((row) => row.date && Number.isFinite(row.value))
  return { provider: 'ecb', series }
}

async function fetchEurostatHistory(dataset, filters = {}) {
  const params = new URLSearchParams({ lang: 'en' })
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, value)
  })
  const { data } = await getWithRetry(`${EUROSTAT_BASE}/${dataset}?${params.toString()}`, { timeout: 30000 }, 3, `[EUROSTAT] ${dataset}`)
  const series = jsonStatRows(data)
  return { provider: 'eurostat', series }
}

async function fetchBisReerHistory(currency) {
  if (FRED_API_KEY) {
    try {
      return await fetchFredBisReerHistory(currency)
    } catch (err) {
      console.warn(`[BIS REER] FRED history fallback for ${currency}: ${err.message}`)
    }
  }

  const targetCode = bisReerCode(currency)
  const { data } = await axios.get('https://www.bis.org/statistics/eer/broad.xlsx', { responseType: 'arraybuffer', timeout: 30000 })
  const workbook = XLSX.read(data, { type: 'buffer' })
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase() === 'real') || workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: true })
  const headerIndex = rows.findIndex((row) => row.some((cell) => String(cell).trim().toUpperCase() === targetCode))
  if (headerIndex < 0) throw new Error(`BIS currency not found: ${currency}`)
  const headers = rows[headerIndex].map((cell) => String(cell || '').trim().toUpperCase())
  const colIndex = headers.findIndex((cell) => cell === targetCode)
  const series = rows.slice(headerIndex + 1)
    .map((row) => {
      const excelDate = Number(row[0])
      const date = Number.isFinite(excelDate)
        ? new Date(Date.UTC(1899, 11, 30) + excelDate * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
        : String(row[0] || '')
      return { date, value: Number.parseFloat(row[colIndex]) }
    })
    .filter((row) => row.date && Number.isFinite(row.value))
  return {
    provider: 'bis',
    transform: 'reer_deviation_vs_10y_mean',
    series: buildReerDeviationVsMean(series, 120),
  }
}

async function fetchCftcHistory(market, invert = false, yearsBack = 5) {
  const currentYear = new Date().getUTCFullYear()
  const allRows = []
  for (let year = currentYear - yearsBack + 1; year <= currentYear; year += 1) {
    try {
      const url = `https://www.cftc.gov/files/dea/history/fut_fin_txt_${year}.zip`
      const { data } = await axios.get(url, { responseType: 'arraybuffer', timeout: 30000 })
      const zip = new AdmZip(Buffer.from(data))
      const entry = zip.getEntries().find((item) => item.entryName.toLowerCase().endsWith('.txt'))
      if (entry) allRows.push(...parseCsv(entry.getData().toString('utf8')))
    } catch (err) {
      console.warn(`[CFTC] History year ${year} skipped: ${err.message}`)
    }
  }
  const needle = market.toLowerCase()
  const series = allRows
    .filter((row) => {
      const name = String(row.Market_and_Exchange_Names || row['Market and Exchange Names'] || '').toLowerCase()
      return name.startsWith(`${needle} -`) || name === needle
    })
    .map((row) => {
      const longValue = Number.parseFloat(row.Asset_Mgr_Positions_Long_All || row['Asset Mgr Longs'] || '0')
      const shortValue = Number.parseFloat(row.Asset_Mgr_Positions_Short_All || row['Asset Mgr Shorts'] || '0')
      const compactDate = row.As_of_Date_In_Form_YYMMDD
      const date = row.Report_Date_as_YYYY_MM_DD || (/^\d{6}$/.test(compactDate || '') ? `20${compactDate.slice(0, 2)}-${compactDate.slice(2, 4)}-${compactDate.slice(4, 6)}` : compactDate)
      const value = longValue - shortValue
      return { date, value: invert ? -value : value }
    })
  return { provider: 'cftc', transform: invert ? 'inverted_net_asset_manager' : 'net_asset_manager', series }
}

async function fetchImfDataMapperHistory(indicator, country) {
  const { data } = await axios.get(`https://www.imf.org/external/datamapper/api/v1/${encodeURIComponent(indicator)}/${encodeURIComponent(country)}`, { timeout: 20000 })
  const rawSeries = data?.values?.[indicator]?.[country]
  if (!rawSeries) throw new Error(`No IMF DataMapper data for ${indicator}/${country}`)
  const series = Object.entries(rawSeries).map(([date, value]) => ({ date, value: Number(value) }))
  return { provider: 'imf-datamapper', series }
}

async function fetchWorldBankHistory(country, indicator) {
  const url = `https://api.worldbank.org/v2/country/${encodeURIComponent(country)}/indicator/${encodeURIComponent(indicator)}?format=json&per_page=200&date=1960:2026`
  const { data } = await getWithRetry(url, { timeout: 20000 }, 3, `[WORLDBANK] ${country}/${indicator}`)
  const observations = Array.isArray(data) ? data[1] : null
  if (!Array.isArray(observations)) throw new Error(`No World Bank data for ${country}/${indicator}`)
  const series = observations.map((row) => ({ date: row.date, value: Number(row.value) }))
  return { provider: 'worldbank', series }
}

async function fetchHistoryForSource(source) {
  if (source.fredSeriesId) {
    return fetchFredHistorySeries(source.fredSeriesId, source.fredYoY ? 'yoy' : null, HISTORY_FRED_LIMIT)
  }
  const endpoint = source.apiPath
  if (!endpoint) throw new Error('No automatic history endpoint configured')
  const url = new URL(endpoint, 'http://localhost')

  if (url.pathname === '/api/fred/spread') {
    return fetchFredSpreadHistory(
      url.searchParams.get('left'),
      url.searchParams.get('right'),
      Math.max(Number(url.searchParams.get('limit') || 0), HISTORY_FRED_LIMIT)
    )
  }
  if (url.pathname === '/api/fred/real-rate') {
    return fetchFredRealRateHistory(url.searchParams.get('policy'), url.searchParams.get('cpi'), url.searchParams.get('cpiraw') === 'true')
  }
  if (url.pathname.startsWith('/api/fred/percentile/')) {
    return fetchFredHistorySeries(url.pathname.split('/').at(-1), 'raw_for_percentile', HISTORY_FRED_LIMIT)
  }
  if (url.pathname.startsWith('/api/fred/above-ma/')) {
    return fetchFredHistorySeries(url.pathname.split('/').at(-1), `raw_for_${url.searchParams.get('window') || 200}dma`, HISTORY_FRED_LIMIT)
  }
  if (url.pathname === '/api/source/yahoo/latest') {
    return { provider: 'yahoo', series: await fetchYahooHistory(url.searchParams.get('symbol'), '10y', '1d') }
  }
  if (url.pathname === '/api/source/yahoo/ratio') {
    return fetchYahooRatioHistory(url.searchParams.get('left'), url.searchParams.get('right'))
  }
  if (url.pathname === '/api/source/yahoo/above-ma') {
    return fetchYahooAboveMaHistory(url.searchParams.get('symbol'), Number(url.searchParams.get('window') || 200))
  }
  if (url.pathname === '/api/source/ecb/latest') {
    return fetchEcbHistory(url.searchParams.get('seriesKey'))
  }
  if (url.pathname.startsWith('/api/source/eurostat/latest/')) {
    const dataset = url.pathname.split('/').at(-1)
    const filters = Object.fromEntries(url.searchParams.entries())
    return fetchEurostatHistory(dataset, filters)
  }
  if (url.pathname === '/api/source/bis/reer/latest') {
    return fetchBisReerHistory(url.searchParams.get('currency'))
  }
  if (url.pathname === '/api/source/bis/cb-assets/latest') {
    return fetchBisCbtaHistory(url.searchParams.get('refArea'))
  }
  if (url.pathname === '/api/source/central-bank/boc/policy-rate/latest') {
    return fetchBankOfCanadaPolicyRateHistory()
  }
  if (url.pathname === '/api/source/cftc/latest') {
    return fetchCftcHistory(url.searchParams.get('market'), url.searchParams.get('invert') === 'true')
  }
  if (url.pathname === '/api/source/oecd/niip/latest') {
    return fetchOecdNiipHistory(url.searchParams.get('country'))
  }
  if (url.pathname === '/api/source/imf-datamapper/latest') {
    return fetchImfDataMapperHistory(url.searchParams.get('indicator'), url.searchParams.get('country'))
  }
  if (url.pathname === '/api/source/worldbank/latest') {
    return fetchWorldBankHistory(url.searchParams.get('country'), url.searchParams.get('indicator'))
  }
  if (url.pathname === '/api/source/worldbank/tot/latest') {
    return fetchWorldBankTotHistory(url.searchParams.get('country'))
  }
  throw new Error(`No history fetcher for ${url.pathname}`)
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.get('/api/history/status', async (_req, res) => {
  try {
    res.json(await readHistoryStatus())
  } catch (err) {
    res.status(502).json({ error: 'History status failed', message: err.message })
  }
})

app.get('/api/history/series/:sourceId', async (req, res) => {
  try {
    res.json(await readHistorySeries(req.params.sourceId, {
      limit: req.query.limit,
      offset: req.query.offset,
      order: req.query.order,
    }))
  } catch (err) {
    res.status(502).json({ error: 'History series failed', message: err.message })
  }
})

app.post('/api/history/ingest', async (req, res) => {
  const source = req.body?.source
  if (!source?.id) return res.status(400).json({ error: 'source required' })
  try {
    const result = await fetchHistoryForSource(source)
    res.json(await saveHistoryResult(source, result))
  } catch (err) {
    const skipped = /No automatic history endpoint|No history fetcher/.test(err.message)
    const row = await saveHistoryFailure(source, skipped ? 'skipped' : 'error', err.message)
    res.status(skipped ? 200 : 502).json(row)
  }
})

app.post('/api/history/ingest-all', async (req, res) => {
  const sources = Array.isArray(req.body?.sources) ? req.body.sources : []
  if (!sources.length) return res.status(400).json({ error: 'sources required' })
  const results = []
  for (const source of sources) {
    try {
      const result = await fetchHistoryForSource(source)
      results.push(await saveHistoryResult(source, result))
    } catch (err) {
      const skipped = /No automatic history endpoint|No history fetcher/.test(err.message)
      results.push(await saveHistoryFailure(source, skipped ? 'skipped' : 'error', err.message))
    }
  }
  res.json({
    total: results.length,
    ok: results.filter((row) => row.status === 'ok').length,
    skipped: results.filter((row) => row.status === 'skipped').length,
    errors: results.filter((row) => row.status === 'error').length,
    results,
  })
})

app.post('/api/features/build/:sourceId', async (req, res) => {
  try {
    const methods = Array.isArray(req.body?.methods) && req.body.methods.length
      ? req.body.methods
      : ['raw', 'rolling_zscore']
    const windowByMethod = req.body?.windowByMethod || {}
    res.json({
      sourceId: req.params.sourceId,
      results: await buildFeaturesForSource(req.params.sourceId, methods, windowByMethod),
    })
  } catch (err) {
    res.status(502).json({ error: 'Feature build failed', message: err.message })
  }
})

app.post('/api/features/build-all', async (req, res) => {
  try {
    const status = await readHistoryStatus()
    const sourceIds = Object.values(status)
      .filter((row) => row.status === 'ok' && row.count > 0)
      .map((row) => row.sourceId)
    const limit = Math.max(1, Math.min(Number(req.body?.limit) || 20, 100))
    const batch = sourceIds.slice(0, limit)
    const results = []
    for (const sourceId of batch) {
      try {
        results.push({ sourceId, ok: true, results: await buildFeaturesForSource(sourceId) })
      } catch (err) {
        results.push({ sourceId, ok: false, error: err.message })
      }
    }
    res.json({
      totalAvailable: sourceIds.length,
      processed: results.length,
      ok: results.filter((row) => row.ok).length,
      errors: results.filter((row) => !row.ok).length,
      results,
    })
  } catch (err) {
    res.status(502).json({ error: 'Feature build-all failed', message: err.message })
  }
})

// FRED proxy endpoints
app.get('/api/fred/latest/:seriesId', async (req, res) => {
  const { seriesId } = req.params
  try {
    const result = await fetchFredLatestValue(seriesId)
    if (!result || result.value === null) {
      return res.status(404).json({ error: 'No data available', seriesId })
    }
    res.json(result)
  } catch (err) {
    console.error(`[FRED] Error fetching latest ${seriesId}:`, err.message)
    res.status(502).json({ error: 'FRED fetch failed', message: err.message })
  }
})

app.get('/api/fred/yoy/:seriesId', async (req, res) => {
  const { seriesId } = req.params
  const quarterly = req.query.quarterly === 'true'
  try {
    const result = await (quarterly ? fetchFredYoYChangeQuarterly(seriesId) : fetchFredYoYChange(seriesId))
    if (!result || result.value === null) {
      return res.status(404).json({ error: 'Not enough data for YoY', seriesId })
    }
    res.json(result)
  } catch (err) {
    console.error(`[FRED] Error fetching YoY ${seriesId}:`, err.message)
    res.status(502).json({ error: 'FRED fetch failed', message: err.message })
  }
})

app.get('/api/fred/percentile/:seriesId', async (req, res) => {
  const { seriesId } = req.params
  const limit = Math.min(parseInt(req.query.limit || '1300', 10), 5000)
  try {
    const result = await fetchFredPercentile(seriesId, limit)
    if (!result || result.value === null) {
      return res.status(404).json({ error: 'Not enough data for percentile', seriesId })
    }
    res.json(result)
  } catch (err) {
    console.error(`[FRED] Error fetching percentile ${seriesId}:`, err.message)
    res.status(502).json({ error: 'FRED percentile failed', message: err.message })
  }
})

app.get('/api/fred/real-rate', async (req, res) => {
  const policy = String(req.query.policy || '')
  const cpi = String(req.query.cpi || '')
  const quarterly = req.query.quarterly === 'true'
  const cpiraw = req.query.cpiraw === 'true' // CPI series is already a YoY rate — use latest value directly
  if (!policy || !cpi) return res.status(400).json({ error: 'policy and cpi required' })
  try {
    const policyObs = await fetchFredObservations(policy, 12)
    const policyLatest = policyObs.find((obs) => Number.isFinite(Number.parseFloat(obs.value)))
    if (!policyLatest) throw new Error(`No valid policy rate for ${policy}`)
    const policyVal = Number.parseFloat(policyLatest.value)
    let cpiYoY
    if (cpiraw) {
      const cpiObs = await fetchFredObservations(cpi, 12)
      const cpiLatest = cpiObs.find((obs) => Number.isFinite(Number.parseFloat(obs.value)))
      if (!cpiLatest) throw new Error(`No valid CPI value for ${cpi}`)
      cpiYoY = { value: Number.parseFloat(cpiLatest.value), date: cpiLatest.date }
    } else {
      cpiYoY = await (quarterly ? fetchFredYoYChangeQuarterly(cpi) : fetchFredYoYChange(cpi))
    }
    if (!cpiYoY || !Number.isFinite(cpiYoY.value)) throw new Error(`No valid CPI YoY for ${cpi}`)
    const realRate = Number((policyVal - cpiYoY.value).toFixed(2))
    res.json({
      value: realRate,
      date: policyLatest.date,
      seriesId: `${policy}-real`,
      meta: { policyRate: policyVal, cpiYoY: cpiYoY.value },
    })
  } catch (err) {
    res.status(502).json({ error: 'Real rate calculation failed', message: err.message })
  }
})

app.get('/api/fred/spread', async (req, res) => {
  const left = String(req.query.left || '')
  const right = String(req.query.right || '')
  const limit = Math.min(parseInt(req.query.limit || '30', 10), 1000)
  if (!left || !right) return res.status(400).json({ error: 'left and right series required' })
  try {
    const result = await fetchFredSpread(left, right, limit)
    if (!result || result.value === null) {
      return res.status(404).json({ error: 'No aligned observations for spread', left, right })
    }
    res.json(result)
  } catch (err) {
    console.error(`[FRED] Error fetching spread ${left}-${right}:`, err.message)
    res.status(502).json({ error: 'FRED spread failed', message: err.message })
  }
})

app.get('/api/fred/above-ma/:seriesId', async (req, res) => {
  const { seriesId } = req.params
  const window = Math.min(parseInt(req.query.window || '200', 10), 1000)
  const limit = Math.min(parseInt(req.query.limit || String(window + 60), 10), 5000)
  try {
    const result = await fetchFredAboveMovingAverage(seriesId, window, limit)
    if (!result || result.value === null) {
      return res.status(404).json({ error: 'Not enough data for moving average', seriesId })
    }
    res.json(result)
  } catch (err) {
    console.error(`[FRED] Error fetching above-ma ${seriesId}:`, err.message)
    res.status(502).json({ error: 'FRED moving average failed', message: err.message })
  }
})

app.get('/api/fred/:seriesId', async (req, res) => {
  const { seriesId } = req.params
  const limit = Math.min(parseInt(req.query.limit || '1', 10), 1000)
  try {
    const observations = await fetchFredObservations(seriesId, limit)
    res.json({ seriesId, count: observations.length, observations })
  } catch (err) {
    console.error(`[FRED] Error fetching ${seriesId}:`, err.message)
    res.status(502).json({ error: 'FRED fetch failed', message: err.message })
  }
})

app.get('/api/source/yahoo/latest', async (req, res) => {
  try {
    if (!req.query.symbol) return res.status(400).json({ error: 'symbol required' })
    res.json(await fetchYahooLatest(String(req.query.symbol)))
  } catch (err) {
    res.status(502).json({ error: 'Yahoo fetch failed', message: err.message })
  }
})

app.get('/api/source/yahoo/above-ma', async (req, res) => {
  try {
    if (!req.query.symbol) return res.status(400).json({ error: 'symbol required' })
    const window = Math.min(parseInt(req.query.window || '200', 10), 1000)
    res.json(await fetchYahooAboveMovingAverage(String(req.query.symbol), window))
  } catch (err) {
    res.status(502).json({ error: 'Yahoo moving average failed', message: err.message })
  }
})

app.get('/api/source/yahoo/ratio', async (req, res) => {
  try {
    if (!req.query.left || !req.query.right) return res.status(400).json({ error: 'left and right symbols required' })
    res.json(await fetchYahooRatio(String(req.query.left), String(req.query.right)))
  } catch (err) {
    res.status(502).json({ error: 'Yahoo ratio failed', message: err.message })
  }
})

app.get('/api/source/ecb/latest', async (req, res) => {
  try {
    if (!req.query.seriesKey) return res.status(400).json({ error: 'seriesKey required' })
    res.json(await fetchEcbLatest(String(req.query.seriesKey)))
  } catch (err) {
    res.status(502).json({ error: 'ECB fetch failed', message: err.message })
  }
})

app.get('/api/source/eurostat/latest/:dataset', async (req, res) => {
  try {
    const { dataset } = req.params
    const { dataset: _dataset, ...filters } = req.query
    res.json(await fetchEurostatLatest(dataset, filters))
  } catch (err) {
    res.status(502).json({ error: 'Eurostat fetch failed', message: err.message })
  }
})

app.get('/api/source/oecd/latest', async (req, res) => {
  try {
    if (!req.query.url) return res.status(400).json({ error: 'url required' })
    res.json(await fetchOecdLatest(String(req.query.url)))
  } catch (err) {
    res.status(502).json({ error: 'OECD fetch failed', message: err.message })
  }
})

app.get('/api/source/bis/reer/latest', async (req, res) => {
  try {
    if (!req.query.currency) return res.status(400).json({ error: 'currency required' })
    res.json(await fetchBisReerLatest(String(req.query.currency)))
  } catch (err) {
    res.status(502).json({ error: 'BIS fetch failed', message: err.message })
  }
})

app.get('/api/source/bis/cb-assets/latest', async (req, res) => {
  try {
    if (!req.query.refArea) return res.status(400).json({ error: 'refArea required' })
    res.json(await fetchBisCbtaLatest(String(req.query.refArea)))
  } catch (err) {
    res.status(502).json({ error: 'BIS CBTA fetch failed', message: err.message })
  }
})

app.get('/api/source/cftc/latest', async (req, res) => {
  try {
    if (!req.query.market) return res.status(400).json({ error: 'market required' })
    const result = await fetchCftcLatest(String(req.query.market))
    if (String(req.query.invert || '').toLowerCase() === 'true') {
      result.value = Number((-result.value).toFixed(2))
      result.raw = result.value
      result.meta = { ...result.meta, inverted: true }
    }
    res.json(result)
  } catch (err) {
    res.status(502).json({ error: 'CFTC fetch failed', message: err.message })
  }
})

app.get('/api/source/imf/latest', async (req, res) => {
  try {
    if (!req.query.dataset || !req.query.seriesKey) {
      return res.status(400).json({ error: 'dataset and seriesKey required' })
    }
    res.json(await fetchImfLatest(String(req.query.dataset), String(req.query.seriesKey), String(req.query.startPeriod || '2000')))
  } catch (err) {
    res.status(502).json({ error: 'IMF fetch failed', message: err.message })
  }
})

app.get('/api/source/oecd/niip/latest', async (req, res) => {
  try {
    if (!req.query.country) return res.status(400).json({ error: 'country required (ISO3)' })
    res.json(await fetchOecdNiipLatest(String(req.query.country)))
  } catch (err) {
    res.status(502).json({ error: 'OECD NIIP fetch failed', message: err.message })
  }
})

app.get('/api/source/imf-datamapper/latest', async (req, res) => {
  try {
    if (!req.query.indicator || !req.query.country) {
      return res.status(400).json({ error: 'indicator and country required' })
    }
    res.json(await fetchImfDataMapperLatest(String(req.query.indicator), String(req.query.country)))
  } catch (err) {
    res.status(502).json({ error: 'IMF DataMapper fetch failed', message: err.message })
  }
})

app.get('/api/source/worldbank/latest', async (req, res) => {
  try {
    if (!req.query.country || !req.query.indicator) {
      return res.status(400).json({ error: 'country and indicator required' })
    }
    res.json(await fetchWorldBankLatest(String(req.query.country), String(req.query.indicator)))
  } catch (err) {
    res.status(502).json({ error: 'World Bank fetch failed', message: err.message })
  }
})

app.get('/api/source/worldbank/tot/latest', async (req, res) => {
  try {
    if (!req.query.country) return res.status(400).json({ error: 'country required' })
    res.json(await fetchWorldBankTotLatest(String(req.query.country)))
  } catch (err) {
    res.status(502).json({ error: 'World Bank ToT fetch failed', message: err.message })
  }
})

app.get('/api/source/central-bank/boc/policy-rate/latest', async (_req, res) => {
  try {
    res.json(await fetchBankOfCanadaPolicyRate())
  } catch (err) {
    res.status(502).json({ error: 'Central bank fetch failed', message: err.message })
  }
})


// Indicadores por país (raw scrape)
app.get('/api/indicators/:country', async (req, res) => {
  const country = req.params.country.toLowerCase()
  const slug = countrySlugs[country] || country
  const cacheKey = `indicators_${slug}`

  try {
    let data = getCached(cacheKey)
    if (!data) {
      data = await fetchOfficialCountryIndicators(slug)
      setCached(cacheKey, data)
    }
    res.json(data)
  } catch (err) {
    console.error(`Error scraping ${slug}:`, err.message)
    res.status(502).json({
      error: 'Scraping failed',
      message: err.message,
      fallback: true,
    })
  }
})

// Fallback data cuando el scraping falla
const fallbackData = {
  source: 'fallback-mock',
  scrapedAt: new Date().toISOString(),
  gdpUsa: 2.9,
  gdpEur: 0.3,
  gdpChn: 5.2,
  gdpJpn: 0.1,
  gdpResto: 0,
  vix: 35,
  hyOas: 35,
  sp200dma: 1,
  embi: 55,
  smartZ: 0.2,
  retailZ: -0.5,
  dxy: 103.5,
  dxy200dma: 101.0,
  dxyRising: 1,
  cpiG7: 2.8,
  breakevens: 2.3,
}

function getGDP(indicators) {
  if (!indicators || indicators.length === 0) return 0
  const gdp = findIndicator(indicators, ['GDP Growth Rate', 'GDP Annual'])
  return gdp ? parseFloat(gdp.last) : 0
}

function getCPI(indicators) {
  if (!indicators || indicators.length === 0) return 0
  const cpi = findIndicator(indicators, ['Inflation Rate', 'Consumer Price'])
  return cpi ? parseFloat(cpi.last) : 0
}

// Endpoint unificado: devuelve los datos mapeados para Polaris
app.get('/api/polaris/worldview', async (_req, res) => {
  const cacheKey = 'polaris_worldview'
  let data = getCached(cacheKey)

  if (data) {
    return res.json(data)
  }

  try {
    let gdpUsa = null
    let gdpEur = null
    let gdpJpn = null
    let cpiUsa = null
    let vix = null
    let hyOas = null
    let sp200dma = null
    let embi = null
    let breakevens = null
    let dxy = null
    let dxy200dma = null
    let dxyRising = null

    // Todas las fuentes en paralelo para minimizar latencia en Vercel
    const [
      fredGdpUsa, fredCpiUsa, fredVix, fredHyOas, fredSp200dma,
      fredEmbi, fredBreakevens, fredGdpEur, fredGdpJpn, yahooDxy,
    ] = await Promise.allSettled([
      FRED_API_KEY ? fetchFredLatestValue('A191RL1Q225SBEA') : Promise.resolve(null),
      FRED_API_KEY ? fetchFredYoYChange('CPIAUCSL') : Promise.resolve(null),
      FRED_API_KEY ? fetchFredPercentile('VIXCLS', 1300) : Promise.resolve(null),
      FRED_API_KEY ? fetchFredPercentile('BAMLH0A0HYM2', 1300) : Promise.resolve(null),
      FRED_API_KEY ? fetchFredAboveMovingAverage('SP500', 200, 320) : Promise.resolve(null),
      FRED_API_KEY ? fetchFredPercentile('BAMLEMCBPIOAS', 756) : Promise.resolve(null),
      FRED_API_KEY ? fetchFredLatestValue('T5YIFR') : Promise.resolve(null),
      FRED_API_KEY ? fetchFredYoYChangeQuarterly('CLVMNACSCAB1GQEA19') : Promise.resolve(null),
      FRED_API_KEY ? fetchFredYoYChangeQuarterly('JPNRGDPEXP') : Promise.resolve(null),
      fetchYahooAboveMovingAverage('DX-Y.NYB', 200),
    ])

    const val = (settled) => settled.status === 'fulfilled' ? settled.value?.value ?? null : null
    const meta = (settled) => settled.status === 'fulfilled' ? settled.value?.meta ?? null : null

    gdpUsa = val(fredGdpUsa)
    cpiUsa = val(fredCpiUsa)
    vix    = val(fredVix)
    hyOas  = val(fredHyOas)
    sp200dma = val(fredSp200dma)
    embi   = val(fredEmbi)
    breakevens = val(fredBreakevens)
    gdpEur = val(fredGdpEur)
    gdpJpn = val(fredGdpJpn)

    const dxyMeta = meta(yahooDxy)
    if (dxyMeta) {
      dxy       = dxyMeta.latestValue
      dxy200dma = dxyMeta.movingAverage
      dxyRising = val(yahooDxy)
    }

    console.log(`[worldview] gdpUsa=${gdpUsa} gdpEur=${gdpEur} gdpJpn=${gdpJpn} vix=${vix} dxy=${dxy}`)

    const allFailed = [gdpUsa, cpiUsa, vix, hyOas, sp200dma, embi, breakevens].every((value) => value === null)

    if (allFailed) {
      console.warn('Official sources failed, returning fallback data')
      data = { ...fallbackData, fallback: true }
    } else {
      const usaGDP = gdpUsa ?? fallbackData.gdpUsa
      const usaCPI = cpiUsa ?? fallbackData.cpiG7
      data = {
        source: 'fred-primary+official-fallback',
        scrapedAt: new Date().toISOString(),
        gdpUsa: usaGDP,
        gdpEur: gdpEur ?? fallbackData.gdpEur,
        gdpChn: fallbackData.gdpChn,
        gdpJpn: gdpJpn ?? fallbackData.gdpJpn,
        gdpResto: 0,
        vix: vix ?? fallbackData.vix,
        hyOas: hyOas ?? fallbackData.hyOas,
        sp200dma: sp200dma ?? fallbackData.sp200dma,
        embi: embi ?? fallbackData.embi,
        smartZ: fallbackData.smartZ,
        retailZ: fallbackData.retailZ,
        dxy: dxy ?? fallbackData.dxy,
        dxy200dma: dxy200dma ?? fallbackData.dxy200dma,
        dxyRising: dxyRising ?? 1,
        cpiG7: usaCPI,
        breakevens: breakevens ?? fallbackData.breakevens,
      }
      setCached(cacheKey, data)
    }

    res.json(data)
  } catch (err) {
    console.error('Error en /api/polaris/worldview:', err.message)
    res.json({ ...fallbackData, fallback: true, error: err.message })
  }
})

// Endpoint dinamico desactivado hasta conectar fetchers oficiales por fuente.
app.post('/api/scrape', express.json(), async (req, res) => {
  res.status(410).json({ success: false, error: 'Scraping disabled', message: 'Use official source endpoints instead.' })
})

async function scrapeOfficialSourceFromUrl(url, indicatorName, forceJsSnippet = false) {
  console.log(`[SCRAPE] Target: ${url}${forceJsSnippet ? ' (forced js_snippet)' : ''}`)

  let html
  let usedProxy = false

  // Intentar ScrapingAnt primero (anti-bot bypass)
  try {
    if (forceJsSnippet && SCRAPINGANT_API_KEY) {
      const jsSnippet = 'await new Promise(r => setTimeout(r, 5000));'
      html = await fetchViaScrapingAnt(url, { js_snippet: jsSnippet, timeout: 60000, wait_for_selector: '.table-responsive' })
    } else {
      html = await fetchViaScrapingAnt(url)
    }
    usedProxy = true
  } catch (antErr) {
    console.log(`[SCRAPINGANT] Failed: ${antErr.message}. Falling back to direct fetch.`)
    // Fallback: fetch directo (solo funciona en localhost si TE no bloquea)
    const { data } = await axios.get(url, { headers: browserHeaders, timeout: 5000 })
    html = data
  }

  // Log primeros 800 chars para debugging
  console.log(`[SCRAPE] HTML preview (${usedProxy ? 'via ScrapingAnt' : 'direct'}): ${html.substring(0, 800).replace(/\n/g, ' ')}`)

  let $ = cheerio.load(html)
  let indicators = extractIndicators($)
  console.log(`[SCRAPE] Found ${indicators.length} indicators on first attempt`)

  // Ultimo intento: ScrapingAnt con js_snippet para esperar carga dinamica
  if (indicators.length === 0 && usedProxy && SCRAPINGANT_API_KEY && !forceJsSnippet) {
    try {
      console.log(`[SCRAPE] Retrying with js_snippet to wait for dynamic content...`)
      const jsSnippet = 'await new Promise(r => setTimeout(r, 5000));'
      html = await fetchViaScrapingAnt(url, { js_snippet: jsSnippet, timeout: 60000, wait_for_selector: '.table-responsive' })
      $ = cheerio.load(html)
      indicators = extractIndicators($)
      console.log(`[SCRAPE] Found ${indicators.length} indicators after js_snippet wait`)
    } catch (retryErr) {
      console.log(`[SCRAPE] js_snippet retry failed: ${retryErr.message}`)
    }
  }

  // Debug: mostrar primeros 5 indicadores encontrados
  if (indicators.length > 0) {
    console.log(`[SCRAPE] First indicators:`, indicators.slice(0, 5).map((i) => i.name))
  } else {
    // Si no hay tabla, puede ser que TE este devolviendo una pagina de challenge/bot
    const title = $('title').text()
    const bodyText = $('body').text().substring(0, 200)
    console.log(`[SCRAPE] Page title: "${title}"`)
    console.log(`[SCRAPE] Body preview: "${bodyText}"`)
    console.log(`[SCRAPE] WARNING: TE likely returned bot protection page. No indicators found.`)
  }

  // Si se especifico un indicatorName, buscarlo y devolver solo ese
  let matchedIndicator = null
  if (indicatorName && indicators.length > 0) {
    const search = indicatorName.toLowerCase()
    console.log(`[SCRAPE] Searching for: "${search}"`)
    matchedIndicator = indicators.find((ind) =>
      ind.name.toLowerCase().includes(search)
    )
    // Si no hay match exacto, buscar palabras individuales
    if (!matchedIndicator) {
      const words = search.split(/\s+/).filter((w) => w.length > 2)
      matchedIndicator = indicators.find((ind) =>
        words.some((w) => ind.name.toLowerCase().includes(w))
      )
      if (matchedIndicator) {
        console.log(`[SCRAPE] Fuzzy match found: "${matchedIndicator.name}"`)
      }
    } else {
      console.log(`[SCRAPE] Exact match found: "${matchedIndicator.name}"`)
    }
  }

  return {
    indicators,
    matchedIndicator: matchedIndicator || null,
    totalIndicators: indicators.length,
  }
}

function extractIndicators($) {
  const indicators = []

  // Selector principal
  $('.table-responsive table tbody tr').each((_, row) => {
    const cells = $(row).find('td')
    if (cells.length >= 3) {
      const name = $(cells[0]).text().trim()
      const last = $(cells[1]).text().trim().replace(/,/g, '')
      const previous = $(cells[2]).text().trim().replace(/,/g, '')
      const unit = $(cells[3]).text().trim() || ''

      if (name && last) {
        indicators.push({
          name,
          last: parseFloat(last) || last,
          previous: parseFloat(previous) || previous,
          unit,
        })
      }
    }
  })

  // Fallback: cualquier tabla
  if (indicators.length === 0) {
    $('table tbody tr').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length >= 3) {
        const name = $(cells[0]).text().trim()
        const last = $(cells[1]).text().trim().replace(/,/g, '')
        const previous = $(cells[2]).text().trim().replace(/,/g, '')
        if (name && last && !isNaN(parseFloat(last))) {
          indicators.push({ name, last: parseFloat(last), previous: parseFloat(previous) || null, unit: '' })
        }
      }
    })
  }

  // Fallback 2: buscar divs con clase tipo "table" o listas de indicadores
  if (indicators.length === 0) {
    $('[class*="table"] tbody tr, [class*="datatable"] tbody tr, .indicator-row').each((_, row) => {
      const cells = $(row).find('td')
      if (cells.length >= 2) {
        const name = $(cells[0]).text().trim()
        const last = $(cells[1]).text().trim().replace(/,/g, '')
        if (name && last && !isNaN(parseFloat(last))) {
          indicators.push({ name, last: parseFloat(last), previous: null, unit: '' })
        }
      }
    })
  }

  return indicators
}

// ─── Auth helpers ────────────────────────────────────────────────────────────

async function requireAdmin(req, res) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'No autorizado' }); return null }
  if (!supabaseAdmin) { res.status(500).json({ error: 'Supabase admin no configurado' }); return null }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) { res.status(401).json({ error: 'Token inválido' }); return null }
  if (user.app_metadata?.role !== 'admin') { res.status(403).json({ error: 'Acceso denegado' }); return null }
  return user
}

// POST /api/auth/invite — admin invita a un nuevo usuario por email
app.post('/api/auth/invite', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
    redirectTo: 'https://polarisframework.vercel.app/',
  })
  if (error) return res.status(400).json({ error: error.message })
  res.json({ user: data.user })
})

// GET /api/auth/users — admin lista todos los usuarios
app.get('/api/auth/users', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const { data, error } = await supabaseAdmin.auth.admin.listUsers()
  if (error) return res.status(400).json({ error: error.message })
  res.json({ users: data.users })
})

// DELETE /api/auth/users/:userId — admin elimina un usuario
app.delete('/api/auth/users/:userId', async (req, res) => {
  const admin = await requireAdmin(req, res)
  if (!admin) return

  const { userId } = req.params
  if (userId === admin.id) return res.status(400).json({ error: 'No podés eliminarte a vos mismo' })

  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
  if (error) return res.status(400).json({ error: error.message })
  res.json({ success: true })
})

// ─────────────────────────────────────────────────────────────────────────────

// Solo iniciar servidor si se ejecuta directamente (desarrollo local)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Polaris Proxy Server running on http://localhost:${PORT}`)
    console.log(`📊 Endpoints:`)
    console.log(`   GET http://localhost:${PORT}/api/health`)
    console.log(`   GET http://localhost:${PORT}/api/fred/:seriesId`)
    console.log(`   GET http://localhost:${PORT}/api/fred/latest/:seriesId`)
    console.log(`   GET http://localhost:${PORT}/api/fred/yoy/:seriesId`)
    console.log(`   GET http://localhost:${PORT}/api/source/yahoo/latest?symbol=EURUSD%3DX`)
    console.log(`   GET http://localhost:${PORT}/api/source/ecb/latest?seriesKey=...`)
    console.log(`   GET http://localhost:${PORT}/api/source/eurostat/latest/:dataset`)
    console.log(`   GET http://localhost:${PORT}/api/source/oecd/latest?url=...`)
    console.log(`   GET http://localhost:${PORT}/api/source/bis/reer/latest?currency=USD`)
    console.log(`   GET http://localhost:${PORT}/api/source/cftc/latest?market=EURO%20FX`)
    console.log(`   GET http://localhost:${PORT}/api/source/imf/latest?dataset=...&seriesKey=...`)
    console.log(`   GET http://localhost:${PORT}/api/indicators/:country`)
    console.log(`   GET http://localhost:${PORT}/api/polaris/worldview`)
    console.log(`   POST http://localhost:${PORT}/api/scrape`)
  })
}

module.exports = (req, res) => {
  app(req, res)
}
