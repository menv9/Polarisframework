# Beta Pipeline — Smart Stack (Extensión Futura)

**Estado:** Documentado. No implementado.
**Prioridad:** Alta — impacto directo en IC y calidad de señal.
**Prerequisito:** Pipeline base funcional (ya completo en `beta_pipeline/`).
**Coste total:** $0 — todas las fuentes son gratuitas.

---

## Visión general

El pipeline actual obtiene betas estadísticamente robustas con datos públicos gratuitos (FRED + Yahoo Finance). Esta extensión eleva la arquitectura a nivel institucional boutique añadiendo consensos macro de fuentes públicas gratuitas, una base de datos Point-in-Time, detección de régimen y Risk Parity a nivel de factores.

```
[ CAPA 1: INGESTIÓN ] ────► Scraper Consensos Gratuitos + Scraper de Minutas CB
                              (Forex Factory / Myfxbook / DailyFX / Phil Fed SPF / ECB SPF)
                                │
                                ▼
[ CAPA 2: ALMACENAMIENTO ] ──► DuckDB (Base de datos Point-in-Time local)
                                │
                                ▼
[ CAPA 3: PROCESAMIENTO ] ───► Filtro de Kalman (Betas dinámicas)
                              + Sorpresas macro (actual − consensus)
                              + NLP CB Sentiment (Z-Score de tono LLM)
                                │
                                ▼
[ CAPA 4: FILTRADO ] ────────► Hidden Markov Models (Detector de régimen)
                                │
                                ▼
[ CAPA 5: CONSOLIDACIÓN ] ───► Factor Risk Parity ──► [ BIAS MACRO TRIMESTRAL ]
```

---

## Capa 1 — Ingestión de Consensos (100% Gratuito)

### Por qué importan los consensos

El pipeline actual usa YoY% de CPI (lo que ya está en precio). El vector de sorpresa es lo que mueve el tipo de cambio en el momento del dato:

```
sorpresa_t = actual_t − consensus_t
```

Las sorpresas son estacionarias por construcción y tienen mayor poder predictivo que el nivel absoluto. Añadir `surprise_cpi_usa`, `surprise_nfp_usa`, etc. a `df_trans` es el upgrade de mayor impacto en IC.

**Transformación:** Las sorpresas no necesitan `pct_change` ni `diff` — ya son desviaciones. Añadir al grupo `"level"` en `TRANSFORM_RULES`.

---

### 1a. Forex Factory — Fuente principal (Playwright)

**Cobertura:** ~10 años de histórico, todos los eventos G10, consenso + actual + anterior + timestamp de release.

**Dificultad:** Media — protección Cloudflare + JS rendering. Requiere Playwright.

```python
# beta_pipeline/scrapers/forex_factory.py
from playwright.sync_api import sync_playwright
import pandas as pd
from datetime import date

def fetch_forex_factory(year: int, month: int) -> pd.DataFrame:
    """
    Descarga el calendario económico de Forex Factory para un mes dado.
    Devuelve DataFrame con columnas:
      date, time, currency, event, actual, forecast, previous, impact
    """
    url = f"https://www.forexfactory.com/calendar?month={year}.{month:02d}"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        )
        page = ctx.new_page()
        page.goto(url, wait_until="networkidle", timeout=30_000)
        page.wait_for_selector(".calendar__table", timeout=15_000)

        rows = page.query_selector_all(".calendar__row")
        records = []
        current_date = None

        for row in rows:
            date_el = row.query_selector(".calendar__date")
            if date_el and date_el.inner_text().strip():
                current_date = date_el.inner_text().strip()

            currency_el = row.query_selector(".calendar__currency")
            event_el    = row.query_selector(".calendar__event")
            actual_el   = row.query_selector(".calendar__actual")
            forecast_el = row.query_selector(".calendar__forecast")
            prev_el     = row.query_selector(".calendar__previous")
            impact_el   = row.query_selector(".calendar__impact span")
            time_el     = row.query_selector(".calendar__time")

            if not (currency_el and event_el):
                continue

            records.append({
                "date":     current_date,
                "time":     time_el.inner_text().strip() if time_el else "",
                "currency": currency_el.inner_text().strip(),
                "event":    event_el.inner_text().strip(),
                "actual":   actual_el.inner_text().strip() if actual_el else "",
                "forecast": forecast_el.inner_text().strip() if forecast_el else "",
                "previous": prev_el.inner_text().strip() if prev_el else "",
                "impact":   impact_el.get_attribute("title") if impact_el else "",
            })

        browser.close()
    return pd.DataFrame(records)


def fetch_forex_factory_range(
    start: date, end: date, high_impact_only: bool = True
) -> pd.DataFrame:
    """Descarga histórico mensual entre start y end, filtrando por impacto."""
    frames = []
    y, m = start.year, start.month
    while (y, m) <= (end.year, end.month):
        df = fetch_forex_factory(y, m)
        if high_impact_only:
            df = df[df["impact"].str.contains("High", na=False)]
        frames.append(df)
        m += 1
        if m > 12:
            m, y = 1, y + 1
    return pd.concat(frames, ignore_index=True) if frames else pd.DataFrame()
```

