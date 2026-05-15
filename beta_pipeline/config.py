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
}

FRED_SERIES = {
    # World View
    "wv_vix": "VIXCLS",
    "wv_hy_oas": "BAMLH0A0HYM2",
    "wv_ig_oas": "BAMLC0A0CM",
    "wv_embi": "JPEMSOSD",
    "wv_cpi_usa": "CPIAUCSL",
    "wv_cpi_eur": "CP0000EZ19M086NEST",
    "wv_breakevens": "T10YIE",
    "wv_gold_fred": "GOLDAMGBD228NLBM",
    "wv_gdp_usa": "GDP",
    "wv_gdp_eur": "CLVMNACSCAB1GQEA19",
    # USA
    "endo_usa_real_2y": "DFII2",
    "endo_usa_10y_real": "DFII10",
    "endo_usa_2y_nom": "DGS2",
    "endo_usa_10y_nom": "DGS10",
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
    "endo_eur_core_cpi": "CPGRLE01EZM659N",
    "endo_eur_reer": "RNEURBIS",
    "endo_eur_debt_gdp": "GGGDTAEZAQ188N",
    "endo_eur_cb_balance": "ECBASSETSW",
    "endo_eur_unempl": "LRHUTTTTEZM156S",
    "endo_eur_m3": "MABMM301EZM189S",
    # GBP
    "endo_gbr_policy": "BOEBR",
    "endo_gbr_cpi": "GBRCPIALLMINMEI",
    "endo_gbr_core_cpi": "GBRCPICORMINMEI",
    "endo_gbr_reer": "RNGBRBIS",
    "endo_gbr_unempl": "LRHUTTTTGBM156S",
    # JPY
    "endo_jpn_policy": "IRSTCI01JPM156N",
    "endo_jpn_cpi": "JPNCPIALLMINMEI",
    "endo_jpn_core_cpi": "JPNCPICORMINMEI",
    "endo_jpn_reer": "RNJPNBIS",
    "endo_jpn_unempl": "LRHUTTTTJPM156S",
    "endo_jpn_cb_balance": "JPNASSETS",
    # AUD / NZD / CAD / CHF / Scandies
    "endo_aus_policy": "IRSTCI01AUM156N",
    "endo_aus_cpi": "AUSCPIALLQINMEI",
    "endo_aus_reer": "RNAUSBIS",
    "endo_aus_unempl": "LRHUTTTTAUM156S",
    "endo_nzl_policy": "IRSTCI01NZM156N",
    "endo_nzl_cpi": "NZLCPIALLQINMEI",
    "endo_nzl_reer": "RNNZLBIS",
    "endo_nzl_unempl": "LRHUTTTTNZM156S",
    "endo_cad_policy": "IRSTCI01CAM156N",
    "endo_cad_cpi": "CANCPIALLMINMEI",
    "endo_cad_reer": "RNCANBIS",
    "endo_cad_unempl": "LRHUTTTTCAM156S",
    "endo_che_policy": "IRSTCI01CHM156N",
    "endo_che_cpi": "CHECPIALLMINMEI",
    "endo_che_reer": "RNCHEBIS",
    "endo_che_unempl": "LRHUTTTTCHM156S",
    "endo_swe_policy": "IRSTCI01SEM156N",
    "endo_swe_cpi": "SWECPIALLMINMEI",
    "endo_nor_policy": "IRSTCI01NOM156N",
    "endo_nor_cpi": "NORCPIALLMINMEI",
    # Exogenous
    "exo_brent": "DCOILBRENTEU",
    "exo_wti": "DCOILWTICO",
    "exo_gold": "GOLDAMGBD228NLBM",
    "exo_copper": "PCOPPUSDM",
    "exo_us10y": "DGS10",
    "exo_us_real": "DFII10",
    "exo_us_2y": "DGS2",
    "exo_term_premium": "THREEFYTP10",
    "exo_embi": "JPEMSOSD",
    "exo_ted": "TEDRATE",
    "exo_chn_pmi": "CHNFKINDPMIMANMEI",
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
        "exo_gold",
        "exo_copper",
        "wv_gold_fred",
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
    ],
    "diff": [
        "wv_vix",
        "wv_hy_oas",
        "wv_ig_oas",
        "wv_breakevens",
        "wv_embi",
        "exo_embi",
        "endo_usa_real_2y",
        "endo_usa_10y_real",
        "endo_usa_2y_nom",
        "endo_usa_10y_nom",
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
        "exo_ted",
        "endo_usa_empl",
        "endo_eur_unempl",
        "endo_gbr_unempl",
        "endo_jpn_unempl",
        "endo_aus_unempl",
        "endo_nzl_unempl",
        "endo_cad_unempl",
        "endo_che_unempl",
        "endo_usa_niip",
        "exo_chn_pmi",
    ],
    "level": [
        "wv_cpi_usa",
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
        "endo_usa_reer",
        "endo_eur_reer",
        "endo_gbr_reer",
        "endo_jpn_reer",
        "endo_aus_reer",
        "endo_nzl_reer",
        "endo_cad_reer",
        "endo_che_reer",
        "endo_usa_debt_gdp",
        "endo_eur_debt_gdp",
        "endo_usa_conf",
        # World Bank CA % GDP series (annual, already in % → level transform)
        "endo_usa_ca",
        "endo_eur_ca",
        "endo_gbr_ca",
        "endo_jpn_ca",
        "endo_aus_ca",
        "endo_nzl_ca",
        "endo_cad_ca",
        "endo_che_ca",
        # NIIP — non-stationary level (use diff in zScore, level here for pipeline input)
        "endo_usa_niip",
    ],
}

# World Bank current account % GDP  (indicator BN.CAB.XOKA.GD.ZS)
# Annual data → expanded to monthly in fetch_worldbank()
# WB country codes: ISO2 for G10 + "EMU" for Euro Area aggregate
WORLDBANK_CA_SERIES: dict[str, tuple[str, str]] = {
    "endo_usa_ca": ("US",  "BN.CAB.XOKA.GD.ZS"),
    "endo_eur_ca": ("EMU", "BN.CAB.XOKA.GD.ZS"),
    "endo_gbr_ca": ("GB",  "BN.CAB.XOKA.GD.ZS"),
    "endo_jpn_ca": ("JP",  "BN.CAB.XOKA.GD.ZS"),
    "endo_aus_ca": ("AU",  "BN.CAB.XOKA.GD.ZS"),
    "endo_nzl_ca": ("NZ",  "BN.CAB.XOKA.GD.ZS"),
    "endo_cad_ca": ("CA",  "BN.CAB.XOKA.GD.ZS"),
    "endo_che_ca": ("CH",  "BN.CAB.XOKA.GD.ZS"),
}
