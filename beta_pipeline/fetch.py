"""Data ingestion for the Polaris beta pipeline."""

from __future__ import annotations

import time

import pandas as pd
import requests
import yfinance as yf

from config import (
    CACHE_DIR, FRED_API_KEY, FRED_SERIES, FRED_SLEEP, START_DATE,
    YAHOO_TICKERS, WORLDBANK_CA_SERIES,
)


FRED_URL = "https://api.stlouisfed.org/fred/series/observations"


def _log(message: str) -> None:
    print(f"  {message}")


def _fetch_fred_series(name: str, code: str, start_date: str) -> pd.Series:
    params = {
        "series_id": code,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "observation_start": start_date,
    }
    response = requests.get(FRED_URL, params=params, timeout=30)
    response.raise_for_status()
    payload = response.json()
    observations = payload.get("observations", [])
    if not observations:
        raise ValueError("empty response")

    df = pd.DataFrame(observations)
    df["date"] = pd.to_datetime(df["date"], errors="coerce")
    df[name] = pd.to_numeric(df["value"].replace(".", pd.NA), errors="coerce")
    return df.set_index("date")[name].dropna()


def fetch_fred(start_date: str = START_DATE, verbose: bool = True) -> tuple[pd.DataFrame, list[dict]]:
    """Download all configured FRED series through the free FRED API."""
    if not FRED_API_KEY:
        raise RuntimeError("FRED_API_KEY is missing. Add it to .env or the environment.")

    frames: dict[str, pd.Series] = {}
    failed: list[dict] = []
    total = len(FRED_SERIES)

    for idx, (name, code) in enumerate(FRED_SERIES.items(), start=1):
        try:
            frames[name] = _fetch_fred_series(name, code, start_date)
            if verbose:
                print(f"  [{idx:>3}/{total}] FRED ok   {name:<28} {code}", end="\r")
        except Exception as exc:  # keep the run alive when a single code fails
            failed.append({"name": name, "code": code, "error": str(exc)})
            if verbose:
                print(f"  [{idx:>3}/{total}] FRED fail {name:<28} {code}", end="\r")
        time.sleep(FRED_SLEEP)

    if verbose:
        print(" " * 90, end="\r")
        _log(f"FRED: {len(frames)} downloaded, {len(failed)} failed")
        for item in failed:
            _log(f"   - {item['name']} ({item['code']}): {item['error'][:120]}")

    df = pd.DataFrame(frames).sort_index()
    return df, failed


def fetch_yahoo(start_date: str = START_DATE, verbose: bool = True) -> tuple[pd.DataFrame, list[dict]]:
    """Download Yahoo Finance close prices in one batch."""
    yahoo_cache_dir = CACHE_DIR / "yfinance"
    yahoo_cache_dir.mkdir(parents=True, exist_ok=True)
    yf.set_tz_cache_location(str(yahoo_cache_dir))

    tickers = list(YAHOO_TICKERS.values())
    ticker_to_name = {ticker: name for name, ticker in YAHOO_TICKERS.items()}

    raw = yf.download(tickers, start=start_date, auto_adjust=True, progress=False, threads=False)
    if raw.empty:
        failed = [
            {"name": name, "ticker": ticker, "error": "empty response"}
            for name, ticker in YAHOO_TICKERS.items()
        ]
        return pd.DataFrame(), failed

    if isinstance(raw.columns, pd.MultiIndex):
        close = raw["Close"].copy()
    else:
        close = raw[["Close"]].copy()
        close.columns = tickers[: len(close.columns)]

    close = close.rename(columns=ticker_to_name)
    close = close.loc[:, ~close.columns.duplicated()].sort_index()

    failed = []
    for name, ticker in YAHOO_TICKERS.items():
        if name not in close.columns or close[name].dropna().empty:
            failed.append({"name": name, "ticker": ticker, "error": "no close data"})

    if verbose:
        _log(f"Yahoo: {len(YAHOO_TICKERS) - len(failed)} downloaded, {len(failed)} failed")
        for item in failed:
            _log(f"   - {item['name']} ({item['ticker']}): {item['error']}")

    return close, failed


