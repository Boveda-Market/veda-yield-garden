import { CHAIN_POOLS } from "./solana-data";
import type { MeteoraRecord } from "./meteora-history";

/**
 * One owner transaction that touched a validated vault (deposit, withdraw, harvest, rebalance, move).
 * cashMicro = owner USDC delta + fee-wallet USDC delta (signed micro-USDC): fees are added back so they never count as money deposited.
 * tokens = owner vault-token deltas (signed raw); native SOL (network costs, refundable rent) is ignored.
 */
export type VaultFlow = { signature: string; slot: number; at: number | null; cashMicro: string; tokens: { pool: string; raw: string }[]; harvestOnly: boolean; hasWithdraw: boolean };

type TokenBalance = { mint: string; owner?: string | undefined; uiTokenAmount: { amount: string } };
/** Signed raw delta of one owner's balances for one mint across a transaction. */
export function tokenDelta(pre: readonly TokenBalance[] | null | undefined, post: readonly TokenBalance[] | null | undefined, owner: string, mint: string) {
  const sum = (rows: readonly TokenBalance[] | null | undefined) => (rows ?? []).filter((r) => r.owner === owner && r.mint === mint && /^\d+$/.test(r.uiTokenAmount.amount)).reduce((s, r) => s + BigInt(r.uiTokenAmount.amount), 0n);
  return sum(post) - sum(pre);
}

type Prices = Record<string, number | null | undefined>;
/** Today's dollar value (micro) of a signed raw token amount in a validated pool; null when its price is unknown. */
function tokenMicro(pool: string, raw: bigint, prices: Prices) {
  if (raw === 0n) return 0n;
  const cfg = CHAIN_POOLS.find((p) => p.pool === pool), price = prices[pool];
  if (!cfg || price == null || !Number.isFinite(price) || price <= 0) return null;
  return (raw * BigInt(Math.round(price * 1_000_000))) / 10n ** BigInt(cfg.decimals);
}

function harvestMicro(rows: MeteoraRecord[], prices: Prices) {
  let micro = 0n;
  for (const r of rows) { const tok = tokenMicro(r.pool, BigInt(r.tokenRaw), prices); if (tok === null) return null; micro += BigInt(r.usdcRaw) + tok; }
  return micro;
}

/**
 * «Desde que depositaste»: deposited = the person's own money still counted in vaults (fees excluded, harvested earnings
 * never become deposits even when reinvested; re-deposited withdrawn principal counts back). change = value today
 * (vault capital + to-harvest) + earnings taken out and not reinvested − deposited. Null when any needed price is missing.
 */
export function sinceDeposit(flows: VaultFlow[], records: MeteoraRecord[], prices: Prices, valueTodayMicro: bigint) {
  const ordered = [...new Map(flows.map((f) => [f.signature, f])).values()].sort((a, b) => a.slot - b.slot || a.signature.localeCompare(b.signature));
  let deposited = 0n, returned = 0n, earnings = 0n;
  for (const f of ordered) {
    const harvests = records.filter((r) => r.signature === f.signature && r.kind === "harvest");
    if (f.harvestOnly) { const h = harvestMicro(harvests, prices); if (h === null) return null; earnings += h; continue; }
    let v = BigInt(f.cashMicro);
    for (const t of f.tokens) { const m = tokenMicro(t.pool, BigInt(t.raw), prices); if (m === null) return null; v += m; }
    if (v < 0n) {
      let d = -v;
      const fromReturned = d < returned ? d : returned; returned -= fromReturned; deposited += fromReturned; d -= fromReturned;
      const fromEarnings = d < earnings ? d : earnings; earnings -= fromEarnings; d -= fromEarnings;
      deposited += d;
    } else if (v > 0n) {
      if (!f.hasWithdraw) { earnings += v; continue; } // rebalance/compound fee paid from earnings
      const h = harvestMicro(harvests, prices); if (h === null) return null;
      const fees = h < v ? h : v;
      earnings += fees; deposited -= v - fees; returned += v - fees;
    }
  }
  const change = valueTodayMicro + earnings - deposited;
  return { depositedMicro: deposited, changeMicro: change, percent: deposited > 0n ? Number((change * 100_000_000n) / deposited) / 1_000_000 : null };
}
