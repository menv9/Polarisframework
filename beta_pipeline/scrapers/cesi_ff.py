"""Forex Factory CESI — Economic Surprise Index from local CSV.

Computes a Citi-style Economic Surprise Index (CESI) per G10 currency from
the Forex Factory calendar dataset (2007-2024).

Algorithm
---------
1. Load the local CSV from  <beta_pipeline>/raw data/forex factory calendar …csv
2. Keep rows where:
     - impact  == "High Impact Expected"
     - currency in G10 set (USD, EUR, GBP, JPY, AUD, CAD, NZD, CHF)
     - both actual and forecast are present and parseable as floats
3. Raw surprise per release:
     surprise = actual − forecast    (same units, consistent sign convention)
4. Normalise per event: rolling 2-year (≈ 24 months) expanding std of surprises
     surprise_z = surprise / std_rolling    (first obs uses expanding std)
5. Aggregate monthly: sum of surprise_z per currency per month
     Positive → data consistently beat expectations → currency-supportive
6. Return a monthly DataFrame with columns: cesi_usd, cesi_eur, cesi_gbp,
     cesi_jpy, cesi_aud, cesi_cad, cesi_nzd, cesi_chf
     Index: end-of-month DatetimeIndex

Output is in Z-score space (no units).  Transform rule: "level" (already
standardised, not differenced).
"""

from __future__ import annotations

import warnings
from pathlib import Path

import numpy as np
import pandas as pd


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_G10_CURRENCIES = {"USD", "EUR", "GBP", "JPY", "AUD", "CAD", "NZD", "CHF"}

_CURRENCY_TO_CESI = {
    "USD": "cesi_usd",
    "EUR": "cesi_eur",
    "GBP": "cesi_gbp",
    "JPY": "cesi_jpy",
    "AUD": "cesi_aud",
    "CAD": "cesi_cad",
    "NZD": "cesi_nzd",
    "CHF": "cesi_chf",
}

# Rolling normalisation window in months (≈ 2 years of monthly events)
_NORM_WINDOW_MONTHS = 24

# Minimum number of historical surprises before we trust the std estimate
_MIN_STD_OBS = 6

# CSV filename (relative to beta_pipeline directory)
_CSV_RELATIVE = Path("raw data") / "forex factory calendar raw dataset 2007 to 2024.csv"


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _log(message: str) -> None:
    print(f"  {message}")


def _parse_numeric(series: pd.Series) -> pd.Series:
    """Coerce a mixed-type Series to float, silencing conversion warnings."""
    return pd.to_numeric(series, errors="coerce")


def _load_csv(csv_path: Path) -> pd.DataFrame:
    """Load and validate the Forex Factory calendar CSV."""
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Forex Factory CSV not found at: {csv_path}\n"
            "Place the file at: beta_pipeline/raw data/forex factory calendar raw dataset 2007 to 2024.csv"
        )
    df = pd.read_csv(csv_path, low_memory=False)
    return df


