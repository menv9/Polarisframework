# Cobertura de Indicadores — Pipeline vs App vs DataSources

Generado: 2026-05-16

Tres capas comparadas:
- **Pipeline** (`beta_pipeline/config.py`) — series FRED / WorldBank / Yahoo que se descargan automáticamente
- **App Model** (`src/lib/endogenousBetas.js`) — los 24 indicadores del modelo endógeno (15 implementados, 9 pendientes)
- **DataSources** (`src/data/dataSources.js`) — los IDs `endo_{prefix}_{key}` registrados en la app por país

---

## 1. Los 24 indicadores del modelo (con estado)

| # | Key | Label | βDoc | Signo | Horizonte | Implementado |
|---|-----|-------|------|-------|-----------|---|
| 1 | `pmi` | ISM Manufacturing / PMI | 0.04 | + | MEDIUM | ✅ |
| 2 | `nmi` | NMI Services | 0.03 | + | MEDIUM | ❌ |
| 3 | `umcsi` | Consumer Sentiment | 0.02 | + | LONG | ✅ |
| 4 | `permits` | Building Permits YoY | 0.02 | + | LONG | ❌ |
| 5 | `m2` | M2 YoY | 0.03 | − | MEDIUM | ❌ |
| 6 | `policy` | Tipo Nominal Banco Central | 0.05 | + | MEDIUM | ✅ |
| 7 | `cpi` | CPI YoY | 0.04 | + | MEDIUM | ✅ |
| 8 | `core_cpi` | Core CPI YoY | 0.05 | + | MEDIUM | ✅ |
| 9 | `ppi` | PPI All YoY | 0.02 | + | MEDIUM | ❌ |
| 10 | `core_ppi` | Core PPI YoY | 0.02 | + | MEDIUM | ❌ |
| 11 | `nfp` | NFP / Empleo YoY | 0.04 | + | MEDIUM | ✅ |
| 12 | `debt` | Govt Debt/GDP | 0.03 | − | LONG | ✅ |
| 13 | `fiscal` | Govt Surplus/Deficit %GDP | 0.03 | + | LONG | ❌ |
| 14 | `interest_gdp` | Interest/GDP | 0.02 | − | LONG | ❌ |
| 15 | `liquidity` | Liquidity Cover | 0.02 | + | LONG | ❌ |
| 16 | `10y_real` | 10Y Yield Real | 0.06 | + | MEDIUM | ✅ |
| 17 | `cb_balance` | CB Balance/GDP YoY | 0.04 | − | LONG | ✅ |
| 18 | `real_2y` | Diferencial Tipos Reales 2Y | 0.14 | + | MEDIUM | ✅ |
| 19 | `ca_gdp` | Cuenta Corriente %GDP | 0.07 | + | LONG | ✅ |
| 20 | `niip` | NIIP %GDP | 0.05 | + | LONG | ✅ |
| 21 | `tot` | Términos de Intercambio YoY | 0.06 | + | LONG | ✅ |
| 22 | `breakevens` | Breakevens 5Y5Y | 0.05 | + | MEDIUM | ❌ |
| 23 | `cftc` | CFTC Posicionamiento | 0.04 | + | SHORT | ✅ |
| 24 | `reer` | REER Desviación 10Y | 0.03 | − | LONG | ✅ |

**β efectivo implementados:** suma βDoc = 0.76 → cada βEff = βDoc / 0.76  
**β perdido por no implementados:** 0.24 (9 indicadores, compensado por renormalización)

---

## 2. Cobertura por país — Pipeline FRED vs DataSources vs Modelo

Leyenda: ✅ automatizable FRED · 🌍 WorldBank (anual) · 📋 Manual · ❌ Sin fuente pública · — No aplica al modelo

### USA

