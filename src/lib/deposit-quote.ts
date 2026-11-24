/**
 * Live deposit quote (integer micro-USDC).
 * - The one-time activation (fee + network reserve) is paid on top of the typed amount whenever the
 *   balance covers both, so the vault receives what the person typed; only when the balance is short
 *   does the deposit shrink to what is left (same rule as ActivationSheet's fit).
 * - A new position swaps half the dollars inside the vault's market: that market fee (feePct, %) is
 *   estimated, plus the small safety margin left in the wallet (SWAP_MARGIN_BPS of the swapped half).
 * - Adding to an existing position in range goes in as dollars only: no swap, no market fee.
 */
export const SWAP_MARGIN_BPS = 20n;
export function depositQuote(amountMicro: bigint, chargeMicro: bigint | null, feeMicro: bigint, opts: { balanceMicro?: bigint | null; feePct?: number | null; swaps?: boolean } = {}) {
  const charge = chargeMicro ?? 0n;
  const fee = chargeMicro == null ? 0n : (feeMicro < charge ? feeMicro : charge);
  const reserve = charge - fee;
  const balance = opts.balanceMicro ?? null;
  const room = balance == null ? amountMicro - charge : balance - charge;
  const net = room <= 0n ? 0n : room < amountMicro ? room : amountMicro;
  const onTop = balance != null && net === amountMicro && charge > 0n;
  const half = opts.swaps === false ? 0n : net / 2n;
  const pctBps = opts.feePct != null && Number.isFinite(opts.feePct) && opts.feePct > 0 && opts.feePct < 10 ? BigInt(Math.round(opts.feePct * 100)) : 0n;
  const swapCost = half * (pctBps + SWAP_MARGIN_BPS) / 10_000n;
  const total = net + charge;
  return { amount: amountMicro, fee, reserve, net, onTop, swapCost, inVault: net - swapCost, total };
}
/** Quick amounts offered when the account has no dollars yet, so anyone can get a quote. */
export const QUOTE_PRESETS = ["20", "50", "100", "500"] as const;
/** Doble o Nada entry: the stake stays whole and the one-time activation is paid on top, so the total needed is stake + charge. */
export function playQuote(stakeMicro: bigint, chargeMicro: bigint | null, feeMicro: bigint) {
  const charge = chargeMicro ?? 0n;
  const fee = chargeMicro == null ? 0n : (feeMicro < charge ? feeMicro : charge);
  return { stake: stakeMicro, fee, reserve: charge - fee, total: stakeMicro + charge };
}
