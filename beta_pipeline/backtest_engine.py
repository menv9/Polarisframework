"""Polaris Capa 1 — Backtest engine mínimo viable (walk-forward).

Versión 2: aproximación directa con betas de regresión.
En lugar de replicar exactamente la lógica de z-scores + scores de la app
(lo cual requiere que las series importadas coincidan perfectamente),
usamos los betas estáticas del pipeline como un modelo lineal directo:

    predicted_return(t) = sum(beta_i × feature_i(t))

Donde feature_i(t) son los valores transformados (df_trans).

Reglas:
  - Si predicción > umbral  → LONG el par
  - Si predicción < -umbral → SHORT el par
  - Hold 1 mes, rebalance mensual
  - Coste = half-turn spread
  - Equal weight entre pares activos

Esta aproximación es más honesta para el MVP porque:
  1. Usa exactamente los betas calibrados por regresión.
  2. No depende de que el usuario haya importado las mismas series.
  3. Es interpretable: si beta es significativo, el modelo debería predecir
     dirección correcta mejor que random.

Walk-forward: usamos betas full-sample (igual que la app) y features
rolling.  No hay look-ahead porque los features en t son conocidos en t.
"""

from __future__ import annotations

import json
import math
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

# ── Configuración ────────────────────────────────────────────────────────────

# Todos los pares G10 del pipeline (7 majors + 3 cruces)
FX_PAIRS = [
    "eurusd", "usdjpy", "gbpusd", "audusd", "usdcad",
    "nzdusd", "usdchf", "eurgbp", "eurjpy", "gbpjpy",
]

# Costes: half-turn spread (entrada única) en % del notional
# Majors: valores del frontend ExecutionOpsPage.
# Cruces: spreads algo más amplios (~50% más que el major más caro de cada leg).
COSTS = {
    "eurusd": 0.00020, "usdjpy": 0.00025, "gbpusd": 0.00030,
    "audusd": 0.00030, "usdcad": 0.00035, "nzdusd": 0.00050,
    "usdchf": 0.00035,
    "eurgbp": 0.00035, "eurjpy": 0.00040, "gbpjpy": 0.00045,
}

UMBRAL_PREDICCION = 0.0125   # 1.25 % mensual predicho para entrar — higher conviction threshold

TURNOVER_COST_MULTIPLIER = 2.0   # extra cost when reversing position direction
MIN_SIGNAL_IMPROVEMENT   = 1.5   # signal must be 1.5× cost to justify a switch

ZSCORE_CONVICTION = 1.25   # dead-zone: only trade when |pred| > 1.25σ of its own history

REBALANCE_FREQ          = 3     # rebalance every N months (3 = quarterly)
HYSTERESIS_THRESHOLD    = 0.02  # minimum |signed-weight change| to execute a trade
MIN_INDICATORS          = 3     # skip pair when fewer valid rolling/Kalman betas available
CARRY_MIN_DIFFERENTIAL  = 0.50  # minimum annual rate differential (%) to trade carry fallback
CARRY_VIX_THRESHOLD     = 25.0  # suppress carry trades when VIX > this level (risk-off filter)
SPOT_VOL_WINDOW         = 3     # months of realized FX spot vol used for Risk Parity sizing


def _log(msg: str) -> None:
    print(f"  {msg}")


# ── Dataclasses ──────────────────────────────────────────────────────────────

@dataclass
class Trade:
    open_date: pd.Timestamp
    close_date: pd.Timestamp
    pair: str
    direction: str
    predicted: float
    actual: float
    gross_return_pct: float
    cost_pct: float
    net_return_pct: float


@dataclass
class BacktestResult:
    trades: list[Trade] = field(default_factory=list)
    equity: pd.Series = field(default_factory=lambda: pd.Series(dtype=float))
    monthly_returns: pd.Series = field(default_factory=lambda: pd.Series(dtype=float))
    metrics: dict = field(default_factory=dict)


# ── Predicción con betas estáticas ───────────────────────────────────────────

def predict_return(
    df_trans: pd.DataFrame,
    beta_static: pd.DataFrame,
    fx_pair: str,
    date: pd.Timestamp,
) -> float | None:
    """Predice el retorno del par en *date* usando betas estáticas.
    predicted = sum(beta_i × feature_i(t))  [sin intercepto para simplificar].
    """
    row = beta_static[beta_static["fx_pair"] == fx_pair]
    if row.empty:
        return None

    pred = 0.0
    for _, r in row.iterrows():
        ind = r["indicator"]
        if ind not in df_trans.columns:
            continue
        val = df_trans[ind].loc[date]
        if pd.isna(val):
            continue
        pred += r["beta"] * val

    return pred


# ── Simulación ───────────────────────────────────────────────────────────────

