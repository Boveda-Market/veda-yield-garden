import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AFFILIATE_SHARE_BPS, subAffiliateShare, affiliateCommission, affiliateRequest, customizeCodeRequest, joinRequest, payoutRequest, recordRequest, type AffiliateDashboard, payoutAdminRequest, markPaidRequest, payoutsDue, type PayoutDue, type PayoutRecent, claimRequest, claimFinalizeRequest, claimNet, type AffiliateKind, createVipCodeRequest, toggleVipCodeRequest, updateVipCodeRequest, deleteVipCodeRequest, setAffiliateShareRequest, VIP_CODE_MAX_USES, type VipCode, type AffiliateRow } from "./affiliate";
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

type Db = Awaited<ReturnType<typeof admin>>["db"];
async function getAffiliateRow(db: Db, id: string) {
  const cols = "code, payout_wallet, share_bps";
  let { data: row } = await db.from("affiliates").select(cols).eq("privy_user_id", id).maybeSingle();
  for (let i = 0; !row && i < 5; i++) {
    const { data: created } = await db.from("affiliates").insert({ privy_user_id: id, code: randomCode() }).select(cols).maybeSingle();
    row = created ?? (await db.from("affiliates").select(cols).eq("privy_user_id", id).maybeSingle()).data;
  }
  if (!row) throw new Error();
  return row;
}

export const getAffiliateDashboard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => affiliateRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; dashboard: AffiliateDashboard } | Fail> => {
    try {
      const { id, db } = await admin(data.token);
      const row = await getAffiliateRow(db, id);
      const [referred, earnings, joined] = await Promise.all([
        db.from("referrals").select("referred_privy_id", { count: "exact", head: true }).eq("affiliate_privy_id", id),
        db.from("affiliate_earnings").select("signature, level, kind, fee_raw, commission_raw, status, created_at").eq("affiliate_privy_id", id).order("created_at", { ascending: false }).limit(50),
        db.from("referrals").select("referred_privy_id").eq("referred_privy_id", id).maybeSingle(),
      ]);
      const list = earnings.data ?? [];
      const { data: directs } = await db.from("referrals").select("referred_privy_id").eq("affiliate_privy_id", id).limit(1000);
      const directIds = (directs ?? []).map((r) => r.referred_privy_id);
      const subCount = directIds.length ? ((await db.from("referrals").select("referred_privy_id", { count: "exact", head: true }).in("affiliate_privy_id", directIds)).count ?? 0) : 0;
      const total = (status: string) => list.filter((e) => e.status === status).reduce((a, e) => a + BigInt(e.commission_raw), 0n).toString();
      return { success: true, dashboard: {
        code: row.code, shareBps: row.share_bps, payoutWallet: row.payout_wallet, referred: referred.count ?? 0,
        pendingRaw: total("pending"), paidRaw: total("paid"),
        joinedCode: Boolean(joined.data),
        subReferred: subCount,
        earnings: list.map((e) => ({ signature: e.signature, level: e.level === 2 ? 2 : 1, kind: e.kind as AffiliateKind, feeRaw: String(e.fee_raw), commissionRaw: String(e.commission_raw), status: e.status, createdAt: e.created_at })),
      } };
    } catch { return { success: false, error: "No se pudo cargar tu programa de afiliados." }; }
  });

export const joinAffiliate = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => joinRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; upgradedBps?: number } | Fail> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: owner } = await db.from("affiliates").select("privy_user_id").eq("code", data.code).maybeSingle();
      if (!owner) {
        // Not a friend's code: try a partner upgrade code assigned by Bóveda Market.
        await getAffiliateRow(db, id);
        const { data: bps } = await db.rpc("redeem_affiliate_upgrade", { _code: data.code, _privy_user_id: id });
        if (typeof bps === "number") return { success: true, upgradedBps: bps };
        return { success: false, error: "Este código ya fue canjeado o no es válido." };
      }
      if (owner.privy_user_id === id) return { success: false, error: "No puedes usar tu propio código." };
      const { error } = await db.from("referrals").insert({ referred_privy_id: id, affiliate_privy_id: owner.privy_user_id });
      if (error) return { success: false, error: "Tu cuenta ya tiene un código de invitación." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo aplicar el código." }; }
  });

