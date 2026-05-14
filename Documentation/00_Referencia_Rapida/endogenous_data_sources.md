# Endogenous — Data Sources por Indicador y País G10

> Fuentes oficiales y alternativas gratuitas para los 24 indicadores endógenos de cada país G10. Basado en §15.4 del Endogenous Module.

---

## Leyenda

| Símbolo | Significado |
|---|---|
| 🟢 | Gratuito / API pública disponible |
| 🟡 | Gratuito pero requiere registro o descarga manual |
| 🔴 | De pago (Bloomberg, Refinitiv) o difícil sin terminal |
| ✅ | Fuente recomendada / estándar académico |

---

## 1. PMI Manufacturing

| País | Fuente principal | Ticker / Serie | Tipo |
|---|---|---|---|
| USA | S&P Global (vía ISM) + FRED | `NAPM` (ISM) / `SPMICSMM` (S&P) | 🟢 FRED |
| EUR | S&P Global PMI + ECB SDW | `PMI_MANU_EA` (S&P) | 🟡 ECB SDW |
| JPN | Jibun Bank PMI + METI | `PMI_JP_MANU` (S&P/Jibun) | 🟡 |
| GBR | S&P Global UK PMI + ONS | `PMI_GB_MANU` | 🟡 |
| CHE | procure.ch PMI + SECO | `PMI_CH_MANU` | 🟡 |
| CAN | S&P Global Canada + Ivey PMI | `IVEY` (Ivey) / `PMI_CA_MANU` | 🟡 |
| AUS | Judo Bank PMI + S&P Global | `PMI_AU_MANU` (Judo) | 🟡 |
| NZL | BNZ PMI + S&P Global | `PMI_NZ_MANU` (BNZ) | 🟡 |
| SWE | Silf PMI + S&P Global | `PMI_SE_MANU` (Silf) | 🟡 |
| NOR | DNB PMI + S&P Global | `PMI_NO_MANU` (DNB) | 🟡 |

**Alternativa gratuita unificada:** S&P Global publica índices PMI mensuales en `investing.com` o `tradingeconomics.com` para casi todos los países. También en el **OECD Main Economic Indicators (MEI)**.

---

## 2. PMI Services / NMI

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | ISM Services + FRED | `NMFS` o `NMI` | 🟢 FRED |
| EUR | S&P Global Composite Services | `PMI_SERV_EA` | 🟡 ECB SDW |
| JPN | Jibun Bank Services PMI | `PMI_JP_SERV` | 🟡 |
| GBR | S&P Global UK Services | `PMI_GB_SERV` | 🟡 |
| CHE | procure.ch Services PMI | `PMI_CH_SERV` | 🟡 |
| CAN | Ivey Services + S&P Global | — | 🟡 |
| AUS | Judo Bank Services PMI | `PMI_AU_SERV` | 🟡 |
| NZL | BNZ PSI (Performance of Services) | `PSI_NZ` | 🟡 |
| SWE | Silf Services PMI | `PMI_SE_SERV` | 🟡 |
| NOR | DNB Services PMI | `PMI_NO_SERV` | 🟡 |

---

## 3. Consumer Sentiment

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | University of Michigan | `UMCSENT` (FRED) | 🟢 FRED |
| EUR | European Commission ESI Consumer | `ESI_CONS_EA` (ECB SDW) | 🟡 ECB SDW |
| JPN | Cabinet Office Consumer Confidence | `JPN_CONF` (OECD) | 🟡 OECD / BoJ |
| GBR | GfK Consumer Confidence | `GFK_GB` (GfK / ONS) | 🟡 ONS |
| CHE | SECO Consumer Confidence | `SECO_CONS` | 🟡 SECO |
| CAN | Conference Board Canada | — | 🟡 StatCan |
| AUS | Westpac-MI Consumer Sentiment | — | 🟡 Westpac |
| NZL | ANZ-Roy Morgan Consumer Confidence | — | 🟡 ANZ |
| SWE | Konjunkturinstitutet (KI) Confidence | — | 🟡 SCB / KI |
| NOR | Forbruker- og administrasjonsbyrået | — | 🟡 SSB |

