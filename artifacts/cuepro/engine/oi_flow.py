"""
CUE-PRO Institutional Order Flow Module
Multi-expiry COI aggregation, wall detection, and stock institutional footprints.
"""

from typing import Dict, List, Optional, Any
import pandas as pd
import numpy as np


def aggregate_coi(
    chains: Dict[str, pd.DataFrame],
    spot: float,
) -> Dict[str, Any]:
    """
    Aggregate Change-in-OI across multiple expiries for an index.

    chains: dict of expiry_label -> DataFrame with columns:
            strike, call_oi, put_oi, call_coi, put_coi (and optionally ltp, iv)
    Returns summary of walls, ratios, and net COI.
    """
    total_put_coi_below = 0.0
    total_call_coi_above = 0.0
    total_put_coi = 0.0
    total_call_coi = 0.0

    put_wall_strike = None
    put_wall_coi = -np.inf
    call_wall_strike = None
    call_wall_coi = -np.inf

    for expiry, df in chains.items():
        if df.empty:
            continue
        # Puts below spot
        puts_below = df[df["strike"] < spot]
        calls_above = df[df["strike"] > spot]

        total_put_coi_below += puts_below["put_coi"].sum()
        total_call_coi_above += calls_above["call_coi"].sum()
        total_put_coi += df["put_coi"].sum()
        total_call_coi += df["call_coi"].sum()

        # Highest put wall (by absolute COI added)
        if not puts_below.empty:
            idx = puts_below["put_coi"].idxmax()
            if puts_below.loc[idx, "put_coi"] > put_wall_coi:
                put_wall_coi = puts_below.loc[idx, "put_coi"]
                put_wall_strike = puts_below.loc[idx, "strike"]

        if not calls_above.empty:
            idx = calls_above["call_coi"].idxmax()
            if calls_above.loc[idx, "call_coi"] > call_wall_coi:
                call_wall_coi = calls_above.loc[idx, "call_coi"]
                call_wall_strike = calls_above.loc[idx, "strike"]

    put_call_ratio = (
        total_put_coi_below / total_call_coi_above
        if total_call_coi_above > 0
        else np.inf
    )
    call_put_ratio = (
        total_call_coi_above / total_put_coi_below
        if total_put_coi_below > 0
        else np.inf
    )

    # Unwinding if both net negative
    unwinding = (total_put_coi < 0) and (total_call_coi < 0)

    bullish_wall = put_call_ratio > 1.3 and not unwinding
    bearish_wall = call_put_ratio > 1.3 and not unwinding

    return {
        "put_wall_strike": put_wall_strike,
        "put_wall_coi": put_wall_coi if put_wall_coi > -np.inf else 0,
        "call_wall_strike": call_wall_strike,
        "call_wall_coi": call_wall_coi if call_wall_coi > -np.inf else 0,
        "put_coi_below": total_put_coi_below,
        "call_coi_above": total_call_coi_above,
        "put_call_ratio": put_call_ratio,
        "call_put_ratio": call_put_ratio,
        "bullish_wall": bullish_wall,
        "bearish_wall": bearish_wall,
        "unwinding": unwinding,
        "total_put_coi": total_put_coi,
        "total_call_coi": total_call_coi,
    }


def stock_institutional_footprint(
    futures_price_change: float,
    futures_oi_change: float,
    delivery_pct: float,
    atm_put_coi: float = 0.0,
    atm_call_coi: float = 0.0,
) -> Dict[str, bool]:
    """
    Detect bullish/bearish institutional footprint for Nifty 200 stocks.
    """
    long_buildup = (futures_price_change > 0) and (futures_oi_change > 0)
    short_buildup = (futures_price_change < 0) and (futures_oi_change > 0)

    bullish = long_buildup and (delivery_pct > 45) and (atm_put_coi > 0)
    bearish = short_buildup and (atm_call_coi > 0)

    return {
        "long_buildup": long_buildup,
        "short_buildup": short_buildup,
        "bullish_footprint": bullish,
        "bearish_footprint": bearish,
        "delivery_ok": delivery_pct > 45,
    }
