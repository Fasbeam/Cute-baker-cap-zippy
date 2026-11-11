import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ScanSearch } from "lucide-react";
import { scanSwing } from "@/lib/market.functions";
import type { SwingScan, SwingCard } from "@/lib/swing";

export function SwingBoard({ capital }: { capital: number }) {
  const run = useServerFn(scanSwing);
  const [scan, setScan] = useState<SwingScan | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const next = await run({ data: { capital } });
      setScan(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  const longSectors = scan?.sectors.filter((s) => s.bias === "long") ?? [];
  const shortSectors = scan?.sectors.filter((s) => s.bias === "short") ?? [];

  return (
    <section className="mb-4">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium">CUE-SWING · Nifty 200</h2>
          <p className="text-sm text-muted">Long ideas are a future plus a put. A name is shown only when that hedge still pays at least 1:2.5.</p>
        </div>
        <button
          type="button"
          onClick={() => void start()}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-bg disabled:opacity-60"
        >
          <ScanSearch className={busy ? "size-4 animate-spin" : "size-4"} />
          {busy ? "Scanning sectors, then stocks" : "Scan Nifty 200"}
        </button>
      </div>

      {error ? <p className="mb-3 text-sm text-down">{error}</p> : null}

      {scan ? (
        <div className="space-y-4">
          <div className="rounded-card border border-line bg-surface p-4">
            <p className="text-xs text-muted">{scan.session}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <SectorList title="Long sectors" items={longSectors} tone="up" />
              <SectorList title="Short sectors" items={shortSectors} tone="down" />
            </div>
            <p className="mt-3 text-xs text-muted">
              {scan.longs.length} long and {scan.shorts.length} short passed all five gates. {scan.scanned} names were in a trending sector.{" "}
              {scan.note}
            </p>
          </div>
          <CardList title="Long swings" cards={scan.longs} empty="No long passed every gate." />
          <CardList title="Short swings" cards={scan.shorts} empty="No F&O short passed every gate." />
          <p className="text-xs text-muted">
            Cap yourself at 2 stock F&O swings or 4 cash swings. At 1.5R (+3%), book half and trail the rest to the entry. Exit longs that close under the 20-day EMA and shorts that close over it.
          </p>
        </div>
      ) : null}
    </section>
  );
}

function SectorList({
  title,
  items,
  tone,
}: {
  title: string;
  items: SwingScan["sectors"];
  tone: "up" | "down";
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-2 space-y-1">
        {items.length === 0 ? <li className="text-sm text-muted">None</li> : null}
        {items.map((s) => (
          <li key={s.id} className="flex items-center justify-between text-sm">
            <span>{s.name}</span>
            <span className={tone === "up" ? "font-mono text-up" : "font-mono text-down"}>
              {s.vsNifty >= 0 ? "+" : ""}
              {(s.vsNifty * 100).toFixed(2)}% vs Nifty
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CardList({ title, cards, empty }: { title: string; cards: SwingCard[]; empty: string }) {
  return (
    <div>
      <h3 className="mb-2 text-base font-medium">{title}</h3>
      {cards.length === 0 ? <p className="text-sm text-muted">{empty}</p> : null}
      <div className="space-y-3">
        {cards.map((card) => (
          <article
            key={`${card.direction}-${card.symbol}`}
            className={
              card.direction === "LONG"
                ? "rounded-card border border-line border-l-4 border-l-up bg-surface p-4"
                : "rounded-card border border-line border-l-4 border-l-down bg-surface p-4"
            }
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={card.direction === "LONG" ? "text-xs font-medium text-up" : "text-xs font-medium text-down"}>
                  {card.direction}
                </p>
                <h4 className="text-lg font-semibold">{card.symbol}</h4>
                <p className="text-sm text-muted">{card.structure}</p>
              </div>
              <p className="font-mono text-xl">{card.score}/100</p>
            </div>
            <ul className="mt-3 space-y-1 text-sm">
              {card.proofs.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              {card.legs.map((leg) => (
                <span key={leg.text} className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">
                  {leg.action.toUpperCase()} · {leg.text.replace(/^(Buy|Sell)\s/, "")}
                </span>
              ))}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4">
              <div>
                <dt className="text-xs text-muted">Future</dt>
                <dd className="font-mono">{card.entry.toLocaleString("en-IN")}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">{card.direction === "LONG" ? "Max loss / share" : "Stop"}</dt>
                <dd className="font-mono text-down">
                  {card.direction === "LONG"
                    ? `₹${Math.round(card.entry - card.stop).toLocaleString("en-IN")}`
                    : card.stop.toLocaleString("en-IN")}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted">R:R</dt>
                <dd className="font-mono text-accent">1:{card.rr.toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted">Target</dt>
                <dd className="font-mono text-up">{card.target.toLocaleString("en-IN")}</dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-muted">{card.invalidation}</p>
            <p className="text-xs text-muted">
              {card.direction === "LONG"
                ? `Put premium about ₹${card.premium.toLocaleString("en-IN")} (estimate). Size ${card.qty.toLocaleString("en-IN")} so the hedge risks 2% of capital. ${card.maxLoss}`
                : card.maxLoss}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