**Alternativa gratuita:** OECD Consumer Confidence Index (`CSCICP03` en FRED/OECD MEI) tiene datos para la mayoría de países OECD.

---

## 4. Building Permits (YoY)

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | Census Bureau / FRED | `PERMIT` (FRED) | 🟢 FRED |
| EUR | Eurostat | `sts_cobp_m` | 🟢 Eurostat API |
| JPN | Ministry of Land, Infrastructure, Transport and Tourism (MLIT) | — | 🟡 |
| GBR | ONS | — | 🟢 ONS API |
| CHE | Federal Statistical Office (OFS) | — | 🟡 BFS |
| CAN | StatCan | — | 🟢 StatCan API |
| AUS | ABS | `8731.0` | 🟢 ABS API |
| NZL | Stats NZ | — | 🟢 Stats NZ |
| SWE | SCB (Statistics Sweden) | — | 🟢 SCB API |
| NOR | SSB (Statistics Norway) | — | 🟢 SSB API |

---

## 5. M2 YoY

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | Fed / FRED | `M2SL` (FRED) | 🟢 FRED |
| EUR | ECB SDW | `BSI.M.U2.Y.V.M20` | 🟡 ECB SDW |
| JPN | Bank of Japan | `M2_JP` (BoJ) | 🟡 BoJ |
| GBR | Bank of England | `M4_GB` (BoE) | 🟡 BoE |
| CHE | Swiss National Bank | `M3_CH` (SNB) | 🟡 SNB |
| CAN | StatCan / Bank of Canada | `v37146` | 🟢 StatCan |
| AUS | RBA | `M3_AU` | 🟡 RBA |
| NZL | RBNZ | `M3_NZ` | 🟡 RBNZ |
| SWE | Sveriges Riksbank | `M3_SE` | 🟡 Riksbank |
| NOR | Norges Bank | `M2_NO` | 🟡 NB |

**Alternativa gratuita:** BIS Credit to Non-Financial Sector (`Q:CH:M:Z:Z:A:M:770:A` en BIS Statistics) o FRED `M2` para USA + OECD M3 para Europa/Japón.

---

## 6. Central Bank Policy Rate

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | Fed / FRED | `DFF` (Effective Fed Funds) | 🟢 FRED |
| EUR | ECB | `DFR` (Deposit Facility Rate) | 🟡 ECB |
| JPN | Bank of Japan | BoJ Policy Rate (negative 2016-2024) | 🟡 BoJ |
| GBR | Bank of England | Bank Rate | 🟡 BoE |
| CHE | Swiss National Bank | SNB Policy Rate | 🟡 SNB |
| CAN | Bank of Canada | Overnight Target Rate | 🟡 BoC |
| AUS | RBA | Cash Rate | 🟡 RBA |
| NZL | RBNZ | Official Cash Rate (OCR) | 🟡 RBNZ |
| SWE | Sveriges Riksbank | Repo Rate | 🟡 Riksbank |
| NOR | Norges Bank | Policy Rate | 🟡 NB |

**Alternativa gratuita:** IMF International Financial Statistics (`FPOLM_PA` en IMF IFS) tiene tasas de política para casi todos los países. También OECD MEI `Short-term interest rates`.

---

## 7. CPI YoY

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | BLS / FRED | `CPIAUCSL` (FRED, luego calcular YoY) | 🟢 FRED |
| EUR | Eurostat | HICP (`prc_hicp_mona`) | 🟢 Eurostat API |
| JPN | MIC / Statistics Bureau | `CPI_JP` | 🟡 MIC |
| GBR | ONS | `CPI_GB` | 🟢 ONS API |
| CHE | BFS (Bundesamt für Statistik) | `CPI_CH` | 🟡 BFS |
| CAN | StatCan | `CPI_CA` | 🟢 StatCan API |
| AUS | ABS | `6401.0` | 🟢 ABS API |
| NZL | Stats NZ | `CPI_NZ` | 🟢 Stats NZ |
| SWE | SCB | `CPI_SE` / `CPIF` | 🟢 SCB API |
| NOR | SSB | `CPI_NO` / `CPI-ATE` | 🟢 SSB API |

