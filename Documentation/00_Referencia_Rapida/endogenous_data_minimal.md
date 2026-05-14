# Endogenous — Lista Mínima Viable de Variables

> Si no puedes descargar los 240 indicadores (24 × 10 países), estas son las **series imprescindibles** para arrancar un Endogenous funcional. Total: ~40-50 series en vez de 240.

---

## Filosofía del recorte

El modelo endógeno tiene 24 indicadores, pero **no todos pesan igual**. El indicador #19 (diferencial tipos reales 2Y) absorbe el 14% del peso total. Los 4-5 siguientes suman otro 20-25%. Los 10 de menor peso suman apenas 20%.

**Regla:** si omites un indicador con β ≤ 0.03, el error en el score final es menor al 3% (asumiendo z-score medio).

---

## Indicadores imprescindibles (no negociables)

### 1. Diferencial tipos reales 2Y (β = 0.14)
**Es el indicador más importante del modelo.**

| País | Serie | Fuente gratuita |
|---|---|---|
| USA | `DGS2` − `T5YIFR` | FRED |
| EUR | Bund 2Y − HICP 5Y5Y | ECB SDW + FRED proxy |
| JPN | JGB 2Y − breakeven proxy | BoJ / FRED proxy |
| GBR | Gilt 2Y − infl swap proxy | BoE / FRED proxy |
| CHE | SARON 2Y − infl exp | SNB |
| CAN | GoC 2Y − BoC core | BoC |
| AUS | ACGB 2Y − RBA trimmed mean | RBA |
| NZL | NZGB 2Y − RBNZ exp | RBNZ |
| SWE | Riksbank 2Y real | Riksbank |
| NOR | NB 2Y real | Norges Bank |

**Alternativa si no hay linker:**
```
real_rate_2y ≈ nominal_2y − cpi_yoy
```
Es imperfecto pero funcional para un MVP.

---

### 2. Cuenta corriente / GDP (β = 0.07)
| País | Fuente |
|---|---|
| Todos G10 | Eurostat (EUR), BEA (USA), ONS (GBR), IMF BoP (resto) |

**Truco:** IMF Balance of Payments tiene datos trimestrales para casi todos los países. Descarga una vez al trimestre.

---

### 3. 10Y Yield Real (β = 0.06)
| País  | Serie                        | Fuente           |
| ----- | ---------------------------- | ---------------- |
| USA   | `DFII10` (TIPS 10Y)          | FRED             |
| EUR   | Bund linker 10Y              | ECB / Bundesbank |
| JPN   | JGBi 10Y                     | BoJ              |
| GBR   | Index-linked Gilt 10Y        | BoE / DMO        |
| Resto | Proxy: nominal 10Y − CPI YoY | Calcular         |

---

### 4. Términos de intercambio YoY (β = 0.06)
| País | Fuente |
|---|---|
| EUR | Eurostat `ei_mfrt_m` |
| AUS, NZL, CAN, NOR | ABS, Stats NZ, StatCan, SSB |
| USA, JPN, GBR, CHE, SWE | OECD MEI o calcular proxy |

**Proxy si no disponible:**
```
ToT ≈ (Export Price Index / Import Price Index) − 1
```
UN Comtrade o OECD tienen índices de precios de comercio.

---

### 5. CPI YoY (β = 0.04) + Core CPI YoY (β = 0.05)
| País | Fuente |
|---|---|
| USA | `CPIAUCSL`, `CPILFESL` (FRED) |
| EUR | Eurostat HICP + HICP ex F&E |
| JPN | MIC / BoJ |
| GBR | ONS |
| CHE | BFS |
| CAN | StatCan / BoC core |
| AUS | ABS trimmed mean |
| NZL | Stats NZ |
| SWE | SCB CPIF |
| NOR | SSB CPI-ATE |

**Alternativa:** OECD CPI (`MEI` database) tiene series mensuales estandarizadas para todos.

---

### 6. ISM / PMI Manufacturing (β = 0.04)
| País | Serie | Fuente |
|---|---|---|
| USA | `NAPM` (ISM) o `SPMICSMM` | FRED |
| EUR | S&P Global Manufacturing PMI | Investing / TradingEconomics |
| JPN | Jibun Bank PMI | Investing |
| GBR | S&P UK PMI | Investing |
| CHE | procure.ch PMI | SECO |
| CAN | Ivey PMI / S&P Global | Investing |
| AUS | Judo Bank PMI | Investing |
| NZL | BNZ PMI | Investing |
| SWE | Silf PMI | Investing |
| NOR | DNB PMI | Investing |

**Truco:** `tradingeconomics.com` tiene APIs gratuitas (con límite de requests) para PMI de casi todos los países.

---

### 7. Empleo / NFP YoY (β = 0.04)
| País | Serie                      | Fuente       |
| ---- | -------------------------- | ------------ |
| USA  | `PAYEMS` (FRED, luego YoY) | FRED         |
| EUR  | Eurostat empleo            | Eurostat API |
| JPN  | MIC empleo                 | OECD         |
| GBR  | ONS LFS                    | ONS API      |
| CHE  | SECO                       | OECD         |
| CAN  | StatCan LFS                | StatCan API  |
| AUS  | ABS LFS                    | ABS API      |
| NZL  | Stats NZ HLFS              | Stats NZ     |
| SWE  | SCB AKU                    | SCB API      |
| NOR  | SSB AKU                    | SSB API      |

---

