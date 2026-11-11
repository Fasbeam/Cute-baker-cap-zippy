import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { a as parseSymbol, i as modelChain, n as decide, r as fallbackSnapshot } from "./market-JpPq8U5D.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/market.functions-DwynLfDP.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var TICKERS = {
	NIFTY: "^NSEI",
	BANKNIFTY: "^NSEBANK",
	FINNIFTY: "NIFTY_FIN_SERVICE.NS",
	VIX: "^INDIAVIX"
};
async function fetchChart(ticker, interval, range) {
	const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
	try {
		const res = await fetch(url, {
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; CuePro/1.0)",
				Accept: "application/json"
			},
			signal: AbortSignal.timeout(8e3)
		});
		if (!res.ok) return null;
		return await res.json();
	} catch {
		return null;
	}
}
function quoteFrom(meta, fallback) {
	const last = meta?.regularMarketPrice ?? fallback;
	const prev = meta?.chartPreviousClose ?? last;
	const change = meta?.regularMarketChange ?? last - prev;
	return {
		last,
		change,
		changePct: meta?.regularMarketChangePercent ?? (prev ? change / prev * 100 : 0)
	};
}
function candlesFrom(chart) {
	const result = chart?.chart?.result?.[0];
	const ts = result?.timestamp ?? [];
	const q = result?.indicators?.quote?.[0];
	if (!q) return [];
	const out = [];
	for (let i = 0; i < ts.length; i++) {
		const close = q.close?.[i];
		const open = q.open?.[i];
		const high = q.high?.[i];
		const low = q.low?.[i];
		if (close == null || open == null || high == null || low == null) continue;
		out.push({
			time: ts[i],
			open,
			high,
			low,
			close,
			volume: q.volume?.[i] ?? 0
		});
	}
	return out;
}
async function loadMarket(symbolInput) {
	const symbol = parseSymbol(symbolInput);
	const fallback = fallbackSnapshot(symbol);
	const [main, nifty, bank, vixChart] = await Promise.all([
		fetchChart(TICKERS[symbol], "5m", "1d"),
		symbol === "NIFTY" ? Promise.resolve(null) : fetchChart(TICKERS.NIFTY, "1d", "1d"),
		symbol === "BANKNIFTY" ? Promise.resolve(null) : fetchChart(TICKERS.BANKNIFTY, "1d", "1d"),
		fetchChart(TICKERS.VIX, "1d", "5d")
	]);
	const mainMeta = main?.chart?.result?.[0]?.meta;
	if (!mainMeta?.regularMarketPrice) return fallback;
	const spot = mainMeta.regularMarketPrice;
	const quote = quoteFrom(mainMeta, spot);
	const niftyQuote = symbol === "NIFTY" ? quote : quoteFrom(nifty?.chart?.result?.[0]?.meta, fallback.nifty.last);
	const bankQuote = symbol === "BANKNIFTY" ? quote : quoteFrom(bank?.chart?.result?.[0]?.meta, fallback.bank.last);
	const vix = vixChart?.chart?.result?.[0]?.meta?.regularMarketPrice ?? fallback.vix;
	const liveCandles = candlesFrom(main);
	const candles = liveCandles.length > 8 ? liveCandles : fallback.candles;
	const chain = modelChain(spot);
	return {
		symbol,
		spot,
		change: quote.change,
		changePct: quote.changePct,
		vix,
		nifty: niftyQuote,
		bank: bankQuote,
		candles,
		chain,
		card: decide(symbol, spot, vix, candles, chain),
		source: "yahoo",
		fetchedAt: (/* @__PURE__ */ new Date()).toISOString()
	};
}
var getMarket_createServerFn_handler = createServerRpc({
	id: "6fdfbdff8b779cdd80db4492138674f9ab3498f6077332c5892ed94e3f737172",
	name: "getMarket",
	filename: "src/lib/market.functions.ts"
}, (opts) => getMarket.__executeServer(opts));
var getMarket = createServerFn({ method: "GET" }).validator((data) => ({ symbol: parseSymbol(data?.symbol) })).handler(getMarket_createServerFn_handler, async ({ data }) => loadMarket(data.symbol));
//#endregion
export { getMarket_createServerFn_handler };