**Instalación:** `pip install playwright && playwright install chromium`

**Rate limiting recomendado:** 1 request cada 3–5 segundos + rotación de user-agent para evitar bloqueos.

---

### 1b. Myfxbook Economic Calendar — Fallback sencillo

**Cobertura:** ~5 años, G10, consenso + actual.
**Dificultad:** Baja — API JSON pública sin autenticación.

```python
# beta_pipeline/scrapers/myfxbook.py
import requests
import pandas as pd
from datetime import date

def fetch_myfxbook(start: date, end: date) -> pd.DataFrame:
    """
    Usa el endpoint JSON público de Myfxbook.
    No requiere API key. Rate limit generoso.
    """
    url = "https://www.myfxbook.com/api/get-economic-calendar.json"
    params = {
        "start": start.strftime("%Y-%m-%d %H:%M"),
        "end":   end.strftime("%Y-%m-%d %H:%M"),
    }
    resp = requests.get(url, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if not data.get("calendar"):
        return pd.DataFrame()

    records = []
    for item in data["calendar"]:
        records.append({
            "date":     item.get("date", ""),
            "currency": item.get("currency", ""),
            "event":    item.get("title", ""),
            "actual":   item.get("actual", ""),
            "forecast": item.get("forecast", ""),
            "previous": item.get("previous", ""),
            "impact":   item.get("impact", ""),
        })
    return pd.DataFrame(records)
```

---

### 1c. DailyFX Economic Calendar — Fallback alternativo

**Cobertura:** ~3 años, foco en G10 FX, buena calidad de consenso.
**Dificultad:** Baja — JSON embebido en página, parseable con requests + BeautifulSoup.

```python
# beta_pipeline/scrapers/dailyfx.py
import requests
from bs4 import BeautifulSoup
import json
import pandas as pd
from datetime import date

def fetch_dailyfx(target_date: date) -> pd.DataFrame:
    """
    Extrae datos del calendario de DailyFX para una fecha.
    Los datos están embebidos como JSON en el HTML de la página.
    """
    url = f"https://www.dailyfx.com/economic-calendar#{target_date.isoformat()}"
    headers = {"User-Agent": "Mozilla/5.0"}
    resp = requests.get(url, headers=headers, timeout=15)
    soup = BeautifulSoup(resp.text, "html.parser")

    # DailyFX embebe los datos en un script JSON
    script = soup.find("script", {"id": "__NEXT_DATA__"})
    if not script:
        return pd.DataFrame()

    data = json.loads(script.string)
    events = (
        data.get("props", {})
            .get("pageProps", {})
            .get("calendarData", {})
            .get("events", [])
    )
    records = []
    for ev in events:
        records.append({
            "date":     ev.get("date", ""),
            "currency": ev.get("country", ""),
            "event":    ev.get("name", ""),
            "actual":   ev.get("actual", ""),
            "forecast": ev.get("consensus", ""),
            "previous": ev.get("previous", ""),
            "impact":   ev.get("impact", ""),
        })
    return pd.DataFrame(records)
```

---

### 1d. Philadelphia Fed Survey of Professional Forecasters — USA (40 años, API directa)

**Cobertura:** Desde 1968, trimestral, USA únicamente. Consenso de ~40 economistas profesionales para GDP, CPI, PCE, desempleo, NFP. La fuente de mayor calidad y profundidad histórica para USA.

**Dificultad:** Nula — API REST pública de la Fed de Filadelfia.

