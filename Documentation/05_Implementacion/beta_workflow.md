# Beta Calibration Workflow — Polaris FX Framework

Documento de referencia para el proceso completo de estimación de beta entre los indicadores macro del framework y los pares FX objetivo.

---

## Índice

1. [Visión general](#1-visión-general)
2. [Entorno y dependencias](#2-entorno-y-dependencias)
3. [Fase 1 — Ingesta de datos](#3-fase-1--ingesta-de-datos)
4. [Fase 2 — Alineación y limpieza](#4-fase-2--alineación-y-limpieza)
5. [Fase 3 — Transformaciones previas a la regresión](#5-fase-3--transformaciones-previas-a-la-regresión)
6. [Fase 4 — Cálculo de beta](#6-fase-4--cálculo-de-beta)
7. [Fase 5 — Beta rolling y régimen](#7-fase-5--beta-rolling-y-régimen)
8. [Fase 6 — Output y validación](#8-fase-6--output-y-validación)
9. [Fuentes sin API gratuita](#9-fuentes-sin-api-gratuita)
10. [Estructura de archivos sugerida](#10-estructura-de-archivos-sugerida)

---

## 1. Visión general

La beta mide cuánto se mueve un par FX por cada unidad de cambio en un indicador macro.
En el framework Polaris se usa para dos cosas:

- **Ponderación del scoring endógeno/exógeno** — qué indicadores tienen mayor poder explicativo sobre cada par.
- **Detección de cambio de régimen** — si la beta rolling se invierte o colapsa, la relación estructural ha cambiado y el peso del indicador debe revisarse.

```
[APIs: FRED / Yahoo / BIS / manual]
            │
            ▼
    ① INGESTA — descargar series brutas
            │
            ▼
    ② ALINEACIÓN — frecuencia común, fill gaps, rango común
            │
            ▼
    ③ TRANSFORMACIÓN — retornos / diferencias / z-scores
            │
            ▼
    ④ BETA ESTÁTICA — OLS full-sample por indicador × par
            │
            ▼
    ⑤ BETA ROLLING — ventana 24 m, detección de régimen
            │
            ▼
    ⑥ OUTPUT — CSV + heatmap + flags de significancia
```

---

## 2. Entorno y dependencias

```bash
pip install pandas numpy scipy matplotlib seaborn fredapi yfinance requests openpyxl
```

| Librería    | Uso                                      |
|-------------|------------------------------------------|
| `fredapi`   | Descarga directa de series FRED          |
| `yfinance`  | FX pairs, equity indices, commodities    |
| `scipy`     | `linregress` para OLS y p-values         |
| `seaborn`   | Heatmap de la beta matrix                |
| `openpyxl`  | Exportar a Excel si se prefiere al CSV   |

Configuración inicial:

```python
import pandas as pd
import numpy as np
from scipy.stats import linregress
import matplotlib.pyplot as plt
import seaborn as sns
from fredapi import Fred
import yfinance as yf
import warnings
warnings.filterwarnings('ignore')

FRED_KEY  = "TU_API_KEY"   # https://fred.stlouisfed.org/docs/api/api_key.html
START     = '2015-01-01'
FREQ      = 'ME'           # Month-End — frecuencia base del modelo
ROLL_WIN  = 24             # ventana rolling en meses

fred = Fred(api_key=FRED_KEY)
```

---

## 3. Fase 1 — Ingesta de datos

### 3.1 Series FRED

FRED cubre la mayor parte de los indicadores del módulo World View y Endogenous (USA, EUR).

```python
FRED_SERIES = {
    # ── World View ────────────────────────────────────────────────────────────
    'wv_vix':           'VIXCLS',
    'wv_hy_oas':        'BAMLH0A0HYM2',
    'wv_sp500':         'SP500',
    'wv_embi':          'JPEMSOSD',
    'wv_move':          None,              # Bloomberg only
    'wv_cpi_usa':       'CPIAUCSL',
    'wv_cpi_eur':       'CP0000EZ19M086NEST',
    'wv_breakevens':    'T10YIE',
    'wv_dxy':           None,              # Yahoo: DX-Y.NYB
    'wv_gold':          'GOLDAMGBD228NLBM',

    # ── Endogenous — USA ──────────────────────────────────────────────────────
    'endo_usa_real_2y':     'DFII2',
    'endo_usa_10y_real':    'DFII10',
    'endo_usa_policy':      'FEDFUNDS',
    'endo_usa_cpi':         'CPIAUCSL',
    'endo_usa_core_cpi':    'CPILFESL',
    'endo_usa_empl':        'UNRATE',
    'endo_usa_ca_gdp':      'BOPGSTB',
    'endo_usa_reer':        'RBUSBIS',
    'endo_usa_debt':        'GFDEGDQ188S',
    'endo_usa_cb_balance':  'WALCL',

    # ── Endogenous — EUR ──────────────────────────────────────────────────────
    'endo_eur_policy':      'ECBDFR',
    'endo_eur_cpi':         'CP0000EZ19M086NEST',
    'endo_eur_core_cpi':    'CPGRLE01EZM659N',
    'endo_eur_reer':        'RNEURBIS',
    'endo_eur_debt':        'GGGDTAEZAQ188N',

    # ── Endogenous — GBP ──────────────────────────────────────────────────────
    'endo_gbr_policy':      'BOEBR',
    'endo_gbr_cpi':         'GBRCPIALLMINMEI',
    'endo_gbr_reer':        'RNGBRBIS',

    # ── Endogenous — JPY ──────────────────────────────────────────────────────
    'endo_jpn_policy':      'IRSTCI01JPM156N',
    'endo_jpn_cpi':         'JPNCPIALLMINMEI',
    'endo_jpn_reer':        'RNJPNBIS',
    'endo_jpn_cb_balance':  'JPNASSETS',

    # ── Endogenous — AUD / NZL / CAD (parcial FRED) ───────────────────────────
    'endo_aus_policy':      'IRSTCI01AUM156N',
    'endo_aus_cpi':         'AUSCPIALLQINMEI',
    'endo_cad_policy':      'IRSTCI01CAM156N',
    'endo_cad_cpi':         'CANCPIALLMINMEI',

    # ── Exogenous ─────────────────────────────────────────────────────────────
    'exo_brent':        'DCOILBRENTEU',
    'exo_wti':          'DCOILWTICO',
    'exo_gold':         'GOLDAMGBD228NLBM',
    'exo_copper':       'PCOPPUSDM',
    'exo_us10y':        'DGS10',
    'exo_us_real':      'DFII10',
    'exo_us_2y':        'DGS2',
    'exo_embi':         'JPEMSOSD',
}


def fetch_fred_all(series_dict, start=START):
    frames = {}
    failed = []
    for name, code in series_dict.items():
        if code is None:
            continue
        try:
            s = fred.get_series(code, observation_start=start)
            s.name = name
            frames[name] = s
        except Exception as e:
            failed.append(f"{name} ({code}): {e}")

    df = pd.DataFrame(frames)
    if failed:
        print(f"  Fallaron {len(failed)} series:")
        for f in failed:
            print(f"    ✗ {f}")
    print(f"  Descargadas: {len(frames)} series FRED")
    return df
```

### 3.2 Yahoo Finance — FX pairs, DXY, equities

```python
YAHOO_TICKERS = {
    # FX targets (dependientes)
    'exo_eurusd':   'EURUSD=X',
    'exo_usdjpy':   'USDJPY=X',
    'exo_gbpusd':   'GBPUSD=X',
    'exo_audusd':   'AUDUSD=X',
    'exo_usdcad':   'USDCAD=X',
    'exo_nzdusd':   'NZDUSD=X',
    'exo_usdchf':   'USDCHF=X',
    'exo_eurgbp':   'EURGBP=X',
    'exo_eurjpy':   'EURJPY=X',
    'exo_gbpjpy':   'GBPJPY=X',
    # Benchmarks / indicadores
    'wv_dxy':       'DX-Y.NYB',
    'wv_sp500_yf':  '^GSPC',
    'exo_iron':     'TIO=F',
    'exo_natgas':   'NG=F',
}


def fetch_yahoo_all(tickers_dict, start=START):
    codes  = list(tickers_dict.values())
    names  = list(tickers_dict.keys())
    raw    = yf.download(codes, start=start, auto_adjust=True, progress=False)['Close']
    if isinstance(raw.columns, pd.MultiIndex):
        raw.columns = raw.columns.get_level_values(0)
    raw.columns = names[:len(raw.columns)]
    print(f"  Descargadas: {raw.shape[1]} series Yahoo")
    return raw
```

### 3.3 Fuentes manuales — carga desde archivo

Para indicadores sin API pública (PMI Markit, CFTC, GDT, CESI) se cargan desde CSV descargados manualmente.

```python
def load_manual(path: str, date_col: str, value_col: str, name: str) -> pd.Series:
    """
    Carga una serie desde CSV con columna de fecha y columna de valor.
    Ejemplo: PMI manufacturero de Markit, descargado desde spglobal.com
    """
    df = pd.read_csv(path, parse_dates=[date_col], index_col=date_col)
    s  = df[value_col].rename(name)
    return s

# Ejemplos de uso:
# pmi_global  = load_manual('data/global_pmi.csv',     'Date', 'Value', 'exo_global_pmi')
# cesi_usa    = load_manual('data/cesi.csv',            'Date', 'CESI_G10', 'wv_cesi')
# cftc_eur    = load_manual('data/cftc_eur.csv',        'Date', 'Net', 'endo_eur_cftc')
# gdt_index   = load_manual('data/gdt.csv',             'Date', 'Index', 'exo_gdt')
```

---

## 4. Fase 2 — Alineación y limpieza

El problema central: FRED devuelve series diarias, semanales y mensuales mezcladas. Yahoo es diario. Los PMI son mensuales. Hay que llevar todo a la misma frecuencia sin introducir look-ahead bias.

```python
def align_to_monthly(df_fred, df_yahoo, manual_series: list = None):
    """
    Lleva todas las fuentes a frecuencia mensual (último dato del mes)
    y las concatena en un único DataFrame.
    """
    # FRED — tomar el último valor disponible de cada mes
    fred_m = df_fred.resample(FREQ).last()

    # Yahoo — ídem, último precio de cierre del mes
    yahoo_m = df_yahoo.resample(FREQ).last()

    frames = [fred_m, yahoo_m]
    if manual_series:
        for s in manual_series:
            frames.append(s.resample(FREQ).last().to_frame())

    df = pd.concat(frames, axis=1)

    # Rango común desde START hasta hoy
    df = df.loc[START:]

    # Forward-fill máximo 3 meses (para trimestrales como deuda/CA)
    df = df.ffill(limit=3)

    # Reporte de cobertura
    coverage = (df.notna().sum() / len(df) * 100).sort_values()
    poor = coverage[coverage < 70]
    if not poor.empty:
        print("  Series con cobertura < 70%:")
        for col, pct in poor.items():
            print(f"    {col}: {pct:.0f}%")

    print(f"\n  DataFrame final: {df.shape[0]} meses × {df.shape[1]} series")
    print(f"  Rango: {df.index[0].date()} → {df.index[-1].date()}")
    return df


df_all = align_to_monthly(
    fetch_fred_all(FRED_SERIES),
    fetch_yahoo_all(YAHOO_TICKERS),
    # manual_series=[pmi_global, cesi_usa, cftc_eur]
)
```

---

## 5. Fase 3 — Transformaciones previas a la regresión

La beta OLS sobre niveles es espuria si las series tienen tendencia (unit root). Se trabaja siempre sobre transformaciones estacionarias.

```python
# Regla por tipo de indicador
TRANSFORM = {
    # Precios y niveles de mercado → retorno porcentual mensual
    'pct_change': [
        'exo_eurusd', 'exo_usdjpy', 'exo_gbpusd', 'exo_audusd',
        'exo_usdcad', 'exo_nzdusd', 'wv_dxy', 'wv_sp500_yf',
        'exo_brent', 'exo_wti', 'exo_gold', 'exo_copper', 'exo_iron',
        'endo_usa_cb_balance', 'endo_jpn_cb_balance',
    ],
    # Tasas y spreads → diferencia de primer orden (en pb o puntos)
    'diff': [
        'endo_usa_policy', 'endo_eur_policy', 'endo_gbr_policy',
        'endo_jpn_policy', 'endo_aus_policy', 'endo_cad_policy',
        'endo_usa_real_2y', 'endo_usa_10y_real', 'exo_us10y',
        'exo_us_2y', 'exo_us_real', 'wv_hy_oas', 'wv_move',
        'exo_embi', 'wv_embi',
    ],
    # Índices de nivel estacionario (VIX, PMI) → diferencia mensual
    'diff': [
        'wv_vix', 'exo_global_pmi', 'exo_chn_pmi', 'exo_eur_pmi_comp',
    ],
    # Inflación → diferencia YoY ya es estacionaria, usar directo
    'level': [
        'wv_cpi_usa', 'wv_cpi_eur', 'endo_usa_cpi', 'endo_usa_core_cpi',
        'endo_eur_cpi', 'endo_gbr_cpi', 'endo_jpn_cpi', 'wv_breakevens',
    ],
}


def transform_series(df, transform_map):
    """
    Aplica la transformación correcta a cada serie.
    Las no mapeadas reciben pct_change por defecto.
    """
    pct_cols   = transform_map.get('pct_change', [])
    diff_cols  = transform_map.get('diff', [])
    level_cols = transform_map.get('level', [])

    result = pd.DataFrame(index=df.index)

    for col in df.columns:
        if col in pct_cols:
            result[col] = df[col].pct_change()
        elif col in diff_cols:
            result[col] = df[col].diff()
        elif col in level_cols:
            result[col] = df[col]          # ya estacionaria
        else:
            result[col] = df[col].pct_change()  # default seguro

    return result.dropna(how='all')


df_trans = transform_series(df_all, TRANSFORM)
```

---

## 6. Fase 4 — Cálculo de beta

### 6.1 Beta estática (full sample)

```python
FX_PAIRS = [
    'exo_eurusd', 'exo_usdjpy', 'exo_gbpusd',
    'exo_audusd', 'exo_usdcad', 'exo_nzdusd',
]

def compute_beta_static(df_trans, fx_pairs, min_obs=36):
    """
    OLS de cada indicador vs cada par FX.
    Requiere al menos min_obs observaciones válidas comunes.
    """
    indicators = [c for c in df_trans.columns if c not in fx_pairs]
    records    = []

    for fx in fx_pairs:
        for ind in indicators:
            common = df_trans[[fx, ind]].dropna()
            if len(common) < min_obs:
                continue

            slope, intercept, r, p, se = linregress(common[ind], common[fx])

            records.append({
                'fx_pair':     fx,
                'indicator':   ind,
                'beta':        round(slope,     4),
                'intercept':   round(intercept, 4),
                'r2':          round(r**2,      4),
                'p_value':     round(p,         4),
                'std_err':     round(se,         4),
                'n_obs':       len(common),
                'significant': p < 0.05,
                'strong':      p < 0.05 and r**2 > 0.15,
            })

    df_beta = pd.DataFrame(records).sort_values(['fx_pair', 'r2'], ascending=[True, False])
    print(f"  Regresiones calculadas: {len(df_beta)}")
    print(f"  Significativas (p<0.05): {df_beta['significant'].sum()}")
    print(f"  Fuertes (p<0.05 & R²>0.15): {df_beta['strong'].sum()}")
    return df_beta


beta_static = compute_beta_static(df_trans, FX_PAIRS)
```

### 6.2 Pivot y top drivers

```python
def top_drivers(beta_df, fx_pair, n=15, only_significant=True):
    sub = beta_df[beta_df['fx_pair'] == fx_pair].copy()
    if only_significant:
        sub = sub[sub['significant']]
    sub['abs_beta'] = sub['beta'].abs()
    return sub.nlargest(n, 'abs_beta')[['indicator', 'beta', 'r2', 'p_value', 'n_obs']]


# Pivot: indicador × par (solo significativas)
pivot = beta_static[beta_static['significant']].pivot_table(
    index='indicator',
    columns='fx_pair',
    values='beta',
    aggfunc='first'
).round(3)
```

---

## 7. Fase 5 — Beta rolling y régimen

La beta rolling detecta cuándo una relación estructural cambia.
Un colapso en R² o inversión de signo indica que el indicador ha perdido poder explicativo sobre ese par.

```python
def compute_beta_rolling(df_trans, fx_pairs, window=ROLL_WIN, min_obs=12):
    """
    Beta rolling con ventana deslizante. Usa correlación de Pearson para
    eficiencia; la beta se recupera como r * (std_y / std_x).
    """
    indicators   = [c for c in df_trans.columns if c not in fx_pairs]
    rolling_betas = {}

    for fx in fx_pairs:
        rb = {}
        for ind in indicators:
            common = df_trans[[fx, ind]].dropna()
            if len(common) < window:
                continue

            beta_series = []
            for i in range(window, len(common) + 1):
                w = common.iloc[i - window:i]
                if w.dropna().shape[0] < min_obs:
                    beta_series.append(np.nan)
                    continue
                s, *_ = linregress(w[ind], w[fx])
                beta_series.append(s)

            idx = common.index[window - 1:]
            rb[ind] = pd.Series(beta_series, index=idx)

        rolling_betas[fx] = pd.DataFrame(rb)
        print(f"  Rolling beta calculada para {fx}")

    return rolling_betas


rolling_betas = compute_beta_rolling(df_trans, FX_PAIRS)
```

### 7.1 Detección de cambio de régimen

```python
def regime_flags(rolling_betas, static_beta_df, threshold_pct=0.5):
    """
    Marca indicadores cuya beta rolling reciente difiere >threshold_pct
    de la beta estática, o ha invertido signo.
    Útil para revisar ponderaciones del scoring model.
    """
    flags = []
    for fx, rb_df in rolling_betas.items():
        for ind in rb_df.columns:
            static_row = static_beta_df[
                (static_beta_df['fx_pair'] == fx) &
                (static_beta_df['indicator'] == ind)
            ]
            if static_row.empty:
                continue

            beta_static_val  = static_row['beta'].values[0]
            beta_recent      = rb_df[ind].dropna().iloc[-3:].mean()  # últimos 3 meses

            if np.isnan(beta_recent):
                continue

            sign_flip    = np.sign(beta_static_val) != np.sign(beta_recent)
            magnitude_ok = abs(beta_static_val) > 0.01

            drift_pct = abs(beta_recent - beta_static_val) / (abs(beta_static_val) + 1e-9)

            if (sign_flip or drift_pct > threshold_pct) and magnitude_ok:
                flags.append({
                    'fx_pair':      fx,
                    'indicator':    ind,
                    'beta_static':  round(beta_static_val, 4),
                    'beta_recent':  round(beta_recent, 4),
                    'drift_pct':    round(drift_pct * 100, 1),
                    'sign_flip':    sign_flip,
                })

    df_flags = pd.DataFrame(flags).sort_values('drift_pct', ascending=False)
    print(f"\n  Indicadores con régimen cambiado: {len(df_flags)}")
    return df_flags


regime = regime_flags(rolling_betas, beta_static)
print(regime.to_string(index=False))
```

---

## 8. Fase 6 — Output y validación

### 8.1 Exportar resultados

```python
OUTPUT_DIR = 'output/'

# Full matrix
beta_static.to_csv(f'{OUTPUT_DIR}beta_matrix_full.csv', index=False)

# Pivot limpio
pivot.to_csv(f'{OUTPUT_DIR}beta_matrix_pivot.csv')

# Flags de régimen
regime.to_csv(f'{OUTPUT_DIR}regime_flags.csv', index=False)

# Rolling betas por par
for fx, rb in rolling_betas.items():
    rb.to_csv(f'{OUTPUT_DIR}rolling_beta_{fx}.csv')

print("Archivos exportados.")
```

### 8.2 Heatmap de la beta matrix

```python
def plot_beta_heatmap(pivot_df, title='Beta Matrix — Indicadores vs FX Pairs'):
    # Ordenar por número de pares con beta significativa
    order = pivot_df.notna().sum(axis=1).sort_values(ascending=False).index
    pivot_sorted = pivot_df.loc[order]

    fig, ax = plt.subplots(figsize=(len(pivot_df.columns) * 2 + 2,
                                    max(10, len(pivot_sorted) * 0.4)))
    sns.heatmap(
        pivot_sorted.fillna(0),
        cmap='RdYlGn', center=0,
        vmin=pivot_sorted.stack().quantile(0.05),
        vmax=pivot_sorted.stack().quantile(0.95),
        annot=True, fmt='.2f', linewidths=0.4, linecolor='#1a1a2e',
        ax=ax, cbar_kws={'label': 'Beta (retornos mensuales)'},
        annot_kws={'size': 7}
    )
    ax.set_title(title, fontweight='bold', pad=12)
    ax.set_xlabel('Par FX (dependiente)')
    ax.set_ylabel('Indicador macro')
    plt.tight_layout()
    plt.savefig(f'{OUTPUT_DIR}beta_heatmap.png', dpi=150, bbox_inches='tight')
    plt.show()


plot_beta_heatmap(pivot)
```

### 8.3 Beta rolling para un par + indicador clave

```python
def plot_rolling_beta(rolling_betas, fx_pair, indicator, static_beta_df):
    rb  = rolling_betas[fx_pair][indicator].dropna()
    ref = static_beta_df.loc[
        (static_beta_df['fx_pair'] == fx_pair) &
        (static_beta_df['indicator'] == indicator), 'beta'
    ].values[0]

    fig, ax = plt.subplots(figsize=(12, 4))
    ax.plot(rb.index, rb.values, color='#10b981', lw=1.5, label=f'Beta rolling {ROLL_WIN}m')
    ax.axhline(ref, color='#ef4444', lw=1.2, linestyle='--', label=f'Beta estática={ref:.3f}')
    ax.axhline(0,   color='gray',    lw=0.5)
    ax.fill_between(rb.index, rb.values, 0,
                    where=rb.values > 0, alpha=0.12, color='green')
    ax.fill_between(rb.index, rb.values, 0,
                    where=rb.values <= 0, alpha=0.12, color='red')
    ax.set_title(f'Beta rolling — {indicator} → {fx_pair}', fontweight='bold')
    ax.legend(fontsize=9); ax.grid(alpha=0.2)
    plt.tight_layout()
    plt.show()

# Ejemplo:
# plot_rolling_beta(rolling_betas, 'exo_eurusd', 'exo_brent', beta_static)
```

---

## 9. Fuentes sin API gratuita

| Indicador              | Fuente              | Alternativa gratuita                           |
|------------------------|---------------------|------------------------------------------------|
| `wv_cesi`              | Bloomberg / Citi    | FRED: `CESIUSD` (approx)                       |
| `exo_global_pmi`       | S&P Global (pago)   | J.P. Morgan Global PMI (descarga manual PDF)   |
| `exo_eur_pmi_comp`     | S&P Global (pago)   | ECB SDW: `ICP.M.U2.N.000000.4.ANR`            |
| `exo_gdt`              | GDT Auctions        | globaldariyrade.com → descarga CSV manual      |
| `endo_*_cftc`          | CFTC COT            | CFTC.gov → descarga semanal gratuita           |
| `wv_move`              | Bloomberg / ICE     | Proxy: `SRVIX` en FRED (SOFR vol)             |
| `endo_*_niip`          | BIS / IMF           | IMF BOP stats → descarga anual manual          |
| `exo_chn_credit`       | PBOC / NBS          | FRED: `CHNCPIALLMINMEI` (parcial)              |

### Parser CFTC (gratuito)

```python
import requests, zipfile, io

def fetch_cftc_legacy(year: int) -> pd.DataFrame:
    """
    Descarga el reporte COT Legacy de un año desde CFTC.gov.
    Los datos están en CSV dentro de un ZIP semanal.
    """
    url = f"https://www.cftc.gov/files/dea/history/deahistfo{year}.zip"
    r   = requests.get(url, timeout=30)
    z   = zipfile.ZipFile(io.BytesIO(r.content))
    csv_name = [n for n in z.namelist() if n.endswith('.csv')][0]
    df  = pd.read_csv(z.open(csv_name), low_memory=False)
    return df

# Filtrar por instrumento y calcular posición neta especuladores
def net_speculative(df_cftc, market_name: str) -> pd.Series:
    sub = df_cftc[df_cftc['Market_and_Exchange_Names'].str.contains(
        market_name, case=False, na=False
    )].copy()
    sub['Date'] = pd.to_datetime(sub['Report_Date_as_MM_DD_YYYY'])
    sub = sub.set_index('Date').sort_index()
    sub['net'] = sub['NonComm_Positions_Long_All'] - sub['NonComm_Positions_Short_All']
    return sub['net'].rename(f'cftc_{market_name.lower()[:6]}')

# Ejemplo:
# df_cftc_2024 = fetch_cftc_legacy(2024)
# cftc_eur = net_speculative(df_cftc_2024, 'EURO FX')
```

---

## 10. Estructura de archivos sugerida

```
beta_workflow/
├── 01_fetch.py          # Ingesta: FRED + Yahoo + manuales
├── 02_align.py          # Alineación y limpieza
├── 03_transform.py      # Retornos / diferencias
├── 04_beta_static.py    # OLS full-sample
├── 05_beta_rolling.py   # Rolling + regime flags
├── 06_output.py         # CSV + heatmaps
│
├── data/
│   ├── raw/             # Series descargadas sin procesar
│   ├── aligned/         # DataFrame mensual alineado
│   └── manual/          # CSVs de fuentes manuales (CFTC, PMI, GDT)
│
└── output/
    ├── beta_matrix_full.csv
    ├── beta_matrix_pivot.csv
    ├── regime_flags.csv
    ├── rolling_beta_*.csv
    └── beta_heatmap.png
```

---

## Resumen ejecutivo

| Fase | Input | Output | Tiempo estimado |
|------|-------|--------|-----------------|
| Ingesta | API keys + CSVs manuales | ~80 series brutas | 2-5 min |
| Alineación | Series brutas | DataFrame 120×80 | < 1 min |
| Transformación | Niveles | Retornos/diferencias | < 1 min |
| Beta estática | Retornos | ~400 regresiones | < 1 min |
| Beta rolling | Retornos | 400 series temporales | 3-8 min |
| Output | Todo lo anterior | CSVs + heatmap | < 1 min |

**Cadencia de actualización recomendada:** mensual, los primeros 5 días hábiles del mes tras publicarse PMI y empleo.
