import { fetchPrices, MARKETS, type MarketId } from "@/lib/markets";

/**
 * Live BTC/ETH/SOL prices from Polymarket's public live-data feed (the Chainlink prices its Up/Down rounds settle on),
 * shared by every Sube/Baja screen through one browser WebSocket. Falls back to exchange spot only while the feed is silent.
 */
export type Tick = { t: number; v: number };

const WS_URL = "wss://ws-live-data.polymarket.com";
const SYMBOL: Record<MarketId, string> = { BTC: "btc/usd", ETH: "eth/usd", SOL: "sol/usd" };
const BY_SYMBOL = Object.fromEntries(MARKETS.map((m) => [SYMBOL[m.id], m.id])) as Record<string, MarketId>;
const MAX_TICKS = 8000;
const SILENT_MS = 8_000;

const series: Record<MarketId, Tick[]> = { BTC: [], ETH: [], SOL: [] };
const subs = new Set<() => void>();
// One socket per asset: the feed only keeps streaming the last filtered subscription of a connection.
const sockets: Partial<Record<MarketId, WebSocket>> = {};
const retries: Partial<Record<MarketId, ReturnType<typeof setTimeout>>> = {};
const backoff: Record<MarketId, number> = { BTC: 1_000, ETH: 1_000, SOL: 1_000 };
const lastFeedAt: Record<MarketId, number> = { BTC: 0, ETH: 0, SOL: 0 };
let ping: ReturnType<typeof setInterval> | undefined;
let watchdog: ReturnType<typeof setInterval> | undefined;

/** Pure: merge ticks keeping time order, dropping duplicates/out-of-order points and invalid values. */
export function mergeTicks(prev: readonly Tick[], incoming: readonly Tick[], max = MAX_TICKS): Tick[] {
  const out = [...prev];
  for (const k of [...incoming].sort((a, b) => a.t - b.t)) {
    if (!Number.isFinite(k.v) || k.v <= 0 || !Number.isFinite(k.t)) continue;
    const last = out[out.length - 1];
    if (last && k.t <= last.t) continue;
    out.push(k);
  }
  return out.length > max ? out.slice(-max) : out;
}

/** Pure: parse one feed message into ticks for our assets ({ topic, payload: { symbol, value, timestamp } | { symbol, data[] } }). */
export function parseFeedMessage(raw: string): { asset: MarketId; ticks: Tick[] } | null {
  if (!raw) return null;
  let j: { topic?: string; payload?: { symbol?: string; value?: number; timestamp?: number; data?: { timestamp?: number; value?: number }[] } };
  try { j = JSON.parse(raw); } catch { return null; }
  if (j.topic !== "crypto_prices_chainlink" || !j.payload?.symbol) return null;
  const asset = BY_SYMBOL[j.payload.symbol];
  if (!asset) return null;
  const rows = Array.isArray(j.payload.data) ? j.payload.data : [{ timestamp: j.payload.timestamp, value: j.payload.value }];
  const ticks = rows.map((r) => ({ t: Number(r.timestamp), v: Number(r.value) })).filter((r) => Number.isFinite(r.t) && Number.isFinite(r.v) && r.v > 0);
  return ticks.length ? { asset, ticks } : null;
}

/**
 * Pure: average of the live prices in the minute before endMs. Polymarket's official price to beat matches this
 * one-minute average at the opening (and the result uses the same average at the close); null without enough data.
 */
export function minuteAverage(ticks: readonly Tick[], endMs: number, minTicks = 40): number | null {
  let sum = 0, n = 0;
  for (const k of ticks) if (k.t >= endMs - 60_000 && k.t < endMs) { sum += k.v; n++; }
  return n >= minTicks ? sum / n : null;
}

const emit = () => subs.forEach((f) => f());

function connect(asset: MarketId) {
  if (typeof WebSocket === "undefined" || sockets[asset]) return;
  const sock = new WebSocket(WS_URL);
  sockets[asset] = sock;
  sock.onopen = () => {
    backoff[asset] = 1_000;
    sock.send(JSON.stringify({ action: "subscribe", subscriptions: [{ topic: "crypto_prices_chainlink", type: "*", filters: JSON.stringify({ symbol: SYMBOL[asset] }) }] }));
  };
  sock.onmessage = (e) => {
    const m = parseFeedMessage(String(e.data));
    if (!m || m.asset !== asset) return;
    lastFeedAt[asset] = Date.now();
    series[asset] = mergeTicks(series[asset], m.ticks);
    emit();
  };
  sock.onclose = () => {
    if (sockets[asset] === sock) delete sockets[asset];
    if (subs.size) { retries[asset] = setTimeout(() => connect(asset), backoff[asset]); backoff[asset] = Math.min(backoff[asset] * 2, 15_000); }
  };
  sock.onerror = () => { try { sock.close(); } catch { /* closing */ } };
}

/** Exchange spot only while the official feed is silent (blocked network, outage), so screens never freeze. */
async function fallbackTick() {
  const now = Date.now();
  const silent = MARKETS.filter((m) => now - lastFeedAt[m.id] >= SILENT_MS);
  if (!silent.length || (typeof document !== "undefined" && document.hidden)) return;
  try {
    const p = await fetchPrices();
    const t = Date.now();
    for (const m of silent) { const v = p[m.id]; if (v) series[m.id] = mergeTicks(series[m.id], [{ t, v }]); }
    emit();
  } catch { /* retry next tick */ }
}

function start() {
  const now = Date.now();
  for (const m of MARKETS) { lastFeedAt[m.id] = now; connect(m.id); }
  ping = setInterval(() => { for (const w of Object.values(sockets)) { try { w?.send("PING"); } catch { /* reconnects on close */ } } }, 10_000);
  watchdog = setInterval(() => void fallbackTick(), 1_500);
}

function stop() {
  if (ping) clearInterval(ping);
  if (watchdog) clearInterval(watchdog);
  ping = watchdog = undefined;
  for (const m of MARKETS) {
    const r = retries[m.id]; if (r) clearTimeout(r); delete retries[m.id];
    const w = sockets[m.id]; delete sockets[m.id];
    try { w?.close(); } catch { /* already closed */ }
  }
}

/** Listen to live ticks; the socket opens with the first listener and closes with the last. */
export function subscribeLivePrices(f: () => void) {
  subs.add(f);
  if (subs.size === 1) start();
  return () => { subs.delete(f); if (subs.size === 0) stop(); };
}

export const liveSeries = (asset: MarketId): Tick[] => series[asset];
export const livePrice = (asset: MarketId): number | undefined => series[asset].at(-1)?.v;
