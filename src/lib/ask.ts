import { SYMBOLS, type MarketSnapshot } from "./market";
import type { SwingCard } from "./swing";
import { NIFTY200 } from "./universe";

const INDEX = new Set<string>(SYMBOLS);

export function promptAnswer(question: string, snapshot: MarketSnapshot): string | null {
  const text = question.trim().toLowerCase().replace(/\?/g, "");
  if (text === "why this structure") {
    const card = snapshot.card;
    if (card.status !== "signal" || !card.legs?.length) {
      return `${snapshot.symbol} has no structure on this card. ${card.reason ?? "Nothing is suggested until the cues agree."} Not an order.`;
    }
    const legs = card.legs.map((leg) => `${leg.action} ${leg.strike.toLocaleString("en-IN")} ${leg.type}`).join(", ");
    return `${card.strategy}. ${(card.why ?? []).join(" ")} Legs: ${legs}. Not an order.`;
  }
  if (text === "what is nifty doing") {
    const n = snapshot.nifty;
    return `Nifty 50 is ${n.last.toLocaleString("en-IN")} (${n.changePct >= 0 ? "+" : ""}${n.changePct.toFixed(2)}%). ${snapshot.symbol} tape is ${snapshot.card.tape}. India VIX ${snapshot.vix.toFixed(2)}, ${snapshot.card.regime === "credit" ? "credit" : "debit"} regime. Not an order.`;
  }
  if (text === "what invalidates it") {
    if (snapshot.card.status !== "signal") return "Nothing to invalidate. The desk is silent. Not an order.";
    return `The ${snapshot.symbol} idea dies if the tape leaves "${snapshot.card.tape}" or the volatility regime flips. Not an order.`;
  }
  return null;
}

export function isScan(question: string): boolean {
  const text = question.trim().toLowerCase().replace(/\?/g, "");
  return text === "scan nifty 200" || text === "scan";
}

export function stockSymbol(question: string): string | null {
  const upper = question.toUpperCase();
  const exact = upper.replace(/\.NS$/, "").match(/^(?:SWING\s+)?([A-Z][A-Z0-9&-]{1,18})$/)?.[1];
  if (exact && !INDEX.has(exact) && NIFTY200.some((row) => row.symbol === exact)) return exact;
  const known = NIFTY200.map((row) => row.symbol).sort((a, b) => b.length - a.length);
  for (const symbol of known) {
    if (new RegExp(`\\b${symbol.replace("&", "\\&")}\\b`).test(upper)) return symbol;
  }
  return null;
}

export function unknownTicker(question: string): string | null {
  const exact = question
    .trim()
    .toUpperCase()
    .replace(/\.NS$/, "")
    .match(/^(?:SWING\s+)?([A-Z][A-Z0-9&-]{1,18})$/)?.[1];
  if (!exact || INDEX.has(exact) || NIFTY200.some((row) => row.symbol === exact)) return null;
  return exact;
}

export function formatSwing(card: SwingCard): string {
  if (card.direction === "LONG") {
    return [
      `${card.symbol} · BUY FUTURE + BUY PE · R:R 1:${card.rr.toFixed(1)} · ${card.sectorName}`,
      `Future at ${inr(card.entry)}. ${card.legs.map((leg) => leg.text).join(". ")}. Estimated premium ₹${inr(card.premium)} from realized vol, not the live chain.`,
      `Max loss about ₹${inr(Math.round(card.entry - card.stop))} per share. Target ${inr(card.target)}. ${card.maxLoss}`,
      "Not an order.",
    ].join("\n");
  }
  const fo = card.fo
    ? `F&O: ${card.structure}. ${card.legs.map((leg) => leg.text).join(". ")}. Defined risk only.`
    : "F&O: this name is not marked F&O-eligible here.";
  return [`${card.symbol} · SHORT · ${card.sectorName}`, "Cash: no overnight short.", fo, "Not an order."].join("\n");
}

export function formatSilence(symbol: string): string {
  return [
    `${symbol}`,
    "Cash: no swing. The sector tide, the 200-day trend, volume, RSI/ADX, and the pullback did not all agree.",
    "F&O: no spread. A derivative idea is blocked until the same gates pass, and shorts stay off names that are not F&O-eligible.",
    "Silence is the recommendation. Not an order.",
  ].join("\n");
}

export function formatScan(longs: SwingCard[], shorts: SwingCard[]): string {
  const lines = [
    `Nifty 200 scan. ${longs.length} long, ${shorts.length} short.`,
    ...longs.slice(0, 6).map((card) => formatSwing(card)),
    ...shorts.slice(0, 6).map((card) => formatSwing(card)),
  ];
  if (longs.length + shorts.length === 0) lines.push("No stock passed every gate.");
  return lines.join("\n\n");
}

export function deskBrief(snapshot: MarketSnapshot): string {
  const card = snapshot.card;
  const legs = card.legs?.map((leg) => `${leg.action} ${leg.strike} ${leg.type}`).join(", ") ?? "none";
  return [
    `${snapshot.symbol} spot ${snapshot.spot} change ${snapshot.changePct.toFixed(2)}%`,
    `Nifty ${snapshot.nifty.last} (${snapshot.nifty.changePct.toFixed(2)}%), Bank Nifty ${snapshot.bank.last} (${snapshot.bank.changePct.toFixed(2)}%)`,
    `India VIX ${snapshot.vix.toFixed(2)}, regime ${card.regime}, tape ${card.tape}`,
    card.status === "signal" ? `Card: ${card.strategy}. Legs: ${legs}. Why: ${(card.why ?? []).join(" ")}` : `Card: silence. ${card.reason ?? ""}`,
    "Option walls on the chart are modeled, not the live NSE chain.",
  ].join("\n");
}

function inr(n: number): string {
  return n.toLocaleString("en-IN");
}