export const customizeAffiliateCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => customizeCodeRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: updated, error } = await db.from("affiliates").update({ code: data.code }).eq("privy_user_id", id).select("code").maybeSingle();
      if (error?.code === "23505") return { success: false, error: "Ese código ya está en uso. Elige otro." };
      if (error || !updated) return { success: false, error: "No se pudo guardar tu enlace." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo guardar tu enlace." }; }
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

/** Credits the referrer only from a confirmed on-chain fee paid to Bóveda Market by the referred user's wallet. */
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
      const { data: aff } = await db.from("affiliates").select("share_bps").eq("privy_user_id", referral.affiliate_privy_id).maybeSingle();
      const shareBps = Math.min(aff?.share_bps ?? AFFILIATE_SHARE_BPS, 9000);
      const rows = [{
        signature: data.signature, level: 1, affiliate_privy_id: referral.affiliate_privy_id, referred_privy_id: id, kind: data.kind,
        fee_raw: Number(transfer.feeRaw), share_bps: shareBps, commission_raw: Number(affiliateCommission(transfer.feeRaw, shareBps)),
      }];
      // Level 2: whoever referred the direct affiliate earns a smaller share. Two levels only.
      const { data: parent } = await db.from("referrals").select("affiliate_privy_id").eq("referred_privy_id", referral.affiliate_privy_id).maybeSingle();
      const subBps = subAffiliateShare(shareBps);
      if (parent && parent.affiliate_privy_id !== id && subBps > 0) {
        rows.push({ signature: data.signature, level: 2, affiliate_privy_id: parent.affiliate_privy_id, referred_privy_id: id, kind: data.kind,
          fee_raw: Number(transfer.feeRaw), share_bps: subBps, commission_raw: Number(affiliateCommission(transfer.feeRaw, subBps)) });
      }
      const { error } = await db.from("affiliate_earnings").insert(rows);
      if (!error) { const tg = await import("./telegram.server"); await tg.treasuryAlert(`💰 <b>Comisión recibida</b> (${data.kind})\nTesorería: +${tg.usdcText(transfer.feeRaw)} USDC\nAfiliados: ${rows.map((r) => `N${r.level} ${tg.usdcText(r.commission_raw)}`).join(" · ")} USDC`); for (const r of rows) await tg.userAlert(r.affiliate_privy_id, `💰 <b>¡Ganaste una comisión!</b>\nUn invitado${r.level === 2 ? " de tu red" : ""} usó Bóveda Market: +${tg.usdcText(r.commission_raw)} USDC para ti.\nCóbrala en Invita y gana.`, "commission"); }
      return { success: !error };
    } catch { return { success: false }; }
  });

/** Only the account that proved ownership of the dedicated payout wallet may manage payouts. */
export async function payoutAdmin(token: string) {
  const { AFFILIATE_PAYOUT_WALLET } = await import("./affiliate");
  const ctx = await admin(token);
  const { data } = await ctx.db.from("verified_wallets").select("privy_user_id").eq("wallet", AFFILIATE_PAYOUT_WALLET).maybeSingle();
  if (!data || data.privy_user_id !== ctx.id) throw new Error("forbidden");
  return ctx;
}

