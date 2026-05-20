"""Configuration for the Polaris beta calibration pipeline.

Only sources with a free/public API are enabled here:
- FRED API, with a free API key.
- Yahoo Finance, via yfinance.

Paid/manual-only sources from Documentation/05_Implementacion/beta_workflow.md
are intentionally excluded from the executable pipeline.
"""

from __future__ import annotations

import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parent
PROJECT_DIR = ROOT_DIR.parent


def _load_dotenv(path: Path = PROJECT_DIR / ".env") -> None:
    """Tiny .env loader so the pipeline does not require python-dotenv."""
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


_load_dotenv()

FRED_API_KEY = os.getenv("FRED_API_KEY", "").strip()

START_DATE = os.getenv("BETA_START_DATE", "2005-01-01")
FREQ = os.getenv("BETA_FREQ", "ME")
ROLLING_WIN = int(os.getenv("BETA_ROLLING_WIN", "60"))
MIN_OBS = int(os.getenv("BETA_MIN_OBS", "24"))
MIN_OBS_ROLL = int(os.getenv("BETA_MIN_OBS_ROLL", "12"))
FFILL_LIMIT = int(os.getenv("BETA_FFILL_LIMIT", "3"))
COVERAGE_MIN = float(os.getenv("BETA_COVERAGE_MIN", "0.60"))
FRED_SLEEP = float(os.getenv("BETA_FRED_SLEEP", "0.25"))

# Set ENABLE_CONSENSUS=True (in .env or environment) to activate the free consensus
# stack (Philly SPF, ECB SPF, CFTC COT). Disabled by default so existing runs are
# unaffected until the scrapers dependencies (openpyxl, requests) are confirmed.
ENABLE_CONSENSUS = os.getenv("ENABLE_CONSENSUS", "False").strip().lower() in ("true", "1", "yes")

# Set EXCLUDE_REER_ROLLING=True to remove REER columns from rolling/Kalman betas
# before the backtest.  REER is computed from trade-weighted nominal FX rates so the
# lag-1 beta can capture lagged autocorrelation (circularity) rather than fundamental
# mean-reversion.  Static betas keep REER for research purposes.
# Default: True — excluded from adaptive signals, kept in full-sample analysis.
EXCLUDE_REER_ROLLING = os.getenv("EXCLUDE_REER_ROLLING", "True").strip().lower() in ("true", "1", "yes")

# Set EXCLUDE_DXY_ROLLING=True to remove wv_dxy from rolling/Kalman betas.
# DXY is a weighted basket of the exact FX pairs we model (57% EUR, 14% JPY, 12% GBP…),
# so regressing EURUSD on DXY gives R²≈0.90 — a near-tautology that inflates IS
# performance and obscures genuine macro drivers.  DXY stays in static betas.
# Default: True.
EXCLUDE_DXY_ROLLING = os.getenv("EXCLUDE_DXY_ROLLING", "True").strip().lower() in ("true", "1", "yes")

# Pairs excluded from the live backtest signal (still included in static/robust/rolling analysis).
# EURGBP: backtest IC = -0.90 with 1-month feature lag — the signal is systematically
# inverted (BOE hike → GBP appreciation already priced before the model reacts).
# Override via env: BACKTEST_EXCLUDE_PAIRS=eurgbp,eurjpy  (comma-separated, lowercase)
_exclude_env = os.getenv("BACKTEST_EXCLUDE_PAIRS", "eurgbp").strip()
BACKTEST_EXCLUDE_PAIRS: list[str] = [p.strip() for p in _exclude_env.split(",") if p.strip()]

CACHE_DIR = ROOT_DIR / "cache"
OUTPUT_DIR = ROOT_DIR / "output"

FX_PAIRS = [
    "eurusd",
    "usdjpy",
    "gbpusd",
    "audusd",
    "usdcad",
    "nzdusd",
    "usdchf",
    "eurgbp",
    "eurjpy",
    "gbpjpy",
]

YAHOO_TICKERS = {
    "eurusd": "EURUSD=X",
    "usdjpy": "USDJPY=X",
    "gbpusd": "GBPUSD=X",
    "audusd": "AUDUSD=X",
    "usdcad": "USDCAD=X",
    "nzdusd": "NZDUSD=X",
    "usdchf": "USDCHF=X",
    "eurgbp": "EURGBP=X",
    "eurjpy": "EURJPY=X",
    "gbpjpy": "GBPJPY=X",
    "wv_dxy": "DX-Y.NYB",
    "wv_sp500": "^GSPC",
    "exo_brent_yf": "BZ=F",
    "exo_wti_yf": "CL=F",
    "exo_copper_yf": "HG=F",
    "exo_natgas": "NG=F",
    "exo_iron_yf": "TIO=F",
    "exo_silver": "SI=F",
    "wv_gold_yf": "GC=F",   # Gold futures — FRED LBMA gold (GOLDPMGBD228NLBM) gave 400
}

