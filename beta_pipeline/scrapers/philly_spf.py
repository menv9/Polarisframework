"""Philadelphia Fed Survey of Professional Forecasters (SPF) downloader.

Downloads consensus forecasts for US macro variables from the Philadelphia Fed's
public Excel files. Quarterly since 1968-Q4, no API key required.

Output columns (quarterly consensus → forward-filled to monthly end-of-month):
    spf_usa_cpi_consensus   – Expected CPI inflation, annual %, current-year mean
    spf_usa_rgdp_consensus  – Expected real GDP growth, annual %, current-year mean
    spf_usa_unemp_consensus – Expected unemployment rate, level, current-year mean
    spf_usa_tbond_consensus – Expected 10Y Treasury yield, level, current-year mean

Release calendar (approximate):
    Q1 survey → released mid-February  → mapped to 1st obs month = February
    Q2 survey → released mid-May       → mapped to May
    Q3 survey → released mid-August    → mapped to August
    Q4 survey → released mid-November  → mapped to November
"""

from __future__ import annotations

import io
import xml.etree.ElementTree as _ET
import zipfile
from pathlib import Path

import pandas as pd
import requests

# ---------------------------------------------------------------------------
# Series configuration
# ---------------------------------------------------------------------------

_BASE_URL = (
    "https://www.philadelphiafed.org/-/media/FRBP/Assets/Surveys-And-Data/"
    "survey-of-professional-forecasters/data-files/files/"
)

# (filename_suffix, primary_col, fallback_cols)
# Philly Fed uses capitalized "Mean_" prefix and "_Level" or "_Growth" suffix.
# The old lowercase "mean_*_level.xlsx" filenames redirected to HTML (404/redirect).
_SPF_SERIES: dict[str, tuple[str, str, list[str]]] = {
    "spf_usa_cpi_consensus": (
        "Mean_CPI_Level.xlsx",
        "CPIG",
        ["CPI6", "CPI5", "CPIG2"],
    ),
    "spf_usa_rgdp_consensus": (
        "Mean_RGDP_Growth.xlsx",
        "RGDPG",
        ["DRGDP2", "DRGDP3", "DRGDP4", "RGDP6", "RGDP5"],
    ),
    "spf_usa_unemp_consensus": (
        "Mean_UNEMP_Level.xlsx",
        "UNEMP2",
        ["UNEMP3", "UNEMP1"],
    ),
    "spf_usa_tbond_consensus": (
        "Mean_TBOND_Level.xlsx",
        "TBOND2",
        ["TBOND3", "TBOND1"],
    ),
}

# Quarter → month offset within the year (survey release month)
_QUARTER_TO_MONTH = {1: 2, 2: 5, 3: 8, 4: 11}


def _log(message: str) -> None:
    print(f"  {message}")


