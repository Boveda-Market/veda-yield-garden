import { z } from "zod";
import { withdrawalInput } from "@/lib/withdrawal";
import { harvestFee } from "@/lib/fees";

export const prepareHarvestInput = withdrawalInput.extend({ maximumFeeRaw: z.string().max(20).regex(/^\d+$/) }).strict();
export type HarvestResult = {
  success: boolean;
  message: string;
  sent: false;
  bytes?: number;
  gross?: string;
  fee?: string;
  net?: string;
  feeRaw?: string;
  netRaw?: string;
  tokenRaw?: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  prepared?: { transaction: string; expiresAt: number; wallet: string; position: string };
  checks?: { position: boolean; usdc: boolean; fee: boolean; token: boolean };
};

/** Tiered harvest fee (tier by harvested amount) (floored, integer micro-USDC) on claimed USDC earnings. */
export function harvestAmounts(claimedUsdc: bigint, positionUsdc = 0n) {
  if (claimedUsdc < 0n || positionUsdc < 0n) throw new Error("Importe inválido");
  const fee = harvestFee(claimedUsdc, positionUsdc);
  return { gross: claimedUsdc, fee, net: claimedUsdc - fee };
}

/** Harvest and harvest+reinvest unlock at $0.50 of estimated pending earnings, so network costs and rounding never eat the claim. */
export const HARVEST_MIN_USD = 0.5;
/** Unknown estimate (price unavailable) never blocks: the server quote still decides. */
export function canHarvest(feesUsd: number | null | undefined) { return typeof feesUsd !== "number" || feesUsd >= HARVEST_MIN_USD; }

/** Converts only the just-harvested other coin to dollars (one free wallet-signed swap); dust under 0.01 is left alone. */
export async function harvestedToUsdc(wallet: string, symbol: string, tokenRaw: bigint, signAndSend: (tx: Uint8Array) => Promise<string>) {
  if (tokenRaw <= 0n) return 0n;
  const { quoteSwap, buildSwap } = await import("@/lib/wallet-actions");
  const quote = await quoteSwap(symbol, "USDC", tokenRaw, { feeUsdc: 0n });
  if (BigInt(quote.outAmount) < 10_000n) return 0n;
  await signAndSend(await buildSwap(wallet, quote));
  return BigInt(quote.outAmount);
}
