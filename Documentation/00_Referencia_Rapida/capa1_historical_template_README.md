# Guía del Template Histórico — Capa 1

Archivo: `capa1_historical_template.csv`

---

## Estructura General

El CSV está organizado en **bloques horizontales** (columnas agrupadas por tema):

1. **World View** (columnas 2-9)
2. **CESI** (columnas 10-13)
3. **Endogenous por país G10** (columnas 14-283) — 24 indicadores × 10 países
4. **Exógenos** (columnas 284-294)

---

## 1. World View (mercado global)

| Columna | Descripción | Frecuencia | Fuente típica |
|---|---|---|---|
| `vix` | VIX spot | Diaria | CBOE |
| `hy_oas` | US High Yield OAS | Diaria | ICE BofA / Bloomberg |
| `spx_close` | S&P 500 cierre | Diaria | Yahoo / FRED |
| `spx_200dma` | Media 200 días S&P | Diaria | Calculada |
| `embi_global` | EMBI Global Spread | Diaria | JPM / Bloomberg |
| `dxy` | Dollar Index | Diaria | ICE / Bloomberg |
| `us_breakevens_5y5y` | 5Y5Y breakeven US | Diaria | FRED T5YIFR |
| `cpi_g7_median` | Mediana CPI YoY G7 | Mensual | Calcular de datos nacionales |

**Uso:** Calcular régimen risk-on/off, USD bias, régimen inflación.

---

## 2. CESI (Citi Economic Surprise Index)

| Columna | País |
|---|---|
| `cesi_usa` | Estados Unidos |
| `cesi_eur` | Eurozona |
| `cesi_chn` | China |
| `cesi_jpn` | Japón |

**Uso:** Proxy de GDP gap para momentum global (§2 World View) o input al score corto.

---

## 3. Endogenous por país

### Convención de nombres
```
{pais}_{indicador}
```

**Países:** `us`, `eur`, `jpy`, `gbp`, `chf`, `cad`, `aud`, `nzd`, `sek`, `nok`

**Indicadores (24 por país):**

| # | Sufijo | Descripción | Transformación típica |
|---|---|---|---|
| 1 | `ism_manuf` | PMI / ISM Manufacturing | Nivel directo |
| 2 | `nmi_services` | PMI / ISM Services | Nivel directo |
| 3 | `umcsi` | Consumer sentiment | Nivel directo |
| 4 | `building_permits_yoy` | Permisos construcción YoY | YoY % |
| 5 | `m2_yoy` | M2 YoY | YoY % |
| 6 | `cb_rate` | Tipo política banco central | Nivel directo |
| 7 | `cpi_yoy` | CPI YoY | YoY % |
| 8 | `core_cpi_yoy` | Core CPI YoY | YoY % |
| 9 | `ppi_all_yoy` | PPI YoY | YoY % |
| 10 | `core_ppi_yoy` | Core PPI YoY | YoY % |
| 11 | `nfp_yoy` | Empleo YoY | YoY % |
| 12 | `govt_debt_gdp` | Deuda pública / GDP | Diferencia anual (Δ12m) |
| 13 | `govt_balance_gdp` | Saldo fiscal / GDP | Diferencia anual |
| 14 | `interest_gdp` | Intereses / GDP | Diferencia anual |
| 15 | `liquidity_cover` | FX reserves / deuda CP | Nivel directo |
| 16 | `yield_10y_nominal` | Yield 10Y nominal | Nivel directo |
| 17 | `yield_10y_real` | Yield 10Y real (TIPS/linker) | Nivel directo |
| 18 | `cb_balance_gdp_yoy` | Balance BC / GDP YoY | Diferencia anual |
| 19 | `real_rate_2y` | Tipo real 2Y | Nivel directo |
| 20 | `current_account_gdp` | Cuenta corriente / GDP | Nivel directo |
| 21 | `niip_gdp` | NIIP / GDP | Diferencia anual |
| 22 | `tot_yoy` | Términos de intercambio YoY | YoY % |
| 23 | `cftc_positioning` | CFTC net positioning | Nivel directo |
| 24 | `reer` | REER (BIS broad) | Desviación vs 10Y (o nivel) |