def _risk_parity_weights(
    returns_history: dict[str, list[float]],
    pairs: list[str],
    min_obs: int = 12,
    spot_vols: dict[str, float] | None = None,
) -> dict[str, float]:
    """Inverse-volatility weights, falling back to equal weight.

    spot_vols (optional): realized annualised vol of the FX spot price computed
    from df_aligned over the last SPOT_VOL_WINDOW months.  When provided it is
    preferred over the model's own P&L history because:
      - it is based on the directly observable price series (more stable),
      - the P&L history is short and noisy early in the backtest,
      - it is look-ahead free (computed from prices up to t_open).
    Pairs absent from spot_vols fall back to the P&L-based estimate.
    """
    vols = {}
    for p in pairs:
        if spot_vols and p in spot_vols and spot_vols[p] > 1e-8:
            vols[p] = spot_vols[p]
        else:
            hist = returns_history.get(p, [])
            if len(hist) >= min_obs:
                vols[p] = float(np.std(hist[-36:]))  # rolling 36-month P&L vol
    if not vols or all(v < 1e-8 for v in vols.values()):
        n = len(pairs)
        return {p: 1.0 / n for p in pairs} if n > 0 else {}
    inv_vol = {p: 1.0 / max(v, 1e-8) for p, v in vols.items()}
    total = sum(inv_vol.values())
    n_missing = len(pairs) - len(inv_vol)
    missing_w = (1.0 / len(pairs)) if n_missing > 0 else 0.0
    return {
        p: (inv_vol[p] / total * (1.0 - missing_w * n_missing) if p in inv_vol else missing_w)
        for p in pairs
    }


def predict_return_rolling(
    rolling_betas: dict[str, pd.DataFrame],
    fx_pair: str,
    date: pd.Timestamp,
    df_trans: pd.DataFrame,
) -> float | None:
    """Predict using rolling betas at *date* (using betas estimated at that date).

    Rolling beta at t uses only data up to t → no look-ahead.
    """
    rb = rolling_betas.get(fx_pair)
    if rb is None or rb.empty:
        return None
    if date not in rb.index:
        return None

    beta_row = rb.loc[date]
    pred = 0.0
    counted = 0
    for ind, beta_val in beta_row.items():
        if pd.isna(beta_val):
            continue
        if ind not in df_trans.columns:
            continue
        val = df_trans[ind].loc[date] if date in df_trans.index else float("nan")
        if pd.isna(val):
            continue
        pred += beta_val * val
        counted += 1
    return pred if counted > 0 else None


def predict_return_kalman(
    kalman_betas: dict[str, pd.DataFrame],
    fx_pair: str,
    date: pd.Timestamp,
    df_trans: pd.DataFrame,
) -> float | None:
    """Predict using Kalman-filtered betas at *date*.

    Kalman betas are computed recursively forward — no look-ahead.  The state
    estimate at *t* uses only observations up to *t*.
    """
    return predict_return_rolling(kalman_betas, fx_pair, date, df_trans)


