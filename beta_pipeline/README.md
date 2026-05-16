# Polaris Beta Pipeline

Executable beta calibration workflow based on `Documentation/05_Implementacion/beta_workflow.md`.

Enabled sources:

- FRED API, using `FRED_API_KEY` from the project `.env` or the environment.
- Yahoo Finance, using `yfinance`.

Paid or manual-only sources from the documentation are deliberately excluded.

## Install dependencies

```powershell
python -m pip install -r beta_pipeline\requirements.txt
```

## Run

Full run:

```powershell
python beta_pipeline\run.py
```

Fast static-beta run:

```powershell
python beta_pipeline\run.py --no-rolling
```

One or more pairs:

```powershell
python beta_pipeline\run.py --fx eurusd usdjpy --no-rolling
```

Reuse last API download:

```powershell
python beta_pipeline\run.py --from-cache
```

Tables only:

```powershell
python beta_pipeline\run.py --skip-plots
```

## Outputs

Each run creates `beta_pipeline/output/<run_id>/` with:

- `beta_matrix_full.csv`
- `beta_matrix_robust.csv`
- `beta_matrix_app_robust.csv`
- `beta_matrix_pivot.csv`
- `beta_matrix_robust_pivot.csv`
- `regime_flags.csv`
- `aligned_monthly.csv`
- `transformed_monthly.csv`
- `coverage.csv`
- `beta_outputs.xlsx`
- `metadata.json`
- `report.txt`
- `rolling/rolling_beta_<pair>.csv`
- PNG charts unless `--skip-plots` is used

## Static vs robust beta files

`beta_matrix_full.csv` is the exploratory legacy matrix: full-sample,
univariate regressions for every indicator/pair combination. It is useful for
discovery, but it can include look-ahead, multiple-testing false positives, and
economically weak cross-country relationships.

`beta_matrix_robust.csv` is the stricter candidate matrix. It applies:

- 1-month feature lag before regression.
- Economic relevance filter: endogenous indicators must belong to one of the
  countries in the FX pair; global `wv_` and `exo_` drivers are allowed.
- Benjamini-Hochberg FDR correction (`q_value`).
- Rolling walk-forward one-step validation (`wf_ic`, `wf_directional_acc`,
  `wf_oos_r2`).
- `accepted = true` only when `q_value <= 0.10`, walk-forward IC is positive,
  directional accuracy is at least 52%, and enough OOS observations exist.
- `watchlist = true` for promising but not production-ready candidates
  (`q_value <= 0.25` and positive walk-forward IC).

`beta_matrix_app_robust.csv` contains only accepted endogenous betas in the
same shape expected by the Polaris app. If it is empty, that is a valid result:
the current free-data universe did not produce production-grade endogenous
betas under the stricter protocol.
