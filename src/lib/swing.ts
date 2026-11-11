import type { SectorId } from "./universe";

export const RISK_PCT = 2;
export const REWARD_PCT = 6;
export const TRAIL_AT_PCT = 3;

export type Bar = { time: number; open: number; high: number; low: number; close: number; volume: number };

export type Side = "LONG" | "SHORT";

export type SwingLeg = { action: "buy" | "sell"; text: string };

export type SectorRead = {
  id: SectorId;
  name: string;
  ret: number;
  vsNifty: number;
  bias: "long" | "short" | "flat";
};

export type SwingScan = {
  scanned: number;
  skipped: number;
  longs: SwingCard[];
  shorts: SwingCard[];
  sectors: SectorRead[];
  session: string;
  note: string;
  fetchedAt: string;
};

export type SwingCard = {
  symbol: string;
  direction: Side;
  sector: SectorId;
  sectorName: string;
  structure: string;
  score: number;
  entry: number;
  stop: number;
  target: number;
  trailAt: number;
  qty: number;
  rsi: number;
  adx: number;
  fo: boolean;
  rr: number;
  premium: number;
  proofs: [string, string, string];
  legs: SwingLeg[];
  invalidation: string;
  maxLoss: string;
};

export type StockInput = {
  symbol: string;
  sector: SectorId;
  sectorName: string;
  fo: boolean;
  bars: Bar[];
  sectorBias: "long" | "short";
  sectorRet: number;
  niftyRet: number;
  capital: number;
};

export function lastReturn(closes: number[], sessions: number): number | null {
  if (closes.length <= sessions) return null;
  const last = closes[closes.length - 1]!;
  const prev = closes[closes.length - 1 - sessions]!;
  if (!prev) return null;
  return last / prev - 1;
}

