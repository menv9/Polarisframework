"""Alignment, cleaning, and stationary transformations."""

from __future__ import annotations

import pandas as pd

from config import COVERAGE_MIN, FFILL_LIMIT, FREQ, FX_PAIRS, START_DATE, TRANSFORM_RULES


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


def transform(df_aligned: pd.DataFrame, verbose: bool = True) -> tuple[pd.DataFrame, dict[str, str]]:
    """Apply pct_change, diff, or level transformations before regression."""
    print("\n-- Phase 3 / Transformation ----------------------------------------")
    transform_map = build_transform_map(df_aligned.columns.tolist())
    result = pd.DataFrame(index=df_aligned.index)
    counts = {"pct_change": 0, "diff": 0, "level": 0}

    for col in df_aligned.columns:
        rule = transform_map[col]
        counts[rule] = counts.get(rule, 0) + 1
        if rule == "pct_change":
            result[col] = df_aligned[col].pct_change()
        elif rule == "diff":
            result[col] = df_aligned[col].diff()
        elif rule == "level":
            result[col] = df_aligned[col]
        else:
            raise ValueError(f"Unknown transform rule for {col}: {rule}")

    result = result.replace([float("inf"), float("-inf")], pd.NA).dropna(how="all")
    if verbose:
        _log(
            "Rules: "
            f"pct_change={counts.get('pct_change', 0)}, "
            f"diff={counts.get('diff', 0)}, "
            f"level={counts.get('level', 0)}"
        )
        _log(f"Transformed shape: {result.shape[0]} months x {result.shape[1]} series")
    return result, transform_map


def prepare(
    df_raw: pd.DataFrame,
    fx_pairs: list[str] | None = None,
    start_date: str = START_DATE,
    verbose: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame, dict[str, str], list[str], pd.Series]:
    """Run alignment and transformation in sequence."""
    active_fx = fx_pairs or FX_PAIRS
    df_aligned, excluded, coverage = align(df_raw, start_date=start_date, verbose=verbose)
    df_trans, transform_map = transform(df_aligned, verbose=verbose)

    missing_fx = [fx for fx in active_fx if fx not in df_trans.columns]
    if missing_fx:
        _log(f"Warning: missing target FX pairs after transform: {missing_fx}")

    return df_trans, df_aligned, transform_map, excluded, coverage
