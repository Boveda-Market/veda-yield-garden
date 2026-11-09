import { z } from "zod";

/** Share of BÓVEDA's 1% exit fee paid to the referring affiliate, in basis points of that fee. */
export const AFFILIATE_TIERS = {
  base: { shareBps: 2500, label: "Usuario" },
  promoter: { shareBps: 3000, label: "Afiliado" },
  vip: { shareBps: 6000, label: "Influencer VIP" },
} as const;
export type AffiliateTier = keyof typeof AFFILIATE_TIERS;

export function tierShareBps(tier: string): number {
  return tier in AFFILIATE_TIERS ? AFFILIATE_TIERS[tier as AffiliateTier].shareBps : AFFILIATE_TIERS.base.shareBps;
}

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
export const applyRequest = z.object({
  token,
  channel: z.string().trim().min(3).max(200),
  audience: z.string().trim().max(500).default(""),
}).strict();
export const payoutRequest = z.object({ token, wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) }).strict();
export const recordRequest = z.object({ token, signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/), kind: z.enum(["harvest", "exit"]) }).strict();

export type AffiliateDashboard = {
  code: string;
  tier: AffiliateTier;
  shareBps: number;
  payoutWallet: string | null;
  referred: number;
  pendingRaw: string;
  paidRaw: string;
  application: "pending" | "approved" | "rejected" | null;
  joinedCode: boolean;
  earnings: Array<{ signature: string; kind: "harvest" | "exit"; feeRaw: string; commissionRaw: string; status: string; createdAt: string }>;
};
