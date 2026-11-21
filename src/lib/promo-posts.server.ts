import { VAULTS } from "./vaults";
import { fetchPoolYield } from "./pool-yield";
import { promoKindFor, promoPost, type PromoVault } from "./promo-posts";

const HOT = ["trump", "dcty", "gta6"];

/** Builds the cycle's promo from live volume/APR of a high-octane vault (rotates by cycle, skips vaults without data). */
export async function buildPromo(cycle: number) {
  const list = await Promise.all(VAULTS.filter((v) => HOT.includes(v.id)).map(async (v) => {
    const [dx, y] = await Promise.allSettled([fetch(`https://api.dexscreener.com/latest/dex/pairs/solana/${v.pool}`).then((r) => r.json() as Promise<any>), fetchPoolYield(v.pool)]);
    const pair = dx.status === "fulfilled" ? (dx.value.pair ?? dx.value.pairs?.[0]) : null;
    const vol = Number(pair?.volume?.h24);
    return { id: v.id, name: v.name, volume24h: Number.isFinite(vol) ? vol : null, apr: y.status === "fulfilled" ? (y.value?.apr ?? null) : null } as PromoVault;
  }));
  const ok = list.filter((v) => v.apr && v.volume24h);
  if (!ok.length) return null;
  const v = ok[cycle % ok.length]!;
  return promoPost(promoKindFor(cycle), v, cycle);
}
