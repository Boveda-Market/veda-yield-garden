import type { PredictSide } from "@/lib/predict";

/**
 * Real trades of one Up/Down round from Polymarket's public live-data feed (topic "activity", filtered by event slug).
 * Used only to show genuine market activity next to the chart; nothing here is invented or simulated.
 */
export type LiveTrade = { id: string; t: number; side: PredictSide; usd: number; buy: boolean };

const WS_URL = "wss://ws-live-data.polymarket.com";

type RawTrade = { eventSlug?: string; slug?: string; outcome?: string; side?: string; size?: number; price?: number; timestamp?: number; transactionHash?: string; asset?: string };

/** Pure: parse one feed message into trades of exactly this round; anything else (other rounds, bad numbers) is dropped. */
export function parseTradeMessage(raw: string, slug: string): LiveTrade[] {
  if (!raw || raw === "PONG") return [];
  let j: { topic?: string; type?: string; timestamp?: number; payload?: RawTrade | RawTrade[] };
  try { j = JSON.parse(raw); } catch { return []; }
  if (j.topic !== "activity" || j.type !== "trades" || !j.payload) return [];
  const rows = Array.isArray(j.payload) ? j.payload : [j.payload];
  const out: LiveTrade[] = [];
  for (const r of rows) {
    if ((r.eventSlug ?? r.slug) !== slug) continue;
    const side = r.outcome === "Up" ? "up" : r.outcome === "Down" ? "down" : null;
    const size = Number(r.size), price = Number(r.price);
    if (!side || !Number.isFinite(size) || !Number.isFinite(price) || size <= 0 || price <= 0 || price >= 1) continue;
    const t = Number.isFinite(Number(r.timestamp)) ? Number(r.timestamp) * 1000 : Number(j.timestamp) || Date.now();
    out.push({ id: `${r.transactionHash ?? ""}:${r.asset ?? ""}:${size}:${price}:${r.side ?? ""}`, t, side, usd: size * price, buy: r.side !== "SELL" });
  }
  return out;
}

/** Pure: number of buys and dollars bought in the window ending at nowMs (only trades this screen actually received). */
export function tradePulse(trades: readonly LiveTrade[], nowMs: number, windowMs = 60_000): { count: number; usd: number; up: number; down: number } {
  let count = 0, usd = 0, up = 0, down = 0;
  for (const k of trades) {
    if (!k.buy || k.t < nowMs - windowMs || k.t > nowMs + 5_000) continue;
    count++; usd += k.usd;
    if (k.side === "up") up += k.usd; else down += k.usd;
  }
  return { count, usd, up, down };
}

/** Listen to the live trades of one round; reconnects while subscribed and closes with the returned cleanup. */
export function subscribeRoundTrades(slug: string, onTrades: (t: LiveTrade[]) => void): () => void {
  if (typeof WebSocket === "undefined") return () => {};
  let sock: WebSocket | null = null, alive = true, wait = 1_000;
  let ping: ReturnType<typeof setInterval> | undefined, retry: ReturnType<typeof setTimeout> | undefined;
  const seen = new Set<string>();
  const open = () => {
    if (!alive) return;
    const s = new WebSocket(WS_URL); sock = s;
    s.onopen = () => { wait = 1_000; s.send(JSON.stringify({ action: "subscribe", subscriptions: [{ topic: "activity", type: "trades", filters: JSON.stringify({ event_slug: slug }) }] })); };
    s.onmessage = (e) => {
      const fresh = parseTradeMessage(String(e.data), slug).filter((k) => !seen.has(k.id));
      if (!fresh.length) return;
      for (const k of fresh) seen.add(k.id);
      if (seen.size > 5_000) seen.clear();
      onTrades(fresh);
    };
    s.onclose = () => { if (sock === s) sock = null; if (alive) { retry = setTimeout(open, wait); wait = Math.min(wait * 2, 15_000); } };
    s.onerror = () => { try { s.close(); } catch { /* closing */ } };
  };
  open();
  ping = setInterval(() => { try { sock?.send("PING"); } catch { /* reconnects on close */ } }, 10_000);
  return () => { alive = false; if (ping) clearInterval(ping); if (retry) clearTimeout(retry); try { sock?.close(); } catch { /* closed */ } };
}
