import { z } from "zod";
import type { RawCandle } from "./gecko-candles";

const schema = z.object({ data: z.object({ items: z.array(z.object({ unixTime: z.number(), c: z.number(), v: z.number().optional(), vUsd: z.number().optional() })) }) });
export type BirdeyeType = "1m" | "1H" | "4H" | "1D";

/** Birdeye pair candles (USD-quoted pools), oldest first. Returns null when no key or the source fails, so callers fall back to GeckoTerminal. */
export async function birdeyeCandles(pool: string, type: BirdeyeType, seconds: number): Promise<RawCandle[] | null> {
  const key = process.env["BIRDEYE_API_KEY"];
  if (!key) return null;
  const now = Math.floor(Date.now() / 1000);
  try {
    const res = await fetch(`https://public-api.birdeye.so/defi/ohlcv/pair?address=${pool}&type=${type}&time_from=${now - seconds}&time_to=${now}`, {
      headers: { accept: "application/json", "X-API-KEY": key, "x-chain": "solana" },
    });
    if (!res.ok) { console.warn("birdeye candles", res.status); return null; }
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) return null;
    return parsed.data.data.items
      .map((i) => ({ t: i.unixTime * 1000, c: i.c, v: i.vUsd ?? i.v ?? 0 }))
      .filter((x) => x.c > 0 && Number.isFinite(x.c))
      .sort((a, b) => a.t - b.t);
  } catch { return null; }
}