export const listAffiliatePayouts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutAdminRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; due: PayoutDue[]; paidRaw: string; pendingAllRaw: string; recent: PayoutRecent[] } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { data: rows } = await db.from("affiliate_earnings").select("affiliate_privy_id, commission_raw, status, payout_signature, paid_at").in("status", ["pending", "paid"]).limit(10000);
      const pendingAllRaw = (rows ?? []).filter((r) => r.status === "pending").reduce((a, r) => a + BigInt(r.commission_raw), 0n).toString();
      const bySig = new Map<string, { aff: string; raw: bigint; at: string }>();
      for (const r of rows ?? []) if (r.status === "paid" && r.payout_signature) { const e = bySig.get(r.payout_signature) ?? { aff: r.affiliate_privy_id, raw: 0n, at: r.paid_at ?? "" }; e.raw += BigInt(r.commission_raw); bySig.set(r.payout_signature, e); }
      const recentRaw = [...bySig].sort((a, b) => b[1].at.localeCompare(a[1].at)).slice(0, 20);
      const pending = (rows ?? []).filter((r) => r.status === "pending");
      const paidRaw = (rows ?? []).filter((r) => r.status === "paid").reduce((a, r) => a + BigInt(r.commission_raw), 0n).toString();
      const due = payoutsDue(pending);
      const ids = [...new Set([...due.map((d) => d.affiliate), ...recentRaw.map(([, v]) => v.aff)])];
      const { data: affs } = ids.length ? await db.from("affiliates").select("privy_user_id, code, payout_wallet").in("privy_user_id", ids) : { data: [] };
      const recent = recentRaw.map(([signature, v]) => { const a = (affs ?? []).find((x) => x.privy_user_id === v.aff); return { code: a?.code ?? "—", wallet: a?.payout_wallet ?? null, amountRaw: v.raw.toString(), signature, paidAt: v.at }; });
      return { success: true, paidRaw, pendingAllRaw, recent, due: due.map((d) => { const a = (affs ?? []).find((x) => x.privy_user_id === d.affiliate); return { affiliate: d.affiliate, code: a?.code ?? "—", wallet: a?.payout_wallet ?? null, pendingRaw: d.raw.toString(), count: d.count }; }) };
    } catch { return { success: false, error: "Solo la wallet de tesorería verificada puede ver este panel." }; }
  });

export const markAffiliatePaid = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => markPaidRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const key = process.env["HELIUS_API_KEY"];
      if (!key) return { success: false, error: "Servicio no disponible." };
      const { db } = await payoutAdmin(data.token);
      const { AFFILIATE_PAYOUT_WALLET } = await import("./affiliate");
      const { data: used } = await db.from("affiliate_earnings").select("signature").eq("payout_signature", data.signature).limit(1);
      if (used?.length) return { success: false, error: "Esa transacción ya se registró." };
      const { data: aff } = await db.from("affiliates").select("payout_wallet").eq("privy_user_id", data.affiliate).maybeSingle();
      if (!aff?.payout_wallet) return { success: false, error: "El afiliado no tiene wallet de cobro." };
      const { data: rows } = await db.from("affiliate_earnings").select("signature, level, commission_raw").eq("affiliate_privy_id", data.affiliate).eq("status", "pending");
      const owed = (rows ?? []).reduce((a, r) => a + BigInt(r.commission_raw), 0n);
      const { confirmedPayoutTransfer } = await import("./affiliate.server");
      let received: bigint | null = null;
      for (let i = 0; i < 6 && received === null; i++) { received = await confirmedPayoutTransfer(key, data.signature, AFFILIATE_PAYOUT_WALLET, aff.payout_wallet); if (received === null) await new Promise((r) => setTimeout(r, 2000)); }
      if (received === null || received < owed) return { success: false, error: "No se encontró en la red un pago confirmado por el total adeudado." };
      for (const r of rows ?? []) {
        const { error } = await db.from("affiliate_earnings").update({ status: "paid", payout_signature: data.signature, paid_at: new Date().toISOString() }).eq("signature", r.signature).eq("level", r.level).eq("affiliate_privy_id", data.affiliate).eq("status", "pending");
        if (error) throw error;
      }
      return { success: true };
    } catch { return { success: false, error: "No se pudo registrar el pago." }; }
  });

const STALE_CLAIM_MS = 5 * 60_000;
async function claimCtx(token: string) {
  const ctx = await admin(token);
  const { data: aff } = await ctx.db.from("affiliates").select("payout_wallet").eq("privy_user_id", ctx.id).maybeSingle();
  return { ...ctx, wallet: aff?.payout_wallet ?? null };
}

