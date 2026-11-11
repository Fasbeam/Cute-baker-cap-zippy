"""
Convenience functions that wire the live NSE feed into the decision engine.
"""

from datetime import datetime
from typing import Dict, Any, Optional
import logging

from .nse_feed import get_client
from ..engine.oi_flow import aggregate_coi
from ..engine.strategy import run_decision_engine

logger = logging.getLogger(__name__)


def live_index_snapshot(
    symbol: str = "NIFTY",
    n_expiries: int = 3,
    ivp: float = 40.0,          # caller should supply real IVP when available
    rdx_row: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    One-shot: fetch live chains + spot/VIX, aggregate OI, run decision engine.
    Returns the trade/silence card plus raw context.
    """
    client = get_client()
    spot, vix = client.get_spot_and_vix(symbol)
    if spot is None:
        return {"status": "error", "reason": f"Could not fetch spot for {symbol}"}

    chains = client.get_multi_expiry_chains(symbol, n_expiries=n_expiries)
    if not chains:
        return {"status": "error", "reason": "No option chain data returned from NSE"}

    oi_summary = aggregate_coi(chains, spot=spot)

    # Default RDX if none supplied (caller should pass real computed values)
    if rdx_row is None:
        rdx_row = {
            "rsi": 50.0,
            "adx": 15.0,
            "adx_slope": 0.0,
            "vwap": spot,
            "ema5": spot,
            "ema20": spot,
            "ema5_slope": 0.0,
        }

    card = run_decision_engine(
        symbol=symbol,
        spot=spot,
        india_vix=vix or 15.0,
        ivp=ivp,
        rdx_row=rdx_row,
        oi_summary=oi_summary,
        current_time=datetime.now(),
        is_index=True,
    )

    card["meta"] = {
        "spot": spot,
        "vix": vix,
        "expiries_fetched": list(chains.keys()),
        "feed": "nse-exchange",
        "fetched_at": datetime.now().isoformat(),
    }
    card["oi_summary"] = oi_summary
    return card