```python
# beta_pipeline/scrapers/philly_fed_spf.py
import requests
import pandas as pd

SPF_BASE = "https://www.philadelphiafed.org/surveys-and-data/real-time-data-research"

# Series disponibles con su clave de descarga directa
SPF_SERIES = {
    "spf_cpi_mean":    "CPI",        # consenso CPI YoY%
    "spf_gdp_mean":    "RGDP",       # consenso GDP real growth
    "spf_unemp_mean":  "UNEMP",      # consenso unemployment rate
    "spf_pce_mean":    "PCE",        # consenso PCE
    "spf_tbill_mean":  "TBILL",      # consenso T-bill rate
    "spf_tbond_mean":  "TBOND",      # consenso 10Y Treasury
}

def fetch_philly_spf(series_key: str = "CPI") -> pd.DataFrame:
    """
    Descarga el Survey of Professional Forecasters de la Fed de Filadelfia.
    Devuelve DataFrame con fecha y consenso trimestral.

    Documentación: https://www.philadelphiafed.org/surveys-and-data/
                   real-time-data-research/survey-of-professional-forecasters
    """
    # Los archivos están disponibles como Excel/CSV en el servidor de la Fed
    url = f"https://www.philadelphiafed.org/-/media/frbp/assets/surveys-and-data/survey-of-professional-forecasters/data-files/files/median_{series_key}_level.xlsx"
    df = pd.read_excel(url, skiprows=0)

    # Limpiar: primera columna = año, segunda = trimestre, resto = horizontes
    df.columns = [str(c).strip() for c in df.columns]
    df = df.dropna(how="all")

    # Construir fecha del survey (Q1=enero, Q2=abril, Q3=julio, Q4=octubre)
    quarter_to_month = {"1": 1, "2": 4, "3": 7, "4": 10}
    records = []
    for _, row in df.iterrows():
        try:
            year = int(row.iloc[0])
            quarter = str(int(row.iloc[1]))
            month = quarter_to_month.get(quarter, 1)
            consensus = row.iloc[2]  # horizonte actual (h=0)
            records.append({
                "date": pd.Timestamp(year=year, month=month, day=1),
                f"spf_{series_key.lower()}_consensus": float(consensus),
            })
        except (ValueError, TypeError):
            continue

    return pd.DataFrame(records).set_index("date")
```

---

### 1e. ECB Survey of Professional Forecasters — EUR (25 años, API directa)

**Cobertura:** Desde 1999, trimestral, Eurozona. Consenso de analistas para HICP, GDP, desempleo. Es el equivalente europeo del Philadelphia Fed SPF.

**Dificultad:** Baja — datos en CSV/Excel descargables directamente del BCE.

```python
# beta_pipeline/scrapers/ecb_spf.py
import requests
import pandas as pd
import io

def fetch_ecb_spf() -> pd.DataFrame:
    """
    Descarga el Survey of Professional Forecasters del BCE.
    Devuelve consensos trimestrales para HICP, GDP y desempleo EUR.

    Fuente: https://www.ecb.europa.eu/stats/ecb_surveys/
            survey_of_professional_forecasters/html/index.en.html
    """
    # El BCE publica los datos en formato Excel/CSV
    url = "https://www.ecb.europa.eu/stats/ecb_surveys/survey_of_professional_forecasters/html/index.en.html"

    # Series específicas disponibles via Statistical Data Warehouse del BCE
    sdw_base = "https://sdw-wsrest.ecb.europa.eu/service/data"

    series_map = {
        "spf_hicp_eur_1y":  "SPF/Q.U2.HICP.POINT.Q0100.ANT",   # HICP 1Y ahead
        "spf_gdp_eur_1y":   "SPF/Q.U2.REALGDP.POINT.Q0100.ANT", # GDP 1Y ahead
        "spf_unemp_eur_1y": "SPF/Q.U2.UNR.POINT.Q0100.ANT",     # Desempleo 1Y ahead
    }

    frames = []
    for col_name, series_id in series_map.items():
        url_sdw = f"{sdw_base}/{series_id}?format=csvdata"
        resp = requests.get(url_sdw, timeout=20)
        if resp.status_code != 200:
            continue
        df = pd.read_csv(io.StringIO(resp.text))
        if "TIME_PERIOD" not in df.columns or "OBS_VALUE" not in df.columns:
            continue
        df["date"] = pd.to_datetime(df["TIME_PERIOD"])
        df = df.set_index("date")[["OBS_VALUE"]].rename(columns={"OBS_VALUE": col_name})
        frames.append(df)

    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, axis=1).sort_index()
```

---

### 1f. Estrategia de cobertura combinada

| Fuente | Histórico | Cobertura geográfica | Granularidad | Prioridad |
|--------|-----------|----------------------|--------------|-----------|
| Philadelphia Fed SPF | 1968–hoy | USA | Trimestral | 1 — backfill USA largo |
| ECB SPF | 1999–hoy | EUR | Trimestral | 2 — backfill EUR largo |
| Myfxbook | ~5 años | G10 todos | Mensual/evento | 3 — cobertura amplia reciente |
| DailyFX | ~3 años | G10 todos | Evento | 4 — fallback / validación |
| Forex Factory | ~10 años | G10 todos | Evento + hora | 5 — fuente principal completa |

