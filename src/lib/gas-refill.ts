import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { SOL_RESERVE_LAMPORTS } from "@/lib/wallet-actions";

/** Below this network balance the wallet is warned and offered a one-tap refill (≈ a handful of operations left). */
export const GAS_LOW_LAMPORTS = 3_000_000n;
/** Refills top the wallet up to the app's standard network reserve. */
export const GAS_TARGET_LAMPORTS = SOL_RESERVE_LAMPORTS;
/** Cushion over the market price so price moves and the network fee the treasury pays are covered (5% + 0.01 USDC). */
export const GAS_MARGIN_BPS = 500n;
export const GAS_FLAT_MICRO = 10_000n;
/** Floor so very small refills still cover the treasury's network cost. */
export const GAS_MIN_CHARGE_MICRO = 50_000n;

export function gasIsLow(sol: bigint) { return sol < GAS_LOW_LAMPORTS; }
/** Target for "vault": a range-based vault position locks a refundable guarantee, so the reserve is topped up to cover it plus normal operations. */
export const GAS_VAULT_TARGET_LAMPORTS = 65_000_000n;
export type RefillTarget = "standard" | "vault";
export function refillLamports(sol: bigint, target: RefillTarget = "standard") {
  if (target === "vault") return sol < GAS_VAULT_TARGET_LAMPORTS ? GAS_VAULT_TARGET_LAMPORTS - sol : 0n;
  return sol < GAS_LOW_LAMPORTS ? GAS_TARGET_LAMPORTS - sol : 0n;
}
/** USDC (micro) charged for the refill, given the market value (micro) of the SOL delivered. */
export function refillCharge(marketMicro: bigint) {
  const c = marketMicro + (marketMicro * GAS_MARGIN_BPS + 9_999n) / 10_000n + GAS_FLAT_MICRO;
  return c < GAS_MIN_CHARGE_MICRO ? GAS_MIN_CHARGE_MICRO : c;
}

export const gasRefillInput = z.object({ wallet: solanaAddressSchema, target: z.enum(["standard", "vault"]).optional() });
