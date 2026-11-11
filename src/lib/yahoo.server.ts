import {
  decide,
  fallbackSnapshot,
  modelChain,
  parseSymbol,
  type Candle,
  type MarketSnapshot,
  type Quote,
  type SymbolId,
} from "./market";

const TICKERS: Record<SymbolId | "VIX", string> = {
  NIFTY: "^NSEI",
  BANKNIFTY: "^NSEBANK",
  FINNIFTY: "NIFTY_FIN_SERVICE.NS",
  VIX: "^INDIAVIX",
};

type YahooMeta = {
  regularMarketPrice?: number;
  chartPreviousClose?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
};

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: YahooMeta;
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

async function fetchChart(ticker: string, interval: string, range: string): Promise<YahooChart | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CuePro/1.0)",
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as YahooChart;
  } catch {
    return null;
  }
}

function quoteFrom(meta: YahooMeta | undefined, fallback: number): Quote {
  const last = meta?.regularMarketPrice ?? fallback;
  const prev = meta?.chartPreviousClose ?? last;
  const change = meta?.regularMarketChange ?? last - prev;
  const changePct = meta?.regularMarketChangePercent ?? (prev ? (change / prev) * 100 : 0);
  return { last, change, changePct };
}

function candlesFrom(chart: YahooChart | null): Candle[] {
  const result = chart?.chart?.result?.[0];
  const ts = result?.timestamp ?? [];
  const q = result?.indicators?.quote?.[0];
  if (!q) return [];
  const out: Candle[] = [];
  for (let i = 0; i < ts.length; i++) {
    const close = q.close?.[i];
    const open = q.open?.[i];
    const high = q.high?.[i];
    const low = q.low?.[i];
    if (close == null || open == null || high == null || low == null) continue;
    out.push({
      time: ts[i]!,
      open,
      high,
      low,
      close,
      volume: q.volume?.[i] ?? 0,
    });
  }
  return out;
}

export async function loadMarket(symbolInput: unknown): Promise<MarketSnapshot> {
  const symbol = parseSymbol(symbolInput);
  const fallback = fallbackSnapshot(symbol);
  const [main, nifty, bank, vixChart] = await Promise.all([
    fetchChart(TICKERS[symbol], "5m", "1d"),
    symbol === "NIFTY" ? Promise.resolve(null) : fetchChart(TICKERS.NIFTY, "1d", "1d"),
    symbol === "BANKNIFTY" ? Promise.resolve(null) : fetchChart(TICKERS.BANKNIFTY, "1d", "1d"),
    fetchChart(TICKERS.VIX, "1d", "5d"),
  ]);

  const mainMeta = main?.chart?.result?.[0]?.meta;
  if (!mainMeta?.regularMarketPrice) return fallback;

  const spot = mainMeta.regularMarketPrice;
  const quote = quoteFrom(mainMeta, spot);
  const niftyQuote =
    symbol === "NIFTY" ? quote : quoteFrom(nifty?.chart?.result?.[0]?.meta, fallback.nifty.last);
  const bankQuote =
    symbol === "BANKNIFTY" ? quote : quoteFrom(bank?.chart?.result?.[0]?.meta, fallback.bank.last);
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
    fetchedAt: new Date().toISOString(),
  };
}
