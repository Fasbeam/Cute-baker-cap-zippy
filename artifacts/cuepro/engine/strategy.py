"""
CUE-PRO Strategy Selector & Decision Engine
Implements volatility regime, 5-pillar gating, and the Strategy Selection Matrix.
Outputs either a trade card dict or a silence reason.
"""

from typing import Dict, Any, Optional
from datetime import datetime, time
import pandas as pd


class VolatilityRegime:
    CREDIT_FRIENDLY = "credit_friendly"   # High VIX / high IVP
    DEBIT_FRIENDLY = "debit_friendly"     # Low/normal VIX


def classify_regime(india_vix: float, ivp: float) -> str:
    """Pillar 2: Volatility Regime Engine."""
    if india_vix > 15 or ivp > 45:
        return VolatilityRegime.CREDIT_FRIENDLY
    return VolatilityRegime.DEBIT_FRIENDLY


def classify_rdx_tape(rsi: float, adx: float, adx_slope: float,
                      price: float, vwap: float, ema5: float, ema20: float,
                      ema5_slope: float) -> str:
    """
    Pillar 4: RDX Momentum Matrix.
    Returns: 'quiet', 'uptrend', 'downtrend', or 'mixed'
    """
    if 40 <= rsi <= 60 and adx < 20:
        return "quiet"
    if (55 <= rsi <= 72 and adx > 20 and adx_slope > 0
            and price > vwap and price > ema20 and ema5_slope > 0 and ema5 > ema20):
        return "uptrend"
    if (28 <= rsi <= 45 and adx > 20 and adx_slope > 0
            and price < vwap and price < ema20 and ema5_slope < 0 and ema5 < ema20):
        return "downtrend"
    return "mixed"


def time_event_shield(
    current_time: datetime,
    is_opening_window: bool = False,
    near_intraday_high: bool = False,
    near_intraday_low: bool = False,
    earnings_lock: bool = False,
    central_bank_lock: bool = False,
) -> Optional[str]:
    """
    Pillar 1: Pre-filter. Returns silence reason or None if passed.
    """
    if is_opening_window or (time(9, 15) <= current_time.time() <= time(10, 15)):
        return "Opening Stabilization Lock (09:15–10:15 IST)"
    if near_intraday_high:
        return "Chasing Prevention: price too close to intraday high"
    if near_intraday_low:
        return "Chasing Prevention: price too close to intraday low"
    if earnings_lock:
        return "Earnings Lock: within 3 trading days of results"
    if central_bank_lock:
        return "Central Bank Policy Lock (RBI/Fed window)"
    return None