/** Step 1: lock pending commissions and return a payout transaction pre-signed by the treasury; the affiliate's wallet co-signs as fee payer (pays network costs in its own SOL). */
export const claimAffiliatePayout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => claimRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; transaction: string; netRaw: string; wallet: string } | Fail> => {
    const key = process.env["HELIUS_API_KEY"];
    const secret = process.env["AFFILIATE_PAYOUT_SECRET_KEY"];
    if (!key || !secret) return { success: false, error: "Los cobros automáticos no están disponibles todavía." };
    const { id, db, wallet } = await claimCtx(data.token);
    if (!wallet) return { success: false, error: "Guarda primero tu wallet de cobro." };
    // Release abandoned locks (never signed / expired transactions).
    await db.from("affiliate_earnings").update({ status: "pending", paid_at: null }).eq("affiliate_privy_id", id).eq("status", "paid").is("payout_signature", null).lt("paid_at", new Date(Date.now() - STALE_CLAIM_MS).toISOString());
    const { data: pending } = await db.from("affiliate_earnings").select("commission_raw").eq("affiliate_privy_id", id).eq("status", "pending");
    if (claimNet((pending ?? []).reduce((a, r) => a + BigInt(r.commission_raw), 0n)) === null) return { success: false, error: "Necesitas al menos 3 USDC acumulados para cobrar." };
    const { data: locked, error: lockErr } = await db.from("affiliate_earnings").update({ status: "paid", paid_at: new Date().toISOString() }).eq("affiliate_privy_id", id).eq("status", "pending").is("payout_signature", null).select("signature, level, commission_raw");
    if (lockErr || !locked?.length) return { success: false, error: "Ya hay un cobro en proceso. Espera unos minutos." };
    const net = claimNet(locked.reduce((a, r) => a + BigInt(r.commission_raw), 0n));
    const revert = async () => { for (const r of locked) await db.from("affiliate_earnings").update({ status: "pending", paid_at: null }).eq("signature", r.signature).eq("level", r.level).eq("affiliate_privy_id", id).is("payout_signature", null); };
    if (net === null) { await revert(); return { success: false, error: "Necesitas al menos 3 USDC acumulados para cobrar." }; }
    try {
      const { AFFILIATE_PAYOUT_WALLET } = await import("./affiliate");
      const { buildAffiliateClaim } = await import("./affiliate.server");
      const transaction = await buildAffiliateClaim(key, secret, AFFILIATE_PAYOUT_WALLET, wallet, net);
      return { success: true, transaction, netRaw: net.toString(), wallet };
    } catch (e) {
      console.error("affiliate claim build failed", e instanceof Error ? e.message : "unknown");
      await revert();
      return { success: false, error: "No se pudo preparar tu cobro. Asegúrate de tener un poco de SOL para la red (≈0.003 SOL) e inténtalo de nuevo." };
    }
  });

/** Step 2: after the affiliate signs and broadcasts, verify the confirmed USDC payout on-chain and record it. */
export const finalizeAffiliateClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => claimFinalizeRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "Servicio no disponible." };
    const { id, db, wallet } = await claimCtx(data.token);
    if (!wallet) return { success: false, error: "Guarda primero tu wallet de cobro." };
    const { data: used } = await db.from("affiliate_earnings").select("signature").eq("payout_signature", data.signature).limit(1);
    if (used?.length) return { success: false, error: "Esa transacción ya se registró." };
    const { data: locked } = await db.from("affiliate_earnings").select("signature, level, commission_raw").eq("affiliate_privy_id", id).eq("status", "paid").is("payout_signature", null);
    if (!locked?.length) return { success: false, error: "No hay un cobro en proceso." };
    const owed = locked.reduce((a, r) => a + BigInt(r.commission_raw), 0n);
    const { AFFILIATE_PAYOUT_WALLET } = await import("./affiliate");
    const { confirmedPayoutTransfer } = await import("./affiliate.server");
    let received: bigint | null = null;
    for (let i = 0; i < 8 && received === null; i++) { received = await confirmedPayoutTransfer(key, data.signature, AFFILIATE_PAYOUT_WALLET, wallet); if (received === null) await new Promise((r) => setTimeout(r, 2000)); }
    if (received === null || received < owed) return { success: false, error: "Aún no vemos tu cobro confirmado en la red. Revisa tu wallet en unos minutos." };
    for (const r of locked) await db.from("affiliate_earnings").update({ payout_signature: data.signature }).eq("signature", r.signature).eq("level", r.level).eq("affiliate_privy_id", id).is("payout_signature", null);
    { const tg = await import("./telegram.server"); await tg.treasuryAlert(`📤 <b>Afiliado cobró</b>\n${tg.usdcText(received)} USDC enviados desde la tesorería.\nhttps://solscan.io/tx/${data.signature}`); await tg.userAlert(id, `📤 <b>Cobro completado</b>\n${tg.usdcText(received)} USDC de comisiones llegaron a tu wallet.`, "commission"); }
    return { success: true };
  });

