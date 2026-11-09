import { createServerFn } from "@tanstack/react-start";
import { affiliateCommission, affiliateRequest, applyRequest, joinRequest, payoutRequest, recordRequest, tierShareBps, type AffiliateDashboard, type AffiliateTier } from "./affiliate";
import { proofIsFresh, walletProofMessage, walletProofRequest } from "./wallet-proof";

type Fail = { success: false; error: string };

async function admin(token: string) {
  const { verifiedPrivyId } = await import("./account-profile.server");
  const id = await verifiedPrivyId(token);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { id, db: supabaseAdmin };
}

function randomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export const getAffiliateDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => affiliateRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; dashboard: AffiliateDashboard } | Fail> => {
    try {
      const { id, db } = await admin(data.token);
      let { data: row } = await db.from("affiliates").select("code, tier, payout_wallet").eq("privy_user_id", id).maybeSingle();
      for (let i = 0; !row && i < 5; i++) {
        const { data: created } = await db.from("affiliates").insert({ privy_user_id: id, code: randomCode() }).select("code, tier, payout_wallet").maybeSingle();
        row = created ?? (await db.from("affiliates").select("code, tier, payout_wallet").eq("privy_user_id", id).maybeSingle()).data;
      }
      if (!row) throw new Error();
      const [referred, earnings, application, joined] = await Promise.all([
        db.from("referrals").select("referred_privy_id", { count: "exact", head: true }).eq("affiliate_privy_id", id),
        db.from("affiliate_earnings").select("signature, kind, fee_raw, commission_raw, status, created_at").eq("affiliate_privy_id", id).order("created_at", { ascending: false }).limit(50),
        db.from("affiliate_applications").select("status").eq("privy_user_id", id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        db.from("referrals").select("referred_privy_id").eq("referred_privy_id", id).maybeSingle(),
      ]);
      const list = earnings.data ?? [];
      const total = (status: string) => list.filter((e) => e.status === status).reduce((a, e) => a + BigInt(e.commission_raw), 0n).toString();
      const tier = row.tier as AffiliateTier;
      return { success: true, dashboard: {
        code: row.code, tier, shareBps: tierShareBps(tier), payoutWallet: row.payout_wallet, referred: referred.count ?? 0,
        pendingRaw: total("pending"), paidRaw: total("paid"),
        application: (application.data?.status as AffiliateDashboard["application"]) ?? null,
        joinedCode: Boolean(joined.data),
        earnings: list.map((e) => ({ signature: e.signature, kind: e.kind as "harvest" | "exit", feeRaw: String(e.fee_raw), commissionRaw: String(e.commission_raw), status: e.status, createdAt: e.created_at })),
      } };
    } catch { return { success: false, error: "No se pudo cargar tu programa de afiliados." }; }
  });

export const joinAffiliate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => joinRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: owner } = await db.from("affiliates").select("privy_user_id").eq("code", data.code).maybeSingle();
      if (!owner) return { success: false, error: "Ese código no existe." };
      if (owner.privy_user_id === id) return { success: false, error: "No puedes usar tu propio código." };
      const { error } = await db.from("referrals").insert({ referred_privy_id: id, affiliate_privy_id: owner.privy_user_id });
      if (error) return { success: false, error: "Tu cuenta ya tiene un código de invitación." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo aplicar el código." }; }
  });

export const applyVip = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => applyRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { id, db } = await admin(data.token);
      const { error } = await db.from("affiliate_applications").insert({ privy_user_id: id, channel: data.channel, audience: data.audience });
      if (error) return { success: false, error: "Ya tienes una solicitud en revisión." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo enviar la solicitud." }; }
  });

export const savePayoutWallet = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { PublicKey } = await import("@solana/web3.js");
      new PublicKey(data.wallet);
      const { id, db } = await admin(data.token);
      const { error } = await db.from("affiliates").update({ payout_wallet: data.wallet }).eq("privy_user_id", id);
      if (error) throw error;
      return { success: true };
    } catch { return { success: false, error: "Dirección de cobro no válida." }; }
  });

/** Has this account already proven ownership of the wallet? */
export const walletIsVerified = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutRequest.parse(input))
  .handler(async ({ data }): Promise<{ verified: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: row } = await db.from("verified_wallets").select("privy_user_id").eq("wallet", data.wallet).maybeSingle();
      return { verified: row?.privy_user_id === id };
    } catch { return { verified: false }; }
  });

/** Stores a wallet ownership proof after verifying its ed25519 signature; a wallet binds to one account forever. */
export const verifyWalletOwnership = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => walletProofRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      if (!proofIsFresh(data.issuedAt)) return { success: false };
      const { id, db } = await admin(data.token);
      const [{ ed25519 }, { default: bs58 }] = await Promise.all([import("@noble/curves/ed25519.js"), import("bs58")]);
      const message = new TextEncoder().encode(walletProofMessage(id, data.wallet, data.issuedAt));
      const pub = bs58.decode(data.wallet);
      const sig = bs58.decode(data.signature);
      if (pub.length !== 32 || sig.length !== 64 || !ed25519.verify(sig, message, pub)) return { success: false };
      const { data: existing } = await db.from("verified_wallets").select("privy_user_id").eq("wallet", data.wallet).maybeSingle();
      if (existing) return { success: existing.privy_user_id === id };
      const { error } = await db.from("verified_wallets").insert({ wallet: data.wallet, privy_user_id: id });
      return { success: !error };
    } catch { return { success: false }; }
  });

/** Credits the referrer only from a confirmed on-chain fee paid to BÓVEDA by the referred user's wallet. */
export const recordAffiliateFee = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => recordRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const key = process.env["HELIUS_API_KEY"];
      if (!key) return { success: false };
      const { id, db } = await admin(data.token);
      const { data: referral } = await db.from("referrals").select("affiliate_privy_id, wallet").eq("referred_privy_id", id).maybeSingle();
      if (!referral) return { success: false };
      const { confirmedFeeTransfer } = await import("./affiliate.server");
      const transfer = await confirmedFeeTransfer(key, data.signature);
      if (!transfer || transfer.feeRaw <= 0n) return { success: false };
      // Only a wallet this account proved it controls (signed message) can earn the referrer a commission.
      const { data: proof } = await db.from("verified_wallets").select("privy_user_id").eq("wallet", transfer.payer).maybeSingle();
      if (!proof || proof.privy_user_id !== id) return { success: false };
      if (referral.wallet && referral.wallet !== transfer.payer) return { success: false };
      if (!referral.wallet) {
        const { error } = await db.from("referrals").update({ wallet: transfer.payer }).eq("referred_privy_id", id).is("wallet", null);
        if (error) return { success: false };
      }
      const { data: affiliate } = await db.from("affiliates").select("tier").eq("privy_user_id", referral.affiliate_privy_id).maybeSingle();
      const shareBps = tierShareBps(affiliate?.tier ?? "base");
      const { error } = await db.from("affiliate_earnings").insert({
        signature: data.signature, affiliate_privy_id: referral.affiliate_privy_id, referred_privy_id: id, kind: data.kind,
        fee_raw: Number(transfer.feeRaw), share_bps: shareBps, commission_raw: Number(affiliateCommission(transfer.feeRaw, shareBps)),
      });
      return { success: !error };
    } catch { return { success: false }; }
  });
