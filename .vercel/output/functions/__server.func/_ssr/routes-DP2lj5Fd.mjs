import { i as __toESM } from "../_runtime.mjs";
import { J as require_react, b as useRouter, x as require_jsx_runtime, y as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as SYMBOLS } from "./market-JpPq8U5D.mjs";
import { n as Shield, r as RefreshCw } from "../_libs/lucide-react.mjs";
import { n as Route } from "./router-p5c2UMyN.mjs";
import { t as Ve } from "../_libs/lightweight-charts.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-DP2lj5Fd.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
