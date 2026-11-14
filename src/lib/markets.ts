/** Practice-only timed prediction rounds (Up/Down). Fictitious credits only; never on-chain. */
export type MarketId = "SOL" | "BTC" | "ETH";
export type Side = "up" | "down";

export const MARKETS: { id: MarketId; name: string }[] = [
  { id: "BTC", name: "Bitcoin" },
  { id: "ETH", name: "Ethereum" },
  { id: "SOL", name: "SOL" },
];

export const WINDOWS = [
  { id: "5m", label: "5 min", ms: 5 * 60_000 },
  { id: "15m", label: "15 min", ms: 15 * 60_000 },
  { id: "1h", label: "1 h", ms: 60 * 60_000 },
] as const;
export type WindowId = (typeof WINDOWS)[number]["id"];

export const MIN_STAKE = 5;
export const STARTING_CREDITS = 1000;
/** Fixed gross payout multiple for a correct prediction. */
export const PAYOUT_MULTIPLE = 1.9;
/** Entries close when less than this fraction of the round remains. */
export const ENTRY_CUTOFF = 0.2;
/** Fictitious practice fee: free profit up to 10, then 1.25% on the excess. */
export const PROFIT_FEE_FREE = 10;
export const PROFIT_FEE_RATE = 0.0125;

export type Prediction = { id: string; market: MarketId; window: WindowId; side: Side; stake: number; lock: number; placedAt: number; endsAt: number };
export type PredictionResult = Prediction & { close: number; outcome: "win" | "loss" | "tie"; fee: number; payout: number };
export type MarketsState = { balance: number; open: Prediction[]; history: PredictionResult[] };

export const windowMs = (w: WindowId) => WINDOWS.find((x) => x.id === w)!.ms;

/** Rounds are aligned to the clock (UTC): e.g. 5m rounds end at :00, :05, :10… */
export function roundOf(w: WindowId, now: number) {
  const ms = windowMs(w);
  const start = Math.floor(now / ms) * ms;
  return { start, end: start + ms, remaining: start + ms - now, entryOpen: start + ms - now > ms * ENTRY_CUTOFF };
}

export function profitFee(profit: number): number {
  if (profit <= PROFIT_FEE_FREE) return 0;
  return Math.round((profit - PROFIT_FEE_FREE) * PROFIT_FEE_RATE * 1e6) / 1e6;
}

export function resolve(p: Prediction, close: number): PredictionResult {
  if (close === p.lock) return { ...p, close, outcome: "tie", fee: 0, payout: p.stake };
  const win = p.side === "up" ? close > p.lock : close < p.lock;
  if (!win) return { ...p, close, outcome: "loss", fee: 0, payout: 0 };
  const profit = p.stake * (PAYOUT_MULTIPLE - 1);
  const fee = profitFee(profit);
  return { ...p, close, outcome: "win", fee, payout: Math.round((p.stake + profit - fee) * 1e6) / 1e6 };
}

export function validStake(stake: number, balance: number): boolean {
  return Number.isFinite(stake) && stake >= MIN_STAKE && stake <= balance;
}

export function readMarkets(raw: string | null): MarketsState {
  try {
    const d = raw ? JSON.parse(raw) : null;
    if (d && typeof d.balance === "number" && Array.isArray(d.open) && Array.isArray(d.history)) return { balance: d.balance, open: d.open, history: d.history.slice(0, 50) };
  } catch {}
  return { balance: STARTING_CREDITS, open: [], history: [] };
}

export async function fetchPrices(): Promise<Partial<Record<MarketId, number>>> {
  const rows = await Promise.all(MARKETS.map(async (m) => {
    try {
      const res = await fetch(`https://api.coinbase.com/v2/prices/${m.id}-USD/spot`, { cache: "no-store" });
      if (!res.ok) return [m.id, NaN] as const;
      const json = (await res.json()) as { data?: { amount?: string } };
      return [m.id, Number(json.data?.amount)] as const;
    } catch { return [m.id, NaN] as const; }
  }));
  const out: Partial<Record<MarketId, number>> = {};
  for (const [id, v] of rows) if (Number.isFinite(v) && v > 0) out[id] = v;
  if (!Object.keys(out).length) throw new Error("price");
  return out;
}

export type Candle = { t: number; o: number; h: number; l: number; c: number };
/** Recent real OHLC candles (oldest first). granularity in seconds: 60, 300, 900, 1800 (aggregated) or 3600. */
export async function fetchCandles(id: MarketId, granularity: number, count = 36): Promise<Candle[]> {
  // Coinbase has no 30m granularity: build it from pairs of 15m candles.
  if (granularity === 1800) {
    const base = await fetchCandles(id, 900, count * 2 + 2);
    const out: Candle[] = [];
    for (const k of base) {
      const t = Math.floor(k.t / 1_800_000) * 1_800_000;
      const last = out[out.length - 1];
      if (last && last.t === t) { last.h = Math.max(last.h, k.h); last.l = Math.min(last.l, k.l); last.c = k.c; }
      else out.push({ ...k, t });
    }
    return out.slice(-count);
  }
  try {
    const res = await fetch(`https://api.exchange.coinbase.com/products/${id}-USD/candles?granularity=${granularity}`);
    if (!res.ok) return [];
    const rows = (await res.json()) as number[][];
    return rows.slice(0, count).reverse()
      .map((r) => ({ t: r[0]! * 1000, l: r[1]!, h: r[2]!, o: r[3]!, c: r[4]! }))
      .filter((k) => k.o > 0 && k.c > 0 && k.h > 0 && k.l > 0);
  } catch { return []; }
}

/** Historical price at a timestamp: open of the 1-minute candle starting then (for rounds that ended while away). */
export async function fetchPriceAt(id: MarketId, ts: number): Promise<number | null> {
  const start = Math.floor(ts / 60_000) * 60_000;
  const url = `https://api.exchange.coinbase.com/products/${id}-USD/candles?granularity=60&start=${new Date(start).toISOString()}&end=${new Date(start + 120_000).toISOString()}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const rows = (await res.json()) as number[][];
    const row = rows.find((r) => r[0]! * 1000 === start);
    return row && row[3]! > 0 ? row[3]! : null;
  } catch { return null; }
}
