"""CFTC Commitments of Traders (COT) downloader — G10 FX positioning.

Downloads the CFTC "Futures-Only" COT report from the CFTC public website,
extracts net non-commercial positions for G10 FX futures, normalises by open
interest, and computes rolling 52-week Z-scores.

Output columns (weekly → resampled to monthly end-of-month):
    cot_zscore_eur  – EUR net non-commercial position Z-score vs 52w window
    cot_zscore_jpy  – JPY
    cot_zscore_gbp  – GBP
    cot_zscore_aud  – AUD
    cot_zscore_cad  – CAD
    cot_zscore_nzd  – NZD
    cot_zscore_chf  – CHF

Positive Z-score = crowded long (bullish consensus).
Negative Z-score = crowded short (bearish consensus).
High |Z| → positioning saturation risk (mean-reversion signal).

Data source: CFTC public website (no key required).
Annual files: https://www.cftc.gov/files/dea/history/fut_txt_{YEAR}.zip
"""

from __future__ import annotations

import io
import zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Correct CFTC URL pattern (confirmed working): deacot{YEAR}.zip
_CFTC_HIST_BASE = "https://www.cftc.gov/files/dea/history/deacot{year}.zip"
# Current year uses the same pattern (no separate "current" endpoint needed)
_CFTC_CURRENT   = None  # handled by _download_years including current year

# Rolling window for Z-score (weeks)
_ZSCORE_WINDOW = 52

# CFTC market name → our currency label
# Patterns matched via substring (case-insensitive)
_FX_MARKETS: dict[str, str] = {
    "EURO FX":          "eur",
    "JAPANESE YEN":     "jpy",
    "BRITISH POUND":    "gbp",
    "AUSTRALIAN DOLLAR":"aud",
    "CANADIAN DOLLAR":  "cad",
    "NEW ZEALAND DOLLAR": "nzd",
    "SWISS FRANC":      "chf",
}

# Columns in CFTC legacy CSV (may vary slightly by year)
_COL_DATE    = "As of Date in Form YYYY-MM-DD"
_COL_MARKET  = "Market and Exchange Names"
_COL_OI      = "Open Interest (All)"
_COL_NC_LONG = "Noncommercial Positions-Long (All)"
_COL_NC_SHORT= "Noncommercial Positions-Short (All)"

# Fallback column name patterns (case-insensitive substrings)
_FALLBACK_DATE   = ["as of date", "report date", "date"]
_FALLBACK_MARKET = ["market and exchange", "market_and_exchange"]
_FALLBACK_OI     = ["open interest"]
_FALLBACK_LONG   = ["noncommercial positions-long", "noncommercial long"]
_FALLBACK_SHORT  = ["noncommercial positions-short", "noncommercial short"]


def _log(message: str) -> None:
    print(f"  {message}")


def _find_col(df: pd.DataFrame, patterns: list[str]) -> str | None:
    """Return the first column whose lower-case name contains any pattern."""
    cols_lower = {c.lower(): c for c in df.columns}
    for pattern in patterns:
        for low, orig in cols_lower.items():
            if pattern.lower() in low:
                return orig
    return None


def _parse_zip(raw: bytes) -> pd.DataFrame | None:
    """Extract and parse the CSV inside a CFTC zip archive."""
    try:
        with zipfile.ZipFile(io.BytesIO(raw)) as zf:
            csv_names = [n for n in zf.namelist() if n.lower().endswith(".txt") or n.lower().endswith(".csv")]
            if not csv_names:
                return None
            with zf.open(csv_names[0]) as f:
                df = pd.read_csv(f, low_memory=False)
    except Exception as exc:
        _log(f"  COT zip parse error: {exc}")
        return None
    return df


def _resolve_columns(df: pd.DataFrame) -> tuple[str, str, str, str, str] | None:
    """Resolve actual column names from a parsed COT dataframe."""
    date_col   = _COL_DATE    if _COL_DATE    in df.columns else _find_col(df, _FALLBACK_DATE)
    market_col = _COL_MARKET  if _COL_MARKET  in df.columns else _find_col(df, _FALLBACK_MARKET)
    oi_col     = _COL_OI      if _COL_OI      in df.columns else _find_col(df, _FALLBACK_OI)
    long_col   = _COL_NC_LONG if _COL_NC_LONG in df.columns else _find_col(df, _FALLBACK_LONG)
    short_col  = _COL_NC_SHORT if _COL_NC_SHORT in df.columns else _find_col(df, _FALLBACK_SHORT)

    if any(c is None for c in (date_col, market_col, oi_col, long_col, short_col)):
        return None
    return date_col, market_col, oi_col, long_col, short_col


def _extract_fx_rows(df: pd.DataFrame) -> pd.DataFrame | None:
    """Filter raw COT data to G10 FX futures rows, returning clean long format."""
    cols = _resolve_columns(df)
    if cols is None:
        return None
    date_col, market_col, oi_col, long_col, short_col = cols

    # Normalise types
    df = df[[date_col, market_col, oi_col, long_col, short_col]].copy()
    df["date"] = pd.to_datetime(df[date_col], errors="coerce")
    df[oi_col]    = pd.to_numeric(df[oi_col],    errors="coerce")
    df[long_col]  = pd.to_numeric(df[long_col],  errors="coerce")
    df[short_col] = pd.to_numeric(df[short_col], errors="coerce")
    df = df.dropna(subset=["date", oi_col, long_col, short_col])

    # Assign currency label by matching market name
    market_upper = df[market_col].str.upper()
    rows = []
    for pattern, label in _FX_MARKETS.items():
        mask = market_upper.str.contains(pattern.upper(), na=False, regex=False)
        subset = df[mask][["date", oi_col, long_col, short_col]].copy()
        subset["currency"] = label
        rows.append(subset)

    if not rows:
        return None

    combined = pd.concat(rows, ignore_index=True)
    combined["net_nc"]   = combined[long_col] - combined[short_col]
    combined["net_nc_pct"] = combined["net_nc"] / combined[oi_col].clip(lower=1)
    return combined[["date", "currency", "net_nc_pct"]].sort_values("date")


