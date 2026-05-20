"""
update_trade.py — Global Trade Monitor data fetcher
Run: python update_trade.py
Output: public/trade_data.json

Dependencies: pip install yfinance requests

Aviation routes (FRA->SIN etc.) have no reliable free API.
Update min_price_usd manually in trade_data.json from Google Flights.
"""

import json
import os
from datetime import datetime

import yfinance as yf

# ── Constants ─────────────────────────────────────────────────────────────────

TICKERS = {
    "bdi": "BDRY",      # Breakwave Dry Bulk ETF — BDI proxy (^BDI delisted on Yahoo)
    "aud": "AUDUSD=X",
    "cad": "CADUSD=X",
    "nok": "NOKUSD=X",
    "oil": "CL=F",
}

RUTAS = [
    ("FRA", "SIN"),
    ("JFK", "LHR"),
    ("DXB", "HKG"),
    ("LAX", "NRT"),
    ("FRA", "JNB"),
    ("GRU", "MIA"),
]

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "trade_data.json")


# ── Data fetchers ─────────────────────────────────────────────────────────────

def _extract_closes(df, ticker):
    """Handle both flat and MultiIndex column layouts across yfinance versions."""
    import pandas as pd
    col = df.get("Close")
    if col is None:
        raise ValueError("No 'Close' column")
    # yfinance ≥0.2 returns MultiIndex (Price, Ticker) when multi_level_index=True
    if isinstance(col, pd.DataFrame):
        col = col.iloc[:, 0]
    return col.dropna()


def fetch_maritime():
    data = {}
    for key, ticker in TICKERS.items():
        try:
            df = yf.download(
                ticker, period="90d", interval="1d",
                progress=False, auto_adjust=True, multi_level_index=False,
            )
            closes = _extract_closes(df, ticker)
            if len(closes) < 2:
                raise ValueError("Insufficient data")
            data[key] = {
                "current": round(float(closes.iloc[-1]), 4),
                "change_pct": round(
                    float((closes.iloc[-1] - closes.iloc[-2]) / closes.iloc[-2] * 100), 2
                ),
                "history": [
                    [int(ts.timestamp() * 1000), round(float(v), 4)]
                    for ts, v in closes.items()
                ],
            }
            print(f"  {key} ({ticker}): {data[key]['current']} ({data[key]['change_pct']:+.2f}%)")
        except Exception as e:
            print(f"  Warning: {key} ({ticker}) failed — {e}")
            data[key] = {"current": None, "change_pct": None, "history": []}
    return data


def fetch_fbx():
    # Freightos FBX does not expose a public JSON API.
    # Update current/change_pct manually from https://fbx.freightos.com
    return {
        "current": None,
        "change_pct": None,
        "source": "Freightos FBX",
        "updated": "manual",
        "note": "No public API — update manually from fbx.freightos.com",
    }


def load_existing_aviation():
    """Preserve existing aviation rows from trade_data.json (manual updates)."""
    try:
        with open(OUTPUT_PATH) as f:
            existing = json.load(f)
        return existing.get("aviation", _default_aviation())
    except Exception:
        return _default_aviation()


def _default_aviation():
    return {
        "routes": [
            {"origin": o, "destination": d, "min_price_usd": None, "date_queried": None, "error": None}
            for o, d in RUTAS
        ],
        "iata_note": "Datos IATA con lag ~6 semanas — update min_price_usd manually from Google Flights",
    }


def build_overlay(maritime_data):
    bdi_map = {ts: v for ts, v in maritime_data.get("bdi", {}).get("history", [])}
    aud_map = {ts: v for ts, v in maritime_data.get("aud", {}).get("history", [])}
    cad_map = {ts: v for ts, v in maritime_data.get("cad", {}).get("history", [])}

    common_bdi_aud = sorted(set(bdi_map) & set(aud_map))
    common_bdi_cad = sorted(set(bdi_map) & set(cad_map))

    return {
        "bdi_vs_aud": [[ts, bdi_map[ts], aud_map[ts]] for ts in common_bdi_aud],
        "bdi_vs_cad": [[ts, bdi_map[ts], cad_map[ts]] for ts in common_bdi_cad],
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print("Fetching maritime data (BDI, AUD, CAD, NOK, Oil)...")
    maritime = fetch_maritime()

    print("Fetching Freightos FBX...")
    maritime["fbx"] = fetch_fbx()

    print("Loading aviation routes (manual)...")
    aviation = load_existing_aviation()

    print("Building macro overlay...")
    overlay = build_overlay(maritime)

    output = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "maritime": maritime,
        "aviation": aviation,
        "macro_overlay": overlay,
    }

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w") as f:
        json.dump(output, f, indent=2)

    print(f"Done -> {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
