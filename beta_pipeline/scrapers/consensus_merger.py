"""Consensus data merger for the Polaris beta pipeline.

Combines all free consensus/positioning sources into a single monthly DataFrame
aligned to end-of-month dates:
    1. Philadelphia Fed SPF  → US macro consensus (CPI, GDP, unemployment, yield)
    2. ECB SPF               → Euro Area macro consensus (HICP, GDP, unemployment)
    3. CFTC COT              → G10 FX net non-commercial positioning Z-scores
    4. Forex Factory CESI    → G10 economic surprise index (actual − forecast, Z-scored)

Optional: compute macro surprise vectors when actual FRED data is provided.
    surprise_{series} = actual_{series} - consensus_{series}
    (positive = better than expected → typically supports the base currency)

Usage
-----
    from scrapers.consensus_merger import fetch_consensus

    df_consensus, report = fetch_consensus(cache_dir=Path("cache/scrapers"))
    # df_consensus is a monthly DataFrame ready to concatenate with df_raw in fetch_all()
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

from scrapers.philly_spf import fetch_philly_spf
from scrapers.ecb_spf    import fetch_ecb_spf
from scrapers.cot_cftc   import fetch_cot_cftc
from scrapers.cesi_ff    import compute_cesi


# ---------------------------------------------------------------------------
# Surprise mapping: consensus column → actual FRED-sourced column
# (requires df_actual to be passed; silently skipped if columns are absent)
# ---------------------------------------------------------------------------

_SURPRISE_MAP: dict[str, str] = {
    "spf_usa_cpi_consensus":   "endo_usa_cpi",    # actual YoY% (from transform)
    "spf_usa_rgdp_consensus":  "wv_gdp_usa",      # actual GDP growth% (from transform)
    "spf_eur_hicp_consensus":  "endo_eur_cpi",    # actual HICP YoY% (from transform)
}


def _log(message: str) -> None:
    print(f"  {message}")


def fetch_consensus(
    cache_dir: Path | None = None,
    start_year: int = 2000,
    compute_surprises: bool = False,
    df_actual: pd.DataFrame | None = None,
    cesi_csv_path: Path | str | None = None,
    verbose: bool = True,
) -> tuple[pd.DataFrame, dict]:
    """Fetch and merge all consensus + positioning data.

    Parameters
    ----------
    cache_dir:
        Directory for caching downloaded files (COT zips, SPF Excel).
        If None, no caching is performed.
    start_year:
        Earliest year for CFTC COT downloads.
    compute_surprises:
        If True, compute surprise = actual - consensus for mapped series.
        Requires df_actual to contain the transformed FRED series.
    df_actual:
        Transformed macro DataFrame (output of transform.prepare) used for
        surprise computation.
    cesi_csv_path:
        Explicit path to the Forex Factory calendar CSV.  If None, uses the
        default location: beta_pipeline/raw data/forex factory calendar …csv
    verbose:
        Print progress to stdout.

    Returns
    -------
    df:
        Monthly DataFrame with all consensus + positioning columns.
    report:
        Dict with keys: sources_ok, sources_failed, columns.
    """
    if verbose:
        print("\n-- Consensus / Positioning Data ------------------------------------")

    sources_ok: list[str] = []
    sources_failed: list[str] = []
    frames: list[pd.DataFrame] = []

    # 1. Philadelphia Fed SPF
    try:
        df_philly, philly_failed = fetch_philly_spf(
            cache_dir=(cache_dir / "philly_spf") if cache_dir else None,
            verbose=verbose,
        )
        if not df_philly.empty:
            frames.append(df_philly)
            sources_ok.append("PhillyFed_SPF")
        else:
            sources_failed.append("PhillyFed_SPF")
    except Exception as exc:
        _log(f"Philly SPF error: {exc}")
        sources_failed.append("PhillyFed_SPF")

    # 2. ECB SPF
    try:
        df_ecb, ecb_failed = fetch_ecb_spf(verbose=verbose)
        if not df_ecb.empty:
            frames.append(df_ecb)
            sources_ok.append("ECB_SPF")
        else:
            sources_failed.append("ECB_SPF")
    except Exception as exc:
        _log(f"ECB SPF error: {exc}")
        sources_failed.append("ECB_SPF")

    # 3. CFTC COT
    try:
        df_cot, cot_failed = fetch_cot_cftc(
            start_year=start_year,
            cache_dir=(cache_dir / "cot") if cache_dir else None,
            verbose=verbose,
        )
        if not df_cot.empty:
            frames.append(df_cot)
            sources_ok.append("CFTC_COT")
        else:
            sources_failed.append("CFTC_COT")
    except Exception as exc:
        _log(f"CFTC COT error: {exc}")
        sources_failed.append("CFTC_COT")

    # 4. Forex Factory CESI (local CSV, no network)
    try:
        df_cesi, cesi_report = compute_cesi(
            csv_path=cesi_csv_path,
            verbose=verbose,
        )
        if not df_cesi.empty:
            frames.append(df_cesi)
            sources_ok.append("FF_CESI")
        else:
            sources_failed.append("FF_CESI")
    except FileNotFoundError as exc:
        _log(f"CESI skipped (CSV not found): {exc}")
        sources_failed.append("FF_CESI")
    except Exception as exc:
        _log(f"CESI error: {exc}")
        sources_failed.append("FF_CESI")

    # Merge all sources
    if not frames:
        _log("No consensus data fetched.")
        return pd.DataFrame(), {"sources_ok": [], "sources_failed": sources_failed, "columns": []}

    df = pd.concat(frames, axis=1).sort_index()

    # 4. Optional: compute surprise vectors
    if compute_surprises and df_actual is not None:
        for consensus_col, actual_col in _SURPRISE_MAP.items():
            if consensus_col in df.columns and actual_col in df_actual.columns:
                actual_aligned = df_actual[actual_col].reindex(df.index)
                surprise = actual_aligned - df[consensus_col]
                surprise_col = consensus_col.replace("_consensus", "_surprise")
                df[surprise_col] = surprise
                if verbose:
                    _log(f"Surprise computed: {surprise_col}")

    columns = list(df.columns)
    if verbose:
        _log(f"Consensus data: {len(columns)} columns, {len(df)} monthly rows")
        _log(f"  Sources ok:     {sources_ok}")
        if sources_failed:
            _log(f"  Sources failed: {sources_failed}")

    report = {
        "sources_ok": sources_ok,
        "sources_failed": sources_failed,
        "columns": columns,
    }
    return df, report
