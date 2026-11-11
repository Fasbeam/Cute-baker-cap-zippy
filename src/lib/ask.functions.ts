import { createServerFn } from "@tanstack/react-start";
import { formatScan, formatSilence, formatSwing } from "./ask";
import { loadSwingScan, loadSymbolSwing } from "./swing-scan.server";

const SYSTEM = `You are Cue, the chat on an index desk. Answer the question.
If the question is about the current Nifty or Bank Nifty card, use the desk brief. Do not invent a strike, a premium, or a fill that is not in the brief.
For a stock, say you only quote a cash swing and an F&O spread after the gates pass, and tell the user to type the symbol.
Never suggest dropping a hedge or trading a naked future.
Keep it under 120 words. End with "Not an order."`;

type Turn = { role: "user" | "assistant"; text: string };

export const readSwing = createServerFn({ method: "POST" })
  .validator((data: { symbol?: string; capital?: number }) => ({
    symbol: String(data?.symbol ?? "")
      .toUpperCase()
      .replace(/[^A-Z0-9&-]/g, "")
      .slice(0, 18),
    capital: Math.min(50_000_000, Math.max(10_000, Number(data?.capital) || 500_000)),
  }))
  .handler(async ({ data }) => {
    if (!data.symbol) return { text: formatSilence("That symbol") };
    const card = await loadSymbolSwing(data.symbol, data.capital);
    return { text: card ? formatSwing(card) : formatSilence(data.symbol) };
  });

export const scanSwings = createServerFn({ method: "POST" })
  .validator((data: { capital?: number }) => ({
    capital: Math.min(50_000_000, Math.max(10_000, Number(data?.capital) || 500_000)),
  }))
  .handler(async ({ data }) => {
    const scan = await loadSwingScan(data.capital);
    return { text: formatScan(scan.longs, scan.shorts) };
  });

export const askCue = createServerFn({ method: "POST" })
  .validator((data: { question?: string; brief?: string; history?: Turn[] }) => {
    const history = Array.isArray(data?.history) ? data.history.slice(-10) : [];
    return {
      question: String(data?.question ?? "").trim().slice(0, 500),
      brief: String(data?.brief ?? "").slice(0, 2000),
      history: history
        .filter((turn) => turn && (turn.role === "user" || turn.role === "assistant"))
        .map((turn) => ({ role: turn.role, text: String(turn.text ?? "").slice(0, 800) })),
    };
  })
  .handler(async ({ data }) => {
    if (!data.question) return { ok: false as const, error: "Ask a question first." };
    const apiKey = process.env.XAI_API_KEY?.trim();
    if (!apiKey) return { ok: false as const, error: "Asking Cue is not available in this environment." };
    const text = await complete(apiKey, data.brief, data.history, data.question);
    return { ok: true as const, text };
  });

async function complete(apiKey: string, brief: string, history: Turn[], question: string): Promise<string> {
  const messages = [
    { role: "system", content: SYSTEM },
    { role: "system", content: `Desk brief:\n${brief}` },
    ...history.map((turn) => ({ role: turn.role, content: turn.text })),
    { role: "user", content: question },
  ];
  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: "grok-4.5", messages, max_tokens: 400, temperature: 0.2 }),
    signal: AbortSignal.timeout(25000),
  });
  if (!res.ok) throw new Error(`Cue could not answer (${res.status}).`);
  const body = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = body.choices?.[0]?.message?.content?.trim();
  if (!text) throw new Error("Cue returned an empty answer.");
  return text;
}
