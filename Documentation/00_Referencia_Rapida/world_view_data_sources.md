# World View — Lista Mínima de Variables a Descargar

> Lista operativa de datos necesarios para calcular el `WorldView_state` completo. Solo inputs; no incluye outputs ni betas de otros módulos.

---

## 1. RÉGIMEN RISK-ON / RISK-OFF (§3) — 4 variables

| Variable | Fuente principal | URL / Ticker | Frecuencia | Gratuito |
|---|---|---|---|---|
| **VIX** | CBOE | `^VIX` (Yahoo Finance) | Diaria | ✅ Sí |
| **HY OAS** | FRED / ICE BofA | `BAMLH0A0HYM2` (FRED) | Diaria | ✅ Sí |
| **S&P 500** | Yahoo Finance / FRED | `^GSPC` (Yahoo) | Diaria | ✅ Sí |
| **EMBI Global Spread** | JPMorgan (vía Bloomberg/Refinitiv) | `JPEIGLBL` (Bloomberg) | Diaria | ❌ No (ver alternativa) |

**Alternativa EMBI gratuita:**
- **FRED:** No tiene EMBI exacto, pero tiene `BAMLEM1BRRAA2A` (EM Bond OAS) como proxy imperfecto.
- **iShares EEM ETF** volatilidad o drawdown como proxy de riesgo EM.

**Cálculo:** Percentiles rolling 5 años (1260 sesiones) de cada serie.

---

## 2. MOMENTUM GLOBAL (§2) — 4 variables

| Variable | Fuente principal | URL / Ticker | Frecuencia | Gratuito |
|---|---|---|---|---|
| **CESI USA** | Citi / Bloomberg | `CESIUSD` (Bloomberg) | Diaria | ❌ No |
| **CESI EUR** | Citi / Bloomberg | `CESIEUR` (Bloomberg) | Diaria | ❌ No |
| **CESI CHN** | Citi / Bloomberg | `CESICNY` (Bloomberg) | Diaria | ❌ No |
| **CESI JPN** | Citi / Bloomberg | `CESIJPY` (Bloomberg) | Diaria | ❌ No |

**Alternativas gratuitas si no tienes Bloomberg:**
- **Atlanta Fed GDPNow:** `GDPNOW` (FRED) — USA only, continua.
- **NY Fed Nowcast:** `NYNME` (FRED) — USA only, semanal.
- **OECD Composite Leading Indicators (CLI):** `LOLITONO` (FRED) — global proxy mensual.
- **PMI compuesto global:** S&P Global (vía Investing / TradingEconomics) — mensual.

**Fórmula operativa sin CESI:**
```
momentum_global = 0.25·GDPNOW(USA) + 0.18·OECD_CLI(EUR) + 0.18·PMI(China) + 0.05·OECD_CLI(JPN)
```
Normalizar cada input a z-score 10Y para que estén en escala comparable.

---

## 3. USD BIAS ESTRUCTURAL (§5) — 3 variables

| Variable | Fuente principal | URL / Ticker | Frecuencia | Gratuito |
|---|---|---|---|---|
| **DXY** | ICE / FRED | `DTWEXBGS` (FRED, broad dollar) o `DX-Y.NYB` (Yahoo) | Diaria | ✅ Sí |
| **US 2Y TIPS (real rate)** | FRED | `DFII2` | Diaria | ✅ Sí |
| **G7 real rates avg** | Calcular de yields nominales − breakevens | Ver §3 | Diaria/Semanal | ✅ Sí |