WB_URL = "https://api.worldbank.org/v2/country/{country}/indicator/{indicator}"


def fetch_worldbank(
    series_map: dict[str, tuple[str, str]] = WORLDBANK_CA_SERIES,
    start_date: str = START_DATE,
    verbose: bool = True,
) -> tuple[pd.DataFrame, dict]:
    """Fetch annual series from the World Bank API and expand to monthly.

    series_map: {pipeline_name: (wb_country_iso2, wb_indicator_id)}
    Annual values are forward-filled to calendar-month frequency so that
    the pipeline's alignment step handles them like any other monthly series.
    """
    ok: list[str] = []
    failed: list[dict] = []
    series: dict[str, pd.Series] = {}
    start_yr = max(2000, int(start_date[:4]) - 1)

    for name, (country, indicator) in series_map.items():
        url = WB_URL.format(country=country, indicator=indicator)
        params = {
            "format": "json",
            "date": f"{start_yr}:2030",
            "per_page": "200",
            "mrv": "30",
        }
        try:
            resp = requests.get(url, params=params, timeout=30)
            resp.raise_for_status()
            payload = resp.json()
            if len(payload) < 2 or not payload[1]:
                raise ValueError("empty response")
            records = [
                (pd.Timestamp(f"{r['date']}-12-31"), float(r["value"]))
                for r in payload[1]
                if r.get("value") is not None
            ]
            if not records:
                raise ValueError("no non-null observations")
            records.sort(key=lambda x: x[0])
            s = pd.Series(
                [v for _, v in records],
                index=pd.DatetimeIndex([d for d, _ in records]),
            )
            # Expand annual → monthly: forward-fill each year's value across 12 months
            monthly_idx = pd.date_range(s.index.min(), pd.Timestamp.today(), freq="ME")
            series[name] = s.reindex(monthly_idx).ffill()
            ok.append(name)
            if verbose:
                _log(f"WB ok   {name:<30} {len(records)} annual obs → {len(series[name])} monthly")
        except Exception as exc:
            failed.append({"name": name, "country": country, "indicator": indicator, "error": str(exc)})
            if verbose:
                _log(f"WB fail {name:<30} {exc}")
        time.sleep(0.4)

    if verbose:
        _log(f"World Bank: {len(ok)} downloaded, {len(failed)} failed")

    df = pd.DataFrame(series).sort_index() if series else pd.DataFrame()
    return df, {"wb_ok": ok, "wb_failed": failed}


def fetch_all(start_date: str = START_DATE, verbose: bool = True) -> tuple[pd.DataFrame, dict]:
    """Fetch FRED, Yahoo Finance, and World Bank data, then combine into one raw frame."""
    print("\n-- Phase 1 / Ingestion ---------------------------------------------")
    fred_df, fred_failed = fetch_fred(start_date=start_date, verbose=verbose)
    yahoo_df, yahoo_failed = fetch_yahoo(start_date=start_date, verbose=verbose)
    wb_df, wb_report = fetch_worldbank(start_date=start_date, verbose=verbose)

    frames = [df for df in (fred_df, yahoo_df, wb_df) if not df.empty]
    df_raw = pd.concat(frames, axis=1).sort_index()
    report = {
        "sources": ["FRED", "Yahoo Finance", "World Bank"],
        "fred_ok": [col for col in FRED_SERIES if col in fred_df.columns],
        "fred_failed": fred_failed,
        "yahoo_ok": [col for col in YAHOO_TICKERS if col in yahoo_df.columns],
        "yahoo_failed": yahoo_failed,
        "wb_ok": wb_report["wb_ok"],
        "wb_failed": wb_report["wb_failed"],
        "total_series": int(df_raw.shape[1]),
        "start_date": start_date,
    }
    _log(f"Total raw series: {df_raw.shape[1]}")
    return df_raw, report