| Key modelo | DataSource ID | Pipeline FRED | Serie | Nota |
|---|---|---|---|---|
| `real_2y` | `endo_usa_real_2y` | ✅ | DFII2 | |
| `10y_real` | `endo_usa_10y_real` | ✅ | DFII10 | |
| `policy` | `endo_usa_policy` | ✅ | FEDFUNDS | |
| `cpi` | `endo_usa_cpi` | ✅ | CPIAUCSL | |
| `core_cpi` | `endo_usa_core_cpi` | ✅ | CPILFESL | |
| `nfp` | `endo_usa_nfp` | ✅ | PAYEMS | |
| `umcsi` | `endo_usa_umcsi` | ✅ | UMCSENT | |
| `debt` | `endo_usa_debt` | ✅ | GFDEGDQ188S | |
| `cb_balance` | `endo_usa_cb_balance` | ✅ | WALCL | |
| `niip` | `endo_usa_niip` | ✅ | IIPUSNETIQ | |
| `reer` | `endo_usa_reer` | ✅ | RBUSBIS | |
| `ca_gdp` | `endo_usa_ca_gdp` | 🌍 | WorldBank US | |
| `pmi` | `endo_usa_pmi` | 📋 | ISM (sin FRED libre) | |
| `cftc` | `endo_usa_cftc` | 📋 | CFTC USD Index | Scraping manual |
| `tot` | `endo_usa_tot` | 📋 | BLS manual | |
| `m2` ❌ | — | ✅ | M2SL | En pipeline, no en modelo |
| — | — | ✅ | DGS2, DGS10, T10Y2Y | En pipeline, no en modelo |
| — | — | ✅ | RSAFS (Retail) | En pipeline, no en modelo |
| — | — | ✅ | HOUST (Housing) | En pipeline, no en modelo |
| — | — | ✅ | PCEPI, PCEPILFE | En pipeline, no en modelo |

### EUR

| Key modelo | DataSource ID | Pipeline FRED | Serie | Nota |
|---|---|---|---|---|
| `real_2y` | `endo_eur_real_2y` | 📋 | — | App calcula policy − CPI |
| `10y_real` | `endo_eur_10y_real` | 📋 | IRLTLT01EZM156N (nominal) | No yield real directo |
| `policy` | `endo_eur_policy` | ✅ | ECBDFR | |
| `cpi` | `endo_eur_cpi` | ✅ | CP0000EZ19M086NEST | |
| `core_cpi` | `endo_eur_core_cpi` | ✅ | CPGRLE01EZM659N | |
| `nfp` | `endo_eur_empl` | ✅ | LRHUTTTTEZM156S | Tasa paro OCDE |
| `umcsi` | `endo_eur_umcsi` | 📋 | CSCICP03EZM665S | Confianza consumidor |
| `debt` | `endo_eur_debt` | ✅ | GGGDTAEZAQ188N | |
| `cb_balance` | `endo_eur_cb_balance` | ✅ | ECBASSETSW | |
| `niip` | `endo_eur_niip` | 📋 | — | Manual/ECB |
| `reer` | `endo_eur_reer` | ✅ | RNEURBIS | |
| `ca_gdp` | `endo_eur_ca_gdp` | 🌍 | WorldBank EMU | |
| `pmi` | `endo_eur_pmi` | 📋 | S&P Global PMI | Manual |
| `cftc` | `endo_eur_cftc` | 📋 | CFTC Euro FX | Scraping manual |
| `tot` | `endo_eur_tot` | 📋 | Eurostat manual | |
| `m2` ❌ | — | ✅ | MABMM301EZM189S (M3) | En pipeline como M3, no en modelo |

### JPY