def _parse_xlsx_stdlib(raw: bytes) -> pd.DataFrame | None:
    """Parse an xlsx file using only Python stdlib (zipfile + xml.etree).

    Fallback for when openpyxl crashes on Python 3.14 due to a datetime
    descriptor incompatibility in the workbook metadata (core.xml).
    Handles shared-string cells and numeric cells; ignores formula results
    stored as errors (#N/A etc.) by mapping them to None.
    """
    try:
        zf = zipfile.ZipFile(io.BytesIO(raw))
    except zipfile.BadZipFile:
        return None

    ns = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

    # ── shared strings ──────────────────────────────────────────────────
    shared: list[str] = []
    if "xl/sharedStrings.xml" in zf.namelist():
        ss_root = _ET.fromstring(zf.read("xl/sharedStrings.xml"))
        for si in ss_root.findall(f"{ns}si"):
            t = si.find(f"{ns}t")
            shared.append(t.text if t is not None else "")

    # ── first sheet ──────────────────────────────────────────────────────
    sheets = [n for n in zf.namelist() if n.startswith("xl/worksheets/sheet")]
    if not sheets:
        return None
    root = _ET.fromstring(zf.read(sheets[0]))

    rows_data: list[list] = []
    for row in root.findall(f".//{ns}row"):
        row_vals: list = []
        for c in row.findall(f"{ns}c"):
            t_attr = c.get("t", "")
            v_el = c.find(f"{ns}v")
            if v_el is None:
                row_vals.append(None)
            elif t_attr == "s":                    # shared string index
                try:
                    row_vals.append(shared[int(v_el.text)])
                except (IndexError, ValueError, TypeError):
                    row_vals.append(None)
            elif t_attr in ("e", "str", "inlineStr"):   # error / string formula
                row_vals.append(None)
            else:                                  # numeric
                try:
                    row_vals.append(float(v_el.text))
                except (ValueError, TypeError):
                    row_vals.append(None)
        rows_data.append(row_vals)

    if len(rows_data) < 2:
        return None

    # Align row lengths (sparse sheets may have short rows)
    max_len = max(len(r) for r in rows_data)
    rows_data = [r + [None] * (max_len - len(r)) for r in rows_data]

    header = [str(v) if v is not None else f"col_{i}" for i, v in enumerate(rows_data[0])]
    df = pd.DataFrame(rows_data[1:], columns=header)
    return df


def _quarter_to_date(year: int, quarter: int) -> pd.Timestamp:
    """Map SPF YEAR/QUARTER to approximate release date (end-of-month)."""
    month = _QUARTER_TO_MONTH.get(int(quarter), int(quarter) * 3 - 1)
    ts = pd.Timestamp(year=int(year), month=month, day=1)
    return ts + pd.offsets.MonthEnd(0)


