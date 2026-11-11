import { t as createServerFn } from "./ssr.mjs";
import { n as loadSwingScan, r as loadSymbolSwing, t as createServerRpc } from "./swing-scan.server-1fqy4bpQ.mjs";
import { i as formatSwing, n as formatScan, r as formatSilence } from "./ask-C94M5JJ1.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ask.functions-BnC3wlOI.js
var SYSTEM = `You are Cue, the chat on an index desk. Answer the question.
If the question is about the current Nifty or Bank Nifty card, use the desk brief. Do not invent a strike, a premium, or a fill that is not in the brief.
For a stock, say you only quote a cash swing and an F&O spread after the gates pass, and tell the user to type the symbol.
Never suggest dropping a hedge or trading a naked future.
Keep it under 120 words. End with "Not an order."`;
var readSwing_createServerFn_handler = createServerRpc({
	id: "b80fefc16e1c71778d7850f2fb7dcceded6ee01dbd2bd45038578421272dc983",
	name: "readSwing",
	filename: "src/lib/ask.functions.ts"
}, (opts) => readSwing.__executeServer(opts));
var readSwing = createServerFn({ method: "POST" }).validator((data) => ({
	symbol: String(data?.symbol ?? "").toUpperCase().replace(/[^A-Z0-9&-]/g, "").slice(0, 18),
	capital: Math.min(5e7, Math.max(1e4, Number(data?.capital) || 5e5))
})).handler(readSwing_createServerFn_handler, async ({ data }) => {
	if (!data.symbol) return { text: formatSilence("That symbol") };
	const card = await loadSymbolSwing(data.symbol, data.capital);
	return { text: card ? formatSwing(card) : formatSilence(data.symbol) };
});
var scanSwings_createServerFn_handler = createServerRpc({
	id: "ff148749e9ae7f641376f1d319a1d6d4aafe4e0c13c836563c05bcf15dfd4105",
	name: "scanSwings",
	filename: "src/lib/ask.functions.ts"
}, (opts) => scanSwings.__executeServer(opts));
var scanSwings = createServerFn({ method: "POST" }).validator((data) => ({ capital: Math.min(5e7, Math.max(1e4, Number(data?.capital) || 5e5)) })).handler(scanSwings_createServerFn_handler, async ({ data }) => {
	const scan = await loadSwingScan(data.capital);
	return { text: formatScan(scan.longs, scan.shorts) };
});
var askCue_createServerFn_handler = createServerRpc({
	id: "12c025912bf350e2bd015b2cc9c8a3138255b8432411ac467e699c8af2c94d4d",
	name: "askCue",
	filename: "src/lib/ask.functions.ts"
}, (opts) => askCue.__executeServer(opts));
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
}).handler(askCue_createServerFn_handler, async ({ data }) => {
	if (!data.question) return {
		ok: false,
		error: "Ask a question first."
	};
	const apiKey = process.env.XAI_API_KEY?.trim();
	if (!apiKey) return {
		ok: false,
		error: "Asking Cue is not available in this environment."
	};
	return {
		ok: true,
		text: await complete(apiKey, data.brief, data.history, data.question)
	};
});
async function complete(apiKey, brief, history, question) {
	const messages = [
		{
			role: "system",
			content: SYSTEM
		},
		{
			role: "system",
			content: `Desk brief:\n${brief}`
		},
		...history.map((turn) => ({
			role: turn.role,
			content: turn.text
		})),
		{
			role: "user",
			content: question
		}
	];
	const res = await fetch("https://api.x.ai/v1/chat/completions", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${apiKey}`
		},
		body: JSON.stringify({
			model: "grok-4.5",
			messages,
			max_tokens: 400,
			temperature: .2
		}),
		signal: AbortSignal.timeout(25e3)
	});
	if (!res.ok) throw new Error(`Cue could not answer (${res.status}).`);
	const text = (await res.json()).choices?.[0]?.message?.content?.trim();
	if (!text) throw new Error("Cue returned an empty answer.");
	return text;
}
//#endregion
export { askCue_createServerFn_handler, readSwing_createServerFn_handler, scanSwings_createServerFn_handler };