| Key modelo | DataSource ID | Pipeline FRED | Serie | Nota |
|---|---|---|---|---|
| `real_2y` | `endo_jpn_real_2y` | 📋 | — | policy − CPI |
| `10y_real` | `endo_jpn_10y_real` | 📋 | IRLTLT01JPM156N (nominal) | |
| `policy` | `endo_jpn_policy` | ✅ | IRSTCI01JPM156N | |
| `cpi` | `endo_jpn_cpi` | ✅ | JPNCPIALLMINMEI | |
| `core_cpi` | `endo_jpn_core_cpi` | ✅ | JPNCPICORMINMEI | |
| `nfp` | `endo_jpn_empl` | ✅ | LRHUTTTTJPM156S | |
| `umcsi` | `endo_jpn_umcsi` | 📋 | — | BoJ Tankan / manual |
| `debt` | `endo_jpn_debt` | 📋 | — | Manual IMF |
| `cb_balance` | `endo_jpn_cb_balance` | ✅ | JPNASSETS | |
| `niip` | `endo_jpn_niip` | 📋 | — | Manual MoF |
| `reer` | `endo_jpn_reer` | ✅ | RNJPNBIS | |
| `ca_gdp` | `endo_jpn_ca_gdp` | 🌍 | WorldBank JP | |
| `pmi` | `endo_jpn_pmi` | 📋 | Manual | |
| `cftc` | `endo_jpn_cftc` | 📋 | CFTC Japanese Yen | |
| `tot` | `endo_jpn_tot` | 📋 | Manual | |

### GBR

| Key modelo | DataSource ID | Pipeline FRED | Nota |
|---|---|---|---|
| `real_2y` | `endo_gbr_real_2y` | 📋 | policy − CPI |
| `10y_real` | `endo_gbr_10y_real` | 📋 | IRLTLT01GBM156N (nominal) |
| `policy` | `endo_gbr_policy` | ✅ BOEBR | |
| `cpi` | `endo_gbr_cpi` | ✅ GBRCPIALLMINMEI | |
| `core_cpi` | `endo_gbr_core_cpi` | ✅ GBRCPICORMINMEI | |
| `nfp` | `endo_gbr_empl` | ✅ LRHUTTTTGBM156S | |
| `reer` | `endo_gbr_reer` | ✅ RNGBRBIS | |
| `ca_gdp` | `endo_gbr_ca_gdp` | 🌍 WorldBank GB | |
| `debt` | `endo_gbr_debt` | 📋 | Manual IMF |
| `cb_balance` | `endo_gbr_cb_balance` | 📋 | BoE manual |
| `niip` | `endo_gbr_niip` | 📋 | Manual ONS |
| `umcsi`, `pmi`, `cftc`, `tot` | varios | 📋 | Todos manuales |

### CHE · CAD · AUD · NZD

| Key modelo | Pipeline FRED | AUS | NZL | CAD | CHE |
|---|---|---|---|---|---|
| `policy` | ✅ | IRSTCI01AUM156N | IRSTCI01NZM156N | IRSTCI01CAM156N | IRSTCI01CHM156N |
| `cpi` | ✅ | AUSCPIALLQINMEI | NZLCPIALLQINMEI | CANCPIALLMINMEI | CHECPIALLMINMEI |
| `nfp` | ✅ | LRHUTTTTAUM156S | LRHUTTTTNZM156S | LRHUTTTTCAM156S | LRHUTTTTCHM156S |
| `reer` | ✅ | RNAUSBIS | RNNZLBIS | RNCANBIS | RNCHEBIS |
| `ca_gdp` | 🌍 WorldBank | AU | NZ | CA | CH |
| `core_cpi` | 📋 manual | — | — | — | — |
| `debt`, `cb_balance`, `niip` | 📋 manual | — | — | — | — |
| `pmi`, `cftc`, `tot`, `umcsi` | 📋 manual | — | — | — | — |

> **⚠ Mismatch de prefijo CAD/CAN**: la app usa `endo_can_*` (dataSources) pero el pipeline genera `endo_cad_*` (config.py). Los IDs no coinciden → los betas del pipeline para Canadá **no se importan** correctamente en la app sin renombrar.

### SEK · NOK

| Key modelo | Pipeline FRED | SWE | NOR | Nota |
|---|---|---|---|---|
| `policy` | ✅ | IRSTCI01SEM156N | IRSTCI01NOM156N | |
| `cpi` | ✅ | SWECPIALLMINMEI | NORCPIALLMINMEI | |
| `ca_gdp` | 🌍 WorldBank | SE | NO | **NO están en WORLDBANK_CA_SERIES del pipeline** |
| `reer` | 📋 manual | — | — | No en FRED_SERIES del pipeline |
| `core_cpi` | 📋 manual | — | — | No en FRED_SERIES |
| `debt`, `cb_balance`, `niip` | 📋 manual | — | — | |
| `nfp`, `pmi`, `cftc`, `tot` | 📋 manual | — | — | |

