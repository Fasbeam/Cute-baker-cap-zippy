import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { askCue, readSwing, scanSwings } from "@/lib/ask.functions";
import { deskBrief, isScan, promptAnswer, stockSymbol, unknownTicker } from "@/lib/ask";
import type { MarketSnapshot } from "@/lib/market";

const STORE = "cue-ask";
const PROMPTS = ["Why this structure", "What is Nifty doing", "What invalidates it"] as const;

type Message = { role: "user" | "assistant"; text: string };

export function AskPanel({ snapshot, capital }: { snapshot: MarketSnapshot; capital: number }) {
  const ask = useServerFn(askCue);
  const one = useServerFn(readSwing);
  const scan = useServerFn(scanSwings);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(STORE) ?? "[]") as Message[];
      if (Array.isArray(saved)) setMessages(saved.slice(-10));
    } catch {
      setMessages([]);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORE, JSON.stringify(messages.slice(-10)));
  }, [messages, ready]);

  async function send(text: string) {
    const question = text.trim();
    if (!question || pending) return;
    const history = messages.slice(-10);
    setMessages((current) => [...current, { role: "user", text: question }]);
    setDraft("");
    setPending(true);
    setError(null);
    const card = promptAnswer(question, snapshot);
    if (card) {
      setMessages((current) => [...current, { role: "assistant", text: card }]);
      setPending(false);
      return;
    }
    try {
      if (isScan(question)) {
        const result = await scan({ data: { capital } });
        setMessages((current) => [...current, { role: "assistant", text: result.text }]);
        return;
      }
      const symbol = stockSymbol(question);
      if (symbol) {
        const result = await one({ data: { symbol, capital } });
        setMessages((current) => [...current, { role: "assistant", text: result.text }]);
        return;
      }
      const missing = unknownTicker(question);
      if (missing) {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text: `${missing} is not in the Nifty 200 list on this desk, so there is no cash swing and no F&O idea. Not an order.`,
          },
        ]);
        return;
      }
      const result = await ask({ data: { question, brief: deskBrief(snapshot), history } });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessages((current) => [...current, { role: "assistant", text: result.text }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cue did not finish.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="mb-4 rounded-card border border-line bg-surface p-4">
      <h2 className="text-lg font-medium">Ask about this read</h2>
      <p className="mt-1 text-sm text-muted">
        Type a stock such as RELIANCE for a cash swing and a defined-risk F&O idea, or ask about the {snapshot.symbol} card.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void send(prompt)}
            className="min-h-11 rounded-full border border-line bg-bg px-3 text-sm text-fg"
          >
            {prompt}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void send("Scan Nifty 200")}
          className="min-h-11 rounded-full border border-line bg-bg px-3 text-sm text-fg"
        >
          Scan Nifty 200
        </button>
      </div>
      <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {messages.length === 0 ? <p className="text-sm text-muted">No questions yet.</p> : null}
        {messages.map((message, index) => (
          <p
            key={`${message.role}-${index}`}
            className={
              message.role === "user"
                ? "whitespace-pre-wrap rounded-lg bg-bg px-3 py-2 text-sm text-muted"
                : "whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg"
            }
          >
            {message.text}
          </p>
        ))}
        {pending ? <p className="text-sm text-muted">Reading…</p> : null}
      </div>
      {error ? <p className="mt-2 text-sm text-down">{error}</p> : null}
      <form
        className="mt-3 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="RELIANCE, or a question about this card"
          className="min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-fg"
        />
        <button type="submit" disabled={pending} className="min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-bg disabled:opacity-60">
          Ask
        </button>
      </form>
    </section>
  );
}
