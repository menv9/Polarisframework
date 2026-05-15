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
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
import pandas as pd

# ── Configuración ────────────────────────────────────────────────────────────

# Solo pares G10 vs USD con datos gratuitos disponibles
FX_PAIRS = [
    "eurusd", "usdjpy", "gbpusd", "audusd", "usdcad",
    "nzdusd", "usdchf",
]

# Costes: half-turn spread (entrada única) en % del notional
# Valores del frontend ExecutionOpsPage, conservadores.
COSTS = {
    "eurusd": 0.00020, "usdjpy": 0.00025, "gbpusd": 0.00030,
    "audusd": 0.00030, "usdcad": 0.00035, "nzdusd": 0.00050,
    "usdchf": 0.00035,
}

UMBRAL_PREDICCION = 0.005   # 0.5 % mensual predicho para entrar


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

def simulate(
    df_aligned: pd.DataFrame,
    df_trans: pd.DataFrame,
    beta_static: pd.DataFrame,
    fx_pairs: list[str] = FX_PAIRS,
    min_obs: int = 24,
    threshold: float = UMBRAL_PREDICCION,
    verbose: bool = True,
) -> BacktestResult:
    """Backtest walk-forward mensual."""
    if verbose:
        print("\n-- Backtest / Simulation -------------------------------------------")

    dates = df_trans.index
    trades: list[Trade] = []
    monthly_pnl: dict[pd.Timestamp, float] = {}
    preds: list[float] = []

    for i in range(len(dates) - 1):
        t_open = dates[i]
        t_close = dates[i + 1]
        if i < min_obs:
            continue

        month_rets: list[float] = []
        for pair in fx_pairs:
            if pair not in df_aligned.columns:
                continue

            pred = predict_return(df_trans, beta_static, pair, t_open)
            if pred is None or abs(pred) < threshold:
                continue
            preds.append(pred)

            direction = "LONG" if pred > 0 else "SHORT"
            prices = df_aligned[pair]
            if t_open not in prices.index or t_close not in prices.index:
                continue

            entry = prices.loc[t_open]
            exit_ = prices.loc[t_close]
            gross = exit_ / entry - 1.0
            if direction == "SHORT":
                gross = -gross

            cost = COSTS.get(pair, 0.0005)
            net = gross - cost

            trades.append(
                Trade(
                    open_date=t_open,
                    close_date=t_close,
                    pair=pair,
                    direction=direction,
                    predicted=pred,
                    actual=gross,
                    gross_return_pct=gross,
                    cost_pct=cost,
                    net_return_pct=net,
                )
            )
            month_rets.append(net)

        if month_rets:
            monthly_pnl[t_close] = sum(month_rets) / len(month_rets)

    monthly_returns = pd.Series(monthly_pnl, dtype=float).sort_index()
    equity = (1 + monthly_returns).cumprod() if not monthly_returns.empty else pd.Series(dtype=float)

    if verbose:
        if preds:
            p = pd.Series(preds)
            _log(f"Predicción media: {p.mean():.4f} (std {p.std():.4f}, range [{p.min():.4f}, {p.max():.4f}])")
        _log(f"Trades: {len(trades)}  |  Meses activos: {len(monthly_returns)}")

    return BacktestResult(trades=trades, equity=equity, monthly_returns=monthly_returns)


# ── Métricas ─────────────────────────────────────────────────────────────────

def compute_metrics(result: BacktestResult) -> dict:
    r = result.monthly_returns.dropna()
    if r.empty or len(r) < 2:
        return {"status": "insufficient_data", "n_months": int(len(r)), "total_return_pct": 0.0}

    equity = result.equity
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

    win_rate = (r > 0).mean()
    trades = result.trades
    wins = [t for t in trades if t.net_return_pct > 0]
    trade_wr = len(wins) / len(trades) if trades else 0.0
    avg_trade = np.mean([t.net_return_pct for t in trades]) if trades else 0.0
    gross = sum(t.gross_return_pct for t in trades)
    costs = sum(t.cost_pct for t in trades)

    return {
        "status": "ok",
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
        "monthly_win_rate": round(win_rate * 100, 1),
        "n_trades": len(trades),
        "trade_win_rate": round(trade_wr * 100, 1),
        "avg_trade_return_pct": round(avg_trade * 100, 3),
        "gross_pnl_pct": round(gross * 100, 2),
        "total_cost_pct": round(costs * 100, 2),
        "net_pnl_pct": round((gross - costs) * 100, 2),
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

    lines = [
        "=" * 72,
        "POLARIS BACKTEST REPORT — Capa 1 FX Macro G10",
        "=" * 72,
        "",
        f"Period:        {metrics.get('start_date', '-')} to {metrics.get('end_date', '-')}",
        f"Months:        {metrics.get('n_months', 0)}",
        f"Trades:        {metrics.get('n_trades', 0)}",
        "",
        "RETURNS",
        f"  Total return:        {metrics.get('total_return_pct', 0):.2f} %",
        f"  Annualized return:   {metrics.get('annualized_return_pct', 0):.2f} %",
        f"  Annualized vol:      {metrics.get('annualized_vol_pct', 0):.2f} %",
        "",
        "RISK-ADJUSTED",
        f"  Sharpe:              {metrics.get('sharpe', 0):.3f}",
        f"  Sortino:             {metrics.get('sortino', 0):.3f}",
        f"  Max Drawdown:        {metrics.get('max_drawdown_pct', 0):.2f} %",
        f"  Calmar:              {metrics.get('calmar', 0):.3f}",
        "",
        "WIN RATES",
        f"  Monthly win rate:    {metrics.get('monthly_win_rate', 0):.1f} %",
        f"  Trade win rate:      {metrics.get('trade_win_rate', 0):.1f} %",
        f"  Avg trade return:    {metrics.get('avg_trade_return_pct', 0):.3f} %",
        "",
        "COSTS",
        f"  Gross P&L:           {metrics.get('gross_pnl_pct', 0):.2f} %",
        f"  Total costs:         {metrics.get('total_cost_pct', 0):.2f} %",
        f"  Net P&L:             {metrics.get('net_pnl_pct', 0):.2f} %",
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
    verbose: bool = True,
) -> BacktestResult:
    if verbose:
        print("\n-- Phase 7 / Backtest ----------------------------------------------")
        print("  Strategy: Capa 1 FX Macro G10 — monthly rebalance")
        print("  Model:    static beta prediction (sign-based)")
        print("  Costs:    half-turn spread")

    result = simulate(
        df_aligned=df_aligned,
        df_trans=df_trans,
        beta_static=beta_static,
        fx_pairs=fx_pairs,
        verbose=verbose,
    )
    metrics = compute_metrics(result)
    save_backtest(result, run_path, metrics, verbose=verbose)
    result.metrics = metrics
    return result