def simulate(
    df_aligned: pd.DataFrame,
    df_trans: pd.DataFrame,
    beta_static: pd.DataFrame,
    fx_pairs: list[str] = FX_PAIRS,
    min_obs: int = 24,
    threshold: float = UMBRAL_PREDICCION,
    rolling_betas: dict | None = None,
    kalman_betas: dict | None = None,
    kalman_weight: float = 0.5,
    rebalance_freq: int = REBALANCE_FREQ,
    hysteresis: float = HYSTERESIS_THRESHOLD,
    min_indicators: int = MIN_INDICATORS,
    verbose: bool = True,
) -> BacktestResult:
    """Backtest walk-forward con Risk Parity, rebalanceo N-mensual e histéresis.

    rebalance_freq : months between signal evaluations (1=monthly, 3=quarterly).
    hysteresis     : minimum |signed-weight change| required to execute a trade.
                     Positions within the band are carried forward at zero cost.
    kalman_betas   : optional Kalman-filtered betas (same structure as rolling_betas).
                     When provided alongside rolling_betas, predictions are blended
                     using kalman_weight (0=rolling only, 1=kalman only, 0.5=equal blend).
                     When rolling_betas is None, kalman_betas acts as the adaptive signal.
    kalman_weight  : blend weight for Kalman prediction (default 0.5 = 50/50 ensemble).
    """
    if verbose:
        print("\n-- Backtest / Simulation -------------------------------------------")
        if rolling_betas and kalman_betas:
            mode = f"rolling+Kalman blend (w_kalman={kalman_weight:.1f})"
        elif kalman_betas:
            mode = "Kalman betas (walk-forward)"
        elif rolling_betas:
            mode = "rolling betas (walk-forward)"
        else:
            mode = "static betas (full-sample)"
        print(f"  Beta mode:   {mode}")
        print(f"  Rebalance:   every {rebalance_freq} month(s)")
        print(f"  Hysteresis:  {hysteresis * 100:.1f}% minimum weight change")

    dates = df_trans.index

    # ── Cross-pair coverage validation ───────────────────────────────────────
    if verbose:
        total_months = len(dates)
        for pair in fx_pairs:
            if pair not in df_aligned.columns:
                _log(f"Coverage: {pair} absent from df_aligned — will be skipped")
                continue
            available = int(df_aligned[pair].dropna().shape[0])
            pct = available / total_months if total_months > 0 else 0.0
            if pct < 0.90:
                _log(f"Coverage warning: {pair}  {available}/{total_months} months ({pct:.0%})")

    trades: list[Trade] = []
    monthly_pnl: dict[pd.Timestamp, float] = {}
    preds: list[float] = []

    pair_return_history: dict[str, list[float]] = {p: [] for p in fx_pairs}
    pred_history: dict[str, list[float]] = {p: [] for p in fx_pairs}
    pair_trade_count: dict[str, int] = {p: 0 for p in fx_pairs}   # months with active position
    pair_skip_count:  dict[str, int] = {p: 0 for p in fx_pairs}   # months skipped (no data)
    # Signed weights: positive = LONG, negative = SHORT, absent = flat
    current_weights: dict[str, float] = {}
    rebalance_counter = 0

    for i in range(len(dates) - 1):
        t_open  = dates[i]
        t_close = dates[i + 1]
        if i < min_obs:
            continue

        rebalance_counter += 1
        is_rebalance = (rebalance_counter % rebalance_freq == 0)

        # pairs whose weights actually changed this period → pay transaction cost
        executed_changes: dict[str, tuple[float, float]] = {}  # pair -> (old_w, new_w)
        raw_signals: dict[str, float] = {}

        # ── Quarterly (or N-monthly) rebalance ───────────────────────────────
        if is_rebalance:
            active_for_rp: list[str] = []

            for pair in fx_pairs:
                if pair not in df_aligned.columns:
                    continue

                # Minimum indicator guard: skip pair when too few valid betas available.
                # Carry fallback: pairs with sparse macro signal (e.g. USDJPY after
                # REER/DXY exclusion) can still trade via the interest rate differential.
                # Carry is economically sound and already computed in df_trans as carry_{pair}.
                if rolling_betas or kalman_betas:
                    n_roll = 0
                    n_kalman = 0
                    if rolling_betas and pair in rolling_betas:
                        rb_df = rolling_betas[pair]
                        if t_open in rb_df.index:
                            n_roll = int(rb_df.loc[t_open].notna().sum())
                    if kalman_betas and pair in kalman_betas:
                        kb_df = kalman_betas[pair]
                        if t_open in kb_df.index:
                            n_kalman = int(kb_df.loc[t_open].notna().sum())
                    if max(n_roll, n_kalman) < min_indicators:
                        # Try carry fallback before giving up on this pair.
                        # VIX regime filter: suppress carry trades in risk-off episodes
                        # (JPY safe-haven flows overwhelm rate differentials above VIX~25).
                        vix_ok = True
                        if "wv_vix" in df_aligned.columns and t_open in df_aligned.index:
                            vix_val = df_aligned["wv_vix"].loc[t_open]
                            if not pd.isna(vix_val) and float(vix_val) > CARRY_VIX_THRESHOLD:
                                vix_ok = False

                        if vix_ok:
                            carry_col = f"carry_{pair}"
                            if carry_col in df_trans.columns and t_open in df_trans.index:
                                carry_val = df_trans[carry_col].loc[t_open]
                                if (
                                    not pd.isna(carry_val)
                                    and abs(float(carry_val)) >= CARRY_MIN_DIFFERENTIAL
                                ):
                                    # Annual rate differential → monthly carry signal.
                                    # positive carry = base rate > quote rate → long signal.
                                    pred = float(carry_val) / 1200.0
                                    pred_history[pair].append(pred)
                                    active_for_rp.append(pair)
                                    raw_signals[pair] = pred
                        continue  # skip full beta path regardless

                # Compute rolling and/or Kalman predictions, then blend
                pred_roll   = None
                pred_kalman = None
                if rolling_betas and pair in rolling_betas:
                    pred_roll = predict_return_rolling(rolling_betas, pair, t_open, df_trans)
                if kalman_betas and pair in kalman_betas:
                    pred_kalman = predict_return_kalman(kalman_betas, pair, t_open, df_trans)

                if pred_roll is not None and pred_kalman is not None:
                    pred = (1.0 - kalman_weight) * pred_roll + kalman_weight * pred_kalman
                elif pred_kalman is not None:
                    pred = pred_kalman
                elif pred_roll is not None:
                    pred = pred_roll
                else:
                    pred = predict_return(df_trans, beta_static, pair, t_open)

                if pred is None:
                    continue

                # Z-score conviction filter
                pred_hist = pred_history[pair]
                pred_hist.append(pred)
                if len(pred_hist) >= 12:
                    pred_std = float(np.std(pred_hist))
                    if pred_std > 1e-10 and abs(pred) / pred_std < ZSCORE_CONVICTION:
                        continue

                old_w = current_weights.get(pair, 0.0)
                old_dir = "LONG" if old_w > 0 else ("SHORT" if old_w < 0 else None)
                new_dir = "LONG" if pred > 0 else "SHORT"
                reversing = old_dir is not None and old_dir != new_dir
                base_cost = COSTS.get(pair, 0.0005)
                eff_threshold = threshold + (base_cost * TURNOVER_COST_MULTIPLIER if reversing else 0.0)

                if abs(pred) >= eff_threshold:
                    active_for_rp.append(pair)
                    raw_signals[pair] = pred

            # Compute candidate signed weights via Risk Parity
            # Use realized spot vol (last SPOT_VOL_WINDOW months) as the denominator —
            # more stable than the model's own P&L history early in the backtest.
            candidate_weights: dict[str, float] = {}
            if active_for_rp:
                spot_vols: dict[str, float] = {}
                for p in active_for_rp:
                    if p in df_aligned.columns:
                        px = df_aligned[p].loc[:t_open].dropna()
                        if len(px) > SPOT_VOL_WINDOW:
                            rv = px.pct_change().dropna().iloc[-SPOT_VOL_WINDOW:]
                            if len(rv) >= SPOT_VOL_WINDOW:
                                spot_vols[p] = float(rv.std()) * np.sqrt(12)  # annualised
                rp_w = _risk_parity_weights(pair_return_history, active_for_rp, spot_vols=spot_vols)
                for pair in active_for_rp:
                    sign = 1.0 if raw_signals[pair] > 0 else -1.0
                    candidate_weights[pair] = sign * rp_w.get(pair, 1.0 / len(active_for_rp))

            # Apply hysteresis band: only execute if weight change >= threshold
            prev_weights = dict(current_weights)
            next_weights: dict[str, float] = {}

            all_pairs = set(list(fx_pairs))
            for pair in all_pairs:
                new_w = candidate_weights.get(pair, 0.0)
                old_w = prev_weights.get(pair, 0.0)
                if abs(new_w - old_w) >= hysteresis:
                    next_weights[pair] = new_w
                    executed_changes[pair] = (old_w, new_w)
                else:
                    next_weights[pair] = old_w  # carry forward — no cost

            current_weights = {p: w for p, w in next_weights.items() if abs(w) > 1e-10}
            if verbose and executed_changes:
                preds.extend(raw_signals[p] for p in executed_changes if p in raw_signals)

        if not current_weights:
            continue

        # ── Monthly P&L on currently held positions ───────────────────────────
        month_weighted_ret = 0.0

        for pair, w in current_weights.items():
            prices = df_aligned[pair]
            if t_open not in prices.index or t_close not in prices.index:
                pair_skip_count[pair] = pair_skip_count.get(pair, 0) + 1
                continue
            pair_trade_count[pair] = pair_trade_count.get(pair, 0) + 1

            entry  = prices.loc[t_open]
            exit_  = prices.loc[t_close]
            gross  = exit_ / entry - 1.0
            direction = "LONG" if w > 0 else "SHORT"
            if direction == "SHORT":
                gross = -gross

            # Transaction cost only when this position was actually changed
            cost_pct = 0.0
            if pair in executed_changes:
                old_w, new_w = executed_changes[pair]
                cost_pct = COSTS.get(pair, 0.0005)
                if np.sign(old_w) != np.sign(new_w) and old_w != 0.0:
                    cost_pct *= TURNOVER_COST_MULTIPLIER

            net = gross - cost_pct

            trades.append(Trade(
                open_date=t_open,
                close_date=t_close,
                pair=pair,
                direction=direction,
                predicted=raw_signals.get(pair, float("nan")),  # nan for carry-forward months
                actual=gross,
                gross_return_pct=gross,
                cost_pct=cost_pct,
                net_return_pct=net,
            ))

            pair_return_history[pair].append(net)
            month_weighted_ret += abs(w) * net

        monthly_pnl[t_close] = month_weighted_ret

    monthly_returns = pd.Series(monthly_pnl, dtype=float).sort_index()
    equity = (1 + monthly_returns).cumprod() if not monthly_returns.empty else pd.Series(dtype=float)

    if verbose:
        if preds:
            p = pd.Series(preds)
            _log(f"Predicción media: {p.mean():.4f} (std {p.std():.4f}, range [{p.min():.4f}, {p.max():.4f}])")
        _log(f"Periodos: {len(trades)}  |  Meses activos: {len(monthly_returns)}")
        # Per-pair activity summary — highlights cross pairs with low coverage
        _log("Actividad por par:")
        for pair in fx_pairs:
            n_t = pair_trade_count.get(pair, 0)
            n_s = pair_skip_count.get(pair, 0)
            total = n_t + n_s
            flag = "  [data gaps]" if n_s > 0 else ""
            _log(f"  {pair:<10} {n_t:>3} meses operados  {n_s:>3} saltados{flag}")

    return BacktestResult(trades=trades, equity=equity, monthly_returns=monthly_returns)


