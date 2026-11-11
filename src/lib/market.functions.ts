import { createServerFn } from "@tanstack/react-start";
import { parseSymbol } from "./market";
import { loadMarket } from "./yahoo.server";

export const getMarket = createServerFn({ method: "GET" })
  .validator((data: { symbol?: string }) => ({ symbol: parseSymbol(data?.symbol) }))
  .handler(async ({ data }) => loadMarket(data.symbol));