> **Nota especial #19 (`real_rate_2y`):** Este indicador **ya es un diferencial** cuando se compara en un par. No aplicar `z(A)−z(B)`. Usar directo: `z_19 = (rate_diff − μ_diff,10Y) / σ_diff,10Y`.

### Series con transformación obligatoria

Según §15.6 del Endogenous Module, antes del z-score:

| Indicador | Transformación |
|---|---|
| Govt Debt/GDP | `x_t − x_{t−12}` (diferencia anual) |
| CB Balance/GDP | `x_t − x_{t−12}` |
| NIIP % GDP | `x_t − x_{t−12}` |
| REER nivel | Desviación vs media móvil 10Y |
| M2 nivel | Ya es YoY en el template |
| CPI nivel | Ya es YoY en el template |
| Yields | Nivel directo |

---

## 4. Exógenos

| Columna | Descripción | Driver principal para |
|---|---|---|
| `iron_ore_usd_t` | Mineral de hierro USD/t | AUD |
| `china_pmi_caixin` | China Caixin Manufacturing PMI | AUD, NZD |
| `china_credit_impulse_6m` | Impulso crédito China (lag 6m) | AUD |
| `copper_usd_lb` | Cobre USD/lb | AUD, commodity proxy |
| `wti_brent_usd_bbl` | Petróleo WTI/Brent USD/bbl | CAD, NOK |
| `global_dairy_trade_index` | Global Dairy Trade index | NZD |
| `eur_usd_close` | EUR/USD cierre | GBP, CHF, SEK, NOK |
| `eur_usd_20dma` | EUR/USD media 20 días | GBP, CHF, SEK, NOK |
| `eurozone_pmi_manuf` | Eurozone Manufacturing PMI | GBP, SEK, NOK, EUR exógeno |
| `periphery_spread_italy` | Spread Italia-Germany 10Y | EUR |

---

## Cómo usar este template

### Paso 1: Poblar con datos históricos
- Frecuencia base: **mensual** (último día del mes) para backtest y calibración de β.
- Frecuencia diaria: solo para world view (VIX, HY OAS, etc.) y timing.
- Mínimo recomendado: **15-20 años** (incluir 2008, 2011, 2015, 2020, 2022).

### Paso 2: Forward-fill
- Series mensuales: forward-fill desde último dato publicado.
- Series semanales (CFTC): último viernes del mes.
- Series trimestrales (CC, NIIP): último publicado, sin interpolar.
- Respetar **lag de publicación** real (CPI ~2-3 semanas, CC ~2-3 meses).

### Paso 3: Calcular z-scores
```python
z = clip((valor - media_10Y) / std_10Y, -10, +10)
```
- Media y std calculadas con ventana rolling 120 meses.
- Winsorizar datos a 1%/99% antes de calcular media/std.

### Paso 4: Calcular Δz por par
```python
# Para indicador i en par A/B (excepto #19):
delta_z = z_A - z_B

# Para indicador #19 (real_rate_2y):
z_diff = (rate_A - rate_B - mu_diff) / sigma_diff
```

### Paso 5: Aplicar signos, betas y filtro régimen
Ver `capa1_cheatsheet.md` §3-§6 para signos, betas iniciales y multiplicadores de régimen.

### Paso 6: Regresión para calibrar betas
```python
# Especificación:
delta_FX(t+h) = alpha + sum(beta_i * delta_z_i(t) * signo_i * filtro_i) + epsilon

# h = 1m, 3m, 6m, 12m
# Método: OLS con Ridge/Lasso
# Validación: walk-forward, últimos 3 años nunca tocados
```

---

## Extensión del template

Si necesitas añadir más series:

1. **Mantener la convención:** `{pais}_{indicador}` o `{categoria}_{subindicador}`
2. **Documentar transformaciones:** añadir columna en este README
3. **Exógenos adicionales:** añadir columnas al final del bloque exógeno
4. **Divisas EM:** requiere template separado (drivers distintos: CDS, carry, etc.)

---

## Ejemplo de fila

La segunda fila del CSV (`2024-01-31`) contiene valores ficticios pero realistas para ilustrar el formato. No usar para backtest — son solo placeholders.

---

> Para la fórmula completa y los parámetros operativos, consultar `capa1_cheatsheet.md`.
