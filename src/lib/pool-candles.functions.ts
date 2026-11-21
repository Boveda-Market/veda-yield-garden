import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { geckoCandles, POOL_RE, type RawCandle } from "./gecko-candles";

const SPEC = {
  "1h": { tf: "minute", agg: 1, count: 60, ttl: 30_000 },
  "24h": { tf: "minute", agg: 5, count: 288, ttl: 60_000 },
  "7d": { tf: "minute", agg: 15, count: 672, ttl: 5 * 60_000 },
  "30d": { tf: "hour", agg: 1, count: 720, ttl: 10 * 60_000 },
  day: { tf: "day", agg: 1, count: 31, ttl: 10 * 60_000 },
} as const;

/** A denser shared series that can stand in for a busy range: its own real candles, trimmed to the window (never invented points). */
const WIDER: Partial<Record<keyof typeof SPEC, { from: keyof typeof SPEC; ms: number }>> = {
  "1h": { from: "24h", ms: 3_600_000 },
  "24h": { from: "7d", ms: 86_400_000 },
  "7d": { from: "30d", ms: 7 * 86_400_000 },
};

type Entry = { at: number; data: RawCandle[] };
const cache = new Map<string, Entry>();
const inflight = new Map<string, Promise<RawCandle[]>>();
// One upstream call at a time with a small gap, so several vaults opening together never trip the public rate limit.
let queue: Promise<unknown> = Promise.resolve();
const queued = <T>(fn: () => Promise<T>) => { const run = queue.then(fn, fn); queue = run.then(() => new Promise((r) => setTimeout(r, 1100)), () => new Promise((r) => setTimeout(r, 1100))); return run; };

/** Instant fallback from DexScreener's official price-change checkpoints (24 h, 6 h, 1 h, 5 min, now) when the candle source is busy. */
async function dexFallback(pool: string): Promise<RawCandle[]> {
  try {
    const res = await fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${pool}`, { headers: { accept: "application/json" } });
    if (!res.ok) return [];
    const j = await res.json() as { pair?: { priceUsd?: string; priceChange?: Record<string, number>; volume?: Record<string, number> }; pairs?: { priceUsd?: string; priceChange?: Record<string, number>; volume?: Record<string, number> }[] };
    const p = j.pair ?? j.pairs?.[0];
    const now = Number(p?.priceUsd);
    if (!p || !(now > 0)) return [];
    const ch = p.priceChange ?? {}, vol = (p.volume?.["h24"] ?? 0) / 4, t = Date.now();
    const at = (h: number, k: string) => ({ t: t - h * 3_600_000, c: now / (1 + (ch[k] ?? 0) / 100), v: vol });
    return [at(24, "h24"), at(6, "h6"), at(1, "h1"), at(5 / 60, "m5"), { t, c: now, v: vol }].filter((x) => x.c > 0 && Number.isFinite(x.c));
  } catch { return []; }
}

function borrowed(pool: string, range: keyof typeof SPEC): RawCandle[] | null {
  const w = WIDER[range]; if (!w) return null;
  const src = cache.get(`${pool}:${w.from}`)?.data; if (!src) return null;
  const cut = Date.now() - w.ms, list = src.filter((c) => c.t >= cut);
  return list.length > 10 ? list : null;
}

/** Pool candles fetched server-side and shared by every visitor (cached per pool+range), so phones never hit the public rate limit and a failed refresh keeps the last good series. */
export const getPoolCandles = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => z.object({ pool: z.string().regex(POOL_RE), range: z.enum(["1h", "24h", "7d", "30d", "day"]) }).parse(d))
  .handler(async ({ data }) => {
    const spec = SPEC[data.range];
    const key = `${data.pool}:${data.range}`;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < spec.ttl) return hit.data;
    let p = inflight.get(key);
    if (!p) {
      p = queued(() => geckoCandles(data.pool, spec.tf, spec.agg, spec.count)).finally(() => inflight.delete(key));
      inflight.set(key, p);
    }
    try {
      const fresh = await p;
      if (fresh.length) cache.set(key, { at: Date.now(), data: fresh });
      if (cache.size > 200) cache.delete(cache.keys().next().value!);
      return fresh.length ? fresh : hit?.data ?? borrowed(data.pool, data.range) ?? (data.range === "day" ? [] : await dexFallback(data.pool));
    } catch {
      if (hit) return hit.data;
      const b = borrowed(data.pool, data.range); if (b) return b;
      if (data.range !== "day") { const fb = await dexFallback(data.pool); if (fb.length) return fb; }
      throw new Error("Gráfica no disponible por ahora");
    }
  });
