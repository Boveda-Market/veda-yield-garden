import { VAULTS } from "./vaults";
import { fetchPoolYield } from "./pool-yield";
import { marketPulsePost, type PulseCoin, type PulseVault } from "./weekly-pulse";

const j = async (url: string) => { const r = await fetch(url, { headers: { accept: "application/json" } }); if (!r.ok) throw new Error(String(r.status)); return r.json() as Promise<any>; };

/** Gathers Fear & Greed, BTC/ETH/SOL and every vault's 24h volume/APR; each source is optional so one outage never blocks the draft. */
export async function buildMarketPulse(now = Date.now()) {
  const [fngR, cgR, ...vr] = await Promise.allSettled([
    j("https://api.alternative.me/fng/?limit=1"),
    j("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_24hr_change=true"),
    ...VAULTS.map(async (v) => {
      const [dx, y] = await Promise.allSettled([j(`https://api.dexscreener.com/latest/dex/pairs/solana/${v.pool}`), fetchPoolYield(v.pool)]);
      const pair = dx.status === "fulfilled" ? (dx.value.pair ?? dx.value.pairs?.[0]) : null;
      const vol = Number(pair?.volume?.h24);
      return { id: v.id, name: v.name, volume24h: Number.isFinite(vol) ? vol : null, apr: y.status === "fulfilled" ? (y.value?.apr ?? null) : null } satisfies PulseVault;
    }),
  ]);
  const f = fngR.status === "fulfilled" ? fngR.value?.data?.[0] : null;
  const cg = cgR.status === "fulfilled" ? cgR.value : {};
  const majors: PulseCoin[] = [["BTC", "bitcoin"], ["ETH", "ethereum"], ["SOL", "solana"]].flatMap(([sym, id]) => cg?.[id!]?.usd ? [{ sym: sym!, price: cg[id!].usd, change24h: cg[id!].usd_24h_change ?? null }] : []);
  const vaults = vr.flatMap((r) => r.status === "fulfilled" ? [r.value as PulseVault] : []);
  const date = new Date(now - 4 * 3_600_000).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return marketPulsePost({ date, fng: f ? { value: Number(f.value), label: String(f.value_classification) } : null, majors, vaults });
}
