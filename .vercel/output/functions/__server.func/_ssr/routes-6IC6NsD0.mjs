import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, W as isRedirect, b as useRouter, x as require_jsx_runtime, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as createServerFn } from "./ssr.mjs";
import { t as SYMBOLS } from "./market-JpPq8U5D.mjs";
import { a as isScan, c as unknownTicker, o as promptAnswer, s as stockSymbol, t as deskBrief } from "./ask-C94M5JJ1.mjs";
import { i as RefreshCw, n as Shield, r as ScanSearch } from "../_libs/lucide-react.mjs";
import { i as createSsrRpc, n as Route, r as scanSwing } from "./router-D72OsKcM.mjs";
import { t as Ve } from "../_libs/lightweight-charts.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-6IC6NsD0.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useServerFn(serverFn) {
	const router = useRouter();
	return import_react.useCallback(async (...args) => {
		try {
			const res = await serverFn(...args);
			if (isRedirect(res)) throw res;
			return res;
		} catch (err) {
			if (isRedirect(err)) {
				err.options._fromLocation = router.stores.location.get();
				return router.navigate(router.resolveRedirect(err).options);
			}
			throw err;
		}
	}, [router, serverFn]);
}
var readSwing = createServerFn({ method: "POST" }).validator((data) => ({
	symbol: String(data?.symbol ?? "").toUpperCase().replace(/[^A-Z0-9&-]/g, "").slice(0, 18),
	capital: Math.min(5e7, Math.max(1e4, Number(data?.capital) || 5e5))
})).handler(createSsrRpc("b80fefc16e1c71778d7850f2fb7dcceded6ee01dbd2bd45038578421272dc983"));
var scanSwings = createServerFn({ method: "POST" }).validator((data) => ({ capital: Math.min(5e7, Math.max(1e4, Number(data?.capital) || 5e5)) })).handler(createSsrRpc("ff148749e9ae7f641376f1d319a1d6d4aafe4e0c13c836563c05bcf15dfd4105"));
var askCue = createServerFn({ method: "POST" }).validator((data) => {
	const history = Array.isArray(data?.history) ? data.history.slice(-10) : [];
	return {
		question: String(data?.question ?? "").trim().slice(0, 500),
		brief: String(data?.brief ?? "").slice(0, 2e3),
		history: history.filter((turn) => turn && (turn.role === "user" || turn.role === "assistant")).map((turn) => ({
			role: turn.role,
			text: String(turn.text ?? "").slice(0, 800)
		}))
	};
}).handler(createSsrRpc("12c025912bf350e2bd015b2cc9c8a3138255b8432411ac467e699c8af2c94d4d"));
var STORE = "cue-ask";
var PROMPTS = [
	"Why this structure",
	"What is Nifty doing",
	"What invalidates it"
];
function AskPanel({ snapshot, capital }) {
	const ask = useServerFn(askCue);
	const one = useServerFn(readSwing);
	const scan = useServerFn(scanSwings);
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [error, setError] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		try {
			const saved = JSON.parse(window.localStorage.getItem(STORE) ?? "[]");
			if (Array.isArray(saved)) setMessages(saved.slice(-10));
		} catch {
			setMessages([]);
		}
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		if (!ready) return;
		window.localStorage.setItem(STORE, JSON.stringify(messages.slice(-10)));
	}, [messages, ready]);
	async function send(text) {
		const question = text.trim();
		if (!question || pending) return;
		const history = messages.slice(-10);
		setMessages((current) => [...current, {
			role: "user",
			text: question
		}]);
		setDraft("");
		setPending(true);
		setError(null);
		const card = promptAnswer(question, snapshot);
		if (card) {
			setMessages((current) => [...current, {
				role: "assistant",
				text: card
			}]);
			setPending(false);
			return;
		}
		try {
			if (isScan(question)) {
				const result = await scan({ data: { capital } });
				setMessages((current) => [...current, {
					role: "assistant",
					text: result.text
				}]);
				return;
			}
			const symbol = stockSymbol(question);
			if (symbol) {
				const result = await one({ data: {
					symbol,
					capital
				} });
				setMessages((current) => [...current, {
					role: "assistant",
					text: result.text
				}]);
				return;
			}
			const missing = unknownTicker(question);
			if (missing) {
				setMessages((current) => [...current, {
					role: "assistant",
					text: `${missing} is not in the Nifty 200 list on this desk, so there is no cash swing and no F&O idea. Not an order.`
				}]);
				return;
			}
			const result = await ask({ data: {
				question,
				brief: deskBrief(snapshot),
				history
			} });
			if (!result.ok) {
				setError(result.error);
				return;
			}
			setMessages((current) => [...current, {
				role: "assistant",
				text: result.text
			}]);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Cue did not finish.");
		} finally {
			setPending(false);
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mb-4 rounded-card border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-lg font-medium",
				children: "Ask about this read"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-1 text-sm text-muted",
				children: [
					"Type a stock such as RELIANCE for a cash swing and a defined-risk F&O idea, or ask about the ",
					snapshot.symbol,
					" card."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 flex flex-wrap gap-2",
				children: [PROMPTS.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => void send(prompt),
					className: "min-h-11 rounded-full border border-line bg-bg px-3 text-sm text-fg",
					children: prompt
				}, prompt)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => void send("Scan Nifty 200"),
					className: "min-h-11 rounded-full border border-line bg-bg px-3 text-sm text-fg",
					children: "Scan Nifty 200"
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-3 max-h-80 space-y-2 overflow-y-auto",
				children: [
					messages.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "No questions yet."
					}) : null,
					messages.map((message, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: message.role === "user" ? "whitespace-pre-wrap rounded-lg bg-bg px-3 py-2 text-sm text-muted" : "whitespace-pre-wrap rounded-lg bg-surface-2 px-3 py-2 text-sm text-fg",
						children: message.text
					}, `${message.role}-${index}`)),
					pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm text-muted",
						children: "Reading…"
					}) : null
				]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-down",
				children: error
			}) : null,
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				className: "mt-3 flex gap-2",
				onSubmit: (event) => {
					event.preventDefault();
					send(draft);
				},
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
					value: draft,
					onChange: (event) => setDraft(event.target.value),
					placeholder: "RELIANCE, or a question about this card",
					className: "min-h-11 min-w-0 flex-1 rounded-lg border border-line bg-bg px-3 text-sm text-fg"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "submit",
					disabled: pending,
					className: "min-h-11 rounded-lg bg-accent px-4 text-sm font-medium text-bg disabled:opacity-60",
					children: "Ask"
				})]
			})
		]
	});
}
function token(name, fallback) {
	if (typeof window === "undefined") return fallback;
	return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
function PriceChart({ candles }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el || candles.length === 0) return;
		let chart;
		const up = token("--color-up", "#2fbf71");
		const down = token("--color-down", "#e15b64");
		chart = Ve(el, {
			autoSize: true,
			height: 320,
			layout: {
				background: { color: token("--color-surface", "#151b24") },
				textColor: token("--color-muted", "#8d99aa"),
				fontFamily: "IBM Plex Sans, sans-serif"
			},
			grid: {
				vertLines: { color: token("--color-line", "#2a3442") },
				horzLines: { color: token("--color-line", "#2a3442") }
			},
			rightPriceScale: { borderColor: token("--color-line", "#2a3442") },
			timeScale: {
				borderColor: token("--color-line", "#2a3442"),
				timeVisible: true,
				secondsVisible: false
			}
		});
		const series = chart.addCandlestickSeries({
			upColor: up,
			downColor: down,
			borderUpColor: up,
			borderDownColor: down,
			wickUpColor: up,
			wickDownColor: down
		});
		const vwap = chart.addLineSeries({
			color: token("--color-accent", "#d6b36a"),
			lineWidth: 2,
			title: "VWAP"
		});
		const ema5 = chart.addLineSeries({
			color: up,
			lineWidth: 1,
			title: "EMA 5"
		});
		const ema20 = chart.addLineSeries({
			color: token("--color-fg", "#e7edf5"),
			lineWidth: 1,
			title: "EMA 20"
		});
		const rows = uniqueCandles(candles);
		series.setData(rows.map((c) => ({
			time: c.time,
			open: c.open,
			high: c.high,
			low: c.low,
			close: c.close
		})));
		vwap.setData(vwapSeries(rows));
		ema5.setData(emaSeries(rows, 5));
		ema20.setData(emaSeries(rows, 20));
		chart.timeScale().fitContent();
		return () => chart?.remove();
	}, [candles]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "h-80 w-full"
	});
}
function OiChart({ chain }) {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const el = ref.current;
		if (!el || chain.length === 0) return;
		const strikes = {};
		const base = Math.floor(Date.now() / 1e3) - chain.length * 60;
		const chart = Ve(el, {
			autoSize: true,
			height: 280,
			layout: {
				background: { color: token("--color-surface", "#151b24") },
				textColor: token("--color-muted", "#8d99aa"),
				fontFamily: "IBM Plex Sans, sans-serif"
			},
			grid: {
				vertLines: { color: token("--color-line", "#2a3442") },
				horzLines: { color: token("--color-line", "#2a3442") }
			},
			rightPriceScale: { borderColor: token("--color-line", "#2a3442") },
			timeScale: {
				borderColor: token("--color-line", "#2a3442"),
				tickMarkFormatter: (time) => {
					const strike = strikes[time];
					return strike ? strike.toLocaleString("en-IN") : "";
				}
			}
		});
		const puts = chart.addHistogramSeries({
			color: token("--color-up", "#2fbf71"),
			priceFormat: { type: "volume" },
			title: "Put OI"
		});
		const calls = chart.addHistogramSeries({
			color: token("--color-down", "#e15b64"),
			priceFormat: { type: "volume" },
			title: "Call OI"
		});
		puts.setData(chain.map((row, i) => {
			const time = base + i * 60;
			strikes[time] = row.strike;
			return {
				time,
				value: row.putOi
			};
		}));
		calls.setData(chain.map((row, i) => ({
			time: base + i * 60,
			value: row.callOi
		})));
		chart.timeScale().fitContent();
		return () => chart.remove();
	}, [chain]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref,
		className: "h-72 w-full"
	});
}
function uniqueCandles(candles) {
	const seen = /* @__PURE__ */ new Set();
	return candles.filter((c) => Number.isFinite(c.time) && Number.isFinite(c.close)).sort((a, b) => a.time - b.time).filter((c) => {
		if (seen.has(c.time)) return false;
		seen.add(c.time);
		return true;
	});
}
function emaSeries(candles, period) {
	const k = 2 / (period + 1);
	let value = candles[0]?.close ?? 0;
	return candles.map((c) => {
		value = c.close * k + value * (1 - k);
		return {
			time: c.time,
			value
		};
	});
}
function vwapSeries(candles) {
	let vol = 0;
	let tpv = 0;
	return candles.map((c) => {
		const tp = (c.high + c.low + c.close) / 3;
		vol += c.volume || 1;
		tpv += tp * (c.volume || 1);
		return {
			time: c.time,
			value: tpv / vol
		};
	});
}
function SwingBoard({ capital }) {
	const run = useServerFn(scanSwing);
	const [scan, setScan] = (0, import_react.useState)(null);
	const [error, setError] = (0, import_react.useState)("");
	const [busy, setBusy] = (0, import_react.useState)(false);
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mb-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mb-3 flex flex-wrap items-end justify-between gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-lg font-medium",
					children: "CUE-SWING · Nifty 200"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted",
					children: "Long ideas are a future plus a put. A name is shown only when that hedge still pays at least 1:2.5."
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => void start(),
					disabled: busy,
					className: "inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-sm font-medium text-bg disabled:opacity-60",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ScanSearch, { className: busy ? "size-4 animate-spin" : "size-4" }), busy ? "Scanning sectors, then stocks" : "Scan Nifty 200"]
				})]
			}),
			error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-3 text-sm text-down",
				children: error
			}) : null,
			scan ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-card border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: scan.session
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-3 grid gap-3 md:grid-cols-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorList, {
									title: "Long sectors",
									items: longSectors,
									tone: "up"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SectorList, {
									title: "Short sectors",
									items: shortSectors,
									tone: "down"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "mt-3 text-xs text-muted",
								children: [
									scan.longs.length,
									" long and ",
									scan.shorts.length,
									" short passed all five gates. ",
									scan.scanned,
									" names were in a trending sector.",
									" ",
									scan.note
								]
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardList, {
						title: "Long swings",
						cards: scan.longs,
						empty: "No long passed every gate."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CardList, {
						title: "Short swings",
						cards: scan.shorts,
						empty: "No F&O short passed every gate."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Cap yourself at 2 stock F&O swings or 4 cash swings. At 1.5R (+3%), book half and trail the rest to the entry. Exit longs that close under the 20-day EMA and shorts that close over it."
					})
				]
			}) : null
		]
	});
}
function SectorList({ title, items, tone }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-sm font-medium",
		children: title
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
		className: "mt-2 space-y-1",
		children: [items.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", {
			className: "text-sm text-muted",
			children: "None"
		}) : null, items.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
			className: "flex items-center justify-between text-sm",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: s.name }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
				className: tone === "up" ? "font-mono text-up" : "font-mono text-down",
				children: [
					s.vsNifty >= 0 ? "+" : "",
					(s.vsNifty * 100).toFixed(2),
					"% vs Nifty"
				]
			})]
		}, s.id))]
	})] });
}
function CardList({ title, cards, empty }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
			className: "mb-2 text-base font-medium",
			children: title
		}),
		cards.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm text-muted",
			children: empty
		}) : null,
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-3",
			children: cards.map((card) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
				className: card.direction === "LONG" ? "rounded-card border border-line border-l-4 border-l-up bg-surface p-4" : "rounded-card border border-line border-l-4 border-l-down bg-surface p-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-start justify-between gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: card.direction === "LONG" ? "text-xs font-medium text-up" : "text-xs font-medium text-down",
								children: card.direction
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-lg font-semibold",
								children: card.symbol
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-sm text-muted",
								children: card.structure
							})
						] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "font-mono text-xl",
							children: [card.score, "/100"]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
						className: "mt-3 space-y-1 text-sm",
						children: card.proofs.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "mt-3 flex flex-wrap gap-2",
						children: card.legs.map((leg) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "rounded-full bg-surface-2 px-3 py-1 font-mono text-xs",
							children: [
								leg.action.toUpperCase(),
								" · ",
								leg.text.replace(/^(Buy|Sell)\s/, "")
							]
						}, leg.text))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
						className: "mt-3 grid grid-cols-2 gap-2 text-sm md:grid-cols-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "Future"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-mono",
								children: card.entry.toLocaleString("en-IN")
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: card.direction === "LONG" ? "Max loss / share" : "Stop"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-mono text-down",
								children: card.direction === "LONG" ? `₹${Math.round(card.entry - card.stop).toLocaleString("en-IN")}` : card.stop.toLocaleString("en-IN")
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "R:R"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dd", {
								className: "font-mono text-accent",
								children: ["1:", card.rr.toFixed(1)]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "text-xs text-muted",
								children: "Target"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "font-mono text-up",
								children: card.target.toLocaleString("en-IN")
							})] })
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-xs text-muted",
						children: card.invalidation
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: card.direction === "LONG" ? `Put premium about ₹${card.premium.toLocaleString("en-IN")} (estimate). Size ${card.qty.toLocaleString("en-IN")} so the hedge risks 2% of capital. ${card.maxLoss}` : card.maxLoss
					})
				]
			}, `${card.direction}-${card.symbol}`))
		})
	] });
}
function Desk() {
	const snapshot = Route.useLoaderData();
	const { symbol } = Route.useSearch();
	const navigate = useNavigate();
	const router = useRouter();
	const [capital, setCapital] = (0, import_react.useState)(5e5);
	const [risk, setRisk] = (0, import_react.useState)(1.5);
	const [ready, setReady] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		setReady(true);
	}, []);
	(0, import_react.useEffect)(() => {
		const id = window.setInterval(() => {
			router.invalidate();
		}, 6e4);
		return () => window.clearInterval(id);
	}, [router]);
	function pick(next) {
		navigate({
			to: "/",
			search: { symbol: next }
		});
	}
	async function refresh() {
		setBusy(true);
		await router.invalidate();
		setBusy(false);
	}
	const riskRupees = Math.round(capital * (risk / 100));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto min-h-screen max-w-6xl px-4 py-5 md:px-6",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
				className: "mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-mono text-xs tracking-[0.18em] text-accent uppercase",
						children: "Index desk"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
						className: "text-3xl font-semibold tracking-tight text-fg",
						children: "CUE-PRO"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 max-w-xl text-sm text-muted",
						children: "Silence is a recommendation. Cards stay defined-risk. Price and VIX come from Yahoo Finance."
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [SYMBOLS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: () => pick(item),
						className: item === symbol ? "min-h-11 rounded-full bg-up px-4 text-sm font-medium text-bg" : "min-h-11 rounded-full border border-line bg-surface px-4 text-sm text-fg",
						children: item
					}, item)), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "button",
						onClick: () => void refresh(),
						className: "inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface px-4 text-sm text-fg",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: busy ? "size-4 animate-spin" : "size-4" }), "Refresh"]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pulse, {
						label: "Nifty 50",
						last: snapshot.nifty.last,
						pct: snapshot.nifty.changePct
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pulse, {
						label: "Bank Nifty",
						last: snapshot.bank.last,
						pct: snapshot.bank.changePct
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-card border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "India VIX"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-2xl text-fg",
								children: fmt(snapshot.vix)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: snapshot.card.regime === "credit" ? "text-sm text-accent" : "text-sm text-up",
								children: snapshot.card.regime === "credit" ? "Credit-friendly" : "Debit-friendly"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-card border border-line bg-surface p-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted",
								children: "Feed"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-lg font-medium text-fg",
								children: snapshot.source === "yahoo" ? "Yahoo live" : "Last known print"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs text-muted",
								children: [snapshot.fetchedAt.slice(11, 19), " IST print"]
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4 rounded-card border border-line bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium",
						children: "Price, VWAP, EMAs"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
						className: "font-mono text-sm text-muted",
						children: [
							symbol,
							" ",
							fmt(snapshot.spot),
							" ",
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: snapshot.changePct >= 0 ? "text-up" : "text-down",
								children: [
									snapshot.changePct >= 0 ? "+" : "",
									snapshot.changePct.toFixed(2),
									"%"
								]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PriceChart, { candles: snapshot.candles })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4 rounded-card border border-line bg-surface p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-1 flex items-baseline justify-between gap-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-medium",
						children: "OI walls by strike"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted",
						children: "Modeled from spot — exchange chain is not public from this host"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OiChart, { chain: snapshot.chain })]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "mb-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mb-3 text-lg font-medium",
					children: "Cue card"
				}), snapshot.card.status === "silence" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-card border border-line bg-surface px-6 py-10 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "mx-auto mb-3 size-8 text-accent" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "text-xl font-medium",
							children: "Market silence — capital protected"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mx-auto mt-2 max-w-md text-sm text-muted",
							children: snapshot.card.reason
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-2 font-mono text-xs text-muted",
							children: ["Tape ", snapshot.card.tape]
						})
					]
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("article", {
					className: "rounded-card border border-line border-l-4 border-l-up bg-surface p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-start justify-between gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-xs text-muted",
								children: [symbol, " · nearest expiry"]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "text-xl font-semibold",
								children: snapshot.card.strategy
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
								className: "font-mono text-2xl text-up",
								children: [snapshot.card.score, "/100"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-1 text-sm text-fg",
							children: snapshot.card.why?.map((line) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: line }, line))
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mt-4 flex flex-wrap gap-2",
							children: snapshot.card.legs?.map((leg) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "rounded-full bg-surface-2 px-3 py-1 font-mono text-xs",
								children: [
									leg.action.toUpperCase(),
									" ",
									leg.strike.toLocaleString("en-IN"),
									" ",
									leg.type
								]
							}, `${leg.action}-${leg.strike}-${leg.type}`))
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AskPanel, {
				snapshot,
				capital
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwingBoard, { capital }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
				className: "rounded-card border border-line bg-surface p-5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mb-3 text-lg font-medium",
						children: "Position size"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex flex-wrap items-end gap-4",
						children: [ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-muted",
							children: ["Capital (₹)", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 0,
								value: capital,
								onChange: (e) => setCapital(Number(e.target.value) || 0),
								className: "mt-1 block min-h-11 w-40 rounded-lg border border-line bg-bg px-3 font-mono text-sm text-fg"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: "text-xs text-muted",
							children: ["Risk %", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: "number",
								min: 0,
								step: .1,
								value: risk,
								onChange: (e) => setRisk(Number(e.target.value) || 0),
								className: "mt-1 block min-h-11 w-24 rounded-lg border border-line bg-bg px-3 font-mono text-sm text-fg"
							})]
						})] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "pb-2 text-sm text-muted",
							children: "Capital ₹5,00,000 · risk 1.5%"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "pb-2 text-sm text-muted",
							children: [
								"Max risk this trade",
								" ",
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
									className: "font-mono text-fg",
									children: ["₹", riskRupees.toLocaleString("en-IN")]
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 text-xs text-muted",
						children: "Educational read of public prices. Options can expire worthless. Check the live chain at your broker before you act."
					})
				]
			})
		]
	});
}
function Pulse({ label, last, pct }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-card border border-line bg-surface p-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-xs text-muted",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "font-mono text-2xl text-fg",
				children: fmt(last)
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: pct >= 0 ? "text-sm text-up" : "text-sm text-down",
				children: [
					pct >= 0 ? "+" : "",
					pct.toFixed(2),
					"%"
				]
			})
		]
	});
}
function fmt(n) {
	return n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}
//#endregion
export { Desk as component };
