"""Alignment, cleaning, and stationary transformations."""

from __future__ import annotations

import pandas as pd

from config import CARRY_PAIRS, COVERAGE_MIN, FFILL_LIMIT, FREQ, FX_PAIRS, START_DATE, TRANSFORM_RULES


def _log(message: str) -> None:
    print(f"  {message}")


def align(
    df_raw: pd.DataFrame,
    start_date: str = START_DATE,
    verbose: bool = True,
) -> tuple[pd.DataFrame, list[str], pd.Series]:
    """Convert all raw series to month-end frequency and filter poor coverage."""
    print("\n-- Phase 2 / Alignment ---------------------------------------------")
    if df_raw.empty:
        raise ValueError("No raw data available to align.")

    df = df_raw.copy()
    df.index = pd.to_datetime(df.index)
    df = df.sort_index().resample(FREQ).last().loc[start_date:]
    df = df.ffill(limit=FFILL_LIMIT)

    coverage = df.notna().mean().sort_values()
    excluded = coverage[coverage < COVERAGE_MIN].index.tolist()
    df = df.drop(columns=excluded)

    if verbose:
        if excluded:
            _log(f"Excluded for coverage < {COVERAGE_MIN:.0%}: {len(excluded)}")
            for col in excluded:
                _log(f"   - {col}: {coverage[col]:.0%}")
        _log(f"Range: {df.index.min().date()} to {df.index.max().date()}")
        _log(f"Aligned shape: {df.shape[0]} months x {df.shape[1]} series")

    return df, excluded, coverage


def build_transform_map(columns: list[str]) -> dict[str, str]:
    reverse: dict[str, str] = {}
    for transform_type, names in TRANSFORM_RULES.items():
        for name in names:
            reverse[name] = transform_type
    return {col: reverse.get(col, "pct_change") for col in columns}


def compute_carry_factors(df_aligned: pd.DataFrame, fx_pairs: list[str]) -> pd.DataFrame:
    """Compute interest rate differentials (carry) for each FX pair.

    carry_pair = rate_base - rate_quote  (level, annualised percentage points)

    The level of the differential — not its change — is the carry trade signal.
    A positive carry means the base currency yields more → positive expected carry return.
    """
    carry_cols: dict[str, pd.Series] = {}
    for pair in fx_pairs:
        if pair not in CARRY_PAIRS:
            continue
        base_col, quote_col = CARRY_PAIRS[pair]
        if base_col not in df_aligned.columns or quote_col not in df_aligned.columns:
            continue
        carry_cols[f"carry_{pair}"] = df_aligned[base_col] - df_aligned[quote_col]
    return pd.DataFrame(carry_cols, index=df_aligned.index)


def transform(df_aligned: pd.DataFrame, verbose: bool = True) -> tuple[pd.DataFrame, dict[str, str]]:
    """Apply pct_change, pct_change_yoy, diff, or level transformations before regression."""
    print("\n-- Phase 3 / Transformation ----------------------------------------")
    transform_map = build_transform_map(df_aligned.columns.tolist())
    counts: dict[str, int] = {}

    # Build all transformed series in one dict then concat — avoids DataFrame fragmentation
    series: dict[str, pd.Series] = {}
    for col in df_aligned.columns:
        rule = transform_map[col]
        counts[rule] = counts.get(rule, 0) + 1
        if rule == "pct_change":
            series[col] = df_aligned[col].pct_change()
        elif rule == "pct_change_yoy":
            series[col] = df_aligned[col].pct_change(12)   # YoY%: what central banks target
        elif rule == "diff":
            series[col] = df_aligned[col].diff()
        elif rule == "level":
            series[col] = df_aligned[col]
        else:
            raise ValueError(f"Unknown transform rule for {col}: {rule}")

    result = pd.concat(series, axis=1)
    result = result.replace([float("inf"), float("-inf")], pd.NA).dropna(how="all")
    # Ensure all columns are float64 — pd.concat can produce object or nullable
    # integer dtypes when source series contain pd.NA (e.g. from CESI columns
    # with sparse monthly data).  Downstream numpy/scipy code requires float64.
    result = result.apply(pd.to_numeric, errors="coerce").astype("float64")
    if verbose:
        parts = ", ".join(f"{k}={v}" for k, v in sorted(counts.items()))
        _log(f"Rules: {parts}")
        _log(f"Transformed shape: {result.shape[0]} months x {result.shape[1]} series")
    return result, transform_map


def prepare(
    df_raw: pd.DataFrame,
    fx_pairs: list[str] | None = None,
    start_date: str = START_DATE,
    verbose: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, str], list[str], pd.Series]:
    """Run alignment and transformation in sequence, then append carry factors."""
    active_fx = fx_pairs or FX_PAIRS
    df_aligned, excluded, coverage = align(df_raw, start_date=start_date, verbose=verbose)
    df_trans, transform_map = transform(df_aligned, verbose=verbose)

    # Carry factors: rate differential in level form (base rate − quote rate)
    carry = compute_carry_factors(df_aligned, active_fx)
    if not carry.empty:
        df_trans = pd.concat([df_trans, carry], axis=1)
        if verbose:
            _log(f"Carry factors added: {list(carry.columns)}")

    missing_fx = [fx for fx in active_fx if fx not in df_trans.columns]
    if missing_fx:
        _log(f"Warning: missing target FX pairs after transform: {missing_fx}")

    return df_trans, df_aligned, transform_map, excluded, coverage