def select_strategy(
    symbol: str,
    spot: float,
    regime: str,
    tape: str,
    oi_summary: Dict[str, Any],
    is_index: bool = True,
    expiry: str = "current_weekly",
    confluence_score: int = 0,
) -> Dict[str, Any]:
    """
    Strategy Selection Matrix.
    Returns a trade card dict or a silence card.
    """
    # Mandatory defined-risk only
    card = {
        "symbol": symbol,
        "spot": spot,
        "regime": regime,
        "tape": tape,
        "expiry": expiry,
        "confluence_score": confluence_score,
        "status": "silence",
        "reason": "Pillars did not fully align",
        "strategy": None,
        "legs": [],
        "max_profit": None,
        "max_loss": None,
        "breakeven": None,
        "invalidation": None,
        "why": [],
    }

    if oi_summary.get("unwinding") and regime == VolatilityRegime.CREDIT_FRIENDLY:
        card["reason"] = "Unwinding detected — credit spreads suppressed"
        return card

    # Quiet + High IVP paths
    if tape == "quiet" and regime == VolatilityRegime.CREDIT_FRIENDLY:
        if oi_summary.get("bullish_wall"):
            put_wall = oi_summary.get("put_wall_strike")
            hedge = put_wall - 200 if is_index else put_wall - 150  # simplified
            card.update({
                "status": "signal",
                "strategy": "Bull Put Credit Spread",
                "legs": [
                    {"action": "sell", "type": "PE", "strike": put_wall},
                    {"action": "buy", "type": "PE", "strike": hedge},
                ],
                "why": [
                    f"Put wall at {put_wall} with strong COI",
                    f"Quiet tape + Credit-friendly regime (VIX/IVP)",
                    "Defined-risk credit structure",
                ],
            })
        elif oi_summary.get("bearish_wall"):
            call_wall = oi_summary.get("call_wall_strike")
            hedge = call_wall + 200 if is_index else call_wall + 150
            card.update({
                "status": "signal",
                "strategy": "Bear Call Credit Spread",
                "legs": [
                    {"action": "sell", "type": "CE", "strike": call_wall},
                    {"action": "buy", "type": "CE", "strike": hedge},
                ],
                "why": [
                    f"Call wall at {call_wall} with strong COI",
                    f"Quiet tape + Credit-friendly regime",
                    "Defined-risk credit structure",
                ],
            })
        elif oi_summary.get("put_wall_strike") and oi_summary.get("call_wall_strike"):
            # Balanced walls → Iron Condor
            card.update({
                "status": "signal",
                "strategy": "Iron Condor",
                "legs": [
                    {"action": "sell", "type": "PE", "strike": oi_summary["put_wall_strike"]},
                    {"action": "buy", "type": "PE", "strike": oi_summary["put_wall_strike"] - 200},
                    {"action": "sell", "type": "CE", "strike": oi_summary["call_wall_strike"]},
                    {"action": "buy", "type": "CE", "strike": oi_summary["call_wall_strike"] + 200},
                ],
                "why": [
                    "Balanced OI walls",
                    "Quiet tape + High IVP — premium harvest",
                    "Hard-capped iron condor",
                ],
            })

    # Strong trend + debit-friendly
    elif tape == "uptrend" and regime == VolatilityRegime.DEBIT_FRIENDLY and oi_summary.get("bullish_wall"):
        atm = round(spot / 50) * 50 if is_index else round(spot / 10) * 10
        card.update({
            "status": "signal",
            "strategy": "Bull Call Debit Spread",
            "legs": [
                {"action": "buy", "type": "CE", "strike": atm},
                {"action": "sell", "type": "CE", "strike": atm + (200 if is_index else 50)},
            ],
            "why": [
                "Confirmed uptrend (RDX)",
                "Bullish OI wall + Debit-friendly regime",
                "Defined-risk debit spread",
            ],
        })

    elif tape == "downtrend" and regime == VolatilityRegime.DEBIT_FRIENDLY and oi_summary.get("bearish_wall"):
        atm = round(spot / 50) * 50 if is_index else round(spot / 10) * 10
        card.update({
            "status": "signal",
            "strategy": "Bear Put Debit Spread",
            "legs": [
                {"action": "buy", "type": "PE", "strike": atm},
                {"action": "sell", "type": "PE", "strike": atm - (200 if is_index else 50)},
            ],
            "why": [
                "Confirmed downtrend (RDX)",
                "Bearish OI wall + Debit-friendly regime",
                "Defined-risk debit spread",
            ],
        })

    if card["status"] == "signal":
        card["reason"] = None
        # Placeholder risk numbers — to be filled by pricing engine
        card["max_profit"] = "calc_from_chain"
        card["max_loss"] = "hard_capped"
        card["breakeven"] = "calc_from_legs"
        card["invalidation"] = "spot_close_beyond_wall_or_50pct_debit"

    return card


def run_decision_engine(
    symbol: str,
    spot: float,
    india_vix: float,
    ivp: float,
    rdx_row: Dict[str, float],          # latest values from compute_rdx
    oi_summary: Dict[str, Any],
    current_time: datetime,
    is_index: bool = True,
    earnings_lock: bool = False,
    central_bank_lock: bool = False,
    near_high: bool = False,
    near_low: bool = False,
) -> Dict[str, Any]:
    """
    Full 5-pillar sequential gate.
    Returns trade card or silence card with exact reason.
    """
    # Pillar 1
    shield = time_event_shield(
        current_time,
        near_intraday_high=near_high,
        near_intraday_low=near_low,
        earnings_lock=earnings_lock,
        central_bank_lock=central_bank_lock,
    )
    if shield:
        return {
            "status": "silence",
            "reason": shield,
            "symbol": symbol,
            "pillar_failed": 1,
        }

    # Pillar 2
    regime = classify_regime(india_vix, ivp)

    # Pillar 4 (RDX) — Pillar 3 is already in oi_summary
    tape = classify_rdx_tape(
        rsi=rdx_row.get("rsi", 50),
        adx=rdx_row.get("adx", 15),
        adx_slope=rdx_row.get("adx_slope", 0),
        price=spot,
        vwap=rdx_row.get("vwap", spot),
        ema5=rdx_row.get("ema5", spot),
        ema20=rdx_row.get("ema20", spot),
        ema5_slope=rdx_row.get("ema5_slope", 0),
    )

    # Simple confluence score (weights from PRD: OI 50%, RDX 30%, others 20%)
    score = 0
    if oi_summary.get("bullish_wall") or oi_summary.get("bearish_wall"):
        score += 50
    if tape in ("uptrend", "downtrend", "quiet"):
        score += 30
    if not oi_summary.get("unwinding"):
        score += 10
    if regime:
        score += 10

    # Pillar 5 is swing-only and would be applied by caller for multi-TF check
    card = select_strategy(
        symbol=symbol,
        spot=spot,
        regime=regime,
        tape=tape,
        oi_summary=oi_summary,
        is_index=is_index,
        confluence_score=score,
    )
    card["pillar_failed"] = None if card["status"] == "signal" else "matrix"
    card["regime"] = regime
    card["tape"] = tape
    return card