# ── Métricas ─────────────────────────────────────────────────────────────────

def _period_metrics(r: pd.Series, eq: pd.Series, label: str) -> dict:
    """Compute standard metrics for a sub-period. Returns dict with label prefix."""
    if r.empty or len(r) < 2:
        return {f"{label}_sharpe": None, f"{label}_sortino": None,
                f"{label}_max_dd_pct": None, f"{label}_ann_ret_pct": None,
                f"{label}_n_months": 0}

    total_ret = eq.iloc[-1] / eq.iloc[0] - 1.0
    ann_ret = (1 + total_ret) ** (12 / len(r)) - 1.0
    ann_vol = r.std() * np.sqrt(12)
    sharpe = ann_ret / ann_vol if ann_vol > 1e-12 else 0.0

    downside = r[r < 0]
    sortino = (
        ann_ret / (downside.std() * np.sqrt(12))
        if len(downside) > 1 and downside.std() > 1e-12
        else 0.0
    )

    peak = eq.cummax()
    mdd = ((eq - peak) / peak).min()

    return {
        f"{label}_n_months": int(len(r)),
        f"{label}_ann_ret_pct": round(ann_ret * 100, 2),
        f"{label}_sharpe": round(sharpe, 3),
        f"{label}_sortino": round(sortino, 3),
        f"{label}_max_dd_pct": round(mdd * 100, 2),
    }


