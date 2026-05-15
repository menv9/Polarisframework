"""CSV, Excel, report, and chart exports for beta runs."""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from config import FX_PAIRS, OUTPUT_DIR, ROLLING_WIN


COLORS = {
    "positive": "#22c55e",
    "negative": "#ef4444",
    "neutral": "#94a3b8",
    "accent": "#6366f1",
    "highlight": "#f59e0b",
    "bg": "#0f172a",
    "panel": "#1e293b",
    "text": "#e2e8f0",
    "grid": "#334155",
}


def _ensure_output(run_id: str, output_dir: Path | str = OUTPUT_DIR) -> Path:
    path = Path(output_dir) / run_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _style() -> None:
    plt.rcParams.update(
        {
            "figure.facecolor": COLORS["bg"],
            "axes.facecolor": COLORS["panel"],
            "axes.edgecolor": COLORS["grid"],
            "axes.labelcolor": COLORS["text"],
            "axes.titlecolor": COLORS["text"],
            "xtick.color": COLORS["neutral"],
            "ytick.color": COLORS["neutral"],
            "grid.color": COLORS["grid"],
            "text.color": COLORS["text"],
            "font.family": "DejaVu Sans",
        }
    )


# Reverse of pairBetas.js PREFIX_MAP: pipeline prefix → app prefix
_PIPELINE_TO_APP_PREFIX: dict[str, str] = {"cad": "can"}

# Reverse of pairBetas.js KEY_MAP + nfp special case: pipeline suffix → app key
_PIPELINE_TO_APP_KEY: dict[str, str] = {
    "debt_gdp": "debt",
    "ca":       "ca_gdp",
    "conf":     "umcsi",
    "unempl":   "nfp",
}

_KNOWN_PREFIXES = {"usa", "eur", "gbr", "jpn", "aus", "nzl", "cad", "che", "swe", "nor"}


def _pipeline_col_to_app_key(col: str) -> str | None:
    """'endo_cad_debt_gdp' → 'can_debt', 'endo_eur_unempl' → 'eur_nfp', etc."""
    if not col.startswith("endo_"):
        return None
    rest = col[5:]
    for prefix in _KNOWN_PREFIXES:
        if rest.startswith(prefix + "_"):
            pipeline_key = rest[len(prefix) + 1:]
            app_prefix = _PIPELINE_TO_APP_PREFIX.get(prefix, prefix)
            app_key = _PIPELINE_TO_APP_KEY.get(pipeline_key, pipeline_key)
            return f"{app_prefix}_{app_key}"
    return None


def save_endogenous_history(run_path: Path, df_aligned: pd.DataFrame) -> None:
    """Export aligned monthly series as endogenous_history.json for direct app import.

    The JSON matches the polaris_endogenous_history localStorage structure so the
    app can load it via the PIPELINE JSON button in Model Inputs.
    """
    endo_cols = [c for c in df_aligned.columns if c.startswith("endo_")]
    history: dict = {}
    today = datetime.now().isoformat(timespec="seconds")

    for col in endo_cols:
        app_key = _pipeline_col_to_app_key(col)
        if not app_key:
            continue
        series = df_aligned[col].dropna()
        if len(series) < 12:
            continue
        history[app_key] = {
            "series": [
                {"date": idx.strftime("%Y-%m"), "value": round(float(v), 6)}
                for idx, v in series.items()
            ],
            "lastImported": today,
        }

    import json as _json
    out = run_path / "endogenous_history.json"
    with out.open("w", encoding="utf-8") as f:
        _json.dump(history, f, separators=(",", ":"))
    print(f"  Exported {len(history)} endogenous series -> endogenous_history.json")


def save_tables(
    run_path: Path,
    beta_static: pd.DataFrame,
    pivot: pd.DataFrame,
    regime_flags: pd.DataFrame,
    rolling_betas: dict[str, pd.DataFrame],
    df_aligned: pd.DataFrame | None = None,
    df_trans: pd.DataFrame | None = None,
    coverage: pd.Series | None = None,
) -> None:
    beta_static.to_csv(run_path / "beta_matrix_full.csv", index=False)

    # App-specific filtered matrix: only endo_ indicators, columns the app reads.
    # Import this file (beta_matrix_app.csv) in the Polaris app instead of the full one.
    _app_cols = ["fx_pair", "indicator", "beta", "r2", "p_value", "significant"]
    beta_static[beta_static["indicator"].str.startswith("endo_")][_app_cols].to_csv(
        run_path / "beta_matrix_app.csv", index=False
    )

    pivot.to_csv(run_path / "beta_matrix_pivot.csv")
    regime_flags.to_csv(run_path / "regime_flags.csv", index=False)

    if df_aligned is not None:
        df_aligned.to_csv(run_path / "aligned_monthly.csv")
        save_endogenous_history(run_path, df_aligned)
    if df_trans is not None:
        df_trans.to_csv(run_path / "transformed_monthly.csv")
    if coverage is not None:
        coverage.rename("coverage").to_csv(run_path / "coverage.csv")

    rolling_dir = run_path / "rolling"
    rolling_dir.mkdir(exist_ok=True)
    for fx, frame in rolling_betas.items():
        frame.to_csv(rolling_dir / f"rolling_beta_{fx}.csv")

    with pd.ExcelWriter(run_path / "beta_outputs.xlsx", engine="openpyxl") as writer:
        beta_static.to_excel(writer, sheet_name="beta_full", index=False)
        pivot.to_excel(writer, sheet_name="pivot")
        regime_flags.to_excel(writer, sheet_name="regime_flags", index=False)
        if coverage is not None:
            coverage.rename("coverage").to_excel(writer, sheet_name="coverage")


