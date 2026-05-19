"""Consensus and positioning data scrapers for the Polaris beta pipeline.

Public API
----------
    fetch_philly_spf()       – Philadelphia Fed SPF (US CPI, GDP, unemployment)
    fetch_ecb_spf()          – ECB SPF (Euro Area HICP, GDP, unemployment)
    fetch_cot_cftc()         – CFTC COT G10 FX positioning Z-scores
    compute_cesi()           – G10 CESI from local Forex Factory calendar CSV
    fetch_consensus()        – Merged DataFrame from all four sources

All functions return (DataFrame, report_dict) and write no side-effects
beyond optional file caching.
"""

from scrapers.philly_spf       import fetch_philly_spf
from scrapers.ecb_spf          import fetch_ecb_spf
from scrapers.cot_cftc         import fetch_cot_cftc
from scrapers.cesi_ff          import compute_cesi
from scrapers.consensus_merger import fetch_consensus

__all__ = [
    "fetch_philly_spf",
    "fetch_ecb_spf",
    "fetch_cot_cftc",
    "compute_cesi",
    "fetch_consensus",
]