**Lógica de merge:** Para cada evento macro, priorizar Forex Factory (mayor profundidad y granularidad). Complementar USA con Philadelphia Fed SPF y EUR con ECB SPF para histórico largo (pre-2015).

```python
# beta_pipeline/scrapers/consensus_merger.py

def build_surprise_series(
    calendar_df: pd.DataFrame,  # output de fetch_forex_factory_range()
    spf_usa: pd.DataFrame,       # output de fetch_philly_spf()
    spf_eur: pd.DataFrame,       # output de fetch_ecb_spf()
) -> pd.DataFrame:
    """
    Combina fuentes en un DataFrame mensual de sorpresas por indicador.
    Columnas output: surprise_cpi_usa, surprise_nfp_usa, surprise_cpi_eur, ...
    Listo para añadir a df_trans en transform.py.
    """
    ...
```

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

-- Índice para queries PIT rápidas
CREATE INDEX idx_pit ON macro_pit (series_id, obs_date, valid_from);
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

**Dificultad:** Alta. Requiere guardar vintages desde el inicio. FRED API permite descargar revisiones históricas con los parámetros `realtime_start` / `realtime_end`.

**Referencia:** Reemplaza `beta_pipeline/fetch.py` + nuevo `beta_pipeline/db.py`.

---

## Capa 3 — Procesamiento

### 3a. Kalman Filter para betas dinámicas

**Estado:** Ya implementado en `beta_pipeline/kalman_beta.py`.

**Parámetros actuales:** Q=1e-6 (betas muy estables). Revisar tras añadir sorpresas macro — con señales más limpias puede ser adecuado Q=1e-5.

---

### 3b. Vector de sorpresas como feature

Output de la Capa 1: columnas `surprise_cpi_usa`, `surprise_nfp_usa`, `surprise_hicp_eur`, etc. Se añaden directamente a `df_trans`. El pipeline de betas, Kalman y PCA los procesa automáticamente sin cambios de arquitectura.

**Transformación:** Las sorpresas ya son estacionarias. Añadir al grupo `"level"` en `TRANSFORM_RULES` de `config.py`.

---

### 3c. Z-Score de sentimiento CB (LLM scoring)

**Qué añade:** Las minutas de la Fed, BCE, BoE, BoJ contienen señales sobre política monetaria que preceden a los movimientos de tipos en semanas.

**Implementación:** LLM con prompt estructurado (más fiable que FinBERT para este dominio):

```python
PROMPT_CB_TONE = """
Analiza el siguiente fragmento de minutas de banco central.
Puntúa el tono monetario en una escala de -5 a +5:
  -5 = muy dovish (bajadas agresivas inminentes)
   0 = neutro / sin cambios
  +5 = muy hawkish (subidas agresivas inminentes)

Devuelve SOLO un JSON: {"score": <float>, "razon": "<1 frase>"}

Texto: {texto}
"""
```

**Fuentes de scraping (gratuitas):**
- Fed FOMC: federalreserve.gov/monetarypolicy/fomccalendars.htm
- BCE: ecb.europa.eu/press/accounts/
- BoE: bankofengland.co.uk/monetary-policy-summary-and-minutes
- BoJ: boj.or.jp/en/mopo/mpmsche_minu/

**Referencia:** Nuevo módulo `beta_pipeline/cb_sentiment.py`.

---

## Capa 4 — Detección de Régimen (Hidden Markov Models)

**Por qué:** Las betas macro cambian de signo según el régimen. En risk-off el USD se aprecia (safe haven). En carry trade el USD se deprecia. Una beta única sobre todo el periodo mezcla regímenes opuestos → IC artificialmente bajo.

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

**Estados típicos G10 (2005–2025):**
- Régimen 0: Risk-On / Carry Trade (VIX bajo, USD débil, AUD/NZD fuertes)
- Régimen 1: Risk-Off / Crisis (VIX alto, USD fuerte, JPY fuerte, CHF fuerte)
- Régimen 2: Inflación / Política Monetaria Divergente (carry por diferenciales de tipos)

**Uso:** Calcular betas condicionales al régimen. En producción: identificar el régimen actual (última obs del HMM) y usar las betas del régimen correspondiente para el bias trimestral.

**Limitaciones:**
- Identificación con cierto retraso (suavizado del HMM).
- ~80 observaciones por régimen — suficiente pero ajustado.
- Labels requieren interpretación manual de las medias de cada estado.

