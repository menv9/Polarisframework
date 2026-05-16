"""Robust beta candidate selection.

This module keeps the existing exploratory beta pipeline intact and adds a
stricter layer for production candidates:

- conservative feature lag to reduce macro release look-ahead,
- economic relevance filter by FX pair,
- Benjamini-Hochberg FDR control,
- rolling walk-forward one-step predictions.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy.stats import linregress, pearsonr

from config import FX_PAIRS, MIN_OBS


DEFAULT_FEATURE_LAG = 1
DEFAULT_TRAIN_WINDOW = 84
DEFAULT_MIN_TRAIN_OBS = 36
DEFAULT_MIN_OOS_OBS = 24
DEFAULT_Q_THRESHOLD = 0.10
DEFAULT_WATCHLIST_Q_THRESHOLD = 0.25
DEFAULT_MIN_DIRECTIONAL_ACC = 0.52

_GLOBAL_PREFIXES = ("wv_", "exo_")
_PAIR_COUNTRIES = {
    "eurusd": {"eur", "usa"},
    "usdjpy": {"usa", "jpn"},
    "gbpusd": {"gbr", "usa"},
    "audusd": {"aus", "usa"},
    "usdcad": {"usa", "cad"},
    "nzdusd": {"nzl", "usa"},
    "usdchf": {"usa", "che"},
    "eurgbp": {"eur", "gbr"},
    "eurjpy": {"eur", "jpn"},
    "gbpjpy": {"gbr", "jpn"},
}


def _log(message: str) -> None:
    print(f"  {message}")


def _get_indicators(df: pd.DataFrame, fx_pairs: list[str]) -> list[str]:
    return [col for col in df.columns if col not in FX_PAIRS]


def is_economically_relevant(fx_pair: str, indicator: str) -> bool:
    """Return True if an indicator is allowed to explain a pair.

    Global World View / Exogenous drivers are allowed for all pairs. Endogenous
    country drivers are restricted to the currencies present in the pair.
    """
    if indicator.startswith(_GLOBAL_PREFIXES):
        return True
    if not indicator.startswith("endo_"):
        return False
    parts = indicator.split("_")
    if len(parts) < 3:
        return False
    return parts[1] in _PAIR_COUNTRIES.get(fx_pair, set())


def _bh_q_values(p_values: pd.Series) -> pd.Series:
    """Benjamini-Hochberg q-values, preserving the original index."""
    p = p_values.astype(float).replace([np.inf, -np.inf], np.nan)
    valid = p.dropna().sort_values()
    q = pd.Series(np.nan, index=p.index, dtype=float)
    m = len(valid)
    if m == 0:
        return q

    ranked = valid.reset_index()
    ranked.columns = ["idx", "p"]
    ranked["rank"] = np.arange(1, m + 1)
    ranked["q_raw"] = ranked["p"] * m / ranked["rank"]
    ranked["q"] = ranked["q_raw"][::-1].cummin()[::-1].clip(upper=1.0)
    q.loc[ranked["idx"]] = ranked["q"].to_numpy()
    return q


def _fit_beta(x: np.ndarray, y: np.ndarray) -> tuple[float, float] | None:
    mask = ~(np.isnan(x) | np.isnan(y))
    if mask.sum() < DEFAULT_MIN_TRAIN_OBS:
        return None
    x_clean = x[mask]
    y_clean = y[mask]
    if np.var(x_clean) < 1e-12 or np.var(y_clean) < 1e-12:
        return None
    slope, intercept, *_ = linregress(x_clean, y_clean)
    return float(slope), float(intercept)


def _walk_forward_stats(
    x: pd.Series,
    y: pd.Series,
    train_window: int,
    min_train_obs: int,
) -> dict:
    aligned = pd.concat({"x": x, "y": y}, axis=1)
    rolling = aligned.rolling(train_window, min_periods=min_train_obs)
    mean_x = rolling["x"].mean().shift(1)
    mean_y = rolling["y"].mean().shift(1)
    beta = (rolling["x"].cov(aligned["y"]) / rolling["x"].var()).shift(1)
    intercept = mean_y - beta * mean_x
    pred = intercept + beta * aligned["x"]

    eval_frame = pd.concat({"pred": pred, "actual": aligned["y"]}, axis=1).dropna()
    eval_frame = eval_frame.replace([np.inf, -np.inf], np.nan).dropna()
    n = len(eval_frame)
    if n < 2:
        return {
            "wf_n": n,
            "wf_ic": np.nan,
            "wf_directional_acc": np.nan,
            "wf_oos_r2": np.nan,
        }

    pred_arr = eval_frame["pred"].to_numpy(dtype=float)
    actual_arr = eval_frame["actual"].to_numpy(dtype=float)
    if np.std(pred_arr) < 1e-12 or np.std(actual_arr) < 1e-12:
        ic = np.nan
    else:
        ic = float(pearsonr(pred_arr, actual_arr)[0])

    directional = float((np.sign(pred_arr) == np.sign(actual_arr)).mean())
    sse = float(np.sum((actual_arr - pred_arr) ** 2))
    sst = float(np.sum((actual_arr - actual_arr.mean()) ** 2))
    oos_r2 = 1.0 - sse / sst if sst > 1e-12 else np.nan
    return {
        "wf_n": n,
        "wf_ic": round(ic, 4) if np.isfinite(ic) else np.nan,
        "wf_directional_acc": round(directional, 4),
        "wf_oos_r2": round(oos_r2, 4) if np.isfinite(oos_r2) else np.nan,
    }


def compute_robust_candidates(
    df_trans: pd.DataFrame,
    fx_pairs: list[str] | None = None,
    feature_lag: int = DEFAULT_FEATURE_LAG,
    train_window: int = DEFAULT_TRAIN_WINDOW,
    min_train_obs: int = DEFAULT_MIN_TRAIN_OBS,
    min_oos_obs: int = DEFAULT_MIN_OOS_OBS,
    q_threshold: float = DEFAULT_Q_THRESHOLD,
    watchlist_q_threshold: float = DEFAULT_WATCHLIST_Q_THRESHOLD,
    min_directional_acc: float = DEFAULT_MIN_DIRECTIONAL_ACC,
    verbose: bool = True,
) -> pd.DataFrame:
    """Compute robust beta candidates with lagged features and OOS checks."""
    print("\n-- Phase 4b / Robust beta candidates -------------------------------")
    active_fx = fx_pairs or FX_PAIRS
    indicators = _get_indicators(df_trans, active_fx)
    rows = []

    for fx in active_fx:
        if fx not in df_trans.columns:
            continue
        y = df_trans[fx]
        for indicator in indicators:
            relevant = is_economically_relevant(fx, indicator)
            if not relevant:
                continue

            x = df_trans[indicator].shift(feature_lag)
            common = pd.concat({"x": x, "y": y}, axis=1).dropna()
            if len(common) < MIN_OBS:
                continue
            if common["x"].var() < 1e-12 or common["y"].var() < 1e-12:
                continue

            slope, intercept, r_value, p_value, std_err = linregress(common["x"], common["y"])
            wf = _walk_forward_stats(x, y, train_window=train_window, min_train_obs=min_train_obs)
            rows.append({
                "fx_pair": fx,
                "indicator": indicator,
                "beta": round(float(slope), 4),
                "intercept": round(float(intercept), 4),
                "r2": round(float(r_value ** 2), 4),
                "p_value": round(float(p_value), 6),
                "std_err": round(float(std_err), 4),
                "n_obs": int(len(common)),
                "feature_lag": int(feature_lag),
                "economic_relevance": bool(relevant),
                **wf,
            })

    columns = [
        "fx_pair", "indicator", "beta", "intercept", "r2", "p_value", "q_value",
        "std_err", "n_obs", "feature_lag", "economic_relevance", "wf_n", "wf_ic",
        "wf_directional_acc", "wf_oos_r2", "accepted", "watchlist",
    ]
    result = pd.DataFrame(rows)
    if result.empty:
        return pd.DataFrame(columns=columns)

    result["q_value"] = _bh_q_values(result["p_value"]).round(6)
    result["accepted"] = (
        (result["q_value"] <= q_threshold)
        & (result["wf_n"] >= min_oos_obs)
        & (result["wf_ic"] > 0)
        & (result["wf_directional_acc"] >= min_directional_acc)
    )
    result["watchlist"] = (
        ~result["accepted"]
        & (result["q_value"] <= watchlist_q_threshold)
        & (result["wf_n"] >= min_oos_obs)
        & (result["wf_ic"] > 0)
    )
    result = result[columns].sort_values(
        ["accepted", "watchlist", "fx_pair", "q_value", "wf_ic"],
        ascending=[False, False, True, True, False],
    ).reset_index(drop=True)

    if verbose:
        _log(f"Candidates tested: {len(result)}")
        _log(f"Accepted q<={q_threshold:.2f}, WF IC>0, dir>={min_directional_acc:.0%}: {int(result['accepted'].sum())}")
        _log(f"Watchlist q<={watchlist_q_threshold:.2f}, WF IC>0: {int(result['watchlist'].sum())}")
    return result


def build_robust_pivot(robust_beta: pd.DataFrame, only_accepted: bool = True) -> pd.DataFrame:
    if robust_beta.empty:
        return pd.DataFrame()
    frame = robust_beta.copy()
    if only_accepted:
        frame = frame[frame["accepted"]]
    if frame.empty:
        return pd.DataFrame()
    pivot = frame.pivot_table(index="indicator", columns="fx_pair", values="beta", aggfunc="first").round(3)
    order = pivot.notna().sum(axis=1).sort_values(ascending=False).index
    return pivot.loc[order]
