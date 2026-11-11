"""
CUE-PRO Indicators Module
Pure pandas/numpy implementations of RDX components (RSI, ADX, EMAs, VWAP, Fibonacci).
No external TA-Lib dependency required for core logic.
"""

import pandas as pd
import numpy as np
from typing import Tuple, Optional


def ema(series: pd.Series, period: int) -> pd.Series:
    """Exponential Moving Average."""
    return series.ewm(span=period, adjust=False).mean()


def sma(series: pd.Series, period: int) -> pd.Series:
    """Simple Moving Average."""
    return series.rolling(window=period).mean()


def rsi(series: pd.Series, period: int = 14) -> pd.Series:
    """Relative Strength Index (Wilder's smoothing)."""
    delta = series.diff()
    gain = delta.clip(lower=0)
    loss = -delta.clip(upper=0)
    avg_gain = gain.ewm(alpha=1/period, adjust=False).mean()
    avg_loss = loss.ewm(alpha=1/period, adjust=False).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    return 100 - (100 / (1 + rs))


def true_range(high: pd.Series, low: pd.Series, close: pd.Series) -> pd.Series:
    """True Range."""
    prev_close = close.shift(1)
    tr1 = high - low
    tr2 = (high - prev_close).abs()
    tr3 = (low - prev_close).abs()
    return pd.concat([tr1, tr2, tr3], axis=1).max(axis=1)


def adx(high: pd.Series, low: pd.Series, close: pd.Series, period: int = 14) -> pd.Series:
    """Average Directional Index (simplified Wilder method)."""
    tr = true_range(high, low, close)
    up_move = high - high.shift(1)
    down_move = low.shift(1) - low

    plus_dm = np.where((up_move > down_move) & (up_move > 0), up_move, 0.0)
    minus_dm = np.where((down_move > up_move) & (down_move > 0), down_move, 0.0)

    plus_dm = pd.Series(plus_dm, index=high.index)
    minus_dm = pd.Series(minus_dm, index=high.index)

    atr = tr.ewm(alpha=1/period, adjust=False).mean()
    plus_di = 100 * (plus_dm.ewm(alpha=1/period, adjust=False).mean() / atr.replace(0, np.nan))
    minus_di = 100 * (minus_dm.ewm(alpha=1/period, adjust=False).mean() / atr.replace(0, np.nan))

    dx = 100 * (plus_di - minus_di).abs() / (plus_di + minus_di).replace(0, np.nan)
    return dx.ewm(alpha=1/period, adjust=False).mean()


def vwap(high: pd.Series, low: pd.Series, close: pd.Series, volume: pd.Series) -> pd.Series:
    """Volume Weighted Average Price (intraday cumulative)."""
    typical = (high + low + close) / 3
    cum_vol = volume.cumsum()
    cum_tpv = (typical * volume).cumsum()
    return cum_tpv / cum_vol.replace(0, np.nan)


def fibonacci_levels(swing_high: float, swing_low: float) -> dict:
    """Calculate key Fibonacci retracement levels from a swing."""
    diff = swing_high - swing_low
    return {
        "0.0": swing_high,
        "23.6": swing_high - 0.236 * diff,
        "38.2": swing_high - 0.382 * diff,
        "50.0": swing_high - 0.5 * diff,
        "61.8": swing_high - 0.618 * diff,
        "78.6": swing_high - 0.786 * diff,
        "100.0": swing_low,
    }


def compute_rdx(
    df: pd.DataFrame,
    rsi_period: int = 14,
    adx_period: int = 14,
    ema_fast: int = 5,
    ema_slow: int = 20,
    sma_200: int = 200,
) -> pd.DataFrame:
    """
    Compute full RDX feature set on an OHLCV DataFrame.
    Expected columns: open, high, low, close, volume (lowercase).
    """
    out = df.copy()
    out["rsi"] = rsi(out["close"], rsi_period)
    out["adx"] = adx(out["high"], out["low"], out["close"], adx_period)
    out["ema5"] = ema(out["close"], ema_fast)
    out["ema20"] = ema(out["close"], ema_slow)
    out["sma200"] = sma(out["close"], sma_200)
    out["vwap"] = vwap(out["high"], out["low"], out["close"], out["volume"])

    # Slopes (simple difference of last 3 bars)
    out["ema5_slope"] = out["ema5"].diff(3)
    out["ema20_slope"] = out["ema20"].diff(3)
    out["adx_slope"] = out["adx"].diff(3)

    return out
