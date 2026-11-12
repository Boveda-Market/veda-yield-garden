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

/** Tiered harvest fee (floored, integer micro-USDC) on claimed USDC earnings. */
export function harvestAmounts(claimedUsdc: bigint) {
  if (claimedUsdc < 0n) throw new Error("Importe inválido");
  const fee = harvestFee(claimedUsdc);
  return { gross: claimedUsdc, fee, net: claimedUsdc - fee };
}
