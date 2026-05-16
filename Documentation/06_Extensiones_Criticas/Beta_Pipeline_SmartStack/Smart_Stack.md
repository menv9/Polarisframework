# Beta Pipeline — Smart Stack (Extensión Futura)

**Estado:** Documentado. No implementado.
**Prioridad:** Alta — impacto directo en IC y calidad de señal.
**Prerequisito:** Pipeline base funcional (ya completo en `beta_pipeline/`).

---

## Visión general

El pipeline actual obtiene betas estadísticamente robustas con datos públicos gratuitos (FRED + Yahoo Finance). Esta extensión eleva la arquitectura a nivel institucional boutique añadiendo fuentes de datos de mayor precisión, una base de datos Point-in-Time, detección de régimen y Risk Parity a nivel de factores.

```
[ CAPA 1: INGESTIÓN ] ────► FXMacroData API ($25/mes) + Scraper de Minutas
                                │
                                ▼
[ CAPA 2: ALMACENAMIENTO ] ──► DuckDB (Base de datos Point-in-Time local)
                                │
                                ▼
[ CAPA 3: PROCESAMIENTO ] ───► Filtro de Kalman (Betas dinámicas)
                              + Sorpresas macro (actual − consensus)
                              + NLP CB Sentiment (Z-Score de tono)
                                │
                                ▼
[ CAPA 4: FILTRADO ] ────────► Hidden Markov Models (Detector de régimen)
                                │
                                ▼
[ CAPA 5: CONSOLIDACIÓN ] ───► Factor Risk Parity ──► [ BIAS MACRO TRIMESTRAL ]
```

---

## Capa 1 — Ingestión

### 1a. FXMacroData ($25/mes) — Sorpresas macro

**Qué añade:** El pipeline actual usa YoY% de CPI (lo que ya está en precio). FXMacroData provee el timestamp exacto del release y el valor de consenso, permitiendo calcular el vector de sorpresa:

```
sorpresa_t = actual_t − consensus_t
```

Esto es lo que mueve el tipo de cambio en el momento del dato, no el nivel absoluto.

**Impacto esperado en IC:** El mayor salto individual. Las sorpresas macro son la señal con mayor poder predictivo a corto y medio plazo en FX.

**Integración:** Añadir columnas `surprise_cpi_usa`, `surprise_nfp_usa`, etc. a `df_trans`. El `feature_lag` pasa de 1 mes a días exactos desde el release.

**Referencia:** `beta_pipeline/fetch.py` → añadir `fetch_fxmacrodata()`.

---

### 1b. Scraper de Minutas de Bancos Centrales — Sentimiento CB

**Qué añade:** Las minutas de la Fed, BCE, BoE, BoJ, RBA, RBNZ, BoC, SNB contienen señales direccionales sobre política monetaria que preceden a los movimientos de tipos en semanas.

**Implementación recomendada:**

En lugar de FinBERT (entrenado en noticias genéricas), usar un LLM vía API con un prompt estructurado:

```python
PROMPT_CB_TONE = """
Analiza el siguiente fragmento de minutas de banco central.
Puntúa el tono monetario en una escala de -5 a +5:
  -5 = muy dovish (bajadas agresivas inminentes)
   0 = neutro
  +5 = muy hawkish (subidas agresivas inminentes)

Devuelve SOLO un JSON: {"score": <float>, "razon": "<1 frase>"}

Texto: {texto}
"""
```

Calcular el z-score del score histórico por banco central para normalizar el tono.

**Fuentes de scraping:**
- Fed: federalreserve.gov/monetarypolicy/fomccalendars.htm
- BCE: ecb.europa.eu/press/accounts/
- BoE: bankofengland.co.uk/monetary-policy-summary-and-minutes
- BoJ: boj.or.jp/en/mopo/mpmsche_minu/

**Referencia:** Nuevo módulo `beta_pipeline/cb_sentiment.py`.

---

## Capa 2 — Almacenamiento Point-in-Time (DuckDB)

