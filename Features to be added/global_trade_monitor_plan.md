# Global Trade Monitor — Plan de Implementación
## Polaris Framework · Página separada `/trade`

---

## Visión general

Panel de contexto macro global que trackea comercio marítimo y tráfico aéreo estratégico. **No afecta al score de Polaris.** Es una capa de lectura del mundo real — señales de actividad económica física antes de que lleguen a los datos oficiales.

```
polaris/
├── trade.html          ← página nueva, ruta /trade
├── trade_data.json     ← generado por el script Python
├── update_trade.py     ← script manual o cron
└── assets/
    └── trade.js        ← charts y lógica del panel
```

---

## Fuentes de datos

| Indicador | Fuente | Frecuencia | Coste | Lag |
|---|---|---|---|---|
| Baltic Dry Index (BDI) | Yahoo Finance `^BDI` | Diario | Gratis | ~1 día |
| AUD/USD, CAD/USD, NOK/USD | Yahoo Finance | Diario | Gratis | ~1 día |
| Oil WTI | Yahoo Finance `CL=F` | Diario | Gratis | ~1 día |
| Freightos FBX (contenedores) | Freightos API | Semanal | Gratis limitado | ~3 días |
| Rutas aéreas estratégicas | `fli` (Google Flights) | On-demand | Gratis | Tiempo real |
| Capacidad global IATA | IATA press releases | Mensual | Gratis | 4–6 semanas |

---

## Script Python — `update_trade.py`

### Instalación

```bash
pip install yfinance requests flights
# 'flights' es el paquete de fli en PyPI
```

### Estructura del script

#### 1. Maritime — BDI y correlaciones FX

```python
import yfinance as yf

TICKERS = {
    "bdi": "^BDI",
    "aud": "AUDUSD=X",
    "cad": "CADUSD=X",
    "nok": "NOKUSD=X",
    "oil": "CL=F",
}

def fetch_maritime():
    data = {}
    for key, ticker in TICKERS.items():
        df = yf.download(ticker, period="90d", interval="1d", progress=False)
        closes = df["Close"].dropna()
        data[key] = {
            "current": round(float(closes.iloc[-1]), 2),
            "change_pct": round(
                float((closes.iloc[-1] - closes.iloc[-2]) / closes.iloc[-2] * 100), 2
            ),
            "history": [
                [int(ts.timestamp()), round(float(v), 2)]
                for ts, v in closes.items()
            ],
        }
    return data
```

#### 2. Freightos FBX

```python
import requests

def fetch_fbx():
    try:
        r = requests.get("https://fbx.freightos.com/api/v1/composite", timeout=5)
        val = r.json().get("composite_index")
        return {
            "current": val,
            "source": "Freightos FBX",
            "updated": datetime.utcnow().strftime("%Y-%m-%d"),
        }
    except Exception:
        return {
            "current": None,
            "source": "Freightos FBX",
            "updated": "N/A",
            "note": "fetch failed — actualizar manualmente",
        }
```

#### 3. Aviation — rutas estratégicas via `fli`

```python
from fli.models import (
    Airport, PassengerInfo, SeatType,
    MaxStops, SortBy, FlightSearchFilters, FlightSegment
)
from fli.search import SearchFlights

RUTAS = [
    ("FRA", "SIN"),   # Europa → Asia (demanda manufactura)
    ("JFK", "LHR"),   # Transatlántico business
    ("DXB", "HKG"),   # Medio Oriente → Asia
    ("LAX", "NRT"),   # Pacífico
    ("FRA", "JNB"),   # Europa → África
    ("GRU", "MIA"),   # LatAm → EEUU
]

AIRPORT_MAP = {
    "FRA": Airport.FRA, "SIN": Airport.SIN,
    "JFK": Airport.JFK, "LHR": Airport.LHR,
    "DXB": Airport.DXB, "HKG": Airport.HKG,
    "LAX": Airport.LAX, "NRT": Airport.NRT,
    "JNB": Airport.JNB, "GRU": Airport.GRU,
    "MIA": Airport.MIA,
}

def fetch_aviation():
    search = SearchFlights()
    target_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
    results = []

    for origin_code, dest_code in RUTAS:
        try:
            filters = FlightSearchFilters(
                passenger_info=PassengerInfo(adults=1),
                flight_segments=[FlightSegment(
                    departure_airport=[[AIRPORT_MAP[origin_code], 0]],
                    arrival_airport=[[AIRPORT_MAP[dest_code], 0]],
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
```

#### 4. Macro Overlay — BDI vs FX

```python
def build_overlay(maritime_data):
    bdi = {ts: v for ts, v in maritime_data["bdi"]["history"]}
    aud = {ts: v for ts, v in maritime_data["aud"]["history"]}
    cad = {ts: v for ts, v in maritime_data["cad"]["history"]}

    common_ts = sorted(set(bdi) & set(aud) & set(cad))
    return {
        "bdi_vs_aud": [[ts, bdi[ts], aud[ts]] for ts in common_ts],
        "bdi_vs_cad": [[ts, bdi[ts], cad[ts]] for ts in common_ts],
    }
```