FRED_SERIES = {
    # World View
    "wv_vix": "VIXCLS",
    "wv_hy_oas": "BAMLH0A0HYM2",
    "wv_ig_oas": "BAMLC0A0CM",
    "wv_embi": "BAMLEMCBPIOAS",        # was JPEMSOSD (discontinued) → EM Corp OAS proxy
    # wv_cpi_usa removed: duplicate of endo_usa_cpi (both CPIAUCSL) → use endo_usa_cpi
    "wv_cpi_eur": "CP0000EZ19M086NEST",
    "wv_breakevens": "T10YIE",
    # wv_gold_fred removed: LBMA gold series not available on FRED → use wv_gold_yf (Yahoo GC=F)
    "wv_gdp_usa": "GDP",
    "wv_gdp_eur": "CLVMNACSCAB1GQEA19",
    # USA
    "endo_usa_real_2y": "DFII5",        # was DFII2 (2Y TIPS not issued regularly) → 5Y TIPS
    # endo_usa_10y_real removed: duplicate of exo_us_real (both DFII10) → exo_ applies to all pairs
    # endo_usa_2y_nom removed: duplicate of exo_us_2y (both DGS2) → exo_ applies to all pairs
    # endo_usa_10y_nom removed: duplicate of exo_us10y (both DGS10) → exo_ applies to all pairs
    "endo_usa_2s10s": "T10Y2Y",
    "endo_usa_policy": "FEDFUNDS",
    "endo_usa_cpi": "CPIAUCSL",
    "endo_usa_core_cpi": "CPILFESL",
    "endo_usa_pce": "PCEPI",
    "endo_usa_core_pce": "PCEPILFE",
    "endo_usa_empl": "UNRATE",
    "endo_usa_nfp": "PAYEMS",
    "endo_usa_retail": "RSAFS",
    "endo_usa_niip": "IIPUSNETIQ",
    "endo_usa_reer": "RBUSBIS",
    "endo_usa_debt_gdp": "GFDEGDQ188S",
    "endo_usa_cb_balance": "WALCL",
    "endo_usa_m2": "M2SL",
    "endo_usa_housing": "HOUST",
    "endo_usa_conf": "UMCSENT",
    # EUR
    "endo_eur_policy": "ECBDFR",
    "endo_eur_cpi": "CP0000EZ19M086NEST",
    "endo_eur_core_cpi": "TOTNRGFOODEA20MI15XM", # was CPGRLE01EZM659N (discontinued)
    "endo_eur_reer": "RNXMBIS",                  # was RNEURBIS (BIS uses XM for Euro area)
    "endo_eur_debt_gdp": "GGGDTAEZA188N",        # was GGGDTAEZAQ188N (quarterly not on FRED)
    "endo_eur_cb_balance": "ECBASSETSW",
    "endo_eur_unempl": "LRHUTTTTEZM156S",
    "endo_eur_m3": "MABMM301EZM189S",
    # GBP
    "endo_gbr_policy": "IRSTCI01GBM156N",        # was BOEBR (not on FRED) → OECD call rate
    "endo_gbr_cpi": "GBRCPIALLMINMEI",
    "endo_gbr_core_cpi": "GBRCPICORMINMEI",
    "endo_gbr_reer": "RNGBBIS",                  # was RNGBRBIS (BIS uses GB not GBR)
    "endo_gbr_unempl": "LRHUTTTTGBM156S",
    # JPY
    "endo_jpn_policy": "IRSTCI01JPM156N",
    "endo_jpn_cpi": "JPNCPIALLMINMEI",
    "endo_jpn_core_cpi": "JPNCPICORMINMEI",
    "endo_jpn_reer": "RNJPBIS",                  # was RNJPNBIS (BIS uses JP not JPN)
    "endo_jpn_unempl": "LRHUTTTTJPM156S",
    "endo_jpn_cb_balance": "JPNASSETS",
    # AUD / NZD / CAD / CHF / Scandies
    "endo_aus_policy": "IRSTCI01AUM156N",
    "endo_aus_cpi": "AUSCPIALLQINMEI",
    "endo_aus_reer": "RNAUBIS",                  # was RNAUSBIS (BIS uses AU not AUS)
    "endo_aus_unempl": "LRHUTTTTAUM156S",
    "endo_nzl_policy": "IRSTCI01NZM156N",
    "endo_nzl_cpi": "NZLCPIALLQINMEI",
    "endo_nzl_reer": "RNNZBIS",                  # was RNNZLBIS (BIS uses NZ not NZL)
    "endo_nzl_unempl": "LRHUTTTTNZQ156S",        # was LRHUTTTTNZM156S (NZ is quarterly)
    "endo_cad_policy": "IRSTCI01CAM156N",
    "endo_cad_cpi": "CANCPIALLMINMEI",
    "endo_cad_reer": "RNCABIS",                  # was RNCANBIS (BIS uses CA not CAN)
    "endo_cad_unempl": "LRHUTTTTCAM156S",
    "endo_che_policy": "IRSTCI01CHM156N",
    "endo_che_cpi": "CHECPIALLMINMEI",
    "endo_che_reer": "RNCHBIS",                  # was RNCHEBIS (BIS uses CH not CHE)
    "endo_che_unempl": "LRHUTTTTCHQ156S",        # was LRHUTTTTCHM156S (CH is quarterly)
    "endo_swe_policy": "IRSTCI01SEM156N",
    "endo_swe_cpi": "SWECPIALLMINMEI",
    "endo_nor_policy": "IRSTCI01NOM156N",
    "endo_nor_cpi": "NORCPIALLMINMEI",
    # Exogenous
    "exo_brent": "DCOILBRENTEU",
    "exo_wti": "DCOILWTICO",
    # exo_gold removed: LBMA FRED series unavailable → covered by wv_gold_yf (Yahoo GC=F)
    "exo_copper": "PCOPPUSDM",
    "exo_us10y": "DGS10",
    "exo_us_real": "DFII10",
    "exo_us_2y": "DGS2",
    "exo_term_premium": "THREEFYTP10",
    "exo_embi": "BAMLEMCBPIOAS",       # was JPEMSOSD (discontinued) → EM Corp OAS proxy
    # exo_ted removed: FRED discontinued TEDRATE on 2023-03-17 → always fails
    # exo_chn_pmi removed: CHNFKINDPMIMANMEI not available on FRED
}

