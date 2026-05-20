"""
update_trade.py — Global Trade Monitor data fetcher
Run: python update_trade.py
Output: public/trade_data.json

Dependencies: pip install yfinance requests flights
"""

import json
import os
from datetime import datetime, timedelta

import yfinance as yf

# ── Aviation import (pip install flights) ─────────────────────────────────────
try:
    from fli.models import (
        Airport, PassengerInfo, SeatType,
        MaxStops, SortBy, FlightSearchFilters, FlightSegment,
    )
    from fli.search import SearchFlights
    FLI_AVAILABLE = True
except ImportError:
    FLI_AVAILABLE = False

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


def _load_existing_routes():
    """Return existing route rows keyed by (origin, dest) to preserve price_history."""
    try:
        with open(OUTPUT_PATH) as f:
            existing = json.load(f)
        return {
            (r["origin"], r["destination"]): r
            for r in existing.get("aviation", {}).get("routes", [])
        }
    except Exception:
        return {}


def _update_history(existing_row, new_price, date_queried):
    """Append new price to history (max 90 entries), return updated history + stats."""
    history = list(existing_row.get("price_history", [])) if existing_row else []
    if new_price is not None:
        history.append([date_queried, new_price])
    history = history[-90:]  # keep last 90 data points

    prices = [p for _, p in history]
    avg = round(sum(prices) / len(prices), 2) if prices else None
    vs_avg_pct = None
    if avg and new_price:
        vs_avg_pct = round((new_price - avg) / avg * 100, 1)

    return history, avg, vs_avg_pct


def fetch_aviation():
    if not FLI_AVAILABLE:
        print("  Warning: 'flights' package not installed — pip install flights")
        return _default_aviation()

    existing_routes = _load_existing_routes()
    search = SearchFlights()
    target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    results = []

    for origin_code, dest_code in RUTAS:
        existing = existing_routes.get((origin_code, dest_code))
        try:
            filters = FlightSearchFilters(
                passenger_info=PassengerInfo(adults=1),
                flight_segments=[FlightSegment(
                    departure_airport=[[getattr(Airport, origin_code), 0]],
                    arrival_airport=[[getattr(Airport, dest_code), 0]],
                    travel_date=target_date,
                )],
                seat_type=SeatType.ECONOMY,
                stops=MaxStops.ANY,
                sort_by=SortBy.CHEAPEST,
            )
            flights = search.search(filters)
            min_price = min((f.price for f in flights if f.price), default=None)
            history, avg, vs_avg_pct = _update_history(existing, min_price, target_date)
            results.append({
                "origin": origin_code,
                "destination": dest_code,
                "min_price_usd": min_price,
                "avg_price_usd": avg,
                "vs_avg_pct": vs_avg_pct,
                "date_queried": target_date,
                "price_history": history,
                "error": None,
            })
            vs_str = f" ({vs_avg_pct:+.1f}% vs avg)" if vs_avg_pct is not None else " (building baseline)"
            print(f"  {origin_code}->{dest_code}: ${min_price}{vs_str}")
        except Exception as e:
            print(f"  Warning: {origin_code}->{dest_code} failed — {e}")
            history = existing.get("price_history", []) if existing else []
            avg = existing.get("avg_price_usd") if existing else None
            results.append({
                "origin": origin_code,
                "destination": dest_code,
                "min_price_usd": None,
                "avg_price_usd": avg,
                "vs_avg_pct": None,
                "date_queried": target_date,
                "price_history": history,
                "error": str(e),
            })

    return {"routes": results, "iata_note": "Datos IATA con lag ~6 semanas"}


def _default_aviation():
    return {
        "routes": [
            {
                "origin": o, "destination": d,
                "min_price_usd": None, "avg_price_usd": None, "vs_avg_pct": None,
                "date_queried": None, "price_history": [], "error": None,
            }
            for o, d in RUTAS
        ],
        "iata_note": "Datos IATA con lag ~6 semanas",
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

    print("Fetching aviation routes...")
    aviation = fetch_aviation()

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