export function screenStock(input: StockInput): SwingCard | null {
  const closes = input.bars.map((b) => b.close);
  const highs = input.bars.map((b) => b.high);
  const lows = input.bars.map((b) => b.low);
  if (closes.length < 210) return null;

  const last = closes[closes.length - 1]!;
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
  const direction: Side = longTrend ? "LONG" : "SHORT";

  const volBase = input.bars.slice(-28, -8);
  const vol20 = mean(volBase.map((b) => b.volume));
  const recent = input.bars.slice(-8, -1);
  const footprint = recent.some((b) => {
    const multiple = vol20 > 0 ? b.volume / vol20 : 0;
    const span = b.high - b.low;
    const loc = span > 0 ? (b.close - b.low) / span : 0.5;
    if (direction === "LONG") return multiple >= 1.5 && loc >= 0.65 && b.close > b.open;
    return multiple >= 1.5 && loc <= 0.35 && b.close < b.open;
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
  const rv = realizedVol(closes) ?? 0.22;
  const rich = rv > 0.28;
  const step = strikeStep(entry);
  const atm = Math.round(entry / step) * step;

  let structure: string;
  let legs: SwingLeg[];
  let stop: number;
  let target: number;
  let trailAt: number;
  let riskPerShare: number;
  let rr: number;
  let premium: number;

  if (direction === "LONG") {
    if (!input.fo) return null;
    const hedge = bestHedge(entry, step, atr(input.bars, 14), rv);
    if (!hedge) return null;
    structure = "Buy future + buy PE";
    legs = [
      { action: "buy", text: `Buy future at ${entry.toLocaleString("en-IN")}` },
      { action: "buy", text: `Buy ${hedge.strike.toLocaleString("en-IN")} PE` },
    ];
    stop = round2(entry - hedge.risk);
    target = round2(entry + hedge.move);
    trailAt = round2(entry + hedge.risk * 1.5);
    riskPerShare = hedge.risk;
    rr = hedge.rr;
    premium = hedge.premium;
  } else {
    structure = rich ? "Bear call credit spread · monthly" : "Bear put debit spread · monthly";
    legs = rich
      ? [
          { action: "sell", text: `Sell ${(atm + step).toLocaleString("en-IN")} CE` },
          { action: "buy", text: `Buy ${(atm + step * 3).toLocaleString("en-IN")} CE` },
        ]
      : [
          { action: "buy", text: `Buy ${atm.toLocaleString("en-IN")} PE` },
          { action: "sell", text: `Sell ${(atm - step).toLocaleString("en-IN")} PE` },
        ];
    stop = round2(entry * (1 + RISK_PCT / 100));
    target = round2(entry * (1 - REWARD_PCT / 100));
    trailAt = round2(entry * (1 - TRAIL_AT_PCT / 100));
    riskPerShare = Math.abs(entry - stop);
    rr = REWARD_PCT / RISK_PCT;
    premium = 0;
  }

  const qty = riskPerShare > 0 ? Math.floor((input.capital * (RISK_PCT / 100)) / riskPerShare) : 0;
  if (qty < 1) return null;
  const sectorPct = (input.sectorRet * 100).toFixed(2);
  const niftyPct = (input.niftyRet * 100).toFixed(2);
  const flow =
    direction === "LONG"
      ? `Volume ${volumeMultiple.toFixed(1)}× the 20-day average and the close held the top of the bar. Futures OI is not on this feed.`
      : `Volume ${volumeMultiple.toFixed(1)}× the 20-day average and the close held the bottom of the bar. Futures OI is not on this feed.`;
  const rdx =
    direction === "LONG"
      ? `Spot above the 200-day average. RSI ${rsi.toFixed(1)}. ADX ${adxNow.toFixed(1)} and rising. ${input.sectorName} ${sectorPct}% vs Nifty ${niftyPct}% over 5 sessions.`
      : `Spot below the 200-day average. RSI ${rsi.toFixed(1)}. ADX ${adxNow.toFixed(1)} and rising. ${input.sectorName} ${sectorPct}% vs Nifty ${niftyPct}% over 5 sessions.`;

  const score = Math.min(99, Math.round(40 + Math.min(25, rr * 8) + Math.min(15, (adxNow - 20) * 0.6) + (fib.quality === "zone" ? 10 : 6)));

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
    proofs: [flow, rdx, fib.note],
    legs,
    invalidation:
      direction === "LONG"
        ? `The put caps a gap. Thesis dies on a close under the 20-day EMA. Premium is estimated from realized volatility, not the live chain.`
        : `Hard stop ${stop.toLocaleString("en-IN")} (+${RISK_PCT}%). Thesis dies on a close over the 20-day EMA.`,
    maxLoss:
      direction === "LONG"
        ? `Max loss ₹${Math.round(riskPerShare).toLocaleString("en-IN")} per share. If it reaches ${target.toLocaleString("en-IN")}, reward is about ₹${Math.round(target - entry - premium).toLocaleString("en-IN")} after the premium. R:R 1:${rr.toFixed(1)}.`
        : `₹${Math.round(qty * riskPerShare).toLocaleString("en-IN")} at ${RISK_PCT}% of capital. Target ${REWARD_PCT}% is ₹${target.toLocaleString("en-IN")}.`,
  };
}

function bestHedge(entry: number, step: number, dailyAtr: number, sigma: number): { strike: number; premium: number; risk: number; move: number; rr: number } | null {
  const move = Math.max(entry * 0.09, dailyAtr * 4);
  const atm = Math.round(entry / step) * step;
  const strikes = [atm, atm - step, atm - step * 2, Math.round((entry * 0.97) / step) * step];
  let best: { strike: number; premium: number; risk: number; move: number; rr: number } | null = null;
  for (const strike of strikes) {
    if (strike <= 0 || strike > entry * 1.01) continue;
    const premium = bsPut(entry, strike, 25 / 365, Math.max(sigma, 0.12));
    if (premium <= 0) continue;
    const risk = Math.max(entry - strike, 0) + premium;
    const reward = move - premium;
    const rr = reward / risk;
    if (rr < 2.5) continue;
    if (!best || rr > best.rr) best = { strike, premium, risk, move, rr };
  }
  return best;
}

function atr(bars: Bar[], period: number): number {
  const start = Math.max(1, bars.length - period);
  const trs: number[] = [];
  for (let i = start; i < bars.length; i++) {
    const prev = bars[i - 1]!.close;
    const bar = bars[i]!;
    trs.push(Math.max(bar.high - bar.low, Math.abs(bar.high - prev), Math.abs(bar.low - prev)));
  }
  return mean(trs);
}

function bsPut(spot: number, strike: number, time: number, sigma: number): number {
  const rate = 0.065;
  const vol = sigma * Math.sqrt(time);
  if (vol <= 0) return 0;
  const d1 = (Math.log(spot / strike) + (rate + 0.5 * sigma * sigma) * time) / vol;
  const d2 = d1 - vol;
  return Math.max(0, strike * Math.exp(-rate * time) * normCdf(-d2) - spot * normCdf(-d1));
}

function normCdf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * ax);
  const erf = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
  return 0.5 * (1 + sign * erf);
}

function longPullback(bars: Bar[], ema5: number): { note: string; quality: "zone" | "ema" } | null {
  const last = bars[bars.length - 1]!;
  if (last.close >= last.high * 0.999) return null;
  const window = bars.slice(-40);
  let lowI = 0;
  for (let i = 1; i < window.length; i++) if (window[i]!.low < window[lowI]!.low) lowI = i;
  let highI = lowI;
  for (let i = lowI; i < window.length; i++) if (window[i]!.high > window[highI]!.high) highI = i;
  if (highI <= lowI) return nearEma(last.close, ema5, "LONG");
  const low = window[lowI]!.low;
  const high = window[highI]!.high;
  const span = high - low;
  if (span <= 0) return null;
  const zoneHi = high - span * 0.382;
  const zoneLo = high - span * 0.5;
  const floor = high - span * 0.618;
  if (last.close < floor) return null;
  const inZone = last.close <= zoneHi && last.close >= zoneLo;
  const atEma = Math.abs(last.close - ema5) / last.close < 0.012;
  if (!inZone && !atEma) return null;
  return {
    quality: inZone ? "zone" : "ema",
    note: inZone
      ? `Not the day's high. Price is inside the 38.2–50% pullback (${zoneLo.toFixed(1)}–${zoneHi.toFixed(1)}), above the 61.8% floor.`
      : `Not the day's high. Price is back at the 5-day EMA without breaking the 61.8% floor at ${floor.toFixed(1)}.`,
  };
}