---

## 3. Series en el pipeline NO usadas por el modelo endógeno

Estas series se descargan y se usan como regresores en el beta_pipeline pero **no tienen un slot en el modelo de scoring endógeno**:

| Serie pipeline | FRED | Uso actual | Candidato a modelo |
|---|---|---|---|
| `endo_usa_m2` | M2SL | Regresor beta | `m2` (pendiente #35) |
| `endo_eur_m3` | MABMM301EZM189S | Regresor beta | — (proxy M2 EUR) |
| `endo_usa_retail` | RSAFS | Regresor beta | Podría ser proxy `nmi` |
| `endo_usa_housing` | HOUST | Regresor beta | Proxy `permits` (#35) |
| `endo_usa_pce` / `core_pce` | PCEPI / PCEPILFE | Regresor beta | Redundante con CPI |
| `endo_usa_2y_nom` / `10y_nom` | DGS2 / DGS10 | Regresor beta | Componentes de `real_2y` |
| `endo_usa_2s10s` | T10Y2Y | Regresor beta | Señal de recesión |
| `exo_chn_pmi` | CHNFKINDPMIMANMEI | Regresor beta | World View / Exo |
| `exo_ted` | TEDRATE | Regresor beta | Exo (riesgo sistémico) |
| `exo_term_premium` | THREEFYTP10 | Regresor beta | Exo |

---

## 4. Gaps críticos de cobertura automática

| Gap | Países afectados | Impacto |
|---|---|---|
| **`ca_gdp` SEK/NOK no en WorldBank pipeline** | SWE, NOR | CA/GDP de Suecia y Noruega se entra manual; falta añadir a `WORLDBANK_CA_SERIES` |
| **Prefijo `cad` vs `can`** | CAD | Los betas del pipeline no casan con los IDs de la app. Fix: renombrar en config.py a `can` o en dataSources.js a `cad` |
| **`core_cpi` solo G4** | AUS, NZL, CAD, CHE, SWE, NOK | Core CPI no está en FRED para estos países; manual o no disponible |
| **`10y_real` solo USA tiene TIPS** | EUR, JPY, GBR, resto | El resto usa yield nominal OCDE → calidad inferior; los betas no son comparables |
| **`niip` solo USA en FRED** | EUR, GBR, JPY, resto | NIIP de no-USD es manual o no disponible públicamente |
| **`cb_balance` solo G3** | GBR, AUS, NZL, CAD, CHE, SWE, NOR | Solo Fed/ECB/BoJ tienen balance en FRED; el resto es manual |
| **9 indicadores sin fuente** | Todos | `nmi`, `permits`, `m2` (no-USD), `ppi`, `core_ppi`, `fiscal`, `interest_gdp`, `liquidity`, `breakevens` |

---

## 5. Resumen de cobertura automática por país

| País | FRED auto | WorldBank | Manual obligatorio | Sin fuente pública |
|---|---|---|---|---|
| USA | 12 | 1 (`ca`) | 3 (`pmi`,`cftc`,`tot`) | 0 |
| EUR | 7 | 1 | 7 | 0 |
| JPY | 6 | 1 | 8 | 0 |
| GBR | 5 | 1 | 9 | 0 |
| AUS | 4 | 1 | 10 | 0 |
| NZL | 4 | 1 | 10 | 0 |
| CAD | 4 | 1 | 10 | ⚠ prefijo mismatch |
| CHE | 4 | 1 | 10 | 0 |
| SWE | 2 | ⚠ falta | 13 | 0 |
| NOR | 2 | ⚠ falta | 13 | 0 |

**USA tiene la cobertura más alta** (12/15 automáticos). **SEK/NOK tienen la más baja** (2/15, más sin WorldBank CA).
