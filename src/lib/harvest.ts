import { z } from "zod";
import { withdrawalInput } from "@/lib/withdrawal";

export const prepareHarvestInput = withdrawalInput.extend({ maximumFeeRaw: z.string().regex(/^\d+$/) }).strict();
export type HarvestResult = {
  success: boolean;
  message: string;
  sent: false;
  bytes?: number;
  gross?: string;
  fee?: string;
  net?: string;
  feeRaw?: string;
  tokenSymbol?: string;
  tokenAmount?: string;
  prepared?: { transaction: string; expiresAt: number; wallet: string; position: string };
  checks?: { position: boolean; usdc: boolean; fee: boolean; token: boolean };
};

/** 1% exit fee (floored, integer micro-USDC) on claimed USDC earnings. */
export function harvestAmounts(claimedUsdc: bigint) {
  if (claimedUsdc < 0n) throw new Error("Importe inválido");
  const fee = claimedUsdc / 100n;
  return { gross: claimedUsdc, fee, net: claimedUsdc - fee };
}
