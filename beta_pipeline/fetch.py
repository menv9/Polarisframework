"""Data ingestion for the Polaris beta pipeline."""

from __future__ import annotations

import time

import pandas as pd
import requests
import yfinance as yf

from config import CACHE_DIR, FRED_API_KEY, FRED_SERIES, FRED_SLEEP, START_DATE, YAHOO_TICKERS


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


def fetch_all(start_date: str = START_DATE, verbose: bool = True) -> tuple[pd.DataFrame, dict]:
    """Fetch FRED and Yahoo data, then combine them into one raw frame."""
    print("\n-- Phase 1 / Ingestion ---------------------------------------------")
    fred_df, fred_failed = fetch_fred(start_date=start_date, verbose=verbose)
    yahoo_df, yahoo_failed = fetch_yahoo(start_date=start_date, verbose=verbose)

    df_raw = pd.concat([fred_df, yahoo_df], axis=1).sort_index()
    report = {
        "sources": ["FRED", "Yahoo Finance"],
        "fred_ok": [col for col in FRED_SERIES if col in fred_df.columns],
        "fred_failed": fred_failed,
        "yahoo_ok": [col for col in YAHOO_TICKERS if col in yahoo_df.columns],
        "yahoo_failed": yahoo_failed,
        "total_series": int(df_raw.shape[1]),
        "start_date": start_date,
    }
    _log(f"Total raw series: {df_raw.shape[1]}")
    return df_raw, report
