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
- `beta_matrix_pivot.csv`
- `regime_flags.csv`
- `aligned_monthly.csv`
- `transformed_monthly.csv`
- `coverage.csv`
- `beta_outputs.xlsx`
- `metadata.json`
- `report.txt`
- `rolling/rolling_beta_<pair>.csv`
- PNG charts unless `--skip-plots` is used
