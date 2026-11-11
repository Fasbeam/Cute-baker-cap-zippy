import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RefreshCw, Shield } from "lucide-react";
import { AskPanel } from "@/components/ask-panel";
import { OiChart, PriceChart } from "@/components/desk-charts";
import { SwingBoard } from "@/components/swing-board";
import { getMarket } from "@/lib/market.functions";
import { SYMBOLS, parseSymbol, type SymbolId } from "@/lib/market";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => ({
    symbol: parseSymbol(search.symbol),
  }),
  loaderDeps: ({ search }) => ({ symbol: search.symbol }),
  loader: ({ deps }) => getMarket({ data: { symbol: deps.symbol } }),
  component: Desk,
});

function Desk() {
  const snapshot = Route.useLoaderData();
  const { symbol } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const [capital, setCapital] = useState(500000);
  const [risk, setRisk] = useState(1.5);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      void router.invalidate();
    }, 60000);
    return () => window.clearInterval(id);
  }, [router]);

  function pick(next: SymbolId) {
    void navigate({ to: "/", search: { symbol: next } });
  }

  async function refresh() {
    setBusy(true);
    await router.invalidate();
    setBusy(false);
  }

  const riskRupees = Math.round(capital * (risk / 100));

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 py-5 md:px-6">
      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs tracking-[0.18em] text-accent uppercase">Index desk</p>
          <h1 className="text-3xl font-semibold tracking-tight text-fg">CUE-PRO</h1>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Silence is a recommendation. Cards stay defined-risk. Price and VIX come from Yahoo Finance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {SYMBOLS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => pick(item)}
              className={
                item === symbol
                  ? "min-h-11 rounded-full bg-up px-4 text-sm font-medium text-bg"
                  : "min-h-11 rounded-full border border-line bg-surface px-4 text-sm text-fg"
              }
            >
              {item}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg"
          >
            <RefreshCw className={busy ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </button>
        </div>
      </header>

      <section className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Pulse label="Nifty 50" last={snapshot.nifty.last} pct={snapshot.nifty.changePct} />
        <Pulse label="Bank Nifty" last={snapshot.bank.last} pct={snapshot.bank.changePct} />
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="text-xs text-muted">India VIX</p>
          <p className="font-mono text-2xl text-fg">{fmt(snapshot.vix)}</p>
          <p className={snapshot.card.regime === "credit" ? "text-sm text-accent" : "text-sm text-up"}>
            {snapshot.card.regime === "credit" ? "Credit-friendly" : "Debit-friendly"}
          </p>
        </div>
        <div className="rounded-card border border-line bg-surface p-4">
          <p className="text-xs text-muted">Feed</p>
          <p className="text-lg font-medium text-fg">{snapshot.source === "yahoo" ? "Yahoo live" : "Last known print"}</p>
          <p className="font-mono text-xs text-muted">{snapshot.fetchedAt.slice(11, 19)} IST print</p>
        </div>
      </section>

      <section className="mb-4 rounded-card border border-line bg-surface p-4">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">Price, VWAP, EMAs</h2>
          <p className="font-mono text-sm text-muted">
            {symbol} {fmt(snapshot.spot)}{" "}
            <span className={snapshot.changePct >= 0 ? "text-up" : "text-down"}>
              {snapshot.changePct >= 0 ? "+" : ""}
              {snapshot.changePct.toFixed(2)}%
            </span>
          </p>
        </div>
        <PriceChart candles={snapshot.candles} />
      </section>

      <section className="mb-4 rounded-card border border-line bg-surface p-4">
        <div className="mb-1 flex items-baseline justify-between gap-3">
          <h2 className="text-lg font-medium">OI walls by strike</h2>
          <p className="text-xs text-muted">Modeled from spot — exchange chain is not public from this host</p>
        </div>
        <OiChart chain={snapshot.chain} />
      </section>

      <section className="mb-4">
        <h2 className="mb-3 text-lg font-medium">Cue card</h2>
        {snapshot.card.status === "silence" ? (
          <article className="rounded-card border border-line bg-surface px-6 py-10 text-center">
            <Shield className="mx-auto mb-3 size-8 text-accent" />
            <h3 className="text-xl font-medium">Market silence — capital protected</h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted">{snapshot.card.reason}</p>
            <p className="mt-2 font-mono text-xs text-muted">Tape {snapshot.card.tape}</p>
          </article>
        ) : (
          <article className="rounded-card border border-line border-l-4 border-l-up bg-surface p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-mono text-xs text-muted">{symbol} · nearest expiry</p>
                <h3 className="text-xl font-semibold">{snapshot.card.strategy}</h3>
              </div>
              <p className="font-mono text-2xl text-up">{snapshot.card.score}/100</p>
            </div>
            <ul className="mt-4 space-y-1 text-sm text-fg">
              {snapshot.card.why?.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap gap-2">
              {snapshot.card.legs?.map((leg) => (
                <span key={`${leg.action}-${leg.strike}-${leg.type}`} className="rounded-full bg-surface-2 px-3 py-1 font-mono text-xs">
                  {leg.action.toUpperCase()} {leg.strike.toLocaleString("en-IN")} {leg.type}
                </span>
              ))}
            </div>
          </article>
        )}
      </section>

      <AskPanel snapshot={snapshot} capital={capital} />

      <SwingBoard capital={capital} />

      <section className="rounded-card border border-line bg-surface p-5">
        <h2 className="mb-3 text-lg font-medium">Position size</h2>
        <div className="flex flex-wrap items-end gap-4">
          {ready ? (
            <>
              <label className="text-xs text-muted">
                Capital (₹)
                <input
                  type="number"
                  min={0}
                  value={capital}
                  onChange={(e) => setCapital(Number(e.target.value) || 0)}
                  className="mt-1 block min-h-11 w-40 rounded-lg border border-line bg-bg px-3 font-mono text-sm text-fg"
                />
              </label>
              <label className="text-xs text-muted">
                Risk %
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={risk}
                  onChange={(e) => setRisk(Number(e.target.value) || 0)}
                  className="mt-1 block min-h-11 w-24 rounded-lg border border-line bg-bg px-3 font-mono text-sm text-fg"
                />
              </label>
            </>
          ) : (
            <p className="pb-2 text-sm text-muted">Capital ₹5,00,000 · risk 1.5%</p>
          )}
          <p className="pb-2 text-sm text-muted">
            Max risk this trade{" "}
            <span className="font-mono text-fg">₹{riskRupees.toLocaleString("en-IN")}</span>
          </p>
        </div>
        <p className="mt-4 text-xs text-muted">
          Educational read of public prices. Options can expire worthless. Check the live chain at your broker before you act.
        </p>
      </section>
    </main>
  );
}

function Pulse({ label, last, pct }: { label: string; last: number; pct: number }) {
  return (
    <div className="rounded-card border border-line bg-surface p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="font-mono text-2xl text-fg">{fmt(last)}</p>
      <p className={pct >= 0 ? "text-sm text-up" : "text-sm text-down"}>
        {pct >= 0 ? "+" : ""}
        {pct.toFixed(2)}%
      </p>
    </div>
  );
}

function fmt(n: number) {
  return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
