import { z } from "zod";

export type RawCandle = { t: number; c: number; v: number };

const schema = z.object({ data: z.object({ attributes: z.object({ ohlcv_list: z.array(z.tuple([z.number(), z.number(), z.number(), z.number(), z.number(), z.number()])) }) }) });
const BASE = "https://api.geckoterminal.com/api/v2/networks/solana/pools";
export const POOL_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Public GeckoTerminal candles for an exact pool (oldest first), paged sequentially up to 1000 per call. */
export async function geckoCandles(pool: string, tf: "minute" | "hour" | "day", agg: number, count: number): Promise<RawCandle[]> {
  if (!POOL_RE.test(pool)) return [];
  const rows: [number, number, number, number, number, number][] = [];
  let before: number | null = null;
  for (let page = 0; page < 2 && rows.length < count; page++) {
    const limit = Math.min(1000, count - rows.length);
    const url = `${BASE}/${pool}/ohlcv/${tf}?aggregate=${agg}&limit=${limit}&currency=usd${before ? `&before_timestamp=${before}` : ""}`;
    let res = await fetch(url, { headers: { accept: "application/json" } });
    // Busy public source: one short retry before giving up, so the chart rarely falls back to a sparse line.
    for (const wait of [1500, 3000, 5000]) { if (res.status !== 429) break; await new Promise((r) => setTimeout(r, wait)); res = await fetch(url, { headers: { accept: "application/json" } }); }
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
