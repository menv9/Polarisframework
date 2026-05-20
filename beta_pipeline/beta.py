"""Static beta, rolling beta, and regime-change detection."""

from __future__ import annotations

from concurrent.futures import ProcessPoolExecutor, as_completed

import numpy as np
import pandas as pd
from scipy.stats import t as _t_dist

from config import FX_PAIRS, MIN_OBS, MIN_OBS_ROLL, ROLLING_WIN


def _ols(x: np.ndarray, y: np.ndarray) -> tuple[float, float, float, float, float]:
    """Manual OLS — avoids scipy.stats.linregress crash on numpy 2.x / Python 3.14."""
    n = len(x)
    if n < 3:
        return float("nan"), float("nan"), float("nan"), float("nan"), float("nan")
    xm = x - x.mean()
    ym = y - y.mean()
    ssxx = float((xm * xm).sum())
    if ssxx < 1e-30:
        return 0.0, float(y.mean()), 0.0, 1.0, float("nan")
    ssxy = float((xm * ym).sum())
    slope = ssxy / ssxx
    intercept = float(y.mean()) - slope * float(x.mean())
    resid = y - (intercept + slope * x)
    ss_res = float((resid * resid).sum())
    ss_tot = float((ym * ym).sum())
    r2 = 1.0 - ss_res / ss_tot if ss_tot > 1e-30 else 0.0
    r_value = float(np.sign(slope) * np.sqrt(max(0.0, r2)))
    se = float(np.sqrt(max(0.0, ss_res / (n - 2)) / ssxx)) if n > 2 else float("nan")
    t_stat = slope / se if (se > 1e-12) else float("nan")
    p_value = float(2.0 * (1.0 - _t_dist.cdf(abs(t_stat), df=n - 2))) if np.isfinite(t_stat) else 1.0
    return slope, intercept, r_value, p_value, se


def _log(message: str) -> None:
    print(f"  {message}")


def _get_indicators(df: pd.DataFrame, fx_pairs: list[str] | None = None) -> list[str]:
    return [col for col in df.columns if col not in FX_PAIRS]


def _rolling_beta_numpy(x: np.ndarray, y: np.ndarray, window: int, min_obs: int) -> np.ndarray:
    betas = np.full(len(x), np.nan)
    for idx in range(window - 1, len(x)):
        xi = x[idx - window + 1 : idx + 1]
        yi = y[idx - window + 1 : idx + 1]
        mask = ~(np.isnan(xi) | np.isnan(yi))
        if mask.sum() < min_obs:
            continue
        xi_clean = xi[mask]
        yi_clean = yi[mask]
        var_x = np.var(xi_clean, ddof=1)
        if var_x < 1e-12:
            continue
        betas[idx] = np.cov(xi_clean, yi_clean, ddof=1)[0, 1] / var_x
    return betas


def compute_static(
    df_trans: pd.DataFrame,
    fx_pairs: list[str] | None = None,
    verbose: bool = True,
) -> pd.DataFrame:
    """OLS full-sample for every indicator against every selected FX pair."""
    print("\n-- Phase 4 / Static beta -------------------------------------------")
    active_fx = fx_pairs or FX_PAIRS
    indicators = _get_indicators(df_trans, active_fx)
    records = []

    for fx in active_fx:
        if fx not in df_trans.columns:
            continue
        for indicator in indicators:
            common = df_trans[[fx, indicator]].dropna()
            if len(common) < MIN_OBS:
                continue

            x = common[indicator].to_numpy(dtype=float)
            y = common[fx].to_numpy(dtype=float)
            if np.var(x) < 1e-12 or np.var(y) < 1e-12:
                continue

            slope, intercept, r_value, p_value, std_err = _ols(x, y)
            records.append(
                {
                    "fx_pair": fx,
                    "indicator": indicator,
                    "beta": round(float(slope), 4),
                    "intercept": round(float(intercept), 4),
                    "r2": round(float(r_value**2), 4),
                    "p_value": round(float(p_value), 4),
                    "std_err": round(float(std_err), 4),
                    "n_obs": int(len(common)),
                    "significant": bool(p_value < 0.05),
                    "strong": bool(p_value < 0.05 and r_value**2 > 0.15),
                }
            )

    columns = [
        "fx_pair",
        "indicator",
        "beta",
        "intercept",
        "r2",
        "p_value",
        "std_err",
        "n_obs",
        "significant",
        "strong",
    ]
    result = pd.DataFrame(records, columns=columns)
    if not result.empty:
        result = result.sort_values(["fx_pair", "r2"], ascending=[True, False]).reset_index(drop=True)

    if verbose:
        _log(f"Regressions: {len(result)}")
        _log(f"Significant p<0.05: {int(result['significant'].sum()) if not result.empty else 0}")
        _log(f"Strong p<0.05 and R2>0.15: {int(result['strong'].sum()) if not result.empty else 0}")
    return result


def _compute_rolling_for_pair(
    fx: str,
    indicators: list[str],
    trans_values: dict[str, np.ndarray],
    trans_index: pd.Index,
    window: int,
    min_obs: int,
) -> tuple[str, pd.DataFrame]:
    y_full = trans_values[fx]
    result = {}
    for indicator in indicators:
        x_full = trans_values.get(indicator)
        if x_full is None:
            continue
        valid = ~(np.isnan(x_full) | np.isnan(y_full))
        if valid.sum() < window:
            continue
        result[indicator] = _rolling_beta_numpy(x_full, y_full, window, min_obs)
    return fx, pd.DataFrame(result, index=trans_index)