**Alternativa gratuita:** OECD CPI (`MEI` database) tiene series mensuales estandarizadas para todos los países.

---

## 8. Core CPI YoY

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | BLS / FRED | `CPILFESL` (Core CPI, excl food & energy) | 🟢 FRED |
| EUR | Eurostat | HICP excl. Food & Energy (`prc_hicp_manr`) | 🟢 Eurostat API |
| JPN | BoJ / MIC | BoJ Core CPI | 🟡 BoJ |
| GBR | ONS | Core CPI (CPIH excl. food, energy, alcohol, tobacco) | 🟢 ONS API |
| CHE | BFS | Core CPI | 🟡 BFS |
| CAN | StatCan / BoC | BoC Core CPI measures (CPI-common, CPI-median, CPI-trim) | 🟢 StatCan |
| AUS | ABS | Trimmed Mean | 🟢 ABS API |
| NZL | Stats NZ | Sectoral Factor Model | 🟢 Stats NZ |
| SWE | SCB | `CPIF` (CPI excl. interest rates) | 🟢 SCB API |
| NOR | SSB | `CPI-ATE` (excl. taxes & energy) | 🟢 SSB API |

---

## 9-10. PPI All / Core YoY

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | BLS | PPI All Commodities + Core PPI | 🟢 FRED |
| EUR | Eurostat | `sts_inpp_m` (Industrial Producer Prices) | 🟢 Eurostat API |
| JPN | BoJ | CGPI (Corporate Goods Price Index) | 🟡 BoJ |
| GBR | ONS | PPI Output | 🟢 ONS API |
| CHE | BFS | PPI | 🟡 BFS |
| CAN | StatCan | IPPI (Industrial Product Price Index) | 🟢 StatCan |
| AUS | ABS | PPI | 🟢 ABS API |
| NZL | Stats NZ | PPI | 🟢 Stats NZ |
| SWE | SCB | PPI | 🟢 SCB API |
| NOR | SSB | PPI | 🟢 SSB API |

> **Nota:** PPI es menos crítico que CPI. Si no disponible, puedes omitirlo (β=0.02 cada uno, peso bajo).

---

## 11. Employment / NFP YoY

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | BLS / FRED | `PAYEMS` (Total Nonfarm Payrolls, luego YoY) | 🟢 FRED |
| EUR | Eurostat | `lfst_r_lfe2emprtn` (Employment) | 🟢 Eurostat API |
| JPN | MIC | Employment | 🟡 MIC |
| GBR | ONS | Labour Force Survey (LFS) Employment | 🟢 ONS API |
| CHE | SECO | Employment | 🟡 SECO |
| CAN | StatCan | Labour Force Survey (LFS) | 🟢 StatCan |
| AUS | ABS | Labour Force (LFS) | 🟢 ABS API |
| NZL | Stats NZ | Household Labour Force Survey (HLFS) | 🟢 Stats NZ |
| SWE | SCB | AKU (Arbetskraftsundersökningarna) | 🟢 SCB API |
| NOR | SSB | AKU (Arbeidskraftundersøkelsen) | 🟢 SSB API |

**Alternativa gratuita:** OECD Employment (`LFS` database) o FRED `PAYEMS` para USA.

---