def _deflated_sharpe(sr_hat: float, n: float, skew: float, kurt: float) -> float:
    """Probabilistic Sharpe Ratio vs SR*=0. Returns P(SR > 0)."""
    if n < 2:
        return float("nan")
    # Bailey & López de Prado (2014): PSR(SR*=0)
    sigma_sr = math.sqrt((1 - skew * sr_hat + (kurt - 1) / 4 * sr_hat ** 2) / (n - 1))
    if sigma_sr < 1e-12:
        return float("nan")
    z = sr_hat / sigma_sr
    return round(float(scipy_stats.norm.cdf(z)), 4)


def compute_metrics(result: BacktestResult) -> dict:
    r = result.monthly_returns.dropna()
    if r.empty or len(r) < 2:
        return {"status": "insufficient_data", "n_months": int(len(r)), "total_return_pct": 0.0}

    equity = result.equity

    # ── Métricas full-sample ──────────────────────────────────────────────────
    total_ret = equity.iloc[-1] - 1.0
    ann_ret = (1 + total_ret) ** (12 / len(r)) - 1.0
    ann_vol = r.std() * np.sqrt(12)
    sharpe = ann_ret / ann_vol if ann_vol > 1e-12 else 0.0

    downside = r[r < 0]
    sortino = ann_ret / (downside.std() * np.sqrt(12)) if len(downside) > 1 and downside.std() > 1e-12 else 0.0

    peak = equity.cummax()
    dd = (equity - peak) / peak
    mdd = dd.min()
    calmar = ann_ret / abs(mdd) if mdd < 0 else 0.0

    # Time underwater
    time_underwater_pct = round(float((dd < 0).mean() * 100), 1)

    # Distribution
    skew = float(r.skew())
    kurt = float(r.kurtosis() + 3)  # convert excess → full kurtosis

    # VaR / CVaR (95 %)
    var_95 = round(float(np.percentile(r, 5) * 100), 3)
    cvar_95 = round(float(r[r <= np.percentile(r, 5)].mean() * 100), 3)

    # Probabilistic Sharpe Ratio (vs SR*=0)
    sr_monthly = r.mean() / r.std() if r.std() > 1e-12 else 0.0
    psr = _deflated_sharpe(sr_monthly, len(r), skew, kurt)

    # ── IS / OOS split (70/30 aproximado) ────────────────────────────────────
    # Nota: betas calculadas full-sample → IS/OOS aquí es análisis de estabilidad,
    # no verdadero walk-forward. Se documenta explícitamente.
    split = max(2, int(len(r) * 0.70))
    r_is, r_oos = r.iloc[:split], r.iloc[split:]
    eq_is = (1 + r_is).cumprod()
    eq_oos_raw = (1 + r_oos).cumprod()
    eq_oos = eq_oos_raw / eq_oos_raw.iloc[0] * eq_is.iloc[-1] if not eq_oos_raw.empty else eq_oos_raw

    is_metrics = _period_metrics(r_is, eq_is, "is")
    oos_metrics = _period_metrics(r_oos, eq_oos, "oos")

    # ── IC — Information Coefficient ─────────────────────────────────────────
    trades = result.trades
    ic_monthly, ic_quarterly = None, None
    if trades:
        df_tr = pd.DataFrame([
            {"month": t.open_date.to_period("M"), "quarter": t.open_date.to_period("Q"),
             "predicted": t.predicted, "actual": t.actual}
            for t in trades
        ])
        # Drop carry-forward months (predicted=nan) — only use rebalance-date predictions
        df_tr = df_tr.dropna(subset=["predicted"])
        df_tr = df_tr[df_tr["predicted"].abs() > 1e-10]  # also drop exact zeros

        # Monthly IC: mean of per-month cross-sectional correlations
        monthly_ics = []
        for _, grp in df_tr.groupby("month"):
            if len(grp) >= 2 and grp["predicted"].std() > 1e-10 and grp["actual"].std() > 1e-10:
                c, _ = scipy_stats.pearsonr(grp["predicted"], grp["actual"])
                if np.isfinite(c):
                    monthly_ics.append(c)
        ic_monthly = round(float(np.mean(monthly_ics)), 4) if monthly_ics else None

        quarterly_ics = []
        for _, grp in df_tr.groupby("quarter"):
            if len(grp) >= 2 and grp["predicted"].std() > 1e-10 and grp["actual"].std() > 1e-10:
                c, _ = scipy_stats.pearsonr(grp["predicted"], grp["actual"])
                if np.isfinite(c):
                    quarterly_ics.append(c)
        ic_quarterly = round(float(np.mean(quarterly_ics)), 4) if quarterly_ics else None

    # ── Trades ───────────────────────────────────────────────────────────────
    wins_list = [t for t in trades if t.net_return_pct > 0]
    losses_list = [t for t in trades if t.net_return_pct < 0]
    trade_wr = len(wins_list) / len(trades) if trades else 0.0
    avg_trade = np.mean([t.net_return_pct for t in trades]) if trades else 0.0
    gross = sum(t.gross_return_pct for t in trades)
    costs = sum(t.cost_pct for t in trades)

    avg_win = np.mean([t.net_return_pct for t in wins_list]) * 100 if wins_list else 0.0
    avg_loss = np.mean([t.net_return_pct for t in losses_list]) * 100 if losses_list else 0.0
    gross_win = sum(t.net_return_pct for t in wins_list)
    gross_loss = abs(sum(t.net_return_pct for t in losses_list))
    profit_factor = round(gross_win / gross_loss, 3) if gross_loss > 1e-12 else None

    durations = [(t.close_date - t.open_date).days for t in trades if hasattr(t.close_date, "days") or True]
    try:
        avg_duration_days = round(float(np.mean(durations)), 1) if durations else None
    except Exception:
        avg_duration_days = None

    # ── Monthly heatmap data ──────────────────────────────────────────────────
    heatmap = []
    for date, ret in r.items():
        heatmap.append({"year": int(date.year), "month": int(date.month), "ret_pct": round(float(ret) * 100, 2)})

    # ── Attribution + IC por par ─────────────────────────────────────────────
    by_pair: dict[str, dict] = {}
    for t in trades:
        p = t.pair
        if p not in by_pair:
            by_pair[p] = {"n": 0, "wins": 0, "net_pct": 0.0, "_preds": [], "_actuals": []}
        by_pair[p]["n"] += 1
        by_pair[p]["net_pct"] = round(by_pair[p]["net_pct"] + t.net_return_pct * 100, 4)
        if t.net_return_pct > 0:
            by_pair[p]["wins"] += 1
        if np.isfinite(t.predicted) and abs(t.predicted) > 1e-10:
            by_pair[p]["_preds"].append(t.predicted)
            by_pair[p]["_actuals"].append(t.actual)

    attribution_by_pair = []
    for p, v in sorted(by_pair.items(), key=lambda x: -x[1]["net_pct"]):
        preds_p, acts_p = v.pop("_preds"), v.pop("_actuals")
        ic_p = None
        if len(preds_p) >= 4:
            pstd = float(np.std(preds_p))
            astd = float(np.std(acts_p))
            if pstd > 1e-10 and astd > 1e-10:
                c, _ = scipy_stats.pearsonr(preds_p, acts_p)
                ic_p = round(float(c), 4) if np.isfinite(c) else None
        dir_acc_p = round(
            float(np.mean([np.sign(pr) == np.sign(ac) for pr, ac in zip(preds_p, acts_p)]) * 100), 1
        ) if preds_p else None
        attribution_by_pair.append({
            "pair": p,
            **v,
            "win_rate_pct": round(v["wins"] / v["n"] * 100, 1),
            "ic": ic_p,
            "directional_acc_pct": dir_acc_p,
        })

    return {
        "status": "ok",
        "note_is_oos": "Betas calculadas full-sample. IS/OOS es análisis de estabilidad, no walk-forward puro.",
        # Full period
        "n_months": int(len(r)),
        "start_date": str(r.index[0].date()),
        "end_date": str(r.index[-1].date()),
        "total_return_pct": round(total_ret * 100, 2),
        "annualized_return_pct": round(ann_ret * 100, 2),
        "annualized_vol_pct": round(ann_vol * 100, 2),
        "sharpe": round(sharpe, 3),
        "sortino": round(sortino, 3),
        "max_drawdown_pct": round(mdd * 100, 2),
        "calmar": round(calmar, 3),
        "time_underwater_pct": time_underwater_pct,
        # Distribution
        "skew": round(skew, 3),
        "kurtosis": round(kurt, 3),
        "var_95_pct": var_95,
        "cvar_95_pct": cvar_95,
        # Statistical quality
        "probabilistic_sharpe_ratio": psr,
        "ic_monthly": ic_monthly,
        "ic_quarterly": ic_quarterly,
        # IS / OOS
        **is_metrics,
        **oos_metrics,
        # Trades
        "monthly_win_rate": round(trade_wr * 100, 1),
        "n_trades": len(trades),
        "trade_win_rate": round(trade_wr * 100, 1),
        "avg_trade_return_pct": round(avg_trade * 100, 3),
        "avg_win_pct": round(avg_win, 3),
        "avg_loss_pct": round(avg_loss, 3),
        "profit_factor": profit_factor,
        "avg_trade_duration_days": avg_duration_days,
        "gross_pnl_pct": round(gross * 100, 2),
        "total_cost_pct": round(costs * 100, 2),
        "net_pnl_pct": round((gross - costs) * 100, 2),
        # Data for charts
        "monthly_heatmap": heatmap,
        "attribution_by_pair": attribution_by_pair,
    }