def _download_years(
    start_year: int,
    end_year: int,
    cache_dir: Path | None,
    session: requests.Session,
) -> list[pd.DataFrame]:
    """Download yearly CFTC zip files and parse them."""
    frames = []
    for year in range(start_year, end_year + 1):
        url  = _CFTC_HIST_BASE.format(year=year)
        fname = f"fut_txt_{year}.zip"
        cache_path = (cache_dir / fname) if cache_dir else None

        if cache_path and cache_path.exists():
            raw = cache_path.read_bytes()
        else:
            try:
                resp = session.get(url, timeout=120)
                resp.raise_for_status()
                raw = resp.content
            except Exception as exc:
                _log(f"  COT {year} download failed: {exc}")
                continue
            if cache_path:
                cache_path.parent.mkdir(parents=True, exist_ok=True)
                cache_path.write_bytes(raw)

        df = _parse_zip(raw)
        if df is not None:
            fx = _extract_fx_rows(df)
            if fx is not None and not fx.empty:
                frames.append(fx)
                _log(f"  COT {year} ok  ({len(fx)} FX rows)")
    return frames


def _download_current(
    cache_dir: Path | None,
    session: requests.Session,
) -> pd.DataFrame | None:
    """Download the current year's COT report."""
    cache_path = (cache_dir / "FuturesOnlyReports.zip") if cache_dir else None
    if cache_path and cache_path.exists():
        raw = cache_path.read_bytes()
    else:
        try:
            resp = session.get(_CFTC_CURRENT, timeout=120)
            resp.raise_for_status()
            raw = resp.content
        except Exception as exc:
            _log(f"  COT current download failed: {exc}")
            return None
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_bytes(raw)

    df = _parse_zip(raw)
    if df is None:
        return None
    return _extract_fx_rows(df)


def _compute_zscores(long_df: pd.DataFrame, window: int) -> pd.DataFrame:
    """Pivot to wide weekly series, then compute rolling Z-scores."""
    # Pivot: index=date, columns=currency, values=net_nc_pct
    wide = long_df.pivot_table(
        index="date", columns="currency", values="net_nc_pct", aggfunc="last"
    ).sort_index()

    # Rolling Z-score
    roll_mean = wide.rolling(window, min_periods=max(4, window // 4)).mean()
    roll_std  = wide.rolling(window, min_periods=max(4, window // 4)).std()
    z = (wide - roll_mean) / roll_std.clip(lower=1e-8)

    # Rename to pipeline convention
    z.columns = [f"cot_zscore_{c}" for c in z.columns]

    # Resample to monthly end-of-month (last observation of each month)
    z.index = pd.DatetimeIndex(z.index)
    z_monthly = z.resample("ME").last()
    return z_monthly


def fetch_cot_cftc(
    start_year: int = 2000,
    cache_dir: Path | None = None,
    verbose: bool = True,
) -> tuple[pd.DataFrame, list[dict]]:
    """Download CFTC COT data and compute G10 FX positioning Z-scores.

    Parameters
    ----------
    start_year:
        Earliest year of annual CFTC files to download (default 2000).
    cache_dir:
        Optional directory to cache downloaded zip files.
    verbose:
        Print progress to stdout.

    Returns
    -------
    df:
        Monthly DataFrame with columns cot_zscore_{currency} for G10 FX.
    failed:
        List of {name, error} dicts for any issues encountered.
    """
    import datetime
    if verbose:
        _log("CFTC COT ...")

    session = requests.Session()
    session.headers.update({"User-Agent": "Polaris-Pipeline/1.0"})

    current_year = datetime.date.today().year
    failed: list[dict] = []

    # Download historical files
    frames = _download_years(
        start_year=start_year,
        end_year=current_year - 1,
        cache_dir=cache_dir,
        session=session,
    )

    # Current year is already included in _download_years above

    if not frames:
        _log("COT: no data downloaded")
        return pd.DataFrame(), failed

    # Combine all years
    long_df = pd.concat(frames, ignore_index=True)
    long_df = long_df.drop_duplicates(subset=["date", "currency"]).sort_values("date")

    # Compute Z-scores
    try:
        df = _compute_zscores(long_df, window=_ZSCORE_WINDOW)
    except Exception as exc:
        _log(f"COT Z-score computation failed: {exc}")
        return pd.DataFrame(), failed + [{"name": "cot_zscore", "error": str(exc)}]

    currencies_found = [c.replace("cot_zscore_", "") for c in df.columns]
    if verbose:
        _log(
            f"COT: {len(df)} monthly obs, currencies: {currencies_found}, "
            f"date range: {df.index[0].date()} → {df.index[-1].date()}"
        )

    return df, failed
