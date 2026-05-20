"""Command-line entry point for the Polaris beta pipeline."""

from __future__ import annotations

import argparse
import os
import pickle
import sys
import time
from datetime import datetime
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))

import pandas as pd

import backtest_engine as bt
import beta as beta_mod
import fetch as fetcher
import kalman_beta as kalman_mod
import output as outputter
import pca_factors as pca_mod
import robust_beta as robust_beta_mod
import transform as transformer
from config import CACHE_DIR, FRED_API_KEY, FX_PAIRS, OUTPUT_DIR, START_DATE, EXCLUDE_REER_ROLLING, EXCLUDE_DXY_ROLLING, BACKTEST_EXCLUDE_PAIRS


CACHE_FILE = CACHE_DIR / "last_raw.pkl"


def _elapsed(start: float) -> str:
    seconds = int(time.time() - start)
    minutes, seconds = divmod(seconds, 60)
    return f"{minutes}m {seconds}s" if minutes else f"{seconds}s"


def _banner(run_id: str) -> None:
    print()
    print("=" * 72)
    print("POLARIS BETA PIPELINE")
    print(f"Run: {run_id}")
    print("Sources: FRED API + Yahoo Finance only")
    print("=" * 72)


def _validate_config(from_cache: bool) -> None:
    if not from_cache and not FRED_API_KEY:
        print("ERROR: FRED_API_KEY is missing. Add it to .env or your environment.")
        sys.exit(1)


def _save_cache(df_raw: pd.DataFrame) -> None:
    if df_raw.empty:
        print("  Cache not saved because ingestion returned no data.")
        return
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    with CACHE_FILE.open("wb") as file:
        pickle.dump(df_raw, file)
    df_raw.to_csv(CACHE_DIR / "last_raw.csv")
    print(f"  Cache saved: {CACHE_FILE}")


def _load_cache() -> pd.DataFrame:
    if not CACHE_FILE.exists():
        print("ERROR: cache not found. Run once without --from-cache.")
        sys.exit(1)
    with CACHE_FILE.open("rb") as file:
        df_raw = pickle.load(file)
    if df_raw.empty:
        print("ERROR: cache exists but is empty. Run again without --from-cache.")
        sys.exit(1)
    mtime = datetime.fromtimestamp(CACHE_FILE.stat().st_mtime).strftime("%Y-%m-%d %H:%M")
    print(f"  Cache loaded: {CACHE_FILE} ({mtime})")
    return df_raw


def _resolve_fx_pairs(requested: list[str] | None) -> list[str]:
    if not requested:
        return FX_PAIRS
    normalized = [item.lower() for item in requested]
    invalid = [item for item in normalized if item not in FX_PAIRS]
    if invalid:
        print(f"Warning: unknown FX pairs ignored: {invalid}")
        print(f"Available pairs: {', '.join(FX_PAIRS)}")
    active = [item for item in normalized if item in FX_PAIRS]
    if not active:
        print("ERROR: no valid FX pairs selected.")
        sys.exit(1)
    return active