def plot_beta_heatmap(pivot: pd.DataFrame, run_path: Path) -> None:
    _style()
    data = pivot.dropna(how="all")
    if data.empty:
        return

    values = data.fillna(0)
    nonzero = values.to_numpy()[values.to_numpy() != 0]
    vmax = float(np.nanpercentile(np.abs(nonzero), 90)) if len(nonzero) else 1.0
    vmax = max(vmax, 0.1)

    fig_w = max(10, len(values.columns) * 1.35 + 2)
    fig_h = max(8, len(values.index) * 0.32)
    fig, ax = plt.subplots(figsize=(fig_w, fig_h))
    image = ax.imshow(values, cmap="RdYlGn", vmin=-vmax, vmax=vmax, aspect="auto")

    ax.set_xticks(range(len(values.columns)), values.columns, rotation=35, ha="right", fontsize=8)
    ax.set_yticks(range(len(values.index)), values.index, fontsize=7)
    ax.set_title("Beta matrix - significant relationships (p < 0.05)", pad=14, fontweight="bold")
    ax.set_xlabel("FX pair")
    ax.set_ylabel("Indicator")
    ax.grid(False)

    for row_idx in range(values.shape[0]):
        for col_idx in range(values.shape[1]):
            val = values.iloc[row_idx, col_idx]
            if val != 0:
                ax.text(col_idx, row_idx, f"{val:.2f}", ha="center", va="center", fontsize=6, color="#0f172a")

    cbar = fig.colorbar(image, ax=ax, fraction=0.025, pad=0.02)
    cbar.set_label("Beta")
    plt.tight_layout()
    fig.savefig(run_path / "beta_heatmap.png", dpi=150, bbox_inches="tight", facecolor=COLORS["bg"])
    plt.close(fig)


def plot_top_drivers(beta_static: pd.DataFrame, run_path: Path, fx_pairs: list[str], n: int = 12) -> None:
    _style()
    if beta_static.empty:
        return
    available = [fx for fx in fx_pairs if fx in set(beta_static["fx_pair"])]
    if not available:
        return

    cols = min(2, len(available))
    rows = int(np.ceil(len(available) / cols))
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 8, rows * 4.8))
    axes_flat = np.array(axes).reshape(-1) if isinstance(axes, np.ndarray) else np.array([axes])

    for idx, fx in enumerate(available):
        ax = axes_flat[idx]
        sub = beta_static[(beta_static["fx_pair"] == fx) & (beta_static["significant"])].copy()
        if sub.empty:
            ax.set_visible(False)
            continue
        sub["abs_beta"] = sub["beta"].abs()
        top = sub.nlargest(n, "abs_beta").sort_values("abs_beta")
        bar_colors = [COLORS["positive"] if beta > 0 else COLORS["negative"] for beta in top["beta"]]
        ax.barh(top["indicator"], top["beta"], color=bar_colors)
        ax.axvline(0, color=COLORS["neutral"], linewidth=0.8)
        ax.set_title(f"Top drivers - {fx.upper()}", fontweight="bold")
        ax.set_xlabel("Beta")
        ax.tick_params(labelsize=7)
        ax.grid(axis="x", alpha=0.25)

    for idx in range(len(available), len(axes_flat)):
        axes_flat[idx].set_visible(False)

    plt.tight_layout()
    fig.savefig(run_path / "top_drivers.png", dpi=150, bbox_inches="tight", facecolor=COLORS["bg"])
    plt.close(fig)


