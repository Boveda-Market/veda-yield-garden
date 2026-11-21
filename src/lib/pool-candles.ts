import { getPoolCandles } from "./pool-candles.functions";

export type PoolCandle = { t: number; c: number; v: number };
export type CandleRange = "24h" | "7d" | "30d";

/** Chart resolutions (reference trend, not live): 5-minute for 24 h, 15-minute for 7 d, 1-hour for 30 d. */
export const RANGE_RES = {
  "24h": { tf: "minute", agg: 5, count: 288, ms: 86_400_000 },
  "7d": { tf: "minute", agg: 15, count: 672, ms: 7 * 86_400_000 },
  "30d": { tf: "hour", agg: 1, count: 720, ms: 30 * 86_400_000 },
} as const;
export type ChartRange = keyof typeof RANGE_RES;

/** Candles for an exact pool (oldest first) at the range's resolution, served through the shared server cache. */
export async function fetchRangeCandles(pool: string, range: ChartRange, _signal?: AbortSignal): Promise<PoolCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool)) return [];
  const fresh = await getPoolCandles({ data: { pool, range } });
  if (fresh.length) saveCachedCandles(pool, range, fresh);
  else { const old = readCachedCandles(pool, range); if (old) return old; }
  return fresh;
}

const CACHE_KEY = (pool: string, range: string) => `boveda:candles:${range}:${pool}`;

/** Last good series kept on the device so a refresh draws the full line instantly (client only; null on the server). */
export function readCachedCandles(pool: string, range: ChartRange): PoolCandle[] | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(CACHE_KEY(pool, range));
    const list = raw ? (JSON.parse(raw) as PoolCandle[]) : null;
    return Array.isArray(list) && list.length >= 2 ? list : undefined;
  } catch { return undefined; }
}

function saveCachedCandles(pool: string, range: ChartRange, list: PoolCandle[]) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(CACHE_KEY(pool, range), JSON.stringify(list)); } catch { /* storage full */ }
}

/** Candles for «Rendimiento y Mercado»: 5-minute for 24 h, 15-minute for 7 d. */
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
export async function fetchDailyCloses(pool: string, n: number, _signal?: AbortSignal): Promise<PoolCandle[]> {
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(pool)) return [];
  const list = await getPoolCandles({ data: { pool, range: "day" } });
  return list.slice(-Math.min(Math.max(n, 2), 31));
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
