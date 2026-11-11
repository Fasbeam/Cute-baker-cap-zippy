"""
CUE-PRO Engine Entry Point
Example usage and convenience wrappers.
"""

from datetime import datetime
from .indicators.rdx import compute_rdx
from .engine.oi_flow import aggregate_coi, stock_institutional_footprint
from .engine.strategy import run_decision_engine
from .data.nse_feed import get_client, NSEClient
from .data.live import live_index_snapshot

__all__ = [
    "compute_rdx",
    "aggregate_coi",
    "stock_institutional_footprint",
    "run_decision_engine",
    "get_client",
    "NSEClient",
    "live_index_snapshot",
]


def example_index_run():
    """Minimal example of how the pieces fit together."""
    # In production these come from live NSE chain + OHLCV feed
    spot = 24986.40
    vix = 18.38
    ivp = 52.0
    now = datetime.now()

    # Dummy RDX values (replace with compute_rdx(df).iloc[-1].to_dict())
    rdx = {
        "rsi": 48.2,
        "adx": 16.5,
        "adx_slope": -1.2,
        "vwap": 24970.0,
        "ema5": 24980.0,
        "ema20": 24950.0,
        "ema5_slope": 5.0,
    }

    # Dummy multi-expiry OI (replace with real chain DataFrames)
    oi_summary = {
        "put_wall_strike": 24800,
        "put_wall_coi": 1250000,
        "call_wall_strike": 25200,
        "call_wall_coi": 980000,
        "bullish_wall": True,
        "bearish_wall": False,
        "unwinding": False,
        "put_coi_below": 4200000,
        "call_coi_above": 3100000,
    }

    card = run_decision_engine(
        symbol="NIFTY",
        spot=spot,
        india_vix=vix,
        ivp=ivp,
        rdx_row=rdx,
        oi_summary=oi_summary,
        current_time=now,
        is_index=True,
    )
    return card
