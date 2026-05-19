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
from config import CACHE_DIR, FRED_API_KEY, FX_PAIRS, OUTPUT_DIR, START_DATE, EXCLUDE_REER_ROLLING, EXCLUDE_DXY_ROLLING


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
    kalman_betas = kalman_mod.compute_kalman(df_trans, fx_pairs=active_fx, verbose=verbose)
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
        rolling_betas = beta_mod.compute_rolling(df_trans, fx_pairs=active_fx, verbose=verbose)
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

    # Circularity guards for rolling/Kalman signals:
    #   REER: built from trade-weighted nominal FX rates → lagged autocorrelation artifact
    #   DXY:  weighted basket of the modelled USD pairs (57% EUR, 14% JPY, 12% GBP…)
    #         → regressing EURUSD on DXY gives R²≈0.90, a near-tautology
    # Both stay in the static analysis for research; removed only from adaptive signals.
    _CIRCULAR_PATTERNS = []
    if EXCLUDE_REER_ROLLING:
        _CIRCULAR_PATTERNS.append("_reer")
    if EXCLUDE_DXY_ROLLING:
        _CIRCULAR_PATTERNS.append("wv_dxy")

    def _filter_cols(pair: str, pair_df: pd.DataFrame) -> list[str]:
        keep = [col for col in pair_df.columns if (pair, col) in sig_pairs]
        keep = [col for col in keep if not any(pat in col for pat in _CIRCULAR_PATTERNS)]
        return keep

    rolling_for_backtest: dict[str, pd.DataFrame] | None = None
    if not no_rolling and rolling_betas:
        rolling_for_backtest = {}
        for pair, pair_df in rolling_betas.items():
            keep = _filter_cols(pair, pair_df)
            rolling_for_backtest[pair] = pair_df[keep] if keep else pair_df

    # Kalman betas: filter to significant indicators, then blend with rolling
    # in the backtest (50/50 ensemble reduces noise from either method alone).
    kalman_for_backtest: dict[str, pd.DataFrame] | None = None
    if kalman_betas:
        kalman_for_backtest = {}
        for pair, pair_df in kalman_betas.items():
            keep = _filter_cols(pair, pair_df)
            kalman_for_backtest[pair] = pair_df[keep] if keep else pair_df

    backtest_result = bt.run_backtest(
        df_aligned=df_aligned,
        df_trans=df_trans,
        beta_static=beta_static,
        run_path=run_path,
        rolling_betas=rolling_for_backtest,
        kalman_betas=kalman_for_backtest,
        kalman_weight=0.5,
        rebalance_freq=bt.REBALANCE_FREQ,
        hysteresis=bt.HYSTERESIS_THRESHOLD,
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