def _fetch_one(
    output_name: str,
    filename: str,
    primary_col: str,
    fallbacks: list[str],
    cache_dir: Path | None,
    session: requests.Session,
) -> pd.Series | None:
    """Download and parse a single SPF Excel file."""
    url = _BASE_URL + filename
    cache_path = (cache_dir / filename) if cache_dir else None

    # ---------- load raw bytes ----------
    content_type = ""
    if cache_path and cache_path.exists():
        raw = cache_path.read_bytes()
    else:
        try:
            resp = session.get(url, timeout=60)
            resp.raise_for_status()
            raw = resp.content
            content_type = resp.headers.get("Content-Type", "")
        except Exception as exc:
            _log(f"SPF download failed [{output_name}]: {exc}")
            return None
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            cache_path.write_bytes(raw)

    # ---------- parse (Excel or CSV fallback) ----------
    # Philly Fed xlsx files use a metadata datetime format that crashes openpyxl
    # on Python 3.14 / numpy 2.x.  Parse order:
    #   1. CSV (if content-type says so)
    #   2. stdlib zip+xml parser (no openpyxl dependency, handles the crash case)
    #   3. openpyxl / xlrd as additional fallbacks
    #   4. CSV regardless of content-type
    df = None

    # 1. Try CSV first if content-type suggests it
    if "csv" in content_type.lower() or "text" in content_type.lower():
        try:
            df = pd.read_csv(io.BytesIO(raw), on_bad_lines="skip")
        except Exception:
            pass

    # 2. stdlib xlsx parser (primary xlsx path — avoids openpyxl datetime crash)
    if df is None and (raw[:2] == b"PK" or b"[Content_Types]" in raw[:200]):
        df = _parse_xlsx_stdlib(raw)

    # 3. Try Excel engines as additional fallback
    if df is None:
        for engine in ("openpyxl", "xlrd"):
            try:
                df = pd.read_excel(io.BytesIO(raw), sheet_name=0, header=0, engine=engine)
                break
            except Exception:
                continue

    # 4. Final fallback: try CSV regardless of content-type
    if df is None:
        try:
            df = pd.read_csv(io.BytesIO(raw), on_bad_lines="skip")
        except Exception:
            pass

    if df is None:
        # Log the first 200 bytes so we can see what's being returned
        preview = raw[:200].decode("utf-8", errors="replace").replace("\n", " ")
        _log(f"SPF parse error [{output_name}]: unrecognised format. Preview: {preview!r}")
        return None

    # Normalise column names (strip whitespace, uppercase)
    df.columns = [str(c).strip().upper() for c in df.columns]

    # Identify YEAR and QUARTER columns
    year_col = next((c for c in df.columns if "YEAR" in c), None)
    qtr_col  = next((c for c in df.columns if "QUARTER" in c or c == "QTR"), None)
    if year_col is None or qtr_col is None:
        _log(f"SPF missing YEAR/QUARTER columns [{output_name}]: {list(df.columns)}")
        return None

    # Identify value column
    val_col = primary_col if primary_col in df.columns else None
    if val_col is None:
        for fb in fallbacks:
            if fb in df.columns:
                val_col = fb
                break
    if val_col is None:
        _log(f"SPF value column not found [{output_name}]. Available: {list(df.columns)}")
        return None

    # Build quarterly series
    df = df[[year_col, qtr_col, val_col]].dropna(subset=[year_col, qtr_col])

    # Excel sometimes stores the YEAR column as datetime objects (auto-format).
    # Extract the integer year from datetime, keep numeric years as-is.
    def _to_year(val: object) -> int | float:
        import datetime as _dt
        if isinstance(val, (_dt.datetime, _dt.date, pd.Timestamp)):
            return pd.Timestamp(val).year
        try:
            return int(float(val))
        except (TypeError, ValueError):
            return float("nan")

    df[year_col]  = df[year_col].apply(_to_year)
    df[qtr_col]   = pd.to_numeric(df[qtr_col],   errors="coerce")
    df[val_col]   = pd.to_numeric(df[val_col],   errors="coerce")
    df = df.dropna()

    dates  = [_quarter_to_date(y, q) for y, q in zip(df[year_col], df[qtr_col])]
    series = pd.Series(df[val_col].values, index=pd.DatetimeIndex(dates), name=output_name)
    series = series[~series.index.duplicated(keep="last")].sort_index()

    # Expand quarterly → monthly (forward-fill within each quarter)
    monthly_idx = pd.date_range(series.index.min(), series.index.max(), freq="ME")
    series = series.reindex(monthly_idx).ffill()

    _log(f"SPF ok  {output_name:<32} {series.dropna().__len__()} monthly obs "
         f"({series.dropna().index[0].date()} to {series.dropna().index[-1].date()})")
    return series


def fetch_philly_spf(
    cache_dir: Path | None = None,
    verbose: bool = True,
) -> tuple[pd.DataFrame, list[dict]]:
    """Download Philadelphia Fed SPF consensus data.

    Parameters
    ----------
    cache_dir:
        Optional directory to cache downloaded Excel files (avoids re-downloads).
    verbose:
        Print progress to stdout.

    Returns
    -------
    df:
        Monthly DataFrame with one column per SPF series (forward-filled within quarter).
    failed:
        List of {name, url, error} dicts for any series that could not be fetched.
    """
    if verbose:
        _log("Philadelphia Fed SPF ...")

    session = requests.Session()
    session.headers.update({"User-Agent": "Polaris-Pipeline/1.0"})

    frames: dict[str, pd.Series] = {}
    failed: list[dict] = []

    for output_name, (filename, primary_col, fallbacks) in _SPF_SERIES.items():
        s = _fetch_one(
            output_name=output_name,
            filename=filename,
            primary_col=primary_col,
            fallbacks=fallbacks,
            cache_dir=cache_dir,
            session=session,
        )
        if s is not None and not s.dropna().empty:
            frames[output_name] = s
        else:
            failed.append({
                "name": output_name,
                "url": _BASE_URL + filename,
                "error": "empty or parse failure",
            })

    df = pd.DataFrame(frames).sort_index() if frames else pd.DataFrame()
    if verbose:
        _log(f"Philly SPF: {len(frames)} series downloaded, {len(failed)} failed")

    return df, failed
