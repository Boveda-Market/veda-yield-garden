import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { progressiveFee, rotateFee } from "@/lib/fees";

export const withdrawalInput = z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema, vaultId: z.enum(["sol", "met", "gta6"]) }).strict();
export type WithdrawalInput = z.infer<typeof withdrawalInput>;
export const WITHDRAWAL_PILOT = { wallet: "GZ3wFmrMdXJAigwooa8GTginE6tLeTzgGLbXhgYTp7HR", position: "2pugCpz54EYthPuCma2C7XBViHWeYWBrA5QALiPaXhvV", nft: "HRsmPKBacA87JcnvLiHhXsnFUJariZmsTzoANydrVZUv", vaultId: "sol" } as const;
/** Exit share of unlocked liquidity: 100 closes the position, 1–99 keeps it open. */
export const EXIT_PERCENTS = [25, 50, 75, 100] as const;
export const exitInput = withdrawalInput.extend({ percent: z.number().int().min(1).max(100).default(100), migrate: z.literal(true).optional(), rotate: z.literal(true).optional() }).strict();
export type ExitInput = z.infer<typeof exitInput>;
/** Floor share of liquidity (u128-safe bigint). */
export function partialLiquidity(liquidity: bigint, percent: number) {
  if (!Number.isInteger(percent) || percent < 1 || percent > 100) throw new Error("Porcentaje inválido");
  return liquidity * BigInt(percent) / 100n;
}
export const prepareWithdrawalInput = exitInput.extend({ maximumFeeRaw: z.string().max(20).regex(/^\d+$/), minimumNetRaw: z.string().max(20).regex(/^\d+$/) }).strict();
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
export type ExitFeeMode = boolean | "rotate";
/** Any vault move (migrate or rotate) = fixed move fee; otherwise the normal exit fee. */
export function exitFeeMode(input: { migrate?: true | undefined; rotate?: true | undefined }): ExitFeeMode { return input.rotate === true ? "rotate" : input.migrate === true; }
export function withdrawalAmounts(minimumGross: bigint, migrate: ExitFeeMode = false) {
  if (minimumGross < 0n) throw new Error("Importe inválido");
  const fee = migrate ? rotateFee(minimumGross) : progressiveFee(minimumGross);
  return { gross: minimumGross, fee, net: minimumGross - fee };
}