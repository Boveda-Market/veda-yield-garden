import { z } from "zod";

/** Share of BÓVEDA's 1% exit fee paid to the referring affiliate, in basis points of that fee. */
export const AFFILIATE_SHARE_BPS = 6000;

/** Integer micro-USDC commission, floored so it never exceeds the collected fee share. */
export function affiliateCommission(feeRaw: bigint, shareBps: number): bigint {
  if (feeRaw <= 0n || shareBps <= 0) return 0n;
  return (feeRaw * BigInt(shareBps)) / 10_000n;
}

export const codeSchema = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,16}$/);
export function normalizeCode(value: string | null | undefined) {
  const parsed = codeSchema.safeParse(value ?? "");
  return parsed.success ? parsed.data : null;
}

export const REF_STORAGE_KEY = "boveda-ref";
const token = z.string().min(20).max(12000);
export const affiliateRequest = z.object({ token }).strict();
export const joinRequest = z.object({ token, code: codeSchema }).strict();
export const customizeCodeRequest = z.object({ token, code: codeSchema }).strict();
export const payoutRequest = z.object({ token, wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) }).strict();
export const recordRequest = z.object({ token, signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/), kind: z.enum(["harvest", "exit"]) }).strict();

export type AffiliateDashboard = {
  code: string;
  shareBps: number;
  payoutWallet: string | null;
  referred: number;
  pendingRaw: string;
  paidRaw: string;
  joinedCode: boolean;
  earnings: Array<{ signature: string; kind: "harvest" | "exit"; feeRaw: string; commissionRaw: string; status: string; createdAt: string }>;
};