### 8. Tipo de política monetaria (β = 0.05)
| País | Serie | Fuente |
|---|---|---|
| USA | `DFF` (Fed Funds Effective) | FRED |
| EUR | ECB Deposit Facility Rate | ECB |
| JPN | BoJ Policy Rate | BoJ |
| GBR | BoE Bank Rate | BoE |
| CHE | SNB Policy Rate | SNB |
| CAN | BoC Overnight Target | BoC |
| AUS | RBA Cash Rate | RBA |
| NZL | RBNZ OCR | RBNZ |
| SWE | Riksbank Repo Rate | Riksbank |
| NOR | Norges Bank Policy Rate | NB |

**Alternativa:** IMF IFS `FPOLM_PA` o OECD `Short-term interest rates`.

---

### 9. CFTC Posicionamiento (β = 0.04)
| Divisa | Ticker CFTC TFF | Fuente |
|---|---|---|
| EUR | `EU` | CFTC.gov |
| JPY | `JY` | CFTC.gov |
| GBP | `BP` | CFTC.gov |
| CHF | `SF` | CFTC.gov |
| CAD | `CD` | CFTC.gov |
| AUD | `AD` | CFTC.gov |
| NZD | `NE` | CFTC.gov |
| DXY | `DX` | CFTC.gov |

**SEK/NOK:** No tienen contrato propio. Usar posición neta DXY como proxy inverso.

---

### 10. REER desviación 10Y (β = 0.03)
| Todos G10 | Serie | Fuente |
|---|---|---|
| Broad REER (CPI-based) | BIS `REER_BROAD` | BIS Statistics |

**Una sola fuente cubre los 10 países.** Descargar `eer_broad_indices.csv` de bis.org.

---

## Indicadores que puedes omitir en un MVP (β ≤ 0.03)

| # | Indicador | β | Razón para omitir |
|---|---|---|---|
| 3 | UMCSI | 0.02 | Volátil, poco señal en FX a 1-3m |
| 4 | Building Permits YoY | 0.02 | Laggy, poco poder predictivo en FX |
| 9-10 | PPI All / Core | 0.02 c/u | Pas-through a CPI es lento e imperfecto |
| 13 | Govt S/D % GDP | 0.03 | Similar info a Debt/GDP |
| 14 | Interest/GDP | 0.02 | Difícil de conseguir, bajo impacto |
| 15 | Liquidity Cover | 0.02 | Más relevante para EM que G10 |
| 17 | CB Balance/GDP YoY | 0.04 | En G10 post-2022 todos reducen, poco discriminante |
| 21 | NIIP % GDP | 0.05 | Similar a Current Account, info redundante |

**Ahorro:** Omitir estos 8 indicadores reduce de 240 a **160 series** (24→16 por país).

---

## Lista final: ¿Qué descargar?

### Opción A: Mínimo viable (~120 series = 12 indicadores × 10 países)

1. Real Rate 2Y
2. Current Account / GDP
3. 10Y Yield Real
4. ToT YoY
5. CPI YoY
6. Core CPI YoY
7. ISM/PMI Manufacturing
8. NFP / Employment YoY
9. CB Policy Rate
10. CFTC Positioning
11. REER desviación
12. Govt Debt / GDP

**Total:** 12 × 10 = 120 columnas en tu CSV.

### Opción B: Recomendado (~160 series = 16 indicadores × 10 países)

Añade a la lista anterior:
13. NMI/PMI Services
14. M2 YoY
15. 10Y Yield Nominal
16. Govt Balance / GDP

**Total:** 16 × 10 = 160 columnas.

### Opción C: Completo (240 series = 24 × 10)

Añade los 8 omitidos cuando tengas el pipeline maduro y APIs automatizadas.

---

## Script de descarga sugerido (MVP)

```python
import pandas_datareader as pdr
from datetime import datetime

start = datetime(2000, 1, 1)
end = datetime.today()

# USA MVP series
usa = {
    'US_CPI': 'CPIAUCSL',
    'US_CORE_CPI': 'CPILFESL',
    'US_NFP': 'PAYEMS',
    'US_CPI_YOY': 'CPIAUCSL',  # calcular YoY después
    'US_DEBT_GDP': 'GFDEGDQ188S',
    'US_2Y_NOMINAL': 'DGS2',
    'US_10Y_REAL': 'DFII10',
    'US_BREAKEVEN': 'T5YIFR',
    'US_REER': 'RTWEXBGS',  # Real Broad Effective Exchange Rate
}

df_usa = pdr.DataReader(list(usa.values()), 'fred', start, end)
df_usa.columns = list(usa.keys())

# Calcular derived series
df_usa['US_CPI_YOY'] = df_usa['US_CPI'].pct_change(12) * 100
df_usa['US_REAL_RATE_2Y'] = df_usa['US_2Y_NOMINAL'] - df_usa['US_BREAKEVEN']

# Repeat pattern for EUR, JPY, GBR, etc.
# For non-US: use OECD, BIS, ECB SDW, or Investing/TradingEconomics scraping.
```

---

## Fuentes unificadas por volumen

| Fuente | Cobertura | Series útiles | Prioridad |
|---|---|---|---|
| **FRED** | USA + globales | 30-40 | 🔴 Crítico |
| **OECD MEI** | 38 países | 20-30 | 🟠 Alta |
| **BIS Statistics** | REER + rates + credit | 15-20 | 🟠 Alta |
| **Eurostat API** | EUR + EA | 10-15 | 🟡 Media |
| **ECB SDW** | EUR rates + infl | 5-10 | 🟡 Media |
| **CFTC.gov** | Posicionamiento | 8 | 🟡 Media |
| **TradingEconomics** | PMI + rates + CPI | 30-40 | 🟢 Baja (scraping) |

---

> **Conclusión:** Empieza con 120 series (Opción A). Cuando el pipeline funcione y tengas backtest, expande a 160 (Opción B). Los 24 indicadores completos son el objetivo a 6-12 meses.