## 12. Govt Debt / GDP

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | OMB / CBO / FRED | `GFDEGDQ188S` (FRED) | 🟢 FRED |
| EUR | Eurostat | `gov_10dd_edpt1` | 🟢 Eurostat API |
| JPN | Ministry of Finance Japan | — | 🟡 MoF |
| GBR | ONS | Public Sector Net Debt | 🟢 ONS API |
| CHE | Eidgenössisches Finanzdepartement (EFV) | — | 🟡 EFV |
| CAN | Department of Finance / StatCan | — | 🟢 StatCan |
| AUS | Australian Office of Financial Management (AOFM) | — | 🟡 AOFM |
| NZL | NZ Treasury | — | 🟡 NZ Treasury |
| SWE | Riksgälden (Swedish National Debt Office) | — | 🟡 Riksgälden |
| NOR | Norges Bank / Ministry of Finance | — | 🟡 NB |

**Alternativa gratuita:** IMF General Government Gross Debt (`GG_G01_GG_GDP` en IMF WEO Database), actualizado semestralmente. OECD Government Debt database.

---

## 13. Govt Fiscal Balance / GDP

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | OMB / CBO | — | 🟡 |
| EUR | Eurostat | `gov_10a_main` | 🟢 Eurostat API |
| JPN | Ministry of Finance | — | 🟡 MoF |
| GBR | OBR / ONS | — | 🟢 ONS API |
| CHE | EFV | — | 🟡 EFV |
| CAN | Department of Finance | — | 🟢 StatCan |
| AUS | Department of Finance (DoF) | — | 🟡 DoF |
| NZL | NZ Treasury | — | 🟡 NZ Treasury |
| SWE | ESV (Ekonomistyrningsverket) | — | 🟡 ESV |
| NOR | Ministry of Finance / SSB | — | 🟢 SSB API |

**Alternativa gratuita:** IMF WEO Fiscal Balance (`GGXCNL_G01_GDP`) o OECD.

---

## 14. Interest Payments / GDP

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | OMB / CBO | — | 🟡 |
| EUR | Eurostat | `gov_10q_ggnind` | 🟢 Eurostat API |
| JPN | MoF | — | 🟡 |
| GBR | ONS / OBR | — | 🟢 ONS |
| CHE | EFV | — | 🟡 |
| CAN | DoF | — | 🟡 |
| AUS | DoF | — | 🟡 |
| NZL | NZ Treasury | — | 🟡 |
| SWE | ESV | — | 🟡 |
| NOR | SSB | — | 🟢 SSB |

> **Nota:** Este indicador es difícil de encontrar en APIs gratuitas. Puedes calcularlo aproximado como: `Interest/GDP ≈ (Debt/GDP) × (Avg Yield 10Y)`. Si no disponible, omitir (β=0.02).

---

## 15. Liquidity Cover (FX Reserves / Short-term Debt)

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | IMF IFS / Fed | — | 🟡 IMF IFS |
| EUR | ECB / IMF IFS | — | 🟡 ECB SDW / IMF |
| JPN | Ministry of Finance / BoJ | — | 🟡 MoF |
| GBR | BoE / IMF IFS | — | 🟡 BoE |
| CHE | SNB | — | 🟡 SNB |
| CAN | BoC / IMF IFS | — | 🟡 BoC |
| AUS | RBA | — | 🟡 RBA |
| NZL | RBNZ | — | 🟡 RBNZ |
| SWE | Riksbank | — | 🟡 Riksbank |
| NOR | Norges Bank | — | 🟡 NB |

**Alternativa gratuita:** IMF International Reserves (`RAFAGOLDM` en FRED para reservas oro + FX). BIS Locational Banking Statistics. World Bank External Debt (`DT.DOD.DECT.CD`).

> **Nota:** Liquidity Cover es más crítico para EM que para G10. En G10 puedes usar un proxy simplificado: `FX Reserves / M2` o `FX Reserves / Imports`.

---

## 16. 10Y Yield Nominal

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | FRED | `DGS10` | 🟢 FRED |
| EUR | ECB / Eurostat | Bund 10Y (`IRLTLT01DEM156N` FRED proxy) | 🟡 ECB |
| JPN | MoF / FRED | `IRLTLT01JPM156N` (FRED proxy) | 🟢 FRED |
| GBR | BoE / FRED | `IRLTLT01GBM156N` (FRED proxy) | 🟢 FRED |
| CHE | SNB / investing.com | — | 🟡 |
| CAN | BoC / StatCan | — | 🟡 |
| AUS | RBA | — | 🟡 RBA |
| NZL | RBNZ | — | 🟡 RBNZ |
| SWE | Riksbank | — | 🟡 Riksbank |
| NOR | Norges Bank | — | 🟡 NB |

