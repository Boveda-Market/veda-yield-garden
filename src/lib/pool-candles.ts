import { z } from "zod";

export type PoolCandle = { t: number; c: number; v: number };
export type CandleRange = "24h" | "7d" | "30d";

const schema = z.object({ data: z.object({ attributes: z.object({ ohlcv_list: z.array(z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])) }) }) });

/** Chart resolutions: 1-minute for 24 h, 15-minute for 7 d, 1-hour for 30 d, so every spike and drop of a volatile token shows. */
export const RANGE_RES = {
  "24h": { tf: "minute", agg: 1, count: 1440, ms: 86_400_000 },
  "7d": { tf: "minute", agg: 15, count: 672, ms: 7 * 86_400_000 },
  "30d": { tf: "hour", agg: 1, count: 720, ms: 30 * 86_400_000 },
} as const;
export type ChartRange = keyof typeof RANGE_RES;

/** Public GeckoTerminal candles for an exact pool (oldest first), paged up to 1000 per call with before_timestamp. */
export async function fetchRangeCandles(pool: string, range: ChartRange, signal?: AbortSignal): Promise<PoolCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool)) return [];
  const { tf, agg, count } = RANGE_RES[range];
  const rows: [number, number, number, number, number, number][] = [];
  let before: number | null = null;
  for (let page = 0; page < 2 && rows.length < count; page++) {
    const limit = Math.min(1000, count - rows.length);
    const res = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/pools/${pool}/ohlcv/${tf}?aggregate=${agg}&limit=${limit}&currency=usd${before ? `&before_timestamp=${before}` : ""}`, { signal: signal ?? null });
    if (!res.ok) { if (rows.length) break; throw new Error("candles"); }
    const parsed = schema.safeParse(await res.json());
    const list = parsed.success ? parsed.data.data.attributes.ohlcv_list : [];
    if (!list.length) break;
    rows.push(...list);
    before = Math.min(...list.map((r) => r[0]));
    if (list.length < limit) break;
  }
  const seen = new Set<number>();
  return rows.filter(([t]) => !seen.has(t) && seen.add(t))
    .map(([t, , , , c, v]) => ({ t: t * 1000, c, v }))
    .filter((x) => x.c > 0 && x.v >= 0)
    .sort((a, b) => a.t - b.t);
}

/** Candles for «Rendimiento y Mercado»: 1-minute for 24 h, 15-minute for 7 d. */
export function fetchPoolCandles(pool: string, range: CandleRange, signal?: AbortSignal): Promise<PoolCandle[]> {
  return fetchRangeCandles(pool, range, signal);
}

/** Global market line over time: each vault's value moved by its own price (carried forward), summed on the densest vault's timestamps. */
export function intradayGlobal(vaults: { value: number; candles: PoolCandle[] }[]): { t: number; v: number }[] {
  const live = vaults.filter((v) => v.candles.length);
  if (!live.length) return [];
  const flat = vaults.filter((v) => !v.candles.length).reduce((s, v) => s + v.value, 0);
  const grid = live.reduce((a, v) => (v.candles.length > a.length ? v.candles : a), live[0]!.candles);
  const idx = live.map(() => 0), last = live.map((v) => v.candles[0]!.c), now = live.map((v) => v.candles[v.candles.length - 1]?.c ?? 1);
  return grid.map(({ t }) => ({ t, v: flat + live.reduce((s, v, k) => {
    let j = idx[k]!;
    while (j < v.candles.length && v.candles[j]!.t <= t) last[k] = v.candles[j++]!.c;
    idx[k] = j;
    return s + v.value * (last[k]! / now[k]!);
  }, 0) }));
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

/** Close price for each day start (carries the previous close forward when a day has no candle). */
export function closesForDays(candles: PoolCandle[], dayStarts: number[]): (number | null)[] {
  let j = 0, last: number | null = null;
  return dayStarts.map((s) => { while (j < candles.length && candles[j]!.t < s + 86_400_000) last = candles[j++]!.c; return last; });
}

/** Global market line: today's value of each vault moved back in time by its token's price ratio, summed. */
export function globalMarket(vaults: { value: number; closes: (number | null)[] }[], n: number): number[] {
  return Array.from({ length: n }, (_, d) => vaults.reduce((s, v) => { const now = v.closes[n - 1], c = v.closes[d]; return s + (now && c ? v.value * (c / now) : v.value); }, 0));
}