# ── Persistencia ─────────────────────────────────────────────────────────────

def save_backtest(
    result: BacktestResult,
    run_path: Path | str,
    metrics: dict,
    verbose: bool = True,
) -> None:
    run_path = Path(run_path)
    run_path.mkdir(parents=True, exist_ok=True)

    if not result.equity.empty:
        pd.DataFrame({"date": result.equity.index, "equity": result.equity.values}).to_csv(
            run_path / "backtest_equity.csv", index=False
        )

    if result.trades:
        pd.DataFrame([
            {
                "open_date": t.open_date,
                "close_date": t.close_date,
                "pair": t.pair,
                "direction": t.direction,
                "predicted": t.predicted,
                "actual": t.actual,
                "gross_return_pct": t.gross_return_pct,
                "cost_pct": t.cost_pct,
                "net_return_pct": t.net_return_pct,
            }
            for t in result.trades
        ]).to_csv(run_path / "backtest_trades.csv", index=False)

    with open(run_path / "backtest_metrics.json", "w", encoding="utf-8") as f:
        json.dump(metrics, f, indent=2, default=str)

    def _f(key, fmt=".2f", suffix=" %", default=0):
        v = metrics.get(key, default)
        return f"{v:{fmt}}{suffix}" if v is not None else "—"

    lines = [
        "=" * 72,
        "POLARIS BACKTEST REPORT — Capa 1 FX Macro G10",
        "=" * 72,
        "",
        f"Period:        {metrics.get('start_date', '-')} to {metrics.get('end_date', '-')}",
        f"Months:        {metrics.get('n_months', 0)}  |  Trades: {metrics.get('n_trades', 0)}",
        "",
        "RETURNS",
        f"  Total return:        {_f('total_return_pct')}",
        f"  Annualized return:   {_f('annualized_return_pct')}",
        f"  Annualized vol:      {_f('annualized_vol_pct')}",
        "",
        "RISK-ADJUSTED",
        f"  Sharpe:              {_f('sharpe', '.3f', '')}",
        f"  Sortino:             {_f('sortino', '.3f', '')}",
        f"  Max Drawdown:        {_f('max_drawdown_pct')}",
        f"  Calmar:              {_f('calmar', '.3f', '')}",
        f"  Time underwater:     {_f('time_underwater_pct')}",
        "",
        "DISTRIBUTION",
        f"  Skew:                {_f('skew', '.3f', '')}",
        f"  Kurtosis:            {_f('kurtosis', '.3f', '')}",
        f"  VaR 95%:             {_f('var_95_pct')}",
        f"  CVaR 95%:            {_f('cvar_95_pct')}",
        "",
        "STATISTICAL QUALITY",
        f"  Probabilistic SR:    {_f('probabilistic_sharpe_ratio', '.4f', '')}  (P[SR>0])",
        f"  IC mensual:          {_f('ic_monthly', '.4f', '')}",
        f"  IC trimestral:       {_f('ic_quarterly', '.4f', '')}",
        "",
        "IS / OOS (70 / 30 — betas full-sample, análisis de estabilidad)",
        f"  IS  ({metrics.get('is_n_months', 0)}m):  Sharpe {_f('is_sharpe', '.3f', '')}  |  MaxDD {_f('is_max_dd_pct')}  |  AnnRet {_f('is_ann_ret_pct')}",
        f"  OOS ({metrics.get('oos_n_months', 0)}m): Sharpe {_f('oos_sharpe', '.3f', '')}  |  MaxDD {_f('oos_max_dd_pct')}  |  AnnRet {_f('oos_ann_ret_pct')}",
        "",
        "TRADES",
        f"  Trade win rate:      {_f('trade_win_rate', '.1f')}",
        f"  Avg trade return:    {_f('avg_trade_return_pct', '.3f')}",
        f"  Avg win / loss:      {_f('avg_win_pct', '.3f')} / {_f('avg_loss_pct', '.3f')}",
        f"  Profit factor:       {_f('profit_factor', '.3f', '')}",
        f"  Avg duration:        {_f('avg_trade_duration_days', '.1f', ' days')}",
        "",
        "COSTS",
        f"  Gross P&L:           {_f('gross_pnl_pct')}",
        f"  Total costs:         {_f('total_cost_pct')}",
        f"  Net P&L:             {_f('net_pnl_pct')}",
        "",
        "IC POR PAR  (señal direccional — usar como bias macro)",
        "  Pair       IC      Dir.Acc   WinRate   Net P&L",
        "  " + "-" * 54,
    ] + [
        "  {:<10} {:>6}  {:>7}   {:>7}   {:>8}".format(
            row["pair"],
            f"{row['ic']:.4f}" if row["ic"] is not None else "  n/a ",
            f"{row['directional_acc_pct']:.1f} %" if row["directional_acc_pct"] is not None else "  n/a",
            f"{row['win_rate_pct']:.1f} %",
            f"{row['net_pct']:.2f} %",
        )
        for row in sorted(
            metrics.get("attribution_by_pair", []),
            key=lambda x: (x["ic"] or -99),
            reverse=True,
        )
    ] + [
        "",
        "=" * 72,
    ]
    report_path = run_path / "backtest_report.txt"
    report_path.write_text("\n".join(lines), encoding="utf-8")

    if verbose:
        _log(f"Backtest saved: {run_path}")
        for line in lines:
            print(line)


