import { FEE_WALLET } from "@/lib/fees";
import { z } from "zod";

/** Share of every BÓVEDA fee (entry, harvest, exit) paid to the referring affiliate, in basis points of that fee. */
export const AFFILIATE_SHARE_BPS = 5000;
/** Second-tier share: the direct affiliate's own referrer earns this from their sub-affiliates' referrals. */
export const SUB_AFFILIATE_SHARE_BPS = 1000;
/** Combined payout across both levels never exceeds this share of the collected fee. */
export const MAX_TOTAL_SHARE_BPS = 9000;

/** Level-2 share, capped so level 1 + level 2 never exceed MAX_TOTAL_SHARE_BPS. */
export function subAffiliateShare(directBps: number) {
  return Math.max(0, Math.min(SUB_AFFILIATE_SHARE_BPS, MAX_TOTAL_SHARE_BPS - directBps));
}

/** Integer micro-USDC commission, floored so it never exceeds the collected fee share. */
export function affiliateCommission(feeRaw: bigint, shareBps: number): bigint {
  if (feeRaw <= 0n || shareBps <= 0) return 0n;
  return (feeRaw * BigInt(shareBps)) / 10_000n;
}

/** Minimum accumulated commission (micro-USDC) before a manual payout is processed. */
export const PAYOUT_MIN_MICRO = 10_000_000n;

/** Progress toward the next payout, 0–100, plus whether the threshold is reached. */
export function payoutProgress(pendingRaw: bigint) {
  const pct = pendingRaw <= 0n ? 0 : pendingRaw >= PAYOUT_MIN_MICRO ? 100 : Number((pendingRaw * 10_000n) / PAYOUT_MIN_MICRO) / 100;
  return { pct, ready: pendingRaw >= PAYOUT_MIN_MICRO, missingRaw: pendingRaw >= PAYOUT_MIN_MICRO ? 0n : PAYOUT_MIN_MICRO - pendingRaw };
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
export const recordRequest = z.object({ token, signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/), kind: z.enum(["harvest", "exit", "deposit"]) }).strict();

export type AffiliateDashboard = {
  code: string;
  shareBps: number;
  payoutWallet: string | null;
  referred: number;
  pendingRaw: string;
  paidRaw: string;
  joinedCode: boolean;
  subReferred: number;
  earnings: Array<{ signature: string; level: 1 | 2; kind: "harvest" | "exit" | "deposit"; feeRaw: string; commissionRaw: string; status: string; createdAt: string }>;
};

/** Single treasury: affiliate payouts are sent from the same wallet that receives app fees. Connecting it unlocks the treasury dashboard. */
export const AFFILIATE_PAYOUT_WALLET = FEE_WALLET;
export type PayoutRecent = { code: string; wallet: string | null; amountRaw: string; signature: string; paidAt: string };
const sig = z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/);
export const payoutAdminRequest = z.object({ token }).strict();
export const markPaidRequest = z.object({ token, affiliate: z.string().min(1).max(200), signature: sig }).strict();
export type PayoutDue = { affiliate: string; code: string; wallet: string | null; pendingRaw: string; count: number };
/** Sums pending commissions per affiliate; only totals at or above the payout minimum are due. */
export function payoutsDue(rows: Array<{ affiliate_privy_id: string; commission_raw: number | string }>) {
  const map = new Map<string, { raw: bigint; count: number }>();
  for (const r of rows) { const e = map.get(r.affiliate_privy_id) ?? { raw: 0n, count: 0 }; e.raw += BigInt(r.commission_raw); e.count++; map.set(r.affiliate_privy_id, e); }
  return [...map].filter(([, v]) => v.raw >= PAYOUT_MIN_MICRO).map(([affiliate, v]) => ({ affiliate, raw: v.raw, count: v.count }));
}

/** Flat network cost deducted from each self-service claim so affiliates can collect with 0 SOL (0.10 USDC). */
export const CLAIM_NETWORK_FEE_MICRO = 100_000n;
export const claimRequest = z.object({ token }).strict();
/** Net USDC sent on a self-service claim; null when the owed total is below the payout minimum. */
export function claimNet(owedRaw: bigint) {
  if (owedRaw < PAYOUT_MIN_MICRO) return null;
  return owedRaw - CLAIM_NETWORK_FEE_MICRO;
}