def compute_rolling(
    df_trans: pd.DataFrame,
    fx_pairs: list[str] | None = None,
    pair_indicators: dict[str, list[str]] | None = None,
    verbose: bool = True,
) -> dict[str, pd.DataFrame]:
    """Rolling beta for all selected FX pairs.

    pair_indicators: optional per-pair indicator list (pre-filtered for economic
    relevance and circularity). When provided each pair only regresses against its
    own relevant indicators, preventing REER/DXY from dominating the signal pool.
    Falls back to all non-FX columns when None.
    """
    print("\n-- Phase 5 / Rolling beta ------------------------------------------")
    active_fx = fx_pairs or FX_PAIRS
    available_fx = [fx for fx in active_fx if fx in df_trans.columns]
    all_indicators = _get_indicators(df_trans, active_fx)   # fallback
    trans_values = {col: df_trans[col].to_numpy(dtype=float) for col in df_trans.columns}
    trans_index = df_trans.index
    rolling_betas: dict[str, pd.DataFrame] = {}

    with ProcessPoolExecutor() as executor:
        futures = {
            executor.submit(
                _compute_rolling_for_pair,
                fx,
                pair_indicators.get(fx, all_indicators) if pair_indicators else all_indicators,
                trans_values,
                trans_index,
                ROLLING_WIN,
                MIN_OBS_ROLL,
            ): fx
            for fx in available_fx
        }
        for done, future in enumerate(as_completed(futures), start=1):
            fx, frame = future.result()
            rolling_betas[fx] = frame
            if verbose:
                n_ind = len(frame.columns) if not frame.empty else 0
                _log(f"[{done}/{len(available_fx)}] rolling beta ready: {fx}  ({n_ind} indicators)")

    return rolling_betas


def detect_regime_changes(
    rolling_betas: dict[str, pd.DataFrame],
    beta_static: pd.DataFrame,
    drift_thresh: float = 0.50,
    recent_months: int = 3,
    verbose: bool = True,
) -> pd.DataFrame:
    """Flag sign flips or large recent-vs-static beta drift."""
    flags = []
    if beta_static.empty:
        return pd.DataFrame(
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

    for fx, rb_df in rolling_betas.items():
        for indicator in rb_df.columns:
            recent_series = rb_df[indicator].dropna()
            if len(recent_series) < recent_months:
                continue

            row = beta_static[(beta_static["fx_pair"] == fx) & (beta_static["indicator"] == indicator)]
            if row.empty:
                continue

            beta_full = float(row["beta"].iloc[0])
            if abs(beta_full) < 1e-4:
                continue

            beta_recent = float(recent_series.iloc[-recent_months:].mean())
            sign_flip = bool(np.sign(beta_full) != np.sign(beta_recent))
            drift_pct = abs(beta_recent - beta_full) / abs(beta_full)
            if sign_flip or drift_pct > drift_thresh:
                flags.append(
                    {
                        "fx_pair": fx,
                        "indicator": indicator,
                        "beta_static": round(beta_full, 4),
                        "beta_recent": round(beta_recent, 4),
                        "drift_pct": round(drift_pct * 100, 1),
                        "sign_flip": sign_flip,
                        "r2": row["r2"].iloc[0],
                        "significant": row["significant"].iloc[0],
                    }
                )

    columns = [
        "fx_pair",
        "indicator",
        "beta_static",
        "beta_recent",
        "drift_pct",
        "sign_flip",
        "r2",
        "significant",
    ]
    result = pd.DataFrame(flags, columns=columns)
    if not result.empty:
        result = result.sort_values("drift_pct", ascending=False).reset_index(drop=True)

    if verbose:
        sign_flips = int(result["sign_flip"].sum()) if not result.empty else 0
        _log(f"Regime changes detected: {len(result)}")
        _log(f"Sign flips: {sign_flips}")
        _log(f"Drift only: {len(result) - sign_flips}")
    return result


def build_pivot(beta_static: pd.DataFrame, only_significant: bool = True) -> pd.DataFrame:
    """Indicator x FX pivot with beta values."""
    if beta_static.empty:
        return pd.DataFrame()
    frame = beta_static.copy()
    if only_significant:
        frame = frame[frame["significant"]]
    if frame.empty:
        return pd.DataFrame()
    pivot = frame.pivot_table(index="indicator", columns="fx_pair", values="beta", aggfunc="first").round(3)
    order = pivot.notna().sum(axis=1).sort_values(ascending=False).index
    return pivot.loc[order]


def top_drivers(
    beta_static: pd.DataFrame,
    fx_pair: str,
    n: int = 15,
    significant: bool = True,
) -> pd.DataFrame:
    """Top N indicators by absolute beta for one FX pair."""
    frame = beta_static[beta_static["fx_pair"] == fx_pair].copy()
    if significant:
        frame = frame[frame["significant"]]
    if frame.empty:
        return pd.DataFrame(columns=["indicator", "beta", "r2", "p_value", "n_obs"])
    frame["abs_beta"] = frame["beta"].abs()
    return frame.nlargest(n, "abs_beta")[["indicator", "beta", "r2", "p_value", "n_obs"]].reset_index(drop=True)
