import { useEffect, useRef } from "react";
import { createChart, type IChartApi, type UTCTimestamp } from "lightweight-charts";
import type { Candle, ChainRow } from "@/lib/market";

function token(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

export function PriceChart({ candles }: { candles: Candle[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || candles.length === 0) return;
    let chart: IChartApi | undefined;
    const up = token("--color-up", "#2fbf71");
    const down = token("--color-down", "#e15b64");
    chart = createChart(el, {
      autoSize: true,
      height: 320,
      layout: {
        background: { color: token("--color-surface", "#151b24") },
        textColor: token("--color-muted", "#8d99aa"),
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      grid: {
        vertLines: { color: token("--color-line", "#2a3442") },
        horzLines: { color: token("--color-line", "#2a3442") },
      },
      rightPriceScale: { borderColor: token("--color-line", "#2a3442") },
      timeScale: { borderColor: token("--color-line", "#2a3442"), timeVisible: true, secondsVisible: false },
    });
    const series = chart.addCandlestickSeries({
      upColor: up,
      downColor: down,
      borderUpColor: up,
      borderDownColor: down,
      wickUpColor: up,
      wickDownColor: down,
    });
    const vwap = chart.addLineSeries({ color: token("--color-accent", "#d6b36a"), lineWidth: 2, title: "VWAP" });
    const ema5 = chart.addLineSeries({ color: up, lineWidth: 1, title: "EMA 5" });
    const ema20 = chart.addLineSeries({ color: token("--color-fg", "#e7edf5"), lineWidth: 1, title: "EMA 20" });
    const rows = uniqueCandles(candles);
    series.setData(rows.map((c) => ({ time: c.time as UTCTimestamp, open: c.open, high: c.high, low: c.low, close: c.close })));
    vwap.setData(vwapSeries(rows));
    ema5.setData(emaSeries(rows, 5));
    ema20.setData(emaSeries(rows, 20));
    chart.timeScale().fitContent();

    return () => chart?.remove();
  }, [candles]);

  return <div ref={ref} className="h-80 w-full" />;
}

export function OiChart({ chain }: { chain: ChainRow[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || chain.length === 0) return;
    const strikes: Record<number, number> = {};
    const base = Math.floor(Date.now() / 1000) - chain.length * 60;
    const chart = createChart(el, {
      autoSize: true,
      height: 280,
      layout: {
        background: { color: token("--color-surface", "#151b24") },
        textColor: token("--color-muted", "#8d99aa"),
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      grid: {
        vertLines: { color: token("--color-line", "#2a3442") },
        horzLines: { color: token("--color-line", "#2a3442") },
      },
      rightPriceScale: { borderColor: token("--color-line", "#2a3442") },
      timeScale: {
        borderColor: token("--color-line", "#2a3442"),
        tickMarkFormatter: (time: number) => {
          const strike = strikes[time];
          return strike ? strike.toLocaleString("en-IN") : "";
        },
      },
    });
    const puts = chart.addHistogramSeries({
      color: token("--color-up", "#2fbf71"),
      priceFormat: { type: "volume" },
      title: "Put OI",
    });
    const calls = chart.addHistogramSeries({
      color: token("--color-down", "#e15b64"),
      priceFormat: { type: "volume" },
      title: "Call OI",
    });
    puts.setData(
      chain.map((row, i) => {
        const time = base + i * 60;
        strikes[time] = row.strike;
        return { time: time as UTCTimestamp, value: row.putOi };
      }),
    );
    calls.setData(chain.map((row, i) => ({ time: (base + i * 60) as UTCTimestamp, value: row.callOi })));
    chart.timeScale().fitContent();

    return () => chart.remove();
  }, [chain]);

  return <div ref={ref} className="h-72 w-full" />;
}

function uniqueCandles(candles: Candle[]) {
  const seen = new Set<number>();
  return candles
    .filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close))
    .sort((a, b) => a.time - b.time)
    .filter((c) => {
      if (seen.has(c.time)) return false;
      seen.add(c.time);
      return true;
    });
}

function emaSeries(candles: Candle[], period: number) {
  const k = 2 / (period + 1);
  let value = candles[0]?.close ?? 0;
  return candles.map((c) => {
    value = c.close * k + value * (1 - k);
    return { time: c.time as UTCTimestamp, value };
  });
}

function vwapSeries(candles: Candle[]) {
  let vol = 0;
  let tpv = 0;
  return candles.map((c) => {
    const tp = (c.high + c.low + c.close) / 3;
    vol += c.volume || 1;
    tpv += tp * (c.volume || 1);
    return { time: c.time as UTCTimestamp, value: tpv / vol };
  });
}
