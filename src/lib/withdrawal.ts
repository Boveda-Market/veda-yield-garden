import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";

export const withdrawalInput = z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema, vaultId: z.enum(["sol", "met"]) }).strict();
export type WithdrawalInput = z.infer<typeof withdrawalInput>;
export type WithdrawalResult = {
  success: boolean;
  message: string;
  sent: false;
  bytes?: number;
  gross?: string;
  fee?: string;
  net?: string;
  rentSol?: string;
  checks?: { closed: boolean; usdc: boolean; fee: boolean; rent: boolean };
};

/** Exact integer accounting on realized USDC; refundable SOL rent is not USDC proceeds. */
export function withdrawalAmounts(gross: bigint) {
  if (gross < 0n) throw new Error("Importe inválido");
  const fee = gross / 100n;
  return { gross, fee, net: gross - fee };
}