**Alternativa gratuita:** OECD Long-term Interest Rates (`MEI` database) tiene 10Y yields estandarizados para todos los países. También Investing.com o TradingEconomics.com para datos diarios.

---

## 17. 10Y Yield Real (TIPS / Linker)

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | FRED | `DFII10` (10Y TIPS) | 🟢 FRED |
| EUR | ECB / Bundesbank | Bund 10Y inflation-linked | 🟡 ECB |
| JPN | BoJ | JGBi (inflation-linked) | 🟡 BoJ |
| GBR | DMO / BoE | Index-Linked Gilt 10Y | 🟡 BoE |
| CHE | SNB | Proxy: nominal − SARON inflation | 🟡 |
| CAN | BoC | RRB (Real Return Bond) | 🟡 BoC |
| AUS | RBA | TIB (Treasury Indexed Bond) | 🟡 RBA |
| NZL | RBNZ | IIB (Inflation Indexed Bond) | 🟡 RBNZ |
| SWE | Riksbank | — | 🟡 |
| NOR | NB | — | 🟡 |

**Alternativa gratuita:** Si no hay linker disponible, calcular proxy: `Real Yield ≈ Nominal 10Y − Breakeven 5Y5Y`.

---

## 18. CB Balance / GDP YoY (diferencia anual)

| País | Fuente principal | Serie / Ticker | Tipo |
|---|---|---|---|
| USA | Fed H.4.1 / FRED | `WALCL` (Total Assets, luego %GDP y ΔYoY) | 🟢 FRED |
| EUR | ECB consolidated balance sheet | — | 🟡 ECB |
| JPN | BoJ | — | 🟡 BoJ |
| GBR | BoE | — | 🟡 BoE |
| CHE | SNB | — | 🟡 SNB |
| CAN | BoC | — | 🟡 BoC |
| AUS | RBA | — | 🟡 RBA |
| NZL | RBNZ | — | 🟡 RBNZ |
| SWE | Riksbank | — | 🟡 Riksbank |
| NOR | NB | — | 🟡 NB |

**Alternativa gratuita:** BIS `Total Credit` statistics. FRED `WALCL` para USA es excelente y gratuito.

---

## 19. Real Rate 2Y (¡Indicador dominante! β=0.14)

| País | Fuente principal | Cálculo | Tipo |
|---|---|---|---|
| USA | FRED | `DGS2` (nominal 2Y) − `T5YIFR` (breakeven 5Y5Y) | 🟢 FRED |
| EUR | ECB / Market | Bund 2Y nominal − HICP 5Y5Y (ECB ILS) | 🟡 ECB |
| JPN | BoJ / Market | OIS 2Y − breakeven JGB | 🟡 |
| GBR | BoE / Market | Gilt 2Y − UK 5Y5Y inflation swap | 🟡 |
| CHE | SNB / Market | SARON 2Y − SECO inflation forecast | 🟡 |
| CAN | BoC / Market | GoC 2Y − BoC neutral/infl exp | 🟡 |
| AUS | RBA / Market | ACGB 2Y − RBA inflation expectation | 🟡 |
| NZL | RBNZ / Market | NZGB 2Y − RBNZ inflation expectation | 🟡 |
| SWE | Riksbank / Market | Riksbank 2Y repo-linked − Riksbank infl exp | 🟡 |
| NOR | NB / Market | NB 2Y − NB inflation expectation | 🟡 |

**Alternativa gratuita:**
- Para USA: FRED tiene todo (`DGS2` + `T5YIFR`).
- Para EUR: ECB Statistical Data Warehouse (`IRS` rates + `ILS` inflation swaps).
- Para otros: si no disponible, usar **10Y real** como proxy de la curva real completa (menos preciso pero funcional).

