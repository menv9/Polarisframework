const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

// CORS: permitir cualquier origen
app.use(cors({ origin: '*' }))
app.use(express.json())

// Mapeo de códigos de país a slugs de Trading Economics
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

// ScrapingAnt config
const SCRAPINGANT_API_KEY = process.env.SCRAPINGANT_API_KEY || ''
const SCRAPINGANT_BASE = 'https://api.scrapingant.com/v2/general'

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

async function fetchViaScrapingAnt(targetUrl) {
  if (!SCRAPINGANT_API_KEY) {
    throw new Error('ScrapingAnt API key not configured')
  }
  const params = new URLSearchParams({ url: targetUrl })
  const apiUrl = `${SCRAPINGANT_BASE}?${params.toString()}`
  console.log(`[SCRAPINGANT] Proxying: ${targetUrl}`)
  const { data: html } = await axios.get(apiUrl, {
    headers: { 'x-api-key': SCRAPINGANT_API_KEY },
    timeout: 15000,
  })
  console.log(`[SCRAPINGANT] Success, HTML length: ${html.length}`)
  return html
}

async function scrapeTradingEconomics(countrySlug) {
  const url = `https://tradingeconomics.com/${countrySlug}/indicators`

  let html
  try {
    html = await fetchViaScrapingAnt(url)
  } catch (antErr) {
    console.log(`[SCRAPINGANT] Failed for country ${countrySlug}: ${antErr.message}. Falling back.`)
    const { data } = await axios.get(url, { headers: browserHeaders, timeout: 5000 })
    html = data
  }

  const $ = cheerio.load(html)

  const indicators = []

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

  return {
    country: countrySlug,
    url,
    scrapedAt: new Date().toISOString(),
    indicators,
  }
}

function findIndicator(indicators, searchTerms) {
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms]
  return indicators.find((ind) =>
    terms.some((term) => ind.name.toLowerCase().includes(term.toLowerCase()))
  )
}

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Indicadores por país (raw scrape)
app.get('/api/indicators/:country', async (req, res) => {
  const country = req.params.country.toLowerCase()
  const slug = countrySlugs[country] || country
  const cacheKey = `indicators_${slug}`

  try {
    let data = getCached(cacheKey)
    if (!data) {
      data = await scrapeTradingEconomics(slug)
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
  vix: 15,
  hyOas: 35,
  sp200dma: 1,
  embi: 320,
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
    let usa, eur, chn, jpn
    try { usa = await scrapeTradingEconomics('united-states') } catch (e) { console.warn('USA scrape failed:', e.message) }
    try { eur = await scrapeTradingEconomics('euro-area') } catch (e) { console.warn('EUR scrape failed:', e.message) }
    try { chn = await scrapeTradingEconomics('china') } catch (e) { console.warn('CHN scrape failed:', e.message) }
    try { jpn = await scrapeTradingEconomics('japan') } catch (e) { console.warn('JPN scrape failed:', e.message) }

    const allFailed = !usa && !eur && !chn && !jpn

    if (allFailed) {
      console.warn('All scrapes failed, returning fallback data')
      data = { ...fallbackData, fallback: true }
    } else {
      data = {
        source: 'trading-economics-proxy',
        scrapedAt: new Date().toISOString(),
        gdpUsa: usa ? getGDP(usa.indicators) : fallbackData.gdpUsa,
        gdpEur: eur ? getGDP(eur.indicators) : fallbackData.gdpEur,
        gdpChn: chn ? getGDP(chn.indicators) : fallbackData.gdpChn,
        gdpJpn: jpn ? getGDP(jpn.indicators) : fallbackData.gdpJpn,
        gdpResto: 0,
        vix: fallbackData.vix,
        hyOas: fallbackData.hyOas,
        sp200dma: 1,
        embi: fallbackData.embi,
        smartZ: fallbackData.smartZ,
        retailZ: fallbackData.retailZ,
        dxy: fallbackData.dxy,
        dxy200dma: fallbackData.dxy200dma,
        dxyRising: 1,
        cpiG7: ((usa ? getCPI(usa.indicators) : fallbackData.cpiG7) + (eur ? getCPI(eur.indicators) : fallbackData.cpiG7)) / 2,
        breakevens: fallbackData.breakevens,
      }
      setCached(cacheKey, data)
    }

    res.json(data)
  } catch (err) {
    console.error('Error en /api/polaris/worldview:', err.message)
    res.json({ ...fallbackData, fallback: true, error: err.message })
  }
})

// Endpoint dinamico: scrapea cualquier URL de Trading Economics
app.post('/api/scrape', express.json(), async (req, res) => {
  const { url, indicatorName } = req.body
  if (!url) {
    return res.status(400).json({ error: 'URL required' })
  }

  // Validar que sea dominio de Trading Economics (seguridad basica)
  if (!url.includes('tradingeconomics.com')) {
    return res.status(400).json({ error: 'Only tradingeconomics.com URLs allowed' })
  }

  try {
    const result = await scrapeTradingEconomicsFromUrl(url, indicatorName)
    res.json({
      success: true,
      url,
      indicatorName: indicatorName || null,
      scrapedAt: new Date().toISOString(),
      ...result,
    })
  } catch (err) {
    console.error('Error en /api/scrape:', err.message)
    res.status(502).json({
      success: false,
      error: 'Scraping failed',
      message: err.message,
    })
  }
})

async function scrapeTradingEconomicsFromUrl(url, indicatorName) {
  console.log(`[SCRAPE] Target: ${url}`)

  let html
  let usedProxy = false

  // Intentar ScrapingAnt primero (anti-bot bypass)
  try {
    html = await fetchViaScrapingAnt(url)
    usedProxy = true
  } catch (antErr) {
    console.log(`[SCRAPINGANT] Failed: ${antErr.message}. Falling back to direct fetch.`)
    // Fallback: fetch directo (solo funciona en localhost si TE no bloquea)
    const { data } = await axios.get(url, { headers: browserHeaders, timeout: 5000 })
    html = data
  }

  // Log primeros 800 chars para debugging
  console.log(`[SCRAPE] HTML preview (${usedProxy ? 'via ScrapingAnt' : 'direct'}): ${html.substring(0, 800).replace(/\n/g, ' ')}`)

  const $ = cheerio.load(html)

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

  console.log(`[SCRAPE] Found ${indicators.length} indicators via .table-responsive`)

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
    console.log(`[SCRAPE] Found ${indicators.length} indicators via fallback table selector`)
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
    console.log(`[SCRAPE] Found ${indicators.length} indicators via generic table selector`)
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

// Solo iniciar servidor si se ejecuta directamente (desarrollo local)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Polaris Proxy Server running on http://localhost:${PORT}`)
    console.log(`📊 Endpoints:`)
    console.log(`   GET http://localhost:${PORT}/api/health`)
    console.log(`   GET http://localhost:${PORT}/api/indicators/:country`)
    console.log(`   GET http://localhost:${PORT}/api/polaris/worldview`)
  })
}

module.exports = (req, res) => {
  app(req, res)
}