function shortBounce(bars: Bar[], ema5: number): { note: string; quality: "zone" | "ema" } | null {
  const last = bars[bars.length - 1]!;
  if (last.close <= last.low * 1.001) return null;
  const window = bars.slice(-40);
  let highI = 0;
  for (let i = 1; i < window.length; i++) if (window[i]!.high > window[highI]!.high) highI = i;
  let lowI = highI;
  for (let i = highI; i < window.length; i++) if (window[i]!.low < window[lowI]!.low) lowI = i;
  if (lowI <= highI) return nearEma(last.close, ema5, "SHORT");
  const high = window[highI]!.high;
  const low = window[lowI]!.low;
  const span = high - low;
  if (span <= 0) return null;
  const zoneLo = low + span * 0.382;
  const zoneHi = low + span * 0.5;
  const ceiling = low + span * 0.618;
  if (last.close > ceiling) return null;
  const inZone = last.close >= zoneLo && last.close <= zoneHi;
  const atEma = Math.abs(last.close - ema5) / last.close < 0.012;
  if (!inZone && !atEma) return null;
  return {
    quality: inZone ? "zone" : "ema",
    note: inZone
      ? `Not the day's low. Price is inside the 38.2–50% bounce (${zoneLo.toFixed(1)}–${zoneHi.toFixed(1)}), under the 61.8% ceiling.`
      : `Not the day's low. Price is back at the 5-day EMA without clearing the 61.8% ceiling at ${ceiling.toFixed(1)}.`,
  };
}

function nearEma(price: number, ema5: number, side: Side): { note: string; quality: "ema" } | null {
  if (Math.abs(price - ema5) / price >= 0.012) return null;
  return {
    quality: "ema",
    note:
      side === "LONG"
        ? "Not the day's high. Price has pulled back to the 5-day EMA."
        : "Not the day's low. Price has bounced into the 5-day EMA.",
  };
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function ema(values: number[], period: number): number {
  const k = 2 / (period + 1);
  let value = mean(values.slice(0, period));
  for (const v of values.slice(period)) value = v * k + value * (1 - k);
  return value;
}

function rsiWilder(closes: number[], period: number): number | null {
  if (closes.length <= period) return null;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    if (diff >= 0) gain += diff;
    else loss -= diff;
  }
  let avgGain = gain / period;
  let avgLoss = loss / period;
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i]! - closes[i - 1]!;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function adxWilder(highs: number[], lows: number[], closes: number[], period: number): number | null {
  const n = closes.length;
  if (n < period * 2 + 2) return null;
  const trs: number[] = [];
  const plus: number[] = [];
  const minus: number[] = [];
  for (let i = 1; i < n; i++) {
    const up = highs[i]! - highs[i - 1]!;
    const down = lows[i - 1]! - lows[i]!;
    plus.push(up > down && up > 0 ? up : 0);
    minus.push(down > up && down > 0 ? down : 0);
    const tr = Math.max(highs[i]! - lows[i]!, Math.abs(highs[i]! - closes[i - 1]!), Math.abs(lows[i]! - closes[i - 1]!));
    trs.push(tr);
  }
  let atr = mean(trs.slice(0, period));
  let pdm = mean(plus.slice(0, period));
  let mdm = mean(minus.slice(0, period));
  const dx: number[] = [];
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]!) / period;
    pdm = (pdm * (period - 1) + plus[i]!) / period;
    mdm = (mdm * (period - 1) + minus[i]!) / period;
    const pdi = atr ? (100 * pdm) / atr : 0;
    const mdi = atr ? (100 * mdm) / atr : 0;
    const sum = pdi + mdi;
    dx.push(sum ? (100 * Math.abs(pdi - mdi)) / sum : 0);
  }
  if (dx.length < period) return null;
  let value = mean(dx.slice(0, period));
  for (const d of dx.slice(period)) value = (value * (period - 1) + d) / period;
  return value;
}

function realizedVol(closes: number[]): number | null {
  const tail = closes.slice(-21);
  if (tail.length < 16) return null;
  const rets: number[] = [];
  for (let i = 1; i < tail.length; i++) rets.push(Math.log(tail[i]! / tail[i - 1]!));
  const m = mean(rets);
  const variance = rets.reduce((s, r) => s + (r - m) ** 2, 0) / (rets.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function strikeStep(price: number): number {
  if (price >= 5000) return 100;
  if (price >= 1000) return 50;
  if (price >= 200) return 10;
  return 5;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
