# CUE-PRO API + Prototype UI

## Run the backend

```bash
cd /workspace/artifacts
pip install fastapi uvicorn requests pandas numpy
uvicorn cuepro.api.main:app --reload --host 0.0.0.0 --port 8000
```

Endpoints:
- `GET /api/card?symbol=NIFTY&n_expiries=3&ivp=48`
- `GET /api/pulse`
- `GET /api/chain?symbol=BANKNIFTY`

## Open the prototype UI

Open `ui/index.html` in a browser (or serve it).

It expects the API at `http://localhost:8000`.  
If you host the API elsewhere, edit the `API` constant at the top of the `<script>` in `ui/index.html`.

The UI shows:
- Market Pulse bar (Nifty, Bank Nifty, VIX + regime)
- Live Cue Cards (signal or elegant Silence state)
- Simple position-sizing calculator
- Cute pastel theme
