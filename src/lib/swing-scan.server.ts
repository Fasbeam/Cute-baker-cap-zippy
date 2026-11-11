import { SECTORS, NIFTY200, type SectorId } from "./universe";
import { lastReturn, screenStock, type Bar, type SectorRead, type SwingCard, type SwingScan } from "./swing";

export type { SwingScan };

type YahooChart = {
  chart?: {
    result?: Array<{
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

const cache = new Map<number, { at: number; scan: SwingScan }>();

export async function loadSwingScan(capital: number): Promise<SwingScan> {
  const cap = Math.max(10000, Math.round(capital || 500000));
  const hit = cache.get(cap);
  if (hit && Date.now() - hit.at < 10 * 60 * 1000) return hit.scan;

  const niftyBars = await fetchBars("^NSEI", "1d", "1y");
  const niftyCloses = niftyBars.map((b) => b.close);
  const niftyRet = lastReturn(niftyCloses, 5) ?? 0;

  const sectorIds = Object.keys(SECTORS) as SectorId[];
  const sectorBars = await mapPool(sectorIds, 6, async (id) => {
    const bars = await fetchBars(SECTORS[id].ticker, "1d", "6mo");
    return [id, bars] as const;
  });

  const sectors: SectorRead[] = [];
  for (const [id, bars] of sectorBars) {
    const ret = lastReturn(bars.map((b) => b.close), 5);
    if (ret == null) continue;
    const vs = ret - niftyRet;
    const bias = vs > 0.0015 ? "long" : vs < -0.0015 ? "short" : "flat";
    sectors.push({ id, name: SECTORS[id].name, ret, vsNifty: vs, bias });
  }
  sectors.sort((a, b) => b.vsNifty - a.vsNifty);

  const biasOf = new Map(sectors.map((s) => [s.id, s]));
  const names = NIFTY200.filter((s) => {
    const b = biasOf.get(s.sector);
    return b && b.bias !== "flat";
  });

  const judged = await mapPool(names, 8, async (stock) => {
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
      capital: cap,
    });
  });

  const cards = judged.filter((card): card is SwingCard => card != null);
  const skipped = names.length - cards.length;

  const longs = cards.filter((c) => c.direction === "LONG").sort((a, b) => b.rr - a.rr);
  const shorts = cards.filter((c) => c.direction === "SHORT").sort((a, b) => b.score - a.score);

  const scan: SwingScan = {
    scanned: names.length,
    skipped,
    longs,
    shorts,
    sectors,
    session: sessionLabel(),
    note: "Sectors are ranked on the last 5 sessions versus the Nifty. A card needs the trend, a heavy directional volume day, RSI/ADX alignment, and a pullback that is not a chase. Delivery percentage, futures open interest, earnings dates, and ASM/GSM are not on this price feed, so those checks are not invented.",
    fetchedAt: new Date().toISOString(),
  };
  cache.set(cap, { at: Date.now(), scan });
  return scan;
}

async function fetchBars(ticker: string, interval: string, range: string): Promise<Bar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CuePro/1.0)", Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as YahooChart;
    const result = json.chart?.result?.[0];
    const ts = result?.timestamp ?? [];
    const q = result?.indicators?.quote?.[0];
    if (!q) return [];
    const bars: Bar[] = [];
    for (let i = 0; i < ts.length; i++) {
      const open = q.open?.[i];
      const high = q.high?.[i];
      const low = q.low?.[i];
      const close = q.close?.[i];
      if (open == null || high == null || low == null || close == null) continue;
      bars.push({ time: ts[i]!, open, high, low, close, volume: q.volume?.[i] ?? 0 });
    }
    return bars;
  } catch {
    return [];
  }
}

async function mapPool<T, R>(items: T[], limit: number, job: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  let index = 0;
  async function worker() {
    while (index < items.length) {
      const current = index;
      index += 1;
      out[current] = await job(items[current]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return out;
}

function sessionLabel(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  const mins = hour * 60 + minute;
  if (weekday === "Sat" || weekday === "Sun") return "Market closed — daily swing read";
  if (mins < 10 * 60 + 15) return "Before 10:15 IST — cards stay queued";
  if (mins > 15 * 60 + 30) return "Market closed — daily swing read";
  return "Session live";
}

export async function loadSymbolSwing(symbol: string, capital: number): Promise<SwingCard | null> {
  const stock = NIFTY200.find((row) => row.symbol === symbol);
  if (!stock) return null;
  const cap = Math.max(10000, Math.round(capital || 500000));
  const [niftyBars, sectorBars, bars] = await Promise.all([
    fetchBars("^NSEI", "1d", "1y"),
    fetchBars(SECTORS[stock.sector].ticker, "1d", "6mo"),
    fetchBars(`${stock.symbol}.NS`, "1d", "2y"),
  ]);
  const niftyRet = lastReturn(niftyBars.map((b) => b.close), 5) ?? 0;
  const sectorRet = lastReturn(sectorBars.map((b) => b.close), 5);
  if (sectorRet == null || bars.length < 210) return null;
  const vs = sectorRet - niftyRet;
  const bias = vs > 0.0015 ? "long" : vs < -0.0015 ? "short" : "flat";
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
    capital: cap,
  });
}
