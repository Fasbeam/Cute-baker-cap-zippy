"""
CUE-PRO FastAPI Backend
Exposes live decision cards and market pulse.
Run with: uvicorn cuepro.api.main:app --reload --port 8000
"""

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import logging
from datetime import datetime, timedelta
import random
from pathlib import Path

from ..data.live import live_index_snapshot
from ..data.nse_feed import get_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="CUE-PRO",
    description="Indian Markets Confluence & Risk-Managed Trading Engine",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the prototype UI
UI_DIR = Path(__file__).resolve().parent.parent.parent / "ui"
if UI_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(UI_DIR)), name="static")


@app.get("/")
async def root():
    """Serve the main dashboard."""
    index = UI_DIR / "index.html"
    if index.exists():
        return FileResponse(index)
    return {"service": "CUE-PRO", "status": "ok", "note": "UI not found"}


@app.get("/api/card")
async def get_card(
    symbol: str = Query("NIFTY", description="NIFTY, BANKNIFTY, FINNIFTY"),
    n_expiries: int = Query(3, ge=1, le=5),
    ivp: float = Query(40.0, description="IV Percentile (0-100)"),
):
    """Live confluence card (signal or silence) from NSE feed."""
    try:
        card = live_index_snapshot(
            symbol=symbol.upper(),
            n_expiries=n_expiries,
            ivp=ivp,
        )
        return card
    except Exception as e:
        logger.exception("Card generation failed")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "reason": str(e)},
        )


@app.get("/api/pulse")
async def market_pulse():
    """Top bar data: Nifty, Bank Nifty, VIX + regime hint."""
    try:
        client = get_client()
        indices = client.get_indices()
        nifty = None
        bank = None
        vix = None
        for k, v in indices.items():
            ku = k.upper()
            if "NIFTY 50" in ku or ku == "NIFTY":
                nifty = v
            elif "BANK" in ku:
                bank = v
            elif "VIX" in ku:
                vix = v
        regime = "credit_friendly" if (vix and vix.get("last", 0) > 15) else "debit_friendly"
        return {
            "nifty": nifty,
            "banknifty": bank,
            "vix": vix,
            "regime": regime,
            "feed": "nse",
        }
    except Exception as e:
        logger.exception("Pulse failed")
        return JSONResponse(
            status_code=503,
            content={"status": "error", "reason": str(e)},
        )


@app.get("/api/chain")
async def get_chain(
    symbol: str = Query("NIFTY"),
    expiry: Optional[str] = None,
):
    """Raw option chain DataFrame as records (for debugging / UI charts)."""
    try:
        client = get_client()
        df = client.get_option_chain(symbol.upper(), expiry=expiry)
        if df is None or df.empty:
            return {"status": "error", "reason": "No chain data"}
        return {
            "symbol": symbol.upper(),
            "expiry": df["expiry"].iloc[0] if "expiry" in df.columns else expiry,
            "records": df.to_dict(orient="records"),
        }
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "error", "reason": str(e)},
        )


@app.get("/api/candles")
async def get_candles(
    symbol: str = Query("NIFTY"),
    bars: int = Query(60, ge=10, le=200),
):
    """
    Recent price candles for the chart.
    Currently returns demo candles centered on live spot so the UI works immediately.
    Replace the generator with a real OHLCV source (Kite, Upstox, Dhan, etc.) later.
    """
    try:
        client = get_client()
        spot, _ = client.get_spot_and_vix(symbol.upper())
        if spot is None:
            spot = 25000.0 if symbol.upper() == "NIFTY" else 52000.0

        # Demo candles: random walk around current spot
        candles = []
        price = spot * 0.998
        now = datetime.now()
        for i in range(bars):
            ts = int((now - timedelta(minutes=5 * (bars - i))).timestamp())
            o = price
            change = random.uniform(-0.0015, 0.0015) * price
            c = price + change
            h = max(o, c) + abs(random.uniform(0, 0.0008) * price)
            l = min(o, c) - abs(random.uniform(0, 0.0008) * price)
            vol = random.randint(80000, 250000)
            candles.append({
                "time": ts,
                "open": round(o, 2),
                "high": round(h, 2),
                "low": round(l, 2),
                "close": round(c, 2),
                "volume": vol,
            })
            price = c

        # Force last close to live spot
        if candles:
            candles[-1]["close"] = round(spot, 2)
            candles[-1]["high"] = max(candles[-1]["high"], spot)
            candles[-1]["low"] = min(candles[-1]["low"], spot)

        return {
            "symbol": symbol.upper(),
            "spot": spot,
            "candles": candles,
            "note": "demo data — wire real OHLCV source for production",
        }
    except Exception as e:
        logger.exception("Candles failed")
        return JSONResponse(status_code=503, content={"status": "error", "reason": str(e)})
