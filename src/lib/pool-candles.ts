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
