import { z } from "zod";

export type PoolCandle = { t: number; c: number; v: number };
export type CandleRange = "24h" | "7d";

const schema = z.object({ data: z.object({ attributes: z.object({ ohlcv_list: z.array(z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])) }) }) });

/** Public GeckoTerminal candles for an exact pool (oldest first). 24h = hourly, 7d = 4-hourly. */
export async function fetchPoolCandles(pool: string, range: CandleRange, signal?: AbortSignal): Promise<PoolCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool)) return [];
  const path = range === "24h" ? "hour?aggregate=1&limit=24" : "hour?aggregate=4&limit=42";
  const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${path}&currency=usd`, { signal: signal ?? null });
  if (!res.ok) throw new Error("candles");
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.data.attributes.ohlcv_list
    .map(([t, , , , c, v]) => ({ t: t * 1000, c, v }))
    .filter((x) => x.c > 0 && x.v >= 0)
    .sort((a, b) => a.t - b.t);
}

/** Running interest paid by the pool: each candle's volume × fee ratio (fees24h / volume24h). Never decreases. */
export function cumulativeInterest(candles: PoolCandle[], feeRatio: number): number[] {
  let s = 0;
  return candles.map((c) => (s += c.v * Math.max(0, feeRatio)));
}

/** Daily closes for the last `n` days (oldest first), from the same public GeckoTerminal pool candles. */
export async function fetchDailyCloses(pool: string, n: number, signal?: AbortSignal): Promise<PoolCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool)) return [];
  const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/day?aggregate=1&limit=${Math.min(Math.max(n, 2), 60)}&currency=usd`, { signal: signal ?? null });
  if (!res.ok) throw new Error("candles");
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.data.attributes.ohlcv_list.map(([t, , , , c, v]) => ({ t: t * 1000, c, v })).filter((x) => x.c > 0).sort((a, b) => a.t - b.t);
}

/** 4-hour closes for the last `days` days (oldest first), for a choppy market line. */
export async function fetchIntradayCloses(pool: string, days: number, signal?: AbortSignal): Promise<PoolCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool)) return [];
  const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/hour?aggregate=4&limit=${Math.min(Math.max(days * 6, 12), 200)}&currency=usd`, { signal: signal ?? null });
  if (!res.ok) throw new Error("candles");
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) return [];
  return parsed.data.data.attributes.ohlcv_list.map(([t, , , , c, v]) => ({ t: t * 1000, c, v })).filter((x) => x.c > 0).sort((a, b) => a.t - b.t);
}

/** Close price for each day start (carries the previous close forward when a day has no candle). */
export function closesForDays(candles: PoolCandle[], dayStarts: number[]): (number | null)[] {
  let j = 0, last: number | null = null;
  return dayStarts.map((s) => { while (j < candles.length && candles[j]!.t < s + 86_400_000) last = candles[j++]!.c; return last; });
}

/** Global market line: today's value of each vault moved back in time by its token's price ratio, summed. */
export function globalMarket(vaults: { value: number; closes: (number | null)[] }[], n: number): number[] {
  return Array.from({ length: n }, (_, d) => vaults.reduce((s, v) => { const now = v.closes[n - 1], c = v.closes[d]; return s + (now && c ? v.value * (c / now) : v.value); }, 0));
}
