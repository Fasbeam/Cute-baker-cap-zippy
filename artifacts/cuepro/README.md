# CUE-PRO Python Quant Engine + Live NSE Feed

Core calculation logic + live exchange data for the 5-pillar decision engine.

## Modules

- `indicators/rdx.py` — RSI, ADX, EMA, VWAP, Fibonacci, `compute_rdx()`
- `engine/oi_flow.py` — multi-expiry COI aggregation & stock institutional footprints
- `engine/strategy.py` — regime, RDX tape, time/event shield, strategy matrix, `run_decision_engine()`
- `data/nse_feed.py` — cookie-bootstrapped NSE client (`option-chain-v3` + `allIndices`)
- `data/live.py` — `live_index_snapshot()` that wires feed → engine

## Live Usage

```python
from cuepro import live_index_snapshot, get_client

# One-shot decision card from live NSE data
card = live_index_snapshot(symbol="NIFTY", n_expiries=3, ivp=48.0)
print(card["status"], card.get("strategy"), card.get("reason"))
print(card.get("meta"))

# Or lower-level
client = get_client()
spot, vix = client.get_spot_and_vix("BANKNIFTY")
chains = client.get_multi_expiry_chains("BANKNIFTY", n_expiries=2)
print(list(chains.keys()), spot, vix)
```

## Notes

- NSE does not publish an official public API. The client bootstraps cookies from the option-chain page and uses the current v3 endpoints.
- Calls can be rate-limited or blocked from datacenter IPs. The client retries once with fresh cookies.
- Outside market hours you receive the last print.
- IVP and full RDX must be supplied by the caller (or computed from historical OHLCV) for highest accuracy; defaults are provided for quick tests.
- All ideas remain strictly defined-risk.