//#region node_modules/.nitro/vite/services/ssr/assets/market-JpPq8U5D.js
var SYMBOLS = [
	"NIFTY",
	"BANKNIFTY",
	"FINNIFTY"
];
function parseSymbol(value) {
	const raw = String(value ?? "NIFTY").toUpperCase();
	if (raw === "BANKNIFTY" || raw === "FINNIFTY") return raw;
	return "NIFTY";
}
var BASE = {
	NIFTY: 24980,
	BANKNIFTY: 52150,
	FINNIFTY: 23420
};
function fallbackSnapshot(symbol) {
	const spot = BASE[symbol];
	const candles = walk(spot, 80);
	const vix = 16.4;
	const chain = modelChain(spot);
	return {
		symbol,
		spot,
		change: -18.4,
		changePct: -.07,
		vix,
		nifty: {
			last: BASE.NIFTY,
			change: -12,
			changePct: -.05
		},
		bank: {
			last: BASE.BANKNIFTY,
			change: -40,
			changePct: -.08
		},
		candles,
		chain,
		card: decide(symbol, spot, vix, candles, chain),
		source: "fallback",
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
function walk(spot, bars) {
	const out = [];
	let price = spot * .997;
	const now = Math.floor(Date.now() / 1e3);
	for (let i = bars; i >= 0; i--) {
		const open = price;
		const close = price * (1 + (i % 7 - 3) * 35e-5);
		out.push({
			time: now - i * 300,
			open: round2(open),
			high: round2(Math.max(open, close) * 1.0004),
			low: round2(Math.min(open, close) * .9996),
			close: round2(close),
			volume: 9e4 + i % 11 * 4e3
		});
		price = close;
	}
	const last = out[out.length - 1];
	if (last) {
		last.close = round2(spot);
		last.high = Math.max(last.high, last.close);
		last.low = Math.min(last.low, last.close);
	}
	return out;
}
function modelChain(spot) {
	const step = spot > 4e4 ? 100 : 50;
	const atm = Math.round(spot / step) * step;
	const rows = [];
	for (let i = -12; i <= 12; i++) {
		const base = Math.round(12e5 * Math.exp(-Math.abs(i) * .32));
		rows.push({
			strike: atm + i * step,
			putOi: Math.round(base * (i <= 0 ? 1.35 : .62)),
			callOi: Math.round(base * (i >= 0 ? 1.35 : .62))
		});
	}
	return rows;
}
function ema(values, period) {
	const k = 2 / (period + 1);
	let value = values[0] ?? 0;
	for (const v of values) value = v * k + value * (1 - k);
	return value;
}
function decide(symbol, spot, vix, candles, chain) {
	const closes = candles.map((c) => c.close);
	const ema5 = ema(closes, 5);
	const ema20 = ema(closes, 20);
	const last = closes[closes.length - 1] ?? spot;
	const prev = closes[Math.max(0, closes.length - 6)] ?? last;
	const drift = Math.abs(last - prev) / Math.max(prev, 1);
	const regime = vix > 15 ? "credit" : "debit";
	const quiet = drift < .004;
	const up = last > ema20 && ema5 > ema20;
	const tape = quiet ? "quiet" : up ? "uptrend" : last < ema20 && ema5 < ema20 ? "downtrend" : "mixed";
	const putWall = chain.reduce((a, b) => a.putOi > b.putOi ? a : b);
	const callWall = chain.reduce((a, b) => a.callOi > b.callOi ? a : b);
	const step = spot > 4e4 ? 100 : 50;
	if (regime === "credit" && quiet && putWall.putOi > callWall.callOi * 1.05) return {
		status: "signal",
		strategy: `${symbol} bull put credit spread`,
		score: 78,
		regime,
		tape,
		why: [
			`Put interest stacks at ${putWall.strike.toLocaleString("en-IN")}.`,
			`India VIX ${vix.toFixed(2)} — credit structure preferred.`,
			"Defined risk only. Not a SEBI recommendation."
		],
		legs: [{
			action: "sell",
			type: "PE",
			strike: putWall.strike
		}, {
			action: "buy",
			type: "PE",
			strike: putWall.strike - step * 4
		}]
	};
	if (regime === "debit" && up) {
		const atm = Math.round(spot / step) * step;
		return {
			status: "signal",
			strategy: `${symbol} bull call debit spread`,
			score: 71,
			regime,
			tape,
			why: [
				"Price is holding above the 20-bar average.",
				`India VIX ${vix.toFixed(2)} — debit structure preferred.`,
				"Defined risk only. Not a SEBI recommendation."
			],
			legs: [{
				action: "buy",
				type: "CE",
				strike: atm
			}, {
				action: "sell",
				type: "CE",
				strike: atm + step * 4
			}]
		};
	}
	return {
		status: "silence",
		reason: quiet ? "Walls are balanced. Waiting for a clearer side." : regime === "credit" ? "Tape is moving. Credit spreads stay off until it quiets." : "Trend and volatility do not agree yet.",
		regime,
		tape
	};
}
function round2(n) {
	return Math.round(n * 100) / 100;
}
//#endregion
export { parseSymbol as a, modelChain as i, decide as n, fallbackSnapshot as r, SYMBOLS as t };