# ── Entry point ──────────────────────────────────────────────────────────────

def run_backtest(
    df_aligned: pd.DataFrame,
    df_trans: pd.DataFrame,
    beta_static: pd.DataFrame,
    run_path: Path | str,
    fx_pairs: list[str] = FX_PAIRS,
    rolling_betas: dict | None = None,
    kalman_betas: dict | None = None,
    kalman_weight: float = 0.5,
    rebalance_freq: int = REBALANCE_FREQ,
    hysteresis: float = HYSTERESIS_THRESHOLD,
    min_indicators: int = MIN_INDICATORS,
    verbose: bool = True,
) -> BacktestResult:
    if verbose:
        print("\n-- Phase 7 / Backtest ----------------------------------------------")
        print(f"  Strategy: Capa 1 FX Macro G10 — {rebalance_freq}-month rebalance")
        if rolling_betas and kalman_betas:
            mode = f"rolling+Kalman blend (w_kalman={kalman_weight:.1f})"
        elif kalman_betas:
            mode = "Kalman walk-forward"
        elif rolling_betas:
            mode = "rolling walk-forward"
        else:
            mode = "static full-sample"
        print(f"  Beta mode: {mode}")
        print(f"  Weighting: Risk Parity (inverse-vol)")
        print(f"  Hysteresis band: {hysteresis * 100:.1f}%")
        print(f"  Min indicators:  {min_indicators} valid betas required to trade a pair")
        print(f"  Costs:     half-turn spread + turnover penalty on reversals")

    result = simulate(
        df_aligned=df_aligned,
        df_trans=df_trans,
        beta_static=beta_static,
        fx_pairs=fx_pairs,
        rolling_betas=rolling_betas,
        kalman_betas=kalman_betas,
        kalman_weight=kalman_weight,
        rebalance_freq=rebalance_freq,
        hysteresis=hysteresis,
        min_indicators=min_indicators,
        verbose=verbose,
    )
    metrics = compute_metrics(result)
    save_backtest(result, run_path, metrics, verbose=verbose)
    result.metrics = metrics
    return result
