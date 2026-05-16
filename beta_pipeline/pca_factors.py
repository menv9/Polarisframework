"""PCA macro factor decomposition.

Groups correlated macro indicators into 3-4 orthogonal components to
reduce multicollinearity before beta regression.

Component definition (economic interpretation):
  PC1 — Risk Sentiment    (VIX, HY OAS, EMBI, IG OAS)
  PC2 — Monetary Policy   (policy rates, real yields, breakevens)
  PC3 — Growth/Commodities (Brent, Copper, China PMI, GDP)
  PC4 — Residual           (everything else with >5% explained variance)
"""
from __future__ import annotations

import numpy as np
import pandas as pd

# Groups of series prefixes / substrings for labelling
_RISK_KEYS    = ("wv_vix", "wv_hy_oas", "wv_ig_oas", "wv_embi", "exo_embi")
_POLICY_KEYS  = ("policy", "real_2y", "10y_real", "wv_breakevens", "exo_term_premium")
_GROWTH_KEYS  = ("exo_brent", "exo_wti", "exo_copper", "exo_chn_pmi", "wv_gdp")

_COMPONENT_LABELS = ["PC_Risk", "PC_Policy", "PC_Growth", "PC_Residual"]

# Anchor columns: the sign of each component is flipped if the correlation
# with its anchor is negative (SVD sign is arbitrary).
# PC_Risk   → VIX proxy: high loading = risk-OFF (score should rise with fear)
# PC_Policy → policy rate proxy: high loading = tighter policy
# PC_Growth → Brent proxy: high loading = expansion
# If an anchor column is absent, no sign correction is applied.
_SIGN_ANCHORS = {
    "PC_Risk":    ("wv_vix",    +1),   # higher VIX → higher PC_Risk score
    "PC_Policy":  ("policy",    +1),   # higher rates → higher PC_Policy
    "PC_Growth":  ("exo_brent", +1),   # higher Brent → higher PC_Growth
}


def _log(msg: str) -> None:
    print(f"  {msg}")


def _standardise(df: pd.DataFrame) -> pd.DataFrame:
    mu  = df.mean()
    std = df.std().replace(0, 1)
    return (df - mu) / std


def compute_pca(
    df_trans: pd.DataFrame,
    fx_pairs: list[str],
    n_components: int = 4,
    min_coverage: float = 0.50,
    verbose: bool = True,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Run PCA on macro indicators (non-FX columns).

    Returns:
        scores      — DataFrame(index=dates, columns=PC_Risk...) with factor scores
        loadings    — DataFrame(index=indicators, columns=PC labels) with loadings
    """
    print("\n-- PCA / Orthogonal factors ----------------------------------------")

    # Drop FX columns
    macro_cols = [c for c in df_trans.columns if c not in fx_pairs]
    df_macro = df_trans[macro_cols].copy()

    # Keep only columns with enough non-NaN data
    coverage = df_macro.notna().mean()
    df_macro = df_macro.loc[:, coverage >= min_coverage]
    if df_macro.shape[1] < n_components:
        if verbose:
            _log(f"Too few columns ({df_macro.shape[1]}) for PCA — skipping")
        return pd.DataFrame(), pd.DataFrame()

    # Fill NaN with column mean, then standardise
    df_filled = df_macro.fillna(df_macro.mean())
    df_std    = _standardise(df_filled)

    # SVD-based PCA (no sklearn required)
    X = df_std.to_numpy(dtype=float)
    U, S, Vt = np.linalg.svd(X, full_matrices=False)
    n_comp = min(n_components, len(S))

    # Scores (observations × components)
    scores_arr = U[:, :n_comp] * S[:n_comp]
    # Loadings (variables × components)
    loadings_arr = Vt[:n_comp].T        # shape: (n_vars, n_comp)

    labels = _COMPONENT_LABELS[:n_comp]
    scores   = pd.DataFrame(scores_arr,   index=df_std.index,   columns=labels)
    loadings = pd.DataFrame(loadings_arr, index=df_macro.columns, columns=labels)

    # ── Sign correction: flip components whose anchor correlation is wrong ────
    for label, (anchor_col, expected_sign) in _SIGN_ANCHORS.items():
        if label not in scores.columns:
            continue
        # Find anchor column by substring match (handles prefixed variants)
        matches = [c for c in df_macro.columns if anchor_col in c]
        if not matches:
            continue
        anchor_series = df_filled[matches[0]].to_numpy(dtype=float)
        pc_series     = scores[label].to_numpy(dtype=float)
        corr = float(np.corrcoef(anchor_series, pc_series)[0, 1])
        if np.isnan(corr):
            continue
        if np.sign(corr) != np.sign(expected_sign):
            scores[label]   *= -1
            loadings[label] *= -1
            if verbose:
                _log(f"{label}: sign flipped (corr with '{matches[0]}' was {corr:.2f})")

    # Explained variance
    explained = (S[:n_comp] ** 2) / (S ** 2).sum()

    if verbose:
        for i, (lab, ev) in enumerate(zip(labels, explained)):
            top3 = loadings[lab].abs().nlargest(3).index.tolist()
            _log(f"{lab}: {ev:.1%} variance — top drivers: {top3}")

    return scores, loadings


def augment_with_pca(
    df_trans: pd.DataFrame,
    fx_pairs: list[str],
    n_components: int = 4,
    verbose: bool = True,
) -> pd.DataFrame:
    """Return df_trans augmented with PCA factor scores as extra columns.

    The original macro columns are kept; PCA factors are added as PC_Risk etc.
    This lets the regression use both raw and orthogonalised predictors.
    """
    scores, loadings = compute_pca(df_trans, fx_pairs, n_components=n_components, verbose=verbose)
    if scores.empty:
        return df_trans
    return pd.concat([df_trans, scores], axis=1)