def run(
    no_rolling: bool = False,
    fx_filter: list[str] | None = None,
    from_cache: bool = False,
    quiet: bool = False,
    start_date: str = START_DATE,
    output_dir: Path | str = OUTPUT_DIR,
    skip_plots: bool = False,
) -> dict:
    """Run the full beta calibration workflow."""
    _validate_config(from_cache=from_cache)
    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    active_fx = _resolve_fx_pairs(fx_filter)
    verbose = not quiet
    total_start = time.time()
    _banner(run_id)

    phase_start = time.time()
    if from_cache:
        print("\n-- Phase 1 / Ingestion ---------------------------------------------")
        df_raw = _load_cache()
        fetch_report = {
            "sources": ["cache"],
            "fred_ok": [],
            "yahoo_ok": [],
            "fred_failed": [],
            "yahoo_failed": [],
            "total_series": int(df_raw.shape[1]),
            "start_date": start_date,
        }
    else:
        df_raw, fetch_report = fetcher.fetch_all(start_date=start_date, verbose=verbose)
        _save_cache(df_raw)
    print(f"  Phase 1 time: {_elapsed(phase_start)}")

    phase_start = time.time()
    df_trans, df_aligned, transform_map, excluded, coverage = transformer.prepare(
        df_raw,
        fx_pairs=active_fx,
        start_date=start_date,
        verbose=verbose,
    )

    # ── SPF surprise vectors ─────────────────────────────────────────────────
    # surprise = actual(transformed, same units as consensus) − consensus(level)
    # Computed post-transform so both sides are in df_trans at compatible units:
    #   spf_usa_cpi_consensus   → % annual CPI forecast  | endo_usa_cpi → YoY%
    #   spf_usa_rgdp_consensus  → % annual GDP forecast   | wv_gdp_usa  → QoQ%
    #   spf_eur_hicp_consensus  → % annual HICP forecast  | endo_eur_cpi → YoY%
    # Positive surprise = data beat consensus → typically currency-supportive.
    _SPF_SURPRISE_MAP = {
        "spf_usa_cpi_consensus":  "endo_usa_cpi",
        "spf_usa_rgdp_consensus": "wv_gdp_usa",
        "spf_eur_hicp_consensus": "endo_eur_cpi",
    }
    _surprises_added: list[str] = []
    for consensus_col, actual_col in _SPF_SURPRISE_MAP.items():
        if consensus_col in df_trans.columns and actual_col in df_trans.columns:
            surprise_col = consensus_col.replace("_consensus", "_surprise")
            df_trans[surprise_col] = (
                df_trans[actual_col] - df_trans[consensus_col]
            ).astype("float64")
            _surprises_added.append(surprise_col)
    if verbose and _surprises_added:
        print(f"  SPF surprises computed: {_surprises_added}")
    elif verbose:
        print("  SPF surprises: skipped (consensus or actual columns missing)")

    # ── Per-pair indicator pool (pre-filtered) ───────────────────────────────
    # Build the indicator list each pair will use for rolling and Kalman betas.
    # Only circular indicators are excluded here — all macro/global signals are kept.
    # Economic-relevance filtering (is_economically_relevant) applies only to the
    # robust_beta walk-forward stage (Phase 4b), not to rolling/Kalman, because:
    #   - Global indicators (VIX, commodities, US rates) drive all G10 pairs
    #   - Irrelevant-country indicators have near-zero rolling betas → negligible noise
    #   - Over-filtering shrinks each pair's indicator pool too much and hurts Sharpe
    # REER: valid mean-reversion signal — included by default (EXCLUDE_REER_ROLLING=False).
    # DXY: truly circular (57% EUR + 14% JPY + 12% GBP = the pairs we model) — excluded.
    _CIRCULAR_PATTERNS: list[str] = []
    if EXCLUDE_REER_ROLLING:
        _CIRCULAR_PATTERNS.append("_reer")
    if EXCLUDE_DXY_ROLLING:
        _CIRCULAR_PATTERNS.append("wv_dxy")

    _all_indicators = [col for col in df_trans.columns if col not in active_fx]
    if _CIRCULAR_PATTERNS:
        _pool = [col for col in _all_indicators if not any(pat in col for pat in _CIRCULAR_PATTERNS)]
    else:
        _pool = _all_indicators
    # All pairs share the same filtered pool (no per-pair economic relevance cut here)
    pair_indicators: dict[str, list[str]] = {_pair: _pool for _pair in active_fx}
    if verbose:
        counts_str = "  ".join(f"{p}={len(v)}" for p, v in pair_indicators.items())
        print(f"  Indicator pool (circular excluded): {counts_str}")

    print(f"  Phases 2-3 time: {_elapsed(phase_start)}")

    phase_start = time.time()
    beta_static = beta_mod.compute_static(df_trans, fx_pairs=active_fx, verbose=verbose)
    pivot = beta_mod.build_pivot(beta_static)
    print(f"  Phase 4 time: {_elapsed(phase_start)}")

    phase_start = time.time()
    beta_robust = robust_beta_mod.compute_robust_candidates(df_trans, fx_pairs=active_fx, verbose=verbose)
    robust_pivot = robust_beta_mod.build_robust_pivot(beta_robust)
    print(f"  Phase 4b time: {_elapsed(phase_start)}")

    phase_start = time.time()
    kalman_betas = kalman_mod.compute_kalman(df_trans, fx_pairs=active_fx, pair_indicators=pair_indicators, verbose=verbose)
    kalman_latest = kalman_mod.latest_kalman_betas(kalman_betas)
    print(f"  Phase 4c time: {_elapsed(phase_start)}")

    phase_start = time.time()
    df_trans_pca = pca_mod.augment_with_pca(df_trans, fx_pairs=active_fx, verbose=verbose)
    print(f"  Phase 4d time: {_elapsed(phase_start)}")

    if no_rolling:
        print("\n-- Phase 5 / Rolling beta ------------------------------------------")
        print("  Skipped with --no-rolling")
        rolling_betas: dict[str, pd.DataFrame] = {}
        regime_flags = pd.DataFrame(
            columns=[
                "fx_pair",
                "indicator",
                "beta_static",
                "beta_recent",
                "drift_pct",
                "sign_flip",
                "r2",
                "significant",
            ]
        )
    else:
        phase_start = time.time()
        rolling_betas = beta_mod.compute_rolling(df_trans, fx_pairs=active_fx, pair_indicators=pair_indicators, verbose=verbose)
        regime_flags = beta_mod.detect_regime_changes(rolling_betas, beta_static, verbose=verbose)
        print(f"  Phase 5 time: {_elapsed(phase_start)}")

    phase_start = time.time()
    metadata = {
        "run_id": run_id,
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "start_date": start_date,
        "fx_pairs": active_fx,
        "excluded_for_coverage": excluded,
        "transform_map": transform_map,
        "no_rolling": no_rolling,
        "from_cache": from_cache,
        "skip_plots": skip_plots,
        "robust_beta": {
            "feature_lag": robust_beta_mod.DEFAULT_FEATURE_LAG,
            "train_window": robust_beta_mod.DEFAULT_TRAIN_WINDOW,
            "min_train_obs": robust_beta_mod.DEFAULT_MIN_TRAIN_OBS,
            "min_oos_obs": robust_beta_mod.DEFAULT_MIN_OOS_OBS,
            "q_threshold": robust_beta_mod.DEFAULT_Q_THRESHOLD,
            "watchlist_q_threshold": robust_beta_mod.DEFAULT_WATCHLIST_Q_THRESHOLD,
            "min_directional_acc": robust_beta_mod.DEFAULT_MIN_DIRECTIONAL_ACC,
        },
        "kalman": {
            "Q": kalman_mod.DEFAULT_Q,
            "R": kalman_mod.DEFAULT_R,
        },
        "pca": {
            "n_components": 4,
        },
    }
    run_path = outputter.save_all(
        beta_static=beta_static,
        pivot=pivot,
        beta_robust=beta_robust,
        robust_pivot=robust_pivot,
        regime_flags=regime_flags,
        rolling_betas=rolling_betas,
        fetch_report=fetch_report,
        run_id=run_id,
        df_aligned=df_aligned,
        df_trans=df_trans,
        coverage=coverage,
        metadata=metadata,
        fx_pairs=active_fx,
        output_dir=output_dir,
        skip_plots=skip_plots,
        kalman_latest=kalman_latest,
        df_trans_pca=df_trans_pca,
    )
    print(f"  Phase 6 time: {_elapsed(phase_start)}")

    # Phase 7: Backtest
    # Filter rolling and Kalman betas to statistically significant indicators (p<0.05).
    # With 108+ features, aggregating all series produces noisy signals.
    # Keeping only significant pair-indicator combinations reduces noise substantially
    # without losing the economically meaningful drivers.
    sig_pairs = set(
        zip(
            beta_static.loc[beta_static["significant"], "fx_pair"],
            beta_static.loc[beta_static["significant"], "indicator"],
        )
    )

    # Circularity and economic-relevance filtering is already applied upfront in
    # pair_indicators (used during rolling/Kalman computation). Here we only apply
    # the static significance filter as a secondary quality gate: keep indicators
    # where full-sample OLS found a detectable relationship (p<0.05) for this pair.
    def _filter_cols(pair: str, pair_df: pd.DataFrame) -> list[str]:
        return [col for col in pair_df.columns if (pair, col) in sig_pairs]

    rolling_for_backtest: dict[str, pd.DataFrame] | None = None
    if not no_rolling and rolling_betas:
        rolling_for_backtest = {}
        for pair, pair_df in rolling_betas.items():
            keep = _filter_cols(pair, pair_df)
            rolling_for_backtest[pair] = pair_df[keep] if keep else pd.DataFrame(index=pair_df.index)

    # Kalman betas: filter to significant indicators, then blend with rolling
    # in the backtest (50/50 ensemble reduces noise from either method alone).
    kalman_for_backtest: dict[str, pd.DataFrame] | None = None
    if kalman_betas:
        kalman_for_backtest = {}
        for pair, pair_df in kalman_betas.items():
            keep = _filter_cols(pair, pair_df)
            kalman_for_backtest[pair] = pair_df[keep] if keep else pd.DataFrame(index=pair_df.index)

    # Pairs with systematically inverted signals (negative backtest IC) are excluded
    # from live trading but kept in all research outputs (static/robust/rolling betas).
    backtest_fx = [p for p in active_fx if p not in BACKTEST_EXCLUDE_PAIRS]
    if BACKTEST_EXCLUDE_PAIRS and verbose:
        excluded_str = ", ".join(BACKTEST_EXCLUDE_PAIRS)
        print(f"  Backtest excludes: {excluded_str} (set BACKTEST_EXCLUDE_PAIRS='' to include)")

    backtest_result = bt.run_backtest(
        df_aligned=df_aligned,
        df_trans=df_trans,
        beta_static=beta_static,
        run_path=run_path,
        fx_pairs=backtest_fx,
        rolling_betas=rolling_for_backtest,
        kalman_betas=kalman_for_backtest,
        kalman_weight=0.5,
        rebalance_freq=bt.REBALANCE_FREQ,
        hysteresis=bt.HYSTERESIS_THRESHOLD,
        min_indicators=bt.MIN_INDICATORS,
        verbose=verbose,
    )

    print("=" * 72)
    print(f"Completed in {_elapsed(total_start)}")
    print(f"Output: {run_path}")
    print("=" * 72)

    return {
        "run_id": run_id,
        "run_path": run_path,
        "df_raw": df_raw,
        "df_aligned": df_aligned,
        "df_trans": df_trans,
        "beta_static": beta_static,
        "beta_robust": beta_robust,
        "pivot": pivot,
        "robust_pivot": robust_pivot,
        "rolling_betas": rolling_betas,
        "regime_flags": regime_flags,
        "fetch_report": fetch_report,
        "backtest": backtest_result,
        "kalman_betas": kalman_betas,
        "kalman_latest": kalman_latest,
        "df_trans_pca": df_trans_pca,
    }


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Polaris beta calibration pipeline")
    parser.add_argument("--no-rolling", action="store_true", help="Skip rolling beta and regime flags.")
    parser.add_argument("--fx", nargs="+", metavar="PAIR", help=f"Limit run to selected pairs: {', '.join(FX_PAIRS)}")
    parser.add_argument("--from-cache", action="store_true", help="Use beta_pipeline/cache/last_raw.pkl.")
    parser.add_argument("--quiet", action="store_true", help="Reduce progress output.")
    parser.add_argument("--start", default=START_DATE, help=f"Start date, default {START_DATE}.")
    parser.add_argument("--output-dir", default=str(OUTPUT_DIR), help="Directory where run folders are created.")
    parser.add_argument("--skip-plots", action="store_true", help="Write tables only, no PNG charts.")
    return parser.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    run(
        no_rolling=args.no_rolling,
        fx_filter=args.fx,
        from_cache=args.from_cache,
        quiet=args.quiet,
        start_date=args.start,
        output_dir=args.output_dir,
        skip_plots=args.skip_plots,
    )
