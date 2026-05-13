const express = require('express')
const axios = require('axios')
const cheerio = require('cheerio')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 3001

// CORS: permitir cualquier origen (frontend en Vercel es mismo dominio, pero
// en dev puede ser localhost)
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

// Headers para simular navegador real
const browserHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
}

/**
 * Scrapea la página de indicadores de Trading Economics para un país.
 */
async function scrapeTradingEconomics(countrySlug) {
  const url = `https://tradingeconomics.com/${countrySlug}/indicators`
  const { data: html } = await axios.get(url, { headers: browserHeaders, timeout: 5000 })
  const $ = cheerio.load(html)

  const indicators = []

  // Trading Economics usa tablas con clase "table" dentro de .table-responsive
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

  // Fallback: si no encontramos filas, probamos con selectores alternativos
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

/**
 * Extrae el valor de un indicador específico por nombre (fuzzy match).
 */
function findIndicator(indicators, searchTerms) {
  const terms = Array.isArray(searchTerms) ? searchTerms : [searchTerms]
  return indicators.find((ind) =>
    terms.some((term) => ind.name.toLowerCase().includes(term.toLowerCase()))
  )
}

// ============================================================
// ENDPOINTS
// ============================================================

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

// Helper para extraer GDP growth
function getGDP(indicators) {
  if (!indicators || indicators.length === 0) return 0
  const gdp = findIndicator(indicators, ['GDP Growth Rate', 'GDP Annual'])
  return gdp ? parseFloat(gdp.last) : 0
}

// Helper para extraer CPI
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
    // Scrapear secuencialmente para evitar timeouts en Vercel (10s límite Hobby)
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

// Solo iniciar servidor si se ejecuta directamente (desarrollo local)
// En Vercel serverless, esto no se ejecuta
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Polaris Proxy Server running on http://localhost:${PORT}`)
    console.log(`📊 Endpoints:`)
    console.log(`   GET http://localhost:${PORT}/api/health`)
    console.log(`   GET http://localhost:${PORT}/api/indicators/:country`)
    console.log(`   GET http://localhost:${PORT}/api/polaris/worldview`)
  })
}

module.exports = app