**Por qué es crítico:** FRED revisa series retroactivamente (GDP, NFP, CPI). Sin PIT, el backtest usa datos que no estaban disponibles en la fecha histórica → look-ahead bias encubierto que infla el IC en IS y colapsa en OOS.

**Solución:** Base de datos DuckDB local que guarda cada *vintage* de dato con su fecha de publicación:

```sql
CREATE TABLE macro_pit (
    series_id    VARCHAR,
    valid_from   DATE,      -- fecha en que este valor fue publicado
    valid_until  DATE,      -- fecha en que fue revisado (NULL = vigente)
    obs_date     DATE,      -- fecha a la que corresponde el dato
    value        DOUBLE
);
```

**Consulta PIT correcta:**

```sql
-- "Dame el valor de UNRATE para 2022-06-01 tal como se conocía en 2022-07-15"
SELECT value FROM macro_pit
WHERE series_id = 'UNRATE'
  AND obs_date  = '2022-06-01'
  AND valid_from <= '2022-07-15'
  AND (valid_until > '2022-07-15' OR valid_until IS NULL)
```

**Por qué DuckDB:** Embebido (sin servidor), columnar (queries analíticas rápidas), integración nativa con pandas, sin coste.

**Dificultad:** Alta. Requiere guardar vintages desde el inicio (FRED API permite descargar revisiones históricas con el parámetro `realtime_start`/`realtime_end`).

**Referencia:** Reemplaza `beta_pipeline/fetch.py` + nuevo `beta_pipeline/db.py`.

---

## Capa 3 — Procesamiento

### 3a. Kalman Filter para betas dinámicas

**Estado:** Ya implementado en `beta_pipeline/kalman_beta.py`.

**Parámetros actuales:** Q=1e-6 (betas muy estables, solo derivan ante cambios estructurales). Revisar tras añadir sorpresas macro — con señales más limpias puede ser adecuado un Q ligeramente mayor (1e-5).

---

### 3b. Vector de sorpresas como feature

Con FXMacroData integrado, las sorpresas se incorporan directamente a `df_trans` como features adicionales. El pipeline actual de betas, Kalman y PCA los procesará automáticamente sin cambios de arquitectura.

**Transformación:** Las sorpresas ya son estacionarias por construcción (desviación de consensus). No necesitan `pct_change` ni `diff`. Añadir al grupo `"level"` en `TRANSFORM_RULES`.

---

### 3c. Z-Score de sentimiento CB

Output del scraper de minutas (§1b): una columna `cb_sentiment_usa`, `cb_sentiment_eur`, etc. con el z-score de tono normalizado histórico.

Integración idéntica a cualquier otro indicador endógeno: el pipeline de betas y Kalman lo absorben directamente.

---

## Capa 4 — Detección de Régimen (Hidden Markov Models)

**Por qué:** Las betas macro cambian de signo según el régimen. En risk-off, el USD se aprecia (safe haven). En risk-on con carry trade, el USD se deprecia. Una beta única sobre todo el periodo mezcla regímenes opuestos → IC artificialmente bajo.

**Implementación:**

```python
from hmmlearn import hmm

# Observaciones: scores PCA (PC_Risk, PC_Policy, PC_Growth)
# → ya disponibles en beta_pipeline/pca_factors.py
X = df_trans_pca[["PC_Risk", "PC_Policy", "PC_Growth"]].dropna().to_numpy()

model = hmm.GaussianHMM(n_components=3, covariance_type="full", n_iter=200)
model.fit(X)
regimes = model.predict(X)  # 0, 1, 2 por fecha
```

**Estados típicos en FX G10 (2005–2025):**
- Régimen 0: Risk-On / Carry Trade (baja volatilidad, USD débil, AUD/NZD fuertes)
- Régimen 1: Risk-Off / Crisis (VIX alto, USD fuerte, JPY fuerte, CHF fuerte)
- Régimen 2: Inflación / Política Monetaria Divergente (carry basado en diferenciales de tipos)

**Uso en el pipeline:**

En lugar de una beta única por par/indicador, calcular betas condicionales al régimen:

