import { n as TSS_SERVER_FUNCTION } from "./ssr.mjs";
import { n as SECTORS, t as NIFTY200 } from "./universe-a5BlEM7h.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/swing-scan.server-1fqy4bpQ.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
function lastReturn(closes, sessions) {
	if (closes.length <= sessions) return null;
	const last = closes[closes.length - 1];
	const prev = closes[closes.length - 1 - sessions];
	if (!prev) return null;
	return last / prev - 1;
}
function screenStock(input) {
	const closes = input.bars.map((b) => b.close);
	const highs = input.bars.map((b) => b.high);
	const lows = input.bars.map((b) => b.low);
	if (closes.length < 210) return null;
	const last = closes[closes.length - 1];
	const sma200 = mean(closes.slice(-200));
	const ema20 = ema(closes, 20);
	const ema5 = ema(closes, 5);
	const ema5Prev = ema(closes.slice(0, -3), 5);
	const rsi = rsiWilder(closes, 14);
	const adxNow = adxWilder(highs, lows, closes, 14);
	const adxPrev = adxWilder(highs.slice(0, -3), lows.slice(0, -3), closes.slice(0, -3), 14);
	if (rsi == null || adxNow == null || adxPrev == null) return null;
	const longTrend = last > sma200 && last > ema20 && input.sectorBias === "long";
	const shortTrend = last < sma200 && last < ema20 && input.sectorBias === "short" && input.fo;
	if (!longTrend && !shortTrend) return null;
	const direction = longTrend ? "LONG" : "SHORT";
	const vol20 = mean(input.bars.slice(-28, -8).map((b) => b.volume));
	const recent = input.bars.slice(-8, -1);
	const footprint = recent.some((b) => {
		const multiple = vol20 > 0 ? b.volume / vol20 : 0;
		const span = b.high - b.low;
		const loc = span > 0 ? (b.close - b.low) / span : .5;
		if (direction === "LONG") return multiple >= 1.5 && loc >= .65 && b.close > b.open;
		return multiple >= 1.5 && loc <= .35 && b.close < b.open;
	});
	const volumeMultiple = vol20 > 0 ? Math.max(...recent.map((b) => b.volume / vol20)) : 0;
	if (!footprint) return null;
	const adxRising = adxNow > 20 && adxNow > adxPrev;
	const longMom = rsi >= 55 && rsi <= 70 && adxRising && ema5 > ema20 && ema5 > ema5Prev;
	const shortMom = rsi >= 30 && rsi <= 45 && adxRising && ema5 < ema20 && ema5 < ema5Prev;
	if (direction === "LONG" && !longMom) return null;
	if (direction === "SHORT" && !shortMom) return null;
	const fib = direction === "LONG" ? longPullback(input.bars, ema5) : shortBounce(input.bars, ema5);
	if (!fib) return null;
	const entry = round2(last);
	const rv = realizedVol(closes) ?? .22;
	const rich = rv > .28;
	const step = strikeStep(entry);
	const atm = Math.round(entry / step) * step;
	let structure;
	let legs;
	let stop;
	let target;
	let trailAt;
	let riskPerShare;
	let rr;
	let premium;
	if (direction === "LONG") {
		if (!input.fo) return null;
		const hedge = bestHedge(entry, step, atr(input.bars, 14), rv);
		if (!hedge) return null;
		structure = "Buy future + buy PE";
		legs = [{
			action: "buy",
			text: `Buy future at ${entry.toLocaleString("en-IN")}`
		}, {
			action: "buy",
			text: `Buy ${hedge.strike.toLocaleString("en-IN")} PE`
		}];
		stop = round2(entry - hedge.risk);
		target = round2(entry + hedge.move);
		trailAt = round2(entry + hedge.risk * 1.5);
		riskPerShare = hedge.risk;
		rr = hedge.rr;
		premium = hedge.premium;
	} else {
		structure = rich ? "Bear call credit spread · monthly" : "Bear put debit spread · monthly";
		legs = rich ? [{
			action: "sell",
			text: `Sell ${(atm + step).toLocaleString("en-IN")} CE`
		}, {
			action: "buy",
			text: `Buy ${(atm + step * 3).toLocaleString("en-IN")} CE`
		}] : [{
			action: "buy",
			text: `Buy ${atm.toLocaleString("en-IN")} PE`
		}, {
			action: "sell",
			text: `Sell ${(atm - step).toLocaleString("en-IN")} PE`
		}];
		stop = round2(entry * 1.02);
		target = round2(entry * (1 - 6 / 100));
		trailAt = round2(entry * (1 - 3 / 100));
		riskPerShare = Math.abs(entry - stop);
		rr = 3;
		premium = 0;
	}
	const qty = riskPerShare > 0 ? Math.floor(input.capital * (2 / 100) / riskPerShare) : 0;
	if (qty < 1) return null;
	const sectorPct = (input.sectorRet * 100).toFixed(2);
	const niftyPct = (input.niftyRet * 100).toFixed(2);
	const flow = direction === "LONG" ? `Volume ${volumeMultiple.toFixed(1)}× the 20-day average and the close held the top of the bar. Futures OI is not on this feed.` : `Volume ${volumeMultiple.toFixed(1)}× the 20-day average and the close held the bottom of the bar. Futures OI is not on this feed.`;
	const rdx = direction === "LONG" ? `Spot above the 200-day average. RSI ${rsi.toFixed(1)}. ADX ${adxNow.toFixed(1)} and rising. ${input.sectorName} ${sectorPct}% vs Nifty ${niftyPct}% over 5 sessions.` : `Spot below the 200-day average. RSI ${rsi.toFixed(1)}. ADX ${adxNow.toFixed(1)} and rising. ${input.sectorName} ${sectorPct}% vs Nifty ${niftyPct}% over 5 sessions.`;
	const score = Math.min(99, Math.round(40 + Math.min(25, rr * 8) + Math.min(15, (adxNow - 20) * .6) + (fib.quality === "zone" ? 10 : 6)));
	return {
		symbol: input.symbol,
		direction,
		sector: input.sector,
		sectorName: input.sectorName,
		structure,
		score,
		entry,
		stop,
		target,
		trailAt,
		qty,
		rsi,
		adx: adxNow,
		fo: input.fo,
		rr: round2(rr),
		premium: round2(premium),
		proofs: [
			flow,
			rdx,
			fib.note
		],
		legs,
		invalidation: direction === "LONG" ? `The put caps a gap. Thesis dies on a close under the 20-day EMA. Premium is estimated from realized volatility, not the live chain.` : `Hard stop ${stop.toLocaleString("en-IN")} (+2%). Thesis dies on a close over the 20-day EMA.`,
		maxLoss: direction === "LONG" ? `Max loss ₹${Math.round(riskPerShare).toLocaleString("en-IN")} per share. If it reaches ${target.toLocaleString("en-IN")}, reward is about ₹${Math.round(target - entry - premium).toLocaleString("en-IN")} after the premium. R:R 1:${rr.toFixed(1)}.` : `₹${Math.round(qty * riskPerShare).toLocaleString("en-IN")} at 2% of capital. Target 6% is ₹${target.toLocaleString("en-IN")}.`
	};
}
function bestHedge(entry, step, dailyAtr, sigma) {
	const move = Math.max(entry * .09, dailyAtr * 4);
	const atm = Math.round(entry / step) * step;
	const strikes = [
		atm,
		atm - step,
		atm - step * 2,
		Math.round(entry * .97 / step) * step
	];
	let best = null;
	for (const strike of strikes) {
		if (strike <= 0 || strike > entry * 1.01) continue;
		const premium = bsPut(entry, strike, 25 / 365, Math.max(sigma, .12));
		if (premium <= 0) continue;
		const risk = Math.max(entry - strike, 0) + premium;
		const rr = (move - premium) / risk;
		if (rr < 2.5) continue;
		if (!best || rr > best.rr) best = {
			strike,
			premium,
			risk,
			move,
			rr
		};
	}
	return best;
}
function atr(bars, period) {
	const start = Math.max(1, bars.length - period);
	const trs = [];
	for (let i = start; i < bars.length; i++) {
		const prev = bars[i - 1].close;
		const bar = bars[i];
		trs.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev)));
	}
	return mean(trs);
}
function bsPut(spot, strike, time, sigma) {
	const rate = .065;
	const vol = sigma * Math.sqrt(time);
	if (vol <= 0) return 0;
	const d1 = (Math.log(spot / strike) + (rate + .5 * sigma * sigma) * time) / vol;
	const d2 = d1 - vol;
	return Math.max(0, strike * Math.exp(-.065 * time) * normCdf(-d2) - spot * normCdf(-d1));
}
function normCdf(x) {
	const sign = x < 0 ? -1 : 1;
	const ax = Math.abs(x) / Math.SQRT2;
	const t = 1 / (1 + .3275911 * ax);
	return .5 * (1 + sign * (1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-ax * ax)));
}
function longPullback(bars, ema5) {
	const last = bars[bars.length - 1];
	if (last.close >= last.high * .999) return null;
	const window = bars.slice(-40);
	let lowI = 0;
	for (let i = 1; i < window.length; i++) if (window[i].low < window[lowI].low) lowI = i;
	let highI = lowI;
	for (let i = lowI; i < window.length; i++) if (window[i].high > window[highI].high) highI = i;
	if (highI <= lowI) return nearEma(last.close, ema5, "LONG");
	const low = window[lowI].low;
	const high = window[highI].high;
	const span = high - low;
	if (span <= 0) return null;
	const zoneHi = high - span * .382;
	const zoneLo = high - span * .5;
	const floor = high - span * .618;
	if (last.close < floor) return null;
	const inZone = last.close <= zoneHi && last.close >= zoneLo;
	const atEma = Math.abs(last.close - ema5) / last.close < .012;
	if (!inZone && !atEma) return null;
	return {
		quality: inZone ? "zone" : "ema",
		note: inZone ? `Not the day's high. Price is inside the 38.2–50% pullback (${zoneLo.toFixed(1)}–${zoneHi.toFixed(1)}), above the 61.8% floor.` : `Not the day's high. Price is back at the 5-day EMA without breaking the 61.8% floor at ${floor.toFixed(1)}.`
	};
}
function shortBounce(bars, ema5) {
	const last = bars[bars.length - 1];
	if (last.close <= last.low * 1.001) return null;
	const window = bars.slice(-40);
	let highI = 0;
	for (let i = 1; i < window.length; i++) if (window[i].high > window[highI].high) highI = i;
	let lowI = highI;
	for (let i = highI; i < window.length; i++) if (window[i].low < window[lowI].low) lowI = i;
	if (lowI <= highI) return nearEma(last.close, ema5, "SHORT");
	const high = window[highI].high;
	const low = window[lowI].low;
	const span = high - low;
	if (span <= 0) return null;
	const zoneLo = low + span * .382;
	const zoneHi = low + span * .5;
	const ceiling = low + span * .618;
	if (last.close > ceiling) return null;
	const inZone = last.close >= zoneLo && last.close <= zoneHi;
	const atEma = Math.abs(last.close - ema5) / last.close < .012;
	if (!inZone && !atEma) return null;
	return {
		quality: inZone ? "zone" : "ema",
		note: inZone ? `Not the day's low. Price is inside the 38.2–50% bounce (${zoneLo.toFixed(1)}–${zoneHi.toFixed(1)}), under the 61.8% ceiling.` : `Not the day's low. Price is back at the 5-day EMA without clearing the 61.8% ceiling at ${ceiling.toFixed(1)}.`
	};
}
function nearEma(price, ema5, side) {
	if (Math.abs(price - ema5) / price >= .012) return null;
	return {
		quality: "ema",
		note: side === "LONG" ? "Not the day's high. Price has pulled back to the 5-day EMA." : "Not the day's low. Price has bounced into the 5-day EMA."
	};
}
function mean(values) {
	if (values.length === 0) return 0;
	return values.reduce((a, b) => a + b, 0) / values.length;
}
function ema(values, period) {
	const k = 2 / (period + 1);
	let value = mean(values.slice(0, period));
	for (const v of values.slice(period)) value = v * k + value * (1 - k);
	return value;
}
function rsiWilder(closes, period) {
	if (closes.length <= period) return null;
	let gain = 0;
	let loss = 0;
	for (let i = 1; i <= period; i++) {
		const diff = closes[i] - closes[i - 1];
		if (diff >= 0) gain += diff;
		else loss -= diff;
	}
	let avgGain = gain / period;
	let avgLoss = loss / period;
	for (let i = period + 1; i < closes.length; i++) {
		const diff = closes[i] - closes[i - 1];
		avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
		avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
	}
	if (avgLoss === 0) return 100;
	return 100 - 100 / (1 + avgGain / avgLoss);
}
function adxWilder(highs, lows, closes, period) {
	const n = closes.length;
	if (n < period * 2 + 2) return null;
	const trs = [];
	const plus = [];
	const minus = [];
	for (let i = 1; i < n; i++) {
		const up = highs[i] - highs[i - 1];
		const down = lows[i - 1] - lows[i];
		plus.push(up > down && up > 0 ? up : 0);
		minus.push(down > up && down > 0 ? down : 0);
		const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1]));
		trs.push(tr);
	}
	let atr = mean(trs.slice(0, period));
	let pdm = mean(plus.slice(0, period));
	let mdm = mean(minus.slice(0, period));
	const dx = [];
	for (let i = period; i < trs.length; i++) {
		atr = (atr * (period - 1) + trs[i]) / period;
		pdm = (pdm * (period - 1) + plus[i]) / period;
		mdm = (mdm * (period - 1) + minus[i]) / period;
		const pdi = atr ? 100 * pdm / atr : 0;
		const mdi = atr ? 100 * mdm / atr : 0;
		const sum = pdi + mdi;
		dx.push(sum ? 100 * Math.abs(pdi - mdi) / sum : 0);
	}
	if (dx.length < period) return null;
	let value = mean(dx.slice(0, period));
	for (const d of dx.slice(period)) value = (value * (period - 1) + d) / period;
	return value;
}
function realizedVol(closes) {
	const tail = closes.slice(-21);
	if (tail.length < 16) return null;
	const rets = [];
	for (let i = 1; i < tail.length; i++) rets.push(Math.log(tail[i] / tail[i - 1]));
	const m = mean(rets);
	const variance = rets.reduce((s, r) => s + (r - m) ** 2, 0) / (rets.length - 1);
	return Math.sqrt(variance) * Math.sqrt(252);
}
function strikeStep(price) {
	if (price >= 5e3) return 100;
	if (price >= 1e3) return 50;
	if (price >= 200) return 10;
	return 5;
}
function round2(n) {
	return Math.round(n * 100) / 100;
}
var cache = /* @__PURE__ */ new Map();
async function loadSwingScan(capital) {
	const cap = Math.max(1e4, Math.round(capital || 5e5));
	const hit = cache.get(cap);
	if (hit && Date.now() - hit.at < 6e5) return hit.scan;
	const niftyRet = lastReturn((await fetchBars("^NSEI", "1d", "1y")).map((b) => b.close), 5) ?? 0;
	const sectorBars = await mapPool(Object.keys(SECTORS), 6, async (id) => {
		return [id, await fetchBars(SECTORS[id].ticker, "1d", "6mo")];
	});
	const sectors = [];
	for (const [id, bars] of sectorBars) {
		const ret = lastReturn(bars.map((b) => b.close), 5);
		if (ret == null) continue;
		const vs = ret - niftyRet;
		const bias = vs > .0015 ? "long" : vs < -.0015 ? "short" : "flat";
		sectors.push({
			id,
			name: SECTORS[id].name,
			ret,
			vsNifty: vs,
			bias
		});
	}
	sectors.sort((a, b) => b.vsNifty - a.vsNifty);
	const biasOf = new Map(sectors.map((s) => [s.id, s]));
	const names = NIFTY200.filter((s) => {
		const b = biasOf.get(s.sector);
		return b && b.bias !== "flat";
	});
	const cards = (await mapPool(names, 8, async (stock) => {
		const sector = biasOf.get(stock.sector);
		if (!sector || sector.bias === "flat") return null;
		const bars = await fetchBars(`${stock.symbol}.NS`, "1d", "2y");
		if (bars.length < 210) return null;
		return screenStock({
			symbol: stock.symbol,
			sector: stock.sector,
			sectorName: sector.name,
			fo: stock.fo,
			bars,
			sectorBias: sector.bias,
			sectorRet: sector.ret,
			niftyRet,
			capital: cap
		});
	})).filter((card) => card != null);
	const skipped = names.length - cards.length;
	const longs = cards.filter((c) => c.direction === "LONG").sort((a, b) => b.rr - a.rr);
	const shorts = cards.filter((c) => c.direction === "SHORT").sort((a, b) => b.score - a.score);
	const scan = {
		scanned: names.length,
		skipped,
		longs,
		shorts,
		sectors,
		session: sessionLabel(),
		note: "Sectors are ranked on the last 5 sessions versus the Nifty. A card needs the trend, a heavy directional volume day, RSI/ADX alignment, and a pullback that is not a chase. Delivery percentage, futures open interest, earnings dates, and ASM/GSM are not on this price feed, so those checks are not invented.",
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
	cache.set(cap, {
		at: Date.now(),
		scan
	});
	return scan;
}
async function fetchBars(ticker, interval, range) {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; CuePro/1.0)",
				Accept: "application/json"
			},
			signal: AbortSignal.timeout(12e3)
		});
		if (!res.ok) return [];
		const result = (await res.json()).chart?.result?.[0];
		const ts = result?.timestamp ?? [];
		const q = result?.indicators?.quote?.[0];
		if (!q) return [];
		const bars = [];
		for (let i = 0; i < ts.length; i++) {
			const open = q.open?.[i];
			const high = q.high?.[i];
			const low = q.low?.[i];
			const close = q.close?.[i];
			if (open == null || high == null || low == null || close == null) continue;
			bars.push({
				time: ts[i],
				open,
				high,
				low,
				close,
				volume: q.volume?.[i] ?? 0
			});
		}
		return bars;
	} catch {
		return [];
	}
}
async function mapPool(items, limit, job) {
	const out = [];
	let index = 0;
	async function worker() {
		while (index < items.length) {
			const current = index;
			index += 1;
			out[current] = await job(items[current]);
		}
	}
	await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
	return out;
}
function sessionLabel() {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: "Asia/Kolkata",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23",
		weekday: "short"
	}).formatToParts(/* @__PURE__ */ new Date());
	const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
	const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
	const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
	const mins = hour * 60 + minute;
	if (weekday === "Sat" || weekday === "Sun") return "Market closed — daily swing read";
	if (mins < 615) return "Before 10:15 IST — cards stay queued";
	if (mins > 930) return "Market closed — daily swing read";
	return "Session live";
}
async function loadSymbolSwing(symbol, capital) {
	const stock = NIFTY200.find((row) => row.symbol === symbol);
	if (!stock) return null;
	const cap = Math.max(1e4, Math.round(capital || 5e5));
	const [niftyBars, sectorBars, bars] = await Promise.all([
		fetchBars("^NSEI", "1d", "1y"),
		fetchBars(SECTORS[stock.sector].ticker, "1d", "6mo"),
		fetchBars(`${stock.symbol}.NS`, "1d", "2y")
	]);
	const niftyRet = lastReturn(niftyBars.map((b) => b.close), 5) ?? 0;
	const sectorRet = lastReturn(sectorBars.map((b) => b.close), 5);
	if (sectorRet == null || bars.length < 210) return null;
	const vs = sectorRet - niftyRet;
	const bias = vs > .0015 ? "long" : vs < -.0015 ? "short" : "flat";
	if (bias === "flat") return null;
	return screenStock({
		symbol: stock.symbol,
		sector: stock.sector,
		sectorName: SECTORS[stock.sector].name,
		fo: stock.fo,
		bars,
		sectorBias: bias,
		sectorRet,
		niftyRet,
		capital: cap
	});
}
//#endregion
export { loadSwingScan as n, loadSymbolSwing as r, createServerRpc as t };