def _normalise_surprise_per_event(group: pd.DataFrame) -> pd.Series:
    """Compute rolling-normalised surprises for a single event (e.g. 'Non-Farm Payrolls USD').

    Uses a backward-looking rolling window (min_periods=_MIN_STD_OBS) to avoid
    look-ahead: the std used for normalisation at time t is computed from all
    surprises strictly before the current calendar month.
    """
    surprises = group["surprise"].values.astype(float)
    dates     = group["month_end"].values          # numpy datetime64, already sorted
    n         = len(surprises)

    if n < 2:
        # Can't normalise with 1 observation — return as-is (will be tiny)
        return pd.Series(surprises, index=group.index, name="surprise_z")

    surprise_z = np.full(n, np.nan)
    # Build a list of (month_end, surprise) pairs sorted chronologically
    for i in range(n):
        # Observations strictly before the rolling window cutoff
        cutoff_date = dates[i] - np.timedelta64(_NORM_WINDOW_MONTHS * 31, "D")
        mask = (dates < dates[i]) & (dates >= cutoff_date)
        hist = surprises[mask]
        # Fall back to expanding window if rolling window has too few obs
        if mask.sum() < _MIN_STD_OBS:
            hist_exp = surprises[:i]
            hist = hist_exp if len(hist_exp) >= _MIN_STD_OBS else surprises[:i]

        if len(hist) < _MIN_STD_OBS:
            # Not enough history — use raw surprise (will stabilise quickly)
            std = np.nanstd(hist) if len(hist) > 1 else 1.0
        else:
            std = np.nanstd(hist)

        surprise_z[i] = surprises[i] / std if std > 1e-12 else 0.0

    return pd.Series(surprise_z, index=group.index, name="surprise_z")


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_cesi(
    csv_path: Path | str | None = None,
    start_date: str | None = None,
    verbose: bool = True,
) -> tuple[pd.DataFrame, dict]:
    """Compute G10 CESI from the local Forex Factory calendar CSV.

    Parameters
    ----------
    csv_path:
        Explicit path to the CSV.  If None, looks for the file at the default
        location relative to this module's parent directory (beta_pipeline/).
    start_date:
        ISO date string (e.g. "2007-01-01").  Rows before this date are dropped.
    verbose:
        Print progress to stdout.

    Returns
    -------
    df_cesi:
        Monthly DataFrame with columns cesi_usd … cesi_chf.
        Index: end-of-month DatetimeIndex, freq="ME" (or compatible).
    report:
        Dict with keys: n_events (total high-impact rows used),
        n_currencies (currencies present), columns, date_range.
    """
    if verbose:
        _log("Forex Factory CESI ...")

    # ------------------------------------------------------------------ path
    if csv_path is None:
        here = Path(__file__).resolve().parent.parent   # beta_pipeline/
        csv_path = here / _CSV_RELATIVE
    else:
        csv_path = Path(csv_path)

    # ------------------------------------------------------------------ load
    df = _load_csv(csv_path)

    if verbose:
        _log(f"  Raw rows: {len(df):,}  columns: {list(df.columns)}")

    # ------------------------------------------------------------------ filter
    # Keep High Impact Expected only
    if "impact" in df.columns:
        df = df[df["impact"] == "High Impact Expected"].copy()
    else:
        _log("  WARNING: 'impact' column not found — using all rows")

    # Keep G10 currencies
    if "currency" in df.columns:
        df["currency"] = df["currency"].str.strip().str.upper()
        df = df[df["currency"].isin(_G10_CURRENCIES)].copy()
    else:
        raise ValueError("'currency' column not found in Forex Factory CSV")

    # Parse datetime
    dt_col = "datetime"
    if dt_col not in df.columns:
        raise ValueError(f"'{dt_col}' column not found in Forex Factory CSV")
    df["datetime"] = pd.to_datetime(df[dt_col], errors="coerce", utc=False)
    df = df.dropna(subset=["datetime"])

    # Apply start_date filter
    if start_date:
        df = df[df["datetime"] >= pd.Timestamp(start_date)]

    # Compute month-end index for each row
    df["month_end"] = df["datetime"].values.astype("datetime64[M]").astype("datetime64[ns]")
    df["month_end"] = pd.to_datetime(df["month_end"]) + pd.offsets.MonthEnd(0)

    # ------------------------------------------------------------------ surprise
    # Parse actual and forecast (may be strings with units like "1.2%" or "105K")
    # Strategy: strip common suffixes, coerce to float
    def _clean_numeric_col(col: pd.Series) -> pd.Series:
        """Strip trailing %, K, M, B and parse as float."""
        s = col.astype(str).str.strip()
        s = s.replace({"nan": np.nan, "": np.nan, "None": np.nan})
        # Multipliers: K→×1000, M→×1e6, B→×1e9 — preserve relative scale
        # We only care about sign consistency within each event, so we can
        # parse the raw number without expanding multipliers (they're consistent).
        s = s.str.replace(r"[%KMBkmbT]$", "", regex=True)
        s = s.str.replace(r"[,\s]", "", regex=True)
        return pd.to_numeric(s, errors="coerce")

    df["actual_num"]   = _clean_numeric_col(df["actual"])
    df["forecast_num"] = _clean_numeric_col(df["forecast"])

    # Drop rows without both actual and forecast
    df = df.dropna(subset=["actual_num", "forecast_num"])
    df["surprise"] = df["actual_num"] - df["forecast_num"]

    # Drop events with zero-variance surprises (e.g., always 0.0 − 0.0)
    event_col = "event" if "event" in df.columns else None

    if event_col and event_col in df.columns:
        # Normalise per (currency, event) pair to keep event identity
        df["event_key"] = df["currency"].str.upper() + "___" + df[event_col].str.strip().str.upper()
    else:
        # Fallback: normalise per currency only
        df["event_key"] = df["currency"].str.upper()

    # Sort by date so rolling windows are chronological
    df = df.sort_values("datetime").reset_index(drop=True)

    # ------------------------------------------------------------------ normalise
    if verbose:
        _log(f"  High-impact G10 releases with actual+forecast: {len(df):,}")

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        normed = df.groupby("event_key", group_keys=False).apply(
            _normalise_surprise_per_event
        )

    df["surprise_z"] = normed.values

    # Clip extreme Z-scores (data errors produce large outliers)
    df["surprise_z"] = df["surprise_z"].clip(-5, 5)

    # ------------------------------------------------------------------ aggregate monthly
    monthly_frames: dict[str, pd.Series] = {}
    for currency, col_name in _CURRENCY_TO_CESI.items():
        sub = df[df["currency"] == currency][["month_end", "surprise_z"]].dropna()
        if sub.empty:
            continue
        monthly = sub.groupby("month_end")["surprise_z"].sum()
        monthly.index = pd.DatetimeIndex(monthly.index)
        monthly.name = col_name
        monthly_frames[col_name] = monthly

    if not monthly_frames:
        _log("  CESI: no data produced — check currency column values")
        return pd.DataFrame(), {"n_events": 0, "n_currencies": 0, "columns": []}

    # ------------------------------------------------------------------ build output
    df_cesi = pd.DataFrame(monthly_frames).sort_index()

    # Reindex to end-of-month frequency (fill gaps with NaN — not forward-filled here;
    # transform.align() will ffill up to FFILL_LIMIT months later)
    idx = pd.date_range(df_cesi.index.min(), df_cesi.index.max(), freq="ME")
    df_cesi = df_cesi.reindex(idx)

    report = {
        "n_events":     len(df),
        "n_currencies": len(monthly_frames),
        "columns":      list(df_cesi.columns),
        "date_range":   (
            df_cesi.dropna(how="all").index.min().date(),
            df_cesi.dropna(how="all").index.max().date(),
        ) if not df_cesi.dropna(how="all").empty else (None, None),
    }

    if verbose:
        dr = report["date_range"]
        _log(
            f"  CESI ok: {report['n_currencies']} currencies, "
            f"{report['n_events']:,} releases  "
            f"({dr[0]} to {dr[1]})"
        )
        for col in df_cesi.columns:
            s = df_cesi[col].dropna()
            _log(f"    {col:<18} {len(s)} monthly obs, "
                 f"mean={s.mean():.2f}, std={s.std():.2f}")

    return df_cesi, report