**Componentes G7 real rates (para el promedio):**
| País | Yield nominal 2Y | Inflación esperada | Cálculo real |
|---|---|---|---|
| USA | `DGS2` (FRED) | `T5YIFR` (FRED, 5Y5Y) | `DGS2 − T5YIFR` |
| Germany | `IRLTLT01DEM156N` (FRED Bund 10Y proxy) o Investing | ECB ILS 5Y5Y (Bloomberg) | Diff |
| Japan | `IRLTLT01JPM156N` (FRED) o BoJ | JGBi 10Y − JGB 10Y (proxy) | Diff |
| UK | `IRLTLT01GBM156N` (FRED) | UK 5Y5Y inflation swap (Bloomberg) | Diff |
| Canada | `DGS2` proxy via BoC | BoC neutral rate exp | Diff |
| France / Italy | Bund spread | — | Proxy via Germany |

**Simplificación práctica:**
Si no tienes acceso a todos los G7, usa solo **US − Germany − Japan** como proxy del diferencial:
```
real_rate_US = DGS2 − T5YIFR
real_rate_DE = Bund_2Y − HICP_5Y5Y (o usar Bund 10Y real como proxy)
real_rate_JP = JGB_2Y − breakeven_JP (proxy)

G7_avg_real = (real_rate_US + real_rate_DE + real_rate_JP) / 3
USD_bias_factor = real_rate_US − G7_avg_real
```

**DXY trend:** Calcular media móvil 200 días sobre `DTWEXBGS`.

---

## 4. RÉGIMEN DE INFLACIÓN GLOBAL (§6) — 3 variables

| Variable | Fuente principal | URL / Ticker | Frecuencia | Gratuito |
|---|---|---|---|---|
| **CPI USA YoY** | BLS / FRED | `CPIAUCSL` (FRED, luego calcular YoY) | Mensual | ✅ Sí |
| **CPI Eurozone YoY** | Eurostat / FRED | `EA19CPALTT01IXOBM` (FRED, proxy) o Eurostat | Mensual | ✅ Sí |
| **Breakevens 5Y5Y USA** | FRED | `T5YIFR` (5Y Forward 5Y) | Diaria | ✅ Sí |

**Para mediana G7 CPI:**
Necesitas CPI YoY de **al menos 5 países** para que la mediana sea robusta:
- USA: `CPIAUCSL` → YoY
- Eurozone: `CP0000EZ19M086NEST` (FRED) o Eurostat
- Japan: `JPNCPIALLMINMEI` (FRED)
- UK: `GBRCPIALLMINMEI` (FRED)
- Canada: `CPALCY01CAM661N` (FRED)
- Australia: `AUSCPIALLMINMEI` (FRED, trimestral)

**Fórmula:**
```
CPI_G7_mediana = median(CPI_USA, CPI_EUR, CPI_JPN, CPI_GBR, CPI_CAN, CPI_AUS)
Breakevens_G7_mediana = median(T5YIFR_US, ECB_ILS_5Y5Y, proxy_JPN, proxy_UK, proxy_CA)

INF:     CPI_mediana > 3.0 AND breakevens_mediana > 2.5
DESINF:  CPI_mediana < 2.0 AND trend_descendiente AND breakevens < 2.0
ESTABLE: resto
```

**Postura BC (infiere de datos, no descarga directa):**
- Si Fed Funds rate > neutral (2.5-3%) y última decisión fue hike → `hawkish`
- Si rate < neutral y última decisión fue cut → `dovish`
- Si en pausa > 3 meses → `hold`

---

## 5. WISDOM OF THE CROWD (§4) — 2 variables mínimas

| Variable | Fuente principal | URL / Ticker | Frecuencia | Gratuito |
|---|---|---|---|---|
| **CFTC Asset Managers** | CFTC | `cftc.gov` (download TFF reports) | Semanal (viernes) | ✅ Sí |
| **Retail SSI / IG Sentiment** | IG / DailyFX / OANDA | `ig.com/uk/client-sentiment` | Diaria | ✅ Sí (registro) |

**CFTC detalle:**
- Descargar **Traders in Financial Futures (TFF)** report, no el COT legacy.
- Usar columna `Asset Manager Long` vs `Short` por divisa.
- Tickers CFTC: `EUR`, `JPY`, `GBP`, `CHF`, `CAD`, `AUD`, `NZD`, `MXN`, `BRL`, etc.

