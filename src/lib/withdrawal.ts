import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";

export const withdrawalInput = z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema, vaultId: z.enum(["sol", "met"]) }).strict();
export type WithdrawalInput = z.infer<typeof withdrawalInput>;
export const WITHDRAWAL_PILOT = { wallet: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", position: "2pugCpz54EYthPuCma2C7XBViHWeYWBrA5QALiPaXhvV", nft: "HRsmPKBacA87JcnvLiHhXsnFUJariZmsTzoANydrVZUv", vaultId: "sol" } as const;
export function isWithdrawalPilot(input: WithdrawalInput) {
  return input.wallet === WITHDRAWAL_PILOT.wallet && input.position === WITHDRAWAL_PILOT.position && input.vaultId === WITHDRAWAL_PILOT.vaultId;
}
export const prepareWithdrawalInput = withdrawalInput.extend({ maximumFeeRaw: z.string().regex(/^\d+$/), minimumNetRaw: z.string().regex(/^\d+$/) }).strict();
export type WithdrawalResult = {
  success: boolean;
  message: string;
  sent: false;
  bytes?: number;
  gross?: string;
  fee?: string;
  net?: string;
  rentSol?: string;
  remainingTokenRaw?: string;
  expectedFee?: string;
  minimumGross?: string;
  minimumNet?: string;
  feeRaw?: string;
  minimumNetRaw?: string;
  prepared?: { transaction: string; expiresAt: number; lastValidBlockHeight: number; wallet: string; position: string };
  checks?: { closed: boolean; usdc: boolean; fee: boolean; rent: boolean };
};

/** Fixed fee on the enforced gross USDC minimum; refundable SOL rent is excluded. */
export function withdrawalAmounts(minimumGross: bigint) {
  if (minimumGross < 0n) throw new Error("Importe inválido");
  const fee = minimumGross / 100n;
  return { gross: minimumGross, fee, net: minimumGross - fee };
}