/** Releases a claim lock when the affiliate cancels the signature. */
export const cancelAffiliateClaim = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => claimRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true }> => {
    const { id, db } = await claimCtx(data.token);
    await db.from("affiliate_earnings").update({ status: "pending", paid_at: null }).eq("affiliate_privy_id", id).eq("status", "paid").is("payout_signature", null);
    return { success: true };
  });

export const listVipCodes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutAdminRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; codes: VipCode[] } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { data: codes } = await db.from("affiliate_upgrade_codes").select("code, share_bps, times_used, max_uses, is_active, created_at").order("created_at", { ascending: false }).limit(500);
      const { data: reds } = await db.from("affiliate_upgrade_redemptions").select("code, privy_user_id, redeemed_at").limit(2000);
      const ids = [...new Set((reds ?? []).map((r) => r.privy_user_id))];
      const { data: affs } = ids.length ? await db.from("affiliates").select("privy_user_id, code").in("privy_user_id", ids) : { data: [] };
      return { success: true, codes: (codes ?? []).map((c) => { const r = (reds ?? []).find((x) => x.code === c.code); return { code: c.code, shareBps: c.share_bps, used: c.times_used >= c.max_uses, active: c.is_active, createdAt: c.created_at, redeemedAt: r?.redeemed_at ?? null, redeemedBy: r ? ((affs ?? []).find((a) => a.privy_user_id === r.privy_user_id)?.code ?? "—") : null }; }) };
    } catch { return { success: false, error: "No se pudieron cargar los códigos." }; }
  });

export const createVipCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => createVipCodeRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { data: clash } = await db.from("affiliates").select("code").eq("code", data.code).maybeSingle();
      if (clash) return { success: false, error: "Ese código ya lo usa un afiliado. Elige otro." };
      const { error } = await db.from("affiliate_upgrade_codes").insert({ code: data.code, share_bps: data.shareBps, max_uses: VIP_CODE_MAX_USES });
      if (error) return { success: false, error: "Ese código ya existe." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo crear el código." }; }
  });

export const toggleVipCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => toggleVipCodeRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { error } = await db.from("affiliate_upgrade_codes").update({ is_active: data.active }).eq("code", data.code);
      if (error) return { success: false, error: "No se pudo actualizar el código." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo actualizar el código." }; }
  });

export const listAffiliateDirectory = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutAdminRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; affiliates: AffiliateRow[] } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const [{ data: affs }, { data: refs }, { data: earns }] = await Promise.all([
        db.from("affiliates").select("privy_user_id, code, share_bps, created_at").order("created_at", { ascending: false }).limit(1000),
        db.from("referrals").select("affiliate_privy_id").limit(10000),
        db.from("affiliate_earnings").select("affiliate_privy_id, commission_raw, status").limit(20000),
      ]);
      const rows = (affs ?? []).map((a) => {
        let pending = 0n, paid = 0n;
        for (const e of earns ?? []) if (e.affiliate_privy_id === a.privy_user_id) { if (e.status === "pending") pending += BigInt(e.commission_raw); else if (e.status === "paid") paid += BigInt(e.commission_raw); }
        return { code: a.code, shareBps: a.share_bps, referred: (refs ?? []).filter((r) => r.affiliate_privy_id === a.privy_user_id).length, pendingRaw: pending.toString(), paidRaw: paid.toString(), createdAt: a.created_at };
      });
      return { success: true, affiliates: rows };
    } catch { return { success: false, error: "No se pudo cargar el directorio." }; }
  });

