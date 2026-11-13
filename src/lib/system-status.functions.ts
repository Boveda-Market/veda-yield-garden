import { createServerFn } from "@tanstack/react-start";

export type ServiceState = "up" | "degraded" | "down";
export type ServiceCheck = { id: string; state: ServiceState; ms: number | null };
export type GlobalMetric = { tvl: number | null; fees24h: number | null; feesAll: number | null; volume24h: number | null; volumeAll: number | null; openInterest: number | null };
export type SystemStatus = { checkedAt: number; services: ServiceCheck[]; meteora: GlobalMetric; polymarket: GlobalMetric };

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : null; };
const SLOW_MS = 2_500;

async function probe(id: string, run: (signal: AbortSignal) => Promise<boolean>): Promise<ServiceCheck> {
  const t0 = Date.now();
  try {
    const ok = await run(AbortSignal.timeout(8_000));
    const ms = Date.now() - t0;
    return { id, state: !ok ? "down" : ms > SLOW_MS ? "degraded" : "up", ms };
  } catch { return { id, state: "down", ms: null }; }
}
const okFetch = (url: string, init?: RequestInit) => (signal: AbortSignal) => fetch(url, { ...init, signal }).then((r) => r.ok);
async function json(url: string): Promise<Record<string, unknown> | null> {
  try { const r = await fetch(url, { signal: AbortSignal.timeout(10_000) }); return r.ok ? await r.json() as Record<string, unknown> : null; } catch { return null; }
}
async function tvl(slug: string) { try { const r = await fetch(`https://api.llama.fi/tvl/${slug}`, { signal: AbortSignal.timeout(10_000) }); return r.ok ? num(await r.text()) : null; } catch { return null; } }
const SUM = "excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true";

let cache: { at: number; data: SystemStatus } | null = null;

/** Public health checks + global protocol metrics (public DefiLlama data); cached 60s so visitors can't amplify upstream calls. */
export const getSystemStatus = createServerFn({ method: "GET" }).handler(async (): Promise<SystemStatus> => {
  if (cache && Date.now() - cache.at < 60_000) return cache.data;
  const jupKey = process.env["JUPITER_API_KEY"];
  const [services, mTvl, mFees, pTvl, pVol, pOi] = await Promise.all([
    Promise.all([
      probe("network", async (s) => {
        try { const r = await fetch("https://status.solana.com/api/v2/status.json", { signal: s }); if (r.ok) { const j = await r.json() as { status?: { indicator?: string } }; return j.status?.indicator === "none" || j.status?.indicator === "minor"; } } catch { /* fallback */ }
        const r = await fetch("https://solana-rpc.publicnode.com", { method: "POST", signal: s, headers: { "content-type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getHealth" }) });
        return r.ok;
      }),
      probe("vaults", okFetch("https://damm-v2.datapi.meteora.ag/pools?page=1&limit=1")),
      probe("predict", okFetch("https://api.jup.ag/prediction/v1/events?provider=polymarket&category=crypto&filter=live&start=0&end=1", jupKey ? { headers: { "x-api-key": jupKey } } : undefined)),
      probe("markets", okFetch("https://gamma-api.polymarket.com/events?limit=1")),
      probe("wallets", (s) => fetch("https://auth.privy.io/", { signal: s }).then((r) => r.status < 500)),
      probe("funding", okFetch("https://api.coinbase.com/v2/time")),
    ]),
    tvl("meteora"),
    json(`https://api.llama.fi/summary/fees/meteora?dataType=dailyFees&${SUM}`),
    tvl("polymarket"),
    json(`https://api.llama.fi/summary/dexs/polymarket?${SUM}`),
    json(`https://api.llama.fi/summary/open-interest/polymarket?${SUM}`),
  ]);
  const data: SystemStatus = {
    checkedAt: Date.now(), services,
    meteora: { tvl: mTvl, fees24h: num(mFees?.["total24h"]), feesAll: num(mFees?.["totalAllTime"]), volume24h: null, volumeAll: null, openInterest: null },
    polymarket: { tvl: pTvl, fees24h: null, feesAll: null, volume24h: num(pVol?.["total24h"]), volumeAll: num(pVol?.["totalAllTime"]), openInterest: num(pOi?.["total24h"]) },
  };
  cache = { at: Date.now(), data };
  return data;
});