TRANSFORM_RULES = {
    "pct_change": [
        *FX_PAIRS,
        "wv_dxy",
        "wv_sp500",
        "exo_brent_yf",
        "exo_wti_yf",
        "exo_copper_yf",
        "exo_natgas",
        "exo_iron_yf",
        "exo_silver",
        "exo_brent",
        "exo_wti",
        "exo_copper",
        "wv_gold_yf",     # Yahoo gold futures (replaces FRED LBMA series)
        "wv_gdp_usa",
        "wv_gdp_eur",
        "endo_usa_cb_balance",
        "endo_eur_cb_balance",
        "endo_jpn_cb_balance",
        "endo_usa_m2",
        "endo_eur_m3",
        "endo_usa_nfp",
        "endo_usa_retail",
        "endo_usa_housing",
        # REER: MoM% change in real effective exchange rate (stationary, policy-relevant)
        "endo_usa_reer",
        "endo_eur_reer",
        "endo_gbr_reer",
        "endo_jpn_reer",
        "endo_aus_reer",
        "endo_nzl_reer",
        "endo_cad_reer",
        "endo_che_reer",
    ],
    "pct_change_yoy": [
        # Inflation series: YoY% is what central banks target and markets price
        # (MoM% is too noisy; level is non-stationary → spurious betas)
        # wv_cpi_usa removed: duplicate of endo_usa_cpi
        "wv_cpi_eur",
        "endo_usa_cpi",
        "endo_usa_core_cpi",
        "endo_usa_pce",
        "endo_usa_core_pce",
        "endo_eur_cpi",
        "endo_eur_core_cpi",
        "endo_gbr_cpi",
        "endo_gbr_core_cpi",
        "endo_jpn_cpi",
        "endo_jpn_core_cpi",
        "endo_aus_cpi",
        "endo_nzl_cpi",
        "endo_cad_cpi",
        "endo_che_cpi",
        "endo_swe_cpi",
        "endo_nor_cpi",
    ],
    "diff": [
        "wv_vix",
        "wv_hy_oas",
        "wv_ig_oas",
        "wv_breakevens",
        "wv_embi",
        "exo_embi",
        "endo_usa_real_2y",
        # endo_usa_10y_real removed: duplicate of exo_us_real
        # endo_usa_2y_nom removed: duplicate of exo_us_2y
        # endo_usa_10y_nom removed: duplicate of exo_us10y
        "endo_usa_2s10s",
        "endo_usa_policy",
        "endo_eur_policy",
        "endo_gbr_policy",
        "endo_jpn_policy",
        "endo_aus_policy",
        "endo_nzl_policy",
        "endo_cad_policy",
        "endo_che_policy",
        "endo_swe_policy",
        "endo_nor_policy",
        "exo_us10y",
        "exo_us_real",
        "exo_us_2y",
        "exo_term_premium",
        # exo_ted removed: TEDRATE discontinued 2023-03-17
        "endo_usa_empl",
        "endo_eur_unempl",
        "endo_gbr_unempl",
        "endo_jpn_unempl",
        "endo_aus_unempl",
        "endo_nzl_unempl",
        "endo_cad_unempl",
        "endo_che_unempl",
        "endo_usa_niip",
        # Change in debt/GDP ratio and sentiment (slow-moving levels → diff for stationarity)
        "endo_usa_debt_gdp",
        "endo_eur_debt_gdp",
        "endo_usa_conf",
        # exo_chn_pmi removed: CHNFKINDPMIMANMEI not available on FRED
    ],
    "level": [
        # Current account % GDP: annual data forwarded monthly; level is a structural
        # position signal (positive CA → currency support over medium term)
        "endo_usa_ca",
        "endo_eur_ca",
        "endo_gbr_ca",
        "endo_jpn_ca",
        "endo_aus_ca",
        "endo_nzl_ca",
        "endo_cad_ca",
        "endo_che_ca",
        # Philadelphia Fed SPF consensus: already in % or rate units — use level directly.
        # Change in consensus (signal for regime shifts) is captured by diff() in beta tests.
        "spf_usa_cpi_consensus",
        "spf_usa_rgdp_consensus",
        "spf_usa_unemp_consensus",
        "spf_usa_tbond_consensus",
        # ECB SPF consensus (same rationale)
        "spf_eur_hicp_consensus",
        "spf_eur_rgdp_consensus",
        "spf_eur_unemp_consensus",
        # SPF surprise vectors: actual(YoY%) − consensus(%)
        # Computed post-transform in run.py (after df_trans is available).
        # Positive = data beat forecast → typically currency-supportive.
        "spf_usa_cpi_surprise",
        "spf_usa_rgdp_surprise",
        "spf_eur_hicp_surprise",
        # CFTC COT Z-scores: already standardised; level carries the positioning signal
        "cot_zscore_eur",
        "cot_zscore_jpy",
        "cot_zscore_gbp",
        "cot_zscore_aud",
        "cot_zscore_cad",
        "cot_zscore_nzd",
        "cot_zscore_chf",
        # Forex Factory CESI: monthly sum of normalised surprises (Z-score space)
        # Positive = data beat consensus → currency-supportive signal
        "cesi_usd",
        "cesi_eur",
        "cesi_gbp",
        "cesi_jpy",
        "cesi_aud",
        "cesi_cad",
        "cesi_nzd",
        "cesi_chf",
    ],
}

