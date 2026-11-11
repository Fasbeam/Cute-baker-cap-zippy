# CUE-PRO — Full Functional App

Indian Markets Confluence & Risk-Managed Trading Engine  
(Cute Trader Pro)

## Features
- Live NSE option-chain + indices feed (cookie-bootstrapped)
- 5-pillar decision engine (Time/Event shield, VIX regime, Institutional OI, RDX, confluence)
- Defined-risk trade cards only (spreads, iron condors, hedged futures) or elegant Silence
- FastAPI backend
- Single-page dashboard with:
  - Market Pulse (Nifty, Bank Nifty, VIX + regime)
  - TradingView Lightweight Charts: Price + VWAP/EMAs and OI Walls by strike
  - Cue Cards feed
  - Position sizing calculator
- Soft cute pastel theme

## Quick Start

```bash
cd /workspace/artifacts
chmod +x run.sh
./run.sh
```

Or manually:

```bash
pip install -r requirements.txt
uvicorn cuepro.api.main:app --host 0.0.0.0 --port 8000 --reload
```

Open **http://localhost:8000** in your browser.

## Project Layout

```
artifacts/
├── cuepro/                 # Python package
│   ├── indicators/         # RDX (RSI, ADX, EMA, VWAP…)
│   ├── engine/             # OI flow + strategy matrix
│   ├── data/               # Live NSE feed
│   └── api/main.py         # FastAPI app (serves UI + endpoints)
├── ui/index.html           # Dashboard
├── requirements.txt
├── run.sh
└── CUE-PRO-PRD.md
```

## Notes
- NSE does not publish an official public API. The client uses current browser endpoints and may be rate-limited or blocked from some IPs.
- Price candles are currently demo data centered on the live spot. Replace `/api/candles` with a real OHLCV source (Kite, Upstox, Dhan, etc.) for production.
- Outside market hours you see the last official print.
- All ideas are strictly defined-risk; naked futures / naked OTM buying are never generated.

## Endpoints
- `GET /` — Dashboard
- `GET /api/card?symbol=NIFTY`
- `GET /api/pulse`
- `GET /api/chain?symbol=BANKNIFTY`
- `GET /api/candles?symbol=NIFTY&bars=80`