> **Crítico:** Este es el indicador más importante de todo el modelo (β=0.14). Si solo puedes calcular **una cosa** para cada país, que sea esta.

---

## 20. Current Account / GDP

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | BEA / FRED | `NETFI` (FRED proxy) o `BOPGSTB` | 🟢 FRED |
| EUR | Eurostat | `bop_c6_q` | 🟢 Eurostat API |
| JPN | Ministry of Finance | BoP | 🟡 MoF |
| GBR | ONS | BoP | 🟢 ONS API |
| CHE | SNB | BoP | 🟡 SNB |
| CAN | StatCan | BoP | 🟢 StatCan API |
| AUS | ABS | BoP | 🟢 ABS API |
| NZL | Stats NZ | BoP | 🟢 Stats NZ |
| SWE | SCB | BoP | 🟢 SCB API |
| NOR | SSB | BoP | 🟢 SSB API |

**Alternativa gratuita:** IMF Balance of Payments (`BOP` database). OECD Quarterly National Accounts.

---

## 21. NIIP / GDP

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | BEA | International Investment Position | 🟡 BEA |
| EUR | Eurostat | IIP | 🟢 Eurostat API |
| JPN | MoF / BoJ | IIP | 🟡 MoF |
| GBR | ONS | IIP | 🟢 ONS API |
| CHE | SNB | IIP | 🟡 SNB |
| CAN | StatCan | IIP | 🟢 StatCan API |
| AUS | ABS | IIP | 🟢 ABS API |
| NZL | Stats NZ | IIP | 🟢 Stats NZ |
| SWE | SCB | IIP | 🟢 SCB API |
| NOR | SSB | IIP | 🟢 SSB API |

**Alternativa gratuita:** IMF International Investment Position (`IIP` database). BIS `Effective exchange rate` tiene algunos datos relacionados.

---

## 22. Terms of Trade (ToT) YoY

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| USA | BEA | Price Index for Exports / Imports | 🟡 BEA |
| EUR | Eurostat | Terms of Trade (`ei_mfrt_m`) | 🟢 Eurostat API |
| JPN | MoF / BoJ | — | 🟡 |
| GBR | ONS | — | 🟢 ONS API |
| CHE | SECO | — | 🟡 SECO |
| CAN | StatCan | — | 🟢 StatCan API |
| AUS | ABS | — | 🟢 ABS API |
| NZL | Stats NZ | — | 🟢 Stats NZ |
| SWE | SCB | — | 🟢 SCB API |
| NOR | SSB | — | 🟢 SSB API |

**Alternativa gratuita:** Si no disponible, calcular proxy: `ToT ≈ (Export Price Index / Import Price Index)` desde UN Comtrade o OECD.

---

## 23. CFTC Positioning

| País / Divisa | Fuente principal | Serie CFTC | Tipo |
|---|---|---|---|
| USD (DXY) | CFTC TFF | `DX` (Dollar Index) | 🟢 CFTC.gov |
| EUR | CFTC TFF | `EU` (Euro FX) | 🟢 CFTC.gov |
| JPY | CFTC TFF | `JY` (Japanese Yen) | 🟢 CFTC.gov |
| GBR | CFTC TFF | `BP` (British Pound) | 🟢 CFTC.gov |
| CHE | CFTC TFF | `SF` (Swiss Franc) | 🟢 CFTC.gov |
| CAN | CFTC TFF | `CD` (Canadian Dollar) | 🟢 CFTC.gov |
| AUS | CFTC TFF | `AD` (Australian Dollar) | 🟢 CFTC.gov |
| NZL | CFTC TFF | `NE` (New Zealand Dollar) | 🟢 CFTC.gov |
| SWE | CFTC TFF | — (no directo, usar proxy DXY) | 🟡 |
| NOR | CFTC TFF | — (no directo, usar proxy DXY) | 🟡 |

