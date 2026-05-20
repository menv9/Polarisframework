"""
update_trade.py — Global Trade Monitor data fetcher
Run: python update_trade.py
Output: public/trade_data.json

Dependencies: pip install yfinance requests
Optional:     pip install fli   (aviation routes via Google Flights)
"""

import json
import os
from datetime import datetime, timedelta

import requests
import yfinance as yf

# ── Aviation import (optional) ────────────────────────────────────────────────
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
    "bdi": "^BDI",
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

AIRPORT_MAP = {
    "FRA": "Airport.FRA", "SIN": "Airport.SIN",
    "JFK": "Airport.JFK", "LHR": "Airport.LHR",
    "DXB": "Airport.DXB", "HKG": "Airport.HKG",
    "LAX": "Airport.LAX", "NRT": "Airport.NRT",
    "JNB": "Airport.JNB", "GRU": "Airport.GRU",
    "MIA": "Airport.MIA",
}

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "public", "trade_data.json")


# ── Data fetchers ─────────────────────────────────────────────────────────────

def fetch_maritime():
    data = {}
    for key, ticker in TICKERS.items():
        try:
            df = yf.download(ticker, period="90d", interval="1d", progress=False, auto_adjust=True)
            closes = df["Close"].dropna()
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
        except Exception as e:
            print(f"  Warning: {key} ({ticker}) failed — {e}")
            data[key] = {"current": None, "change_pct": None, "history": []}
    return data


def fetch_fbx():
    try:
        r = requests.get("https://fbx.freightos.com/api/v1/composite", timeout=8)
        r.raise_for_status()
        payload = r.json()
        val = payload.get("composite_index") or payload.get("value")
        prev = payload.get("previous_index") or payload.get("previous_value")
        change_pct = None
        if val is not None and prev:
            change_pct = round((val - prev) / prev * 100, 2)
        return {
            "current": val,
            "change_pct": change_pct,
            "source": "Freightos FBX",
            "updated": datetime.utcnow().strftime("%Y-%m-%d"),
        }
    except Exception as e:
        print(f"  Warning: Freightos FBX failed — {e}")
        return {
            "current": None,
            "change_pct": None,
            "source": "Freightos FBX",
            "updated": "N/A",
            "note": "fetch failed — update manually",
        }


def fetch_aviation():
    if not FLI_AVAILABLE:
        return {
            "routes": [
                {
                    "origin": o, "destination": d,
                    "min_price_usd": None,
                    "date_queried": None,
                    "error": "fli not installed — pip install fli",
                }
                for o, d in RUTAS
            ],
            "iata_note": "Datos IATA con lag ~6 semanas",
        }

    search = SearchFlights()
    target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    results = []

    for origin_code, dest_code in RUTAS:
        try:
            airport_origin = getattr(Airport, origin_code)
            airport_dest = getattr(Airport, dest_code)
            filters = FlightSearchFilters(
                passenger_info=PassengerInfo(adults=1),
                flight_segments=[FlightSegment(
                    departure_airport=[[airport_origin, 0]],
                    arrival_airport=[[airport_dest, 0]],
                    travel_date=target_date,
                )],
                seat_type=SeatType.ECONOMY,
                stops=MaxStops.ANY,
                sort_by=SortBy.CHEAPEST,
            )
            flights = search.search(filters)
            min_price = min([f.price for f in flights]) if flights else None
            results.append({
                "origin": origin_code,
                "destination": dest_code,
                "min_price_usd": min_price,
                "date_queried": target_date,
                "error": None,
            })
        except Exception as e:
            results.append({
                "origin": origin_code,
                "destination": dest_code,
                "min_price_usd": None,
                "date_queried": target_date,
                "error": str(e),
            })

    return {
        "routes": results,
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

    print(f"Done → {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