#### 5. Main — output JSON

```python
def main():
    print("Fetching maritime data...")
    maritime = fetch_maritime()

    print("Fetching Freightos FBX...")
    maritime["fbx"] = fetch_fbx()

    print("Fetching aviation routes via fli...")
    aviation = fetch_aviation()

    print("Building macro overlay...")
    overlay = build_overlay(maritime)

    output = {
        "updated_at": datetime.utcnow().isoformat() + "Z",
        "maritime": maritime,
        "aviation": aviation,
        "macro_overlay": overlay,
    }

    with open("trade_data.json", "w") as f:
        json.dump(output, f, indent=2)

    print("Done → trade_data.json")

if __name__ == "__main__":
    main()
```

---

## Output JSON — estructura

```json
{
  "updated_at": "2026-05-19T10:00:00Z",
  "maritime": {
    "bdi": {
      "current": 1842,
      "change_pct": 2.3,
      "history": [[timestamp, value], "..."]
    },
    "fbx": {
      "current": 1654,
      "change_pct": -0.8,
      "updated": "2026-05-16"
    },
    "aud": { "current": 0.6512, "change_pct": 0.4, "history": [] },
    "cad": { "current": 0.7341, "change_pct": -0.1, "history": [] },
    "oil": { "current": 78.42, "change_pct": 1.2, "history": [] }
  },
  "aviation": {
    "routes": [
      {
        "origin": "FRA",
        "destination": "SIN",
        "min_price_usd": 387,
        "date_queried": "2026-06-19",
        "error": null
      }
    ],
    "iata_note": "Datos IATA con lag ~6 semanas"
  },
  "macro_overlay": {
    "bdi_vs_aud": [[timestamp, bdi, aud], "..."],
    "bdi_vs_cad": [[timestamp, bdi, cad], "..."]
  }
}
```

---

## Ejecución

```bash
# Manual — antes de abrir el dashboard
python update_trade.py

# Cron — cada mañana a las 07:00
0 7 * * * cd /ruta/polaris && python update_trade.py >> logs/trade.log 2>&1
```

---

## Fases de build del panel HTML

| Fase | Entregable | Estado |
|---|---|---|
| 1 | Script Python completo y testeado | ✅ Planificado |
| 2 | `trade.html` — esqueleto Bloomberg dark | ⬜ Pendiente |
| 3 | Charts marítimos: BDI line chart 90d | ⬜ Pendiente |
| 4 | Overlay BDI vs AUD/USD y CAD/USD | ⬜ Pendiente |
| 5 | Tabla rutas aéreas: precio + ruta + delta | ⬜ Pendiente |
| 6 | Pill "Updated at" + estado de cada fuente | ⬜ Pendiente |

---

## Layout del panel `/trade`

```
┌─────────────────────────────────────────────────────┐
│  POLARIS · GLOBAL TRADE MONITOR          [updated]  │
├──────────────┬──────────────┬───────────────────────┤
│  BDI         │  FBX         │  OIL WTI              │
│  1,842       │  1,654       │  $78.42               │
│  ▲ +2.3%     │  ▼ -0.8%     │  ▲ +1.2%              │
├──────────────┴──────────────┴───────────────────────┤
│  BDI 90 días — line chart                           │
├─────────────────────────┬───────────────────────────┤
│  BDI vs AUD/USD         │  BDI vs CAD/USD           │
│  dual-axis overlay      │  dual-axis overlay        │
├─────────────────────────┴───────────────────────────┤
│  AVIATION — RUTAS ESTRATÉGICAS (precio economy +30d)│
│  FRA→SIN  $387   JFK→LHR  $512   DXB→HKG  $298    │
│  LAX→NRT  $621   FRA→JNB  $743   GRU→MIA  $289    │
├─────────────────────────────────────────────────────┤
│  IATA NOTE: datos Marzo 2026 — lag ~6 semanas       │
└─────────────────────────────────────────────────────┘
```

---

## Notas técnicas

- **Sin backend**: el JSON estático elimina cualquier dependencia de servidor. El HTML hace un `fetch("trade_data.json")` al cargar.
- **Freightos fallback**: si la API falla, el panel muestra "N/A" y la fecha del último dato válido. No rompe el panel.
- **`fli` rate limits**: Google Flights puede throttlear si se hacen muchas queries seguidas. Con 6 rutas y ejecución diaria no hay problema.
- **Correlación BDI/FX**: es contexto visual, no causalidad estadística. El panel no hace ninguna inferencia automática.
- **Estilo**: mismo dark terminal Bloomberg que el Market Terminal — paleta, fuentes y componentes coherentes con el resto de Polaris.
