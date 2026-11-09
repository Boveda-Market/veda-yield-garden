import { z } from "zod";
import { withdrawalInput } from "@/lib/withdrawal";

const raw = z.string().max(20).regex(/^\d+$/);
export const compoundInput = withdrawalInput.extend({ usdcRaw: raw, tokenRaw: raw }).strict();
export type CompoundInput = z.infer<typeof compoundInput>;
export type CompoundResult = {
  success: boolean;
  message: string;
  usdcUsed?: string;
  tokenUsed?: string;
  usdcLeft?: string;
  tokenLeft?: string;
  tokenSymbol?: string;
  prepared?: { transaction: string; expiresAt: number; wallet: string; position: string };
};

/** Liquidity is limited by whichever harvested side runs out first; 1% margin absorbs price moves before signing. */
export function compoundLiquidity(fromUsdc: { liquidity: bigint; tokenNeeded: bigint }, fromToken: { liquidity: bigint }, tokenRaw: bigint) {
  const base = fromUsdc.tokenNeeded <= tokenRaw ? fromUsdc.liquidity : fromToken.liquidity;
  return (base * 99n) / 100n;
}

/** Never spend more than was harvested; anything unused stays in the wallet. */
export function compoundSpendValid(usdcSpent: bigint, tokenSpent: bigint, usdcRaw: bigint, tokenRaw: bigint) {
  return usdcSpent >= 0n && tokenSpent >= 0n && usdcSpent + tokenSpent > 0n && usdcSpent <= usdcRaw && tokenSpent <= tokenRaw;
}