# Carry factor definitions: carry_pair = rate_base - rate_quote (in annualised %)
# Level of differential is the economic signal for carry trade (high-yield vs low-yield)
CARRY_PAIRS: dict[str, tuple[str, str]] = {
    "eurusd": ("endo_eur_policy", "endo_usa_policy"),
    "usdjpy": ("endo_usa_policy", "endo_jpn_policy"),
    "gbpusd": ("endo_gbr_policy", "endo_usa_policy"),
    "audusd": ("endo_aus_policy", "endo_usa_policy"),
    "usdcad": ("endo_usa_policy", "endo_cad_policy"),
    "nzdusd": ("endo_nzl_policy", "endo_usa_policy"),
    "usdchf": ("endo_usa_policy", "endo_che_policy"),
    "eurgbp": ("endo_eur_policy", "endo_gbr_policy"),
    "eurjpy": ("endo_eur_policy", "endo_jpn_policy"),
    "gbpjpy": ("endo_gbr_policy", "endo_jpn_policy"),
}

# World Bank current account % GDP  (indicator BN.CAB.XOKA.GD.ZS)
# Annual data → expanded to monthly in fetch_worldbank()
# WB country codes: ISO2 for G10 + "EMU" for Euro Area aggregate
WORLDBANK_CA_SERIES: dict[str, tuple[str, str]] = {
    "endo_usa_ca": ("US",  "BN.CAB.XOKA.GD.ZS"),
    "endo_eur_ca": ("XC",  "BN.CAB.XOKA.GD.ZS"),   # "XC" = Euro Area in World Bank API
    "endo_gbr_ca": ("GB",  "BN.CAB.XOKA.GD.ZS"),
    "endo_jpn_ca": ("JP",  "BN.CAB.XOKA.GD.ZS"),
    "endo_aus_ca": ("AU",  "BN.CAB.XOKA.GD.ZS"),
    "endo_nzl_ca": ("NZ",  "BN.CAB.XOKA.GD.ZS"),
    "endo_cad_ca": ("CA",  "BN.CAB.XOKA.GD.ZS"),
    "endo_che_ca": ("CH",  "BN.CAB.XOKA.GD.ZS"),
}