```
β_eurusd_vix | régimen 0 ≠ β_eurusd_vix | régimen 1
```

En producción: identificar el régimen actual (última observación del HMM) y usar las betas correspondientes para generar el bias trimestral.

**Limitaciones:**
- El régimen se identifica con cierto retraso (suavizado del HMM).
- Con ~240 observaciones mensuales y 3 regímenes, cada estado tiene ~80 obs — suficiente pero ajustado.
- Los regímenes no tienen labels nativos — requieren interpretación manual de las medias de cada estado.

**Referencia:** Nuevo módulo `beta_pipeline/regime_hmm.py`.

---

## Capa 5 — Factor Risk Parity

**Diferencia vs implementación actual:** El pipeline actual aplica Risk Parity a nivel de par (inverse-vol por par). Factor Risk Parity aplica el presupuesto de riesgo a nivel de factor macro, luego mapea a pares.

**Por qué es mejor:** EURUSD y EURGBP tienen ambos exposición EUR. Risk Parity de pares los trata como independientes → doble cuenta del riesgo EUR. Factor Risk Parity lo evita.

**Implementación:**

```python
def factor_risk_parity_weights(
    factor_betas: pd.DataFrame,   # (n_pairs × n_factors) betas de regresión vs PCA
    factor_vols: pd.Series,        # volatilidad histórica de cada factor
    pair_signals: dict[str, float] # señal direccional por par
) -> dict[str, float]:
    """
    1. Calcular exposición de cada par a cada factor.
    2. Distribuir presupuesto de riesgo igual entre factores.
    3. Mapear presupuesto de factor → peso de par.
    """
    # risk_budget_per_factor = 1 / n_factors
    # weight_pair = sum_f(budget_f / (beta_pair_f * factor_vol_f))
    ...
```

**Prerequisito:** Betas de pares vs factores PCA estables. Ya disponibles en `beta_pipeline/pca_factors.py` + `beta_pipeline/kalman_beta.py`.

---

## Plan de implementación recomendado

| Fase | Tarea | Esfuerzo | Impacto en IC |
|------|-------|----------|---------------|
| 1 | Integrar FXMacroData (sorpresas macro) | 1–2 días | Alto |
| 2 | DuckDB PIT básico (solo series FRED críticas) | 1 semana | Medio (elimina sesgo) |
| 3 | HMM régimen sobre PCA factors | 2–3 días | Medio-Alto |
| 4 | Factor Risk Parity | 1 día | Medio |
| 5 | CB Sentiment scraper + LLM scoring | 1–2 semanas | Medio |
| 6 | DuckDB PIT completo (todas las series) | 2–3 semanas | Alto (long-term) |

**Orden recomendado:** 1 → 3 → 4 → 2 → 5 → 6

El HMM (fase 3) tiene alta relación impacto/esfuerzo y no requiere datos externos de pago. Puede implementarse inmediatamente sobre los datos existentes.

---

## Archivos a crear / modificar

```
beta_pipeline/
├── fetch.py              → añadir fetch_fxmacrodata(), fetch_cot_cftc()
├── db.py                 → nuevo: DuckDB PIT engine
├── cb_sentiment.py       → nuevo: scraper + LLM scoring
├── regime_hmm.py         → nuevo: HMM sobre PCA factors
├── pca_factors.py        → modificar: añadir factor_risk_parity_weights()
├── run.py                → integrar nuevas fases
└── config.py             → añadir FXMACRODATA_API_KEY, HMM_N_STATES
```

---

## Referencias

- Ang & Bekaert (2002): *Regime Switches in Interest Rates* — base teórica para betas condicionales al régimen.
- Bailey & López de Prado (2014): *The Deflated Sharpe Ratio* — ya implementado (PSR).
- Meucci (2009): *Risk and Asset Allocation* — Factor Risk Parity framework.
- Rabiner (1989): *A Tutorial on Hidden Markov Models* — referencia HMM.
- hmmlearn: `pip install hmmlearn` — implementación Python estándar.
- DuckDB: `pip install duckdb` — base de datos columnar embebida.