**Referencia:** Nuevo módulo `beta_pipeline/regime_hmm.py`.

---

## Capa 5 — Factor Risk Parity

**Diferencia vs implementación actual:** El pipeline usa Risk Parity a nivel de par (inverse-vol por par). Factor Risk Parity aplica el presupuesto de riesgo a nivel de factor macro, luego mapea a pares.

**Por qué es mejor:** EURUSD y EURGBP tienen exposición EUR. Risk Parity de pares los trata como independientes → doble cuenta del riesgo EUR. Factor Risk Parity lo evita.

```python
def factor_risk_parity_weights(
    factor_betas: pd.DataFrame,    # (n_pairs × n_factors) betas vs PCA
    factor_vols: pd.Series,         # volatilidad histórica de cada factor
    pair_signals: dict[str, float]  # señal direccional por par
) -> dict[str, float]:
    # risk_budget_per_factor = 1 / n_factors
    # weight_pair = sum_f(budget_f / (beta_pair_f * factor_vol_f))
    ...
```

**Prerequisito:** Betas de pares vs factores PCA. Ya disponibles en `pca_factors.py` + `kalman_beta.py`.

---

## Plan de implementación

| Fase | Tarea | Coste | Esfuerzo | Impacto en IC |
|------|-------|-------|----------|---------------|
| 1 | Scrapers consenso (Myfxbook + Phil Fed SPF + ECB SPF) | $0 | 1–2 días | Alto |
| 2 | Forex Factory scraper (Playwright) — backfill 10 años | $0 | 2–3 días | Alto |
| 3 | HMM régimen sobre PCA factors | $0 | 2–3 días | Medio-Alto |
| 4 | Factor Risk Parity | $0 | 1 día | Medio |
| 5 | CB Sentiment scraper + LLM scoring | Coste API mínimo | 1–2 semanas | Medio |
| 6 | DuckDB PIT básico (series FRED críticas) | $0 | 1 semana | Medio (elimina sesgo) |
| 7 | DuckDB PIT completo | $0 | 2–3 semanas | Alto (long-term) |

**Orden recomendado:** 1 → 2 → 3 → 4 → 6 → 5 → 7

Fases 1–2 son el mayor impacto con menor riesgo: datos de consenso gratuitos que alimentan directamente el vector de sorpresas. Fase 3 (HMM) no requiere datos externos y puede implementarse sobre el pipeline existente en paralelo.

---

## Archivos a crear / modificar

```
beta_pipeline/
├── fetch.py                    → añadir fetch_cot_cftc(), integrar surprise merger
├── db.py                       → nuevo: DuckDB PIT engine
├── cb_sentiment.py             → nuevo: scraper CB + LLM scoring
├── regime_hmm.py               → nuevo: HMM sobre PCA factors
├── pca_factors.py              → modificar: añadir factor_risk_parity_weights()
├── run.py                      → integrar nuevas fases
├── config.py                   → añadir HMM_N_STATES
└── scrapers/
    ├── __init__.py
    ├── forex_factory.py        → nuevo: Playwright scraper
    ├── myfxbook.py             → nuevo: JSON API pública
    ├── dailyfx.py              → nuevo: BeautifulSoup parser
    ├── philly_fed_spf.py       → nuevo: Philadelphia Fed API
    ├── ecb_spf.py              → nuevo: ECB SDW API
    └── consensus_merger.py     → nuevo: merge + surprise computation
```

---

## Dependencias a añadir

```
playwright          # Forex Factory (chromium headless)
beautifulsoup4      # DailyFX parsing
hmmlearn            # Hidden Markov Models
duckdb              # Base de datos PIT
openpyxl            # Philadelphia Fed Excel files
```

```bash
pip install playwright beautifulsoup4 hmmlearn duckdb openpyxl
playwright install chromium
```

---

## Referencias

- Ang & Bekaert (2002): *Regime Switches in Interest Rates* — betas condicionales al régimen.
- Bailey & López de Prado (2014): *The Deflated Sharpe Ratio* — ya implementado (PSR).
- Meucci (2009): *Risk and Asset Allocation* — Factor Risk Parity framework.
- Rabiner (1989): *A Tutorial on Hidden Markov Models* — referencia HMM.
- Philadelphia Fed SPF: philadelphiafed.org/surveys-and-data/real-time-data-research
- ECB SPF: ecb.europa.eu/stats/ecb_surveys/survey_of_professional_forecasters/
- hmmlearn: `pip install hmmlearn`
- DuckDB: `pip install duckdb`
