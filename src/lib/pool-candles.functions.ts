import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geckoCandles, POOL_RE, type RawCandle } from "./gecko-candles";

const SPEC = {
  "24h": { tf: "minute", agg: 5, count: 288, ttl: 5 * 60_000 },
  "7d": { tf: "minute", agg: 15, count: 672, ttl: 5 * 60_000 },
  "30d": { tf: "hour", agg: 1, count: 720, ttl: 10 * 60_000 },
  day: { tf: "day", agg: 1, count: 31, ttl: 10 * 60_000 },
} as const;

type Entry = { at: number; data: RawCandle[] };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<RawCandle[]>>();

/** Pool candles fetched server-side and shared by every visitor (cached per pool+range), so phones never hit the public rate limit and a failed refresh keeps the last good series. */
export const getPoolCandles = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ pool: z.string().regex(POOL_RE), range: z.enum(["24h", "7d", "30d", "day"]) }).parse(d))
  .handler(async ({ data }) => {
    const spec = SPEC[data.range];
    const key = `${data.pool}:${data.range}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < spec.ttl) return hit.data;
    let p = inflight.get(key);
    if (!p) {
      p = geckoCandles(data.pool, spec.tf, spec.agg, spec.count).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    try {
      const fresh = await p;
      if (fresh.length) cache.set(key, { at: Date.now(), data: fresh });
      if (cache.size > 200) cache.delete(cache.keys().next().value!);
      return fresh.length ? fresh : hit?.data ?? [];
    } catch {
      if (hit) return hit.data;
      throw new Error("Gráfica no disponible por ahora");
    }
  });