/** Edits only unredeemed codes so redemption history stays auditable. */
export const updateVipCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => updateVipCodeRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      if (data.newCode !== data.code) {
        const { data: clash } = await db.from("affiliates").select("code").eq("code", data.newCode).maybeSingle();
        if (clash) return { success: false, error: "Ese código ya lo usa un afiliado. Elige otro." };
      }
      const { data: rows, error } = await db.from("affiliate_upgrade_codes").update({ code: data.newCode, share_bps: data.shareBps }).eq("code", data.code).eq("times_used", 0).select("code");
      if (error) return { success: false, error: "Ese código ya existe." };
      if (!rows?.length) return { success: false, error: "Solo puedes editar códigos sin canjear." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo actualizar el código." }; }
  });

export const deleteVipCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => deleteVipCodeRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { data: rows, error } = await db.from("affiliate_upgrade_codes").delete().eq("code", data.code).eq("times_used", 0).select("code");
      if (error || !rows?.length) return { success: false, error: "Solo puedes eliminar códigos sin canjear." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo eliminar el código." }; }
  });

export const setAffiliateShare = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => setAffiliateShareRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { data: rows, error } = await db.from("affiliates").update({ share_bps: data.shareBps }).eq("code", data.code).select("code");
      if (error || !rows?.length) return { success: false, error: "No se pudo actualizar la comisión." };
      return { success: true };
    } catch { return { success: false, error: "No se pudo actualizar la comisión." }; }
  });

/** Operator-only: posts one in-app announcement to the official Telegram channel. */
export const publishAnnouncementToTelegram = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096), id: z.string().min(1).max(80) }).strict().parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try { await payoutAdmin(data.token); } catch { return { success: false, error: "Solo la wallet de tesorería verificada puede publicar." }; }
    const { ANNOUNCEMENTS } = await import("./announcements");
    const a = ANNOUNCEMENTS.find((x) => x.id === data.id);
    if (!a) return { success: false, error: "Aviso no encontrado." };
    const tg = await import("./telegram.server");
    return (await tg.sendTelegram(tg.TELEGRAM_CHANNEL, tg.announcementPost(a), tg.announcementButton(a))) ? { success: true } : { success: false, error: "Telegram no aceptó el mensaje. Revisa que el bot sea administrador del canal." };
  });

/** Operator-only: read community suggestions (newest first). */
export const listSuggestions = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => payoutAdminRequest.parse(input))
  .handler(async ({ data }): Promise<{ success: true; items: import("./suggestions").Suggestion[] } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { data: rows, error } = await db.from("user_suggestions").select("id, category, message, wallet, status, created_at").order("created_at", { ascending: false }).limit(200);
      if (error) return { success: false, error: "No se pudieron cargar las sugerencias." };
      return { success: true, items: (rows ?? []).map((r) => ({ id: r.id, category: r.category as "idea", message: r.message, wallet: r.wallet, status: r.status as "unread", createdAt: r.created_at })) };
    } catch { return { success: false, error: "Solo la wallet de tesorería verificada puede ver las sugerencias." }; }
  });

/** Operator-only: mark a suggestion read/unread. */
export const setSuggestionStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096), id: z.string().uuid(), status: z.enum(["unread", "reviewed"]) }).strict().parse(input))
  .handler(async ({ data }): Promise<{ success: true } | Fail> => {
    try {
      const { db } = await payoutAdmin(data.token);
      const { error } = await db.from("user_suggestions").update({ status: data.status }).eq("id", data.id);
      return error ? { success: false, error: "No se pudo actualizar." } : { success: true };
    } catch { return { success: false, error: "No se pudo actualizar." }; }
  });