**Formato:** Descargar TFF (Traders in Financial Futures) report en CSV desde `cftc.gov`. Usar columna `Asset Manager Long` vs `Short`.

**Para SEK y NOK:** No tienen contratos individuales en CFTC. Usar posición neta DXY como proxy inverso.

---

## 24. REER Desviación 10Y

| País | Fuente principal | Serie | Tipo |
|---|---|---|---|
| Todos G10 | BIS | REER Broad (CPI-based) | 🟢 BIS Statistics |

**BIS REER:** Disponible para 60+ economías en `bis.org/statistics/eer.htm`. Actualizado mensualmente.

**Cálculo:**
```
REER_desviación = REER_t / media_móvil_10Y(REER) − 1
```

> **Nota:** No calcular z-score sobre REER nivel directamente (no estacionario). Primero calcular desviación vs 10Y, luego z-score de esa desviación.

---

## APIs Consolidadas Recomendadas

| API | Cobertura | Costo | Cómo acceder |
|---|---|---|---|
| **FRED** | USA + globales | Gratis | `fred.stlouisfed.org` + `pandas-datareader` |
| **ECB SDW** | Eurozone | Gratis | `sdw.ecb.europa.eu` (web + bulk download) |
| **Eurostat** | Europa | Gratis | `ec.europa.eu/eurostat/databrowser-viewer` + API REST |
| **OECD MEI** | 38 países | Gratis | `stats.oecd.org` + `pandas-datareader` |
| **BIS Statistics** | Global (rates, REER, credit) | Gratis | `bis.org/statistics` + bulk CSV |
| **IMF IFS / WEO** | Global | Gratis | `data.imf.org` + API SDMX |
| **World Bank** | Global | Gratis | `data.worldbank.org` + `wbdata` Python lib |
| **StatCan** | Canadá | Gratis | `statcan.gc.ca` + API |
| **ONS** | UK | Gratis | `ons.gov.uk` + API |
| **ABS** | Australia | Gratis | `abs.gov.au` + API |
| **Stats NZ** | Nueva Zelanda | Gratis | `stats.govt.nz` + API |
| **SSB** | Noruega | Gratis | `ssb.no` + API |
| **SCB** | Suecia | Gratis | `scb.se` + API |
| **CFTC** | Posicionamiento USA | Gratis | `cftc.gov` (download CSV semanal) |

---

## Checklist: ¿Qué puedo omitir si tengo poco tiempo?

Si necesitas arrancar rápido, prioriza por β (peso en el modelo):

| Prioridad | Indicador | β | Por qué |
|---|---|---|---|
| 🔴 Crítico | Real Rate 2Y Diff | 0.14 | Dominante en G10 a 1-3 meses |
| 🟠 Alta | Current Account / GDP | 0.07 | Estructural, fuerte en FX |
| 🟠 Alta | 10Y Real Yield | 0.06 | Carry y atractivo de capital |
| 🟠 Alta | ToT YoY | 0.06 | Commodity currencies |
| 🟡 Media | CPI, Core CPI, CB Rate, NFP, ISM | 0.04-0.05 | Ciclo macro estándar |
| 🟢 Baja | PPI, Building Permits, Interest/GDP | 0.02 | Peso bajo, pueden omitirse en MVP |

**MVP Endogenous (mínimo viable):** ~12-15 indicadores por país en vez de 24. Incluir siempre #19 (real rate 2Y) + CA/GDP + 10Y real + ToT + CPI + NFP + ISM + CB Rate + CFTC + REER.

---

> **Nota final:** La mayoría de bancos centrales (Fed, ECB, BoJ, BoE, SNB, BoC, RBA, RBNZ, Riksbank, Norges Bank) publican sus datos en formatos abiertos. No necesitas Bloomberg para G10 si usas las APIs oficiales. El único dolor real son los **breakevens / inflation swaps** (para calcular real rates), que a veces solo están en terminales de pago. Usa proxies cuando sea necesario.
