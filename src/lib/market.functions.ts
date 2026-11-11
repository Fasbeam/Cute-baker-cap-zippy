import { createServerFn } from "@tanstack/react-start";
import { parseSymbol } from "./market";
import { loadSwingScan } from "./swing-scan.server";
import { loadMarket } from "./yahoo.server";

export const getMarket = createServerFn({ method: "GET" })
  .validator((data: { symbol?: string }) => ({ symbol: parseSymbol(data?.symbol) }))
  .handler(async ({ data }) => loadMarket(data.symbol));

export const scanSwing = createServerFn({ method: "POST" })
  .validator((data: { capital?: number }) => ({
    capital: Math.min(50_000_000, Math.max(10_000, Number(data?.capital) || 500_000)),
  }))
  .handler(async ({ data }) => loadSwingScan(data.capital));
