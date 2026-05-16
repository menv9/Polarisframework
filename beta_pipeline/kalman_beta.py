"""Kalman filter for time-varying beta estimation.

State-space model:
  beta_t = beta_{t-1} + eta_t      eta ~ N(0, Q)   [state noise]
  y_t    = x_t * beta_t + eps_t    eps ~ N(0, R)   [observation noise]

No external libraries required — pure numpy.
"""
from __future__ import annotations

import numpy as np
import pandas as pd

from config import FX_PAIRS

DEFAULT_Q = 1e-6   # state noise variance — very small → betas drift slowly, only on structural breaks
DEFAULT_R = 1e-2   # observation noise variance
DEFAULT_MIN_OBS = 24


def _log(msg: str) -> None:
    print(f"  {msg}")


def _kalman_beta(
    x: np.ndarray,
    y: np.ndarray,
    Q: float = DEFAULT_Q,
    R: float = DEFAULT_R,
) -> np.ndarray:
    """Return time-varying beta estimates via scalar Kalman filter."""
    n = len(x)
    betas = np.full(n, np.nan)
    # Initialise from first valid pair
    valid = ~(np.isnan(x) | np.isnan(y))
    if valid.sum() < 2:
        return betas

    first = np.where(valid)[0][0]
    beta = 0.0
    P = 1.0

    for t in range(first, n):
        if not valid[t]:
            # Predict only (no update)
            P = P + Q
            betas[t] = beta
            continue

        # Predict
        P_pred = P + Q

        # Update
        x_t = x[t]
        S = x_t * x_t * P_pred + R
        K = P_pred * x_t / S
        innov = y[t] - x_t * beta
        beta = beta + K * innov
        P = (1.0 - K * x_t) * P_pred

        betas[t] = beta

    return betas


def compute_kalman(
    df_trans: pd.DataFrame,
    fx_pairs: list[str] | None = None,
    Q: float = DEFAULT_Q,
    R: float = DEFAULT_R,
    min_obs: int = DEFAULT_MIN_OBS,
    verbose: bool = True,
) -> dict[str, pd.DataFrame]:
    """Compute Kalman betas for all FX pairs.

    Returns dict: fx_pair -> DataFrame(index=dates, columns=indicators, values=beta_t).
    """
    print("\n-- Phase 4c / Kalman beta ------------------------------------------")
    active_fx = fx_pairs or FX_PAIRS
    indicators = [col for col in df_trans.columns if col not in FX_PAIRS]
    result: dict[str, pd.DataFrame] = {}

    for fx in active_fx:
        if fx not in df_trans.columns:
            continue
        y_arr = df_trans[fx].to_numpy(dtype=float)
        rows: dict[str, np.ndarray] = {}

        for ind in indicators:
            x_arr = df_trans[ind].to_numpy(dtype=float)
            valid = ~(np.isnan(x_arr) | np.isnan(y_arr))
            if valid.sum() < min_obs:
                continue
            rows[ind] = _kalman_beta(x_arr, y_arr, Q=Q, R=R)

        if rows:
            result[fx] = pd.DataFrame(rows, index=df_trans.index)
            if verbose:
                _log(f"{fx}: {len(rows)} Kalman betas")

    return result


def latest_kalman_betas(
    kalman_betas: dict[str, pd.DataFrame],
) -> pd.DataFrame:
    """Extract the most recent Kalman beta for each (pair, indicator) as a flat DataFrame.

    Returns DataFrame with columns: fx_pair, indicator, beta_kalman, date.
    """
    records = []
    for fx, df in kalman_betas.items():
        last_valid = df.apply(lambda s: s.dropna().iloc[-1] if s.dropna().size > 0 else float("nan"))
        last_date  = df.apply(lambda s: s.dropna().index[-1] if s.dropna().size > 0 else pd.NaT)
        for ind in df.columns:
            records.append({
                "fx_pair": fx,
                "indicator": ind,
                "beta_kalman": round(float(last_valid[ind]), 4) if np.isfinite(last_valid[ind]) else None,
                "date": last_date[ind],
            })
    return pd.DataFrame(records)