def plot_rolling_overview(
    rolling_betas: dict[str, pd.DataFrame],
    beta_static: pd.DataFrame,
    regime_flags: pd.DataFrame,
    run_path: Path,
    fx_pairs: list[str],
    top_n: int = 3,
) -> None:
    _style()
    rolling_dir = run_path / "rolling_plots"
    rolling_dir.mkdir(exist_ok=True)

    for fx in [fx for fx in fx_pairs if fx in rolling_betas]:
        rb_df = rolling_betas[fx]
        top_indicators = (
            beta_static[(beta_static["fx_pair"] == fx) & (beta_static["significant"])]
            .nlargest(top_n, "r2")["indicator"]
            .tolist()
        )
        top_indicators = [name for name in top_indicators if name in rb_df.columns]
        if not top_indicators:
            continue

        fig, axes = plt.subplots(len(top_indicators), 1, figsize=(13, len(top_indicators) * 3.2), sharex=True)
        axes_list = axes if isinstance(axes, np.ndarray) else [axes]

        for ax, indicator in zip(axes_list, top_indicators):
            series = rb_df[indicator].dropna()
            row = beta_static[(beta_static["fx_pair"] == fx) & (beta_static["indicator"] == indicator)]
            beta_ref = float(row["beta"].iloc[0]) if not row.empty else np.nan
            flagged = (
                not regime_flags.empty
                and ((regime_flags["fx_pair"] == fx) & (regime_flags["indicator"] == indicator)).any()
            )
            ax.plot(series.index, series.values, color=COLORS["accent"], linewidth=1.5, label=f"Rolling {ROLLING_WIN}m")
            if not np.isnan(beta_ref):
                ax.axhline(beta_ref, color=COLORS["highlight"], linestyle="--", linewidth=1.1, label=f"Static {beta_ref:.3f}")
            ax.axhline(0, color=COLORS["neutral"], linewidth=0.6)
            ax.set_ylabel(f"{indicator}{' *' if flagged else ''}", fontsize=8)
            ax.grid(alpha=0.2)
            ax.legend(fontsize=7)

        fig.suptitle(f"Rolling beta - {fx.upper()}", fontweight="bold")
        plt.tight_layout()
        fig.savefig(rolling_dir / f"rolling_{fx}.png", dpi=150, bbox_inches="tight", facecolor=COLORS["bg"])
        plt.close(fig)


def save_metadata(run_path: Path, metadata: dict) -> None:
    with (run_path / "metadata.json").open("w", encoding="utf-8") as file:
        json.dump(metadata, file, indent=2, default=str)


def save_report(
    run_path: Path,
    beta_static: pd.DataFrame,
    regime_flags: pd.DataFrame,
    fetch_report: dict,
    fx_pairs: list[str],
    run_id: str,
) -> None:
    lines = [
        "POLARIS BETA PIPELINE - RUN REPORT",
        f"Run ID: {run_id}",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        "",
        "Sources: FRED API + Yahoo Finance + World Bank. Paid/manual-only sources excluded.",
        "App import file: beta_matrix_app.csv (endo_ indicators only, all pairs)",
        f"FRED downloaded: {len(fetch_report.get('fred_ok', []))}",
        f"Yahoo downloaded: {len(fetch_report.get('yahoo_ok', []))}",
        f"World Bank downloaded: {len(fetch_report.get('wb_ok', []))}",
        f"Total raw series: {fetch_report.get('total_series', 0)}",
        "",
        "Static beta",
        f"Regressions: {len(beta_static)}",
        f"Significant p<0.05: {int(beta_static['significant'].sum()) if not beta_static.empty else 0}",
        f"Strong p<0.05 and R2>0.15: {int(beta_static['strong'].sum()) if not beta_static.empty else 0}",
        "",
        "Regime flags",
        f"Changes detected: {len(regime_flags)}",
        f"Sign flips: {int(regime_flags['sign_flip'].sum()) if not regime_flags.empty else 0}",
        "",
    ]

    for fx in fx_pairs:
        if beta_static.empty:
            continue
        top = (
            beta_static[(beta_static["fx_pair"] == fx) & (beta_static["significant"])]
            .assign(abs_beta=lambda frame: frame["beta"].abs())
            .nlargest(5, "abs_beta")
        )
        if top.empty:
            continue
        lines.append(f"Top drivers - {fx.upper()}")
        for _, row in top.iterrows():
            marker = ""
            if not regime_flags.empty:
                mask = (regime_flags["fx_pair"] == fx) & (regime_flags["indicator"] == row["indicator"])
                marker = " regime" if mask.any() else ""
            lines.append(f"  {row['indicator']:<30} beta={row['beta']:+.4f} R2={row['r2']:.3f}{marker}")
        lines.append("")

    text = "\n".join(lines)
    (run_path / "report.txt").write_text(text, encoding="utf-8")
    print(text)


def save_all(
    beta_static: pd.DataFrame,
    pivot: pd.DataFrame,
    regime_flags: pd.DataFrame,
    rolling_betas: dict[str, pd.DataFrame],
    fetch_report: dict,
    run_id: str,
    df_aligned: pd.DataFrame | None = None,
    df_trans: pd.DataFrame | None = None,
    coverage: pd.Series | None = None,
    metadata: dict | None = None,
    fx_pairs: list[str] | None = None,
    output_dir: Path | str = OUTPUT_DIR,
    skip_plots: bool = False,
) -> Path:
    print("\n-- Phase 6 / Output ------------------------------------------------")
    active_fx = fx_pairs or FX_PAIRS
    run_path = _ensure_output(run_id, output_dir)

    save_tables(run_path, beta_static, pivot, regime_flags, rolling_betas, df_aligned, df_trans, coverage)
    if not skip_plots:
        plot_beta_heatmap(pivot, run_path)
        plot_top_drivers(beta_static, run_path, active_fx)
        plot_rolling_overview(rolling_betas, beta_static, regime_flags, run_path, active_fx)
    save_report(run_path, beta_static, regime_flags, fetch_report, active_fx, run_id)
    save_metadata(run_path, metadata or {})

    print(f"  Output directory: {run_path}")
    return run_path