**Retail:**
- IG Client Sentiment está disponible para EUR/USD, GBP/USD, USD/JPY, etc.
- Si IG no disponible, usar **OANDA Order Book** (gratuito con cuenta demo).

---

## RESUMEN: Mínimo Viable

Si tuvieras que arrancar **hoy** con lo menos posible, estas son las **variables imprescindibles**:

| # | Variable | Fuente gratuita | Frecuencia |
|---|---|---|---|
| 1 | VIX | Yahoo (`^VIX`) | Diaria |
| 2 | HY OAS | FRED (`BAMLH0A0HYM2`) | Diaria |
| 3 | S&P 500 | Yahoo (`^GSPC`) | Diaria |
| 4 | EMBI proxy | FRED (`BAMLEM1BRRAA2A`) o EEM vol | Diaria |
| 5 | DXY | FRED (`DTWEXBGS`) | Diaria |
| 6 | US 2Y TIPS real | FRED (`DFII2`) | Diaria |
| 7 | Bund 2Y nominal | Investing / FRED proxy | Diaria |
| 8 | JGB 10Y nominal | FRED (`IRLTLT01JPM156N`) | Mensual proxy |
| 9 | CPI USA YoY | FRED (`CPIAUCSL`) | Mensual |
| 10 | CPI Eurozone YoY | FRED (`CP0000EZ19M086NEST`) | Mensual |
| 11 | Breakevens 5Y5Y US | FRED (`T5YIFR`) | Diaria |
| 12 | Atlanta Fed GDPNow | FRED (`GDPNOW`) | Continua |
| 13 | CFTC TFF | CFTC.gov | Semanal |

**Total: 13 series** para tener un World View funcional y gratuito.

---

## Variables "nice to have" (refinan pero no bloquean)

| Variable | Por qué | Prioridad |
|---|---|---|
| CESI EUR/CHN/JPN | Momentum granular por bloque económico | Media |
| SPF Philadelphia | Smart money forecast USA | Media |
| ECB SPF | Smart money Eurozone | Media |
| Tankan | Smart money Japón | Baja (trimestral, lenta) |
| EPFR Fund Flows | Flujos institucionales EM | Baja |
| MOVE Index | Confirma volatilidad bonos en risk-OFF | Media |
| Gold/S&P ratio | Flight to safety proxy | Baja |
| JPY 7d return | Refugio funcional | Baja |

---

## Script de descarga sugerido (FRED)

```python
import pandas_datareader as pdr
from datetime import datetime

start = datetime(2000, 1, 1)
end = datetime.today()

series = {
    'VIX': 'VIXCLS',           # VIX (diario, llenar forward)
    'HY_OAS': 'BAMLH0A0HYM2',  # HY OAS
    'SP500': 'SP500',          # S&P 500
    'DXY': 'DTWEXBGS',         # Dollar Index (broad)
    'US_REAL_2Y': 'DFII2',     # 2Y TIPS yield
    'US_2Y': 'DGS2',           # 2Y Treasury nominal
    'US_10Y': 'DGS10',         # 10Y Treasury nominal
    'CPI_USA': 'CPIAUCSL',     # CPI nivel
    'T5YIFR': 'T5YIFR',        # 5Y5Y breakeven
    'GDPNOW': 'GDPNOW',        # Atlanta Fed
}

df = pdr.DataReader(list(series.values()), 'fred', start, end)
df.columns = list(series.keys())
```

> Nota: `VIXCLS` en FRED es mensual. Para VIX diario usar Yahoo Finance (`yfinance` library).

---

> **Conclusión:** Con 13 series gratuitas (VIX, HY, S&P, EMBI-proxy, DXY, yields US/DE/JP, CPI US/EUR, breakevens, GDPNow, CFTC) puedes calcular un World View completo y robusto. El resto son refinamientos.
