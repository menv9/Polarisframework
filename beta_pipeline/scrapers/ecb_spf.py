"""ECB Survey of Professional Forecasters (SPF) downloader.

Fetches Euro Area consensus forecasts via the ECB Statistical Data Warehouse
(SDW) REST API. Quarterly since 1999-Q1, no API key required.

Output columns (quarterly consensus → forward-filled to monthly end-of-month):
    spf_eur_hicp_consensus  – Expected HICP inflation, annual %, 1Y-ahead mean
    spf_eur_rgdp_consensus  – Expected real GDP growth, annual %, 1Y-ahead mean
    spf_eur_unemp_consensus – Expected unemployment rate, level %, 1Y-ahead mean

API reference:
    https://data-api.ecb.europa.eu/service/data/SPF/{key}?format=csvdata
    Dataset: SPF (Survey of Professional Forecasters)
    Key structure: FREQ.SERIES.HORIZON.AGGREGATION.AREA
"""

from __future__ import annotations

import io
from pathlib import Path

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Series configuration
# ---------------------------------------------------------------------------

_ECB_API_BASE = "https://data-api.ecb.europa.eu/service/data/SPF/"

# Correct ECB SPF series key format (confirmed working):
# {FREQ}.{REF_AREA}.{INDICATOR}.{BREAKDOWN}.{HORIZON}.{SURVEY_FREQ}.{AGGREGATION}
# M = monthly data freq, A = annual data freq
# U2 = Euro Area (changing composition)
# POINT = point estimate, P12M = 1-year ahead, Q = quarterly survey, AVG = mean
_SPF_KEYS: dict[str, tuple[str, str]] = {
    # (series_key, date_freq) — "M" = monthly period strings, "A" = annual
    "spf_eur_hicp_consensus":  ("M.U2.HICP.POINT.P12M.Q.AVG",  "M"),
    "spf_eur_rgdp_consensus":  ("A.U2.RGDP.POINT.P12M.Q.AVG",  "A"),
    "spf_eur_unemp_consensus": ("M.U2.UNEM.POINT.P12M.Q.AVG",  "M"),
}

_ECB_DATE_COL  = "TIME_PERIOD"
_ECB_VALUE_COL = "OBS_VALUE"


def _log(message: str) -> None:
    print(f"  {message}")


def _parse_ecb_period(period: str) -> pd.Timestamp:
    """Convert ECB period string to end-of-month date.

    Handles:
        '2024-01'   → monthly  → 2024-01-31
        '2024'      → annual   → 2024-12-31
        '2024-Q1'   → quarterly → 2024-02-28 (survey release month)
    """
    period = str(period).strip()
    if "-Q" in period:
        year, q = period.split("-Q")
        quarter_release_month = {1: 2, 2: 5, 3: 8, 4: 11}
        month = quarter_release_month.get(int(q), int(q) * 3 - 1)
        ts = pd.Timestamp(year=int(year), month=month, day=1)
        return ts + pd.offsets.MonthEnd(0)
    if len(period) == 4 and period.isdigit():
        # Annual: map to December end-of-month
        return pd.Timestamp(year=int(period), month=12, day=31)
    # Monthly '2024-01' or any other parseable format
    try:
        return pd.to_datetime(period) + pd.offsets.MonthEnd(0)
    except Exception:
        return pd.NaT


def _fetch_ecb_series(
    output_name: str,
    key: str,
    session: requests.Session,
) -> pd.Series | None:
    """Fetch a single ECB SPF series via the SDW REST API (CSV format)."""
    url = _ECB_API_BASE + key
    # 'detail=dataonly' reduces payload; no extra filter params to avoid 400s
    params = {"format": "csvdata"}
    try:
        resp = session.get(url, params=params, timeout=60)
        resp.raise_for_status()
    except Exception as exc:
        _log(f"ECB SPF download failed [{output_name}]: {exc}")
        return None

    try:
        df = pd.read_csv(io.StringIO(resp.text))
    except Exception as exc:
        _log(f"ECB SPF parse error [{output_name}]: {exc}")
        return None

    # Normalise column names
    df.columns = [str(c).strip() for c in df.columns]

    date_col  = next((c for c in df.columns if "TIME" in c.upper()), None)
    value_col = next((c for c in df.columns if "OBS_VALUE" in c.upper()), None)

    if date_col is None or value_col is None:
        _log(f"ECB SPF column mismatch [{output_name}]: {list(df.columns)}")
        return None

    df[value_col] = pd.to_numeric(df[value_col], errors="coerce")
    df = df[[date_col, value_col]].dropna()

    dates  = [_parse_ecb_period(str(p)) for p in df[date_col]]
    series = pd.Series(df[value_col].values, index=pd.DatetimeIndex(dates), name=output_name)
    series = series[~series.index.duplicated(keep="last")].sort_index()

    # Expand quarterly → monthly (forward-fill within each quarter)
    monthly_idx = pd.date_range(series.index.min(), series.index.max(), freq="ME")
    series = series.reindex(monthly_idx).ffill()

    n = series.dropna().__len__()
    _log(f"ECB SPF ok  {output_name:<32} {n} monthly obs "
         f"({series.dropna().index[0].date()} → {series.dropna().index[-1].date()})")
    return series


def fetch_ecb_spf(verbose: bool = True) -> tuple[pd.DataFrame, list[dict]]:
    """Download ECB SPF consensus data.

    Returns
    -------
    df:
        Monthly DataFrame with one column per ECB SPF series, forward-filled
        within each quarter.
    failed:
        List of {name, key, error} dicts for series that could not be fetched.
    """
    if verbose:
        _log("ECB SPF ...")

    session = requests.Session()
    session.headers.update({
        "User-Agent": "Polaris-Pipeline/1.0",
        "Accept":     "text/csv",
    })

    frames: dict[str, pd.Series] = {}
    failed: list[dict] = []

    for output_name, (key, _date_freq) in _SPF_KEYS.items():
        s = _fetch_ecb_series(output_name, key, session)
        if s is not None and not s.dropna().empty:
            frames[output_name] = s
        else:
            failed.append({"name": output_name, "key": key, "error": "empty or parse failure"})

    df = pd.DataFrame(frames).sort_index() if frames else pd.DataFrame()
    if verbose:
        _log(f"ECB SPF: {len(frames)} series downloaded, {len(failed)} failed")

    return df, failed
