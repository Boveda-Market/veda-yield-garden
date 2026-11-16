import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";

const walletInput = z.object({ wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) }).strict();
const enableInput = z.object({ wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/), auto: z.boolean().optional() }).strict();
/** `enrolled` = a choice was ever recorded for this wallet (on or off), so the default never overrides a user who switched it off. */
export type AutopilotStatus = { enabled: boolean; enrolled: boolean; enabledAt: string | null; lastRebalanceAt: string | null; lastSignature: string | null };

const adminDb = async () => { const { supabaseAdmin } = await import("@/integrations/supabase/client.server"); return supabaseAdmin as unknown as { from: (t: string) => any }; };

/** Autopilot state for the caller's own wallet. */
export const autopilotStatus = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => walletInput.parse(input))
  .handler(async ({ data, context }): Promise<AutopilotStatus> => {
    const db = await adminDb();
    const { data: row } = await db.from("autopilot_enrollments").select("enabled, updated_at, last_rebalance_at, last_signature").eq("wallet", data.wallet).eq("privy_user_id", context.privyUserId).maybeSingle();
    const r = row as { enabled: boolean; updated_at: string; last_rebalance_at: string | null; last_signature: string | null } | null;
    return { enabled: !!r?.enabled, enrolled: !!r, enabledAt: r?.enabled ? r.updated_at : null, lastRebalanceAt: r?.last_rebalance_at ?? null, lastSignature: r?.last_signature ?? null };
  });

/** Turns Autopilot on after the client attached the signer: verifies the caller's own embedded wallet and the signer at Privy. `auto` marks the range-vault default. */
export const enableAutopilot = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => enableInput.parse(input))
  .handler(async ({ data, context }): Promise<AutopilotStatus> => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const secret = process.env["PRIVY_APP_SECRET"];
    if (!secret || !process.env["PRIVY_AUTOPILOT_KEY_SEED"]) throw new Error("El piloto automático no está disponible ahora mismo.");
    const { embeddedWalletId, hasAutopilotSigner } = await import("@/lib/autopilot.server");
    const walletId = await embeddedWalletId(context.privyUserId, data.wallet, secret);
    if (!walletId) throw new Error("El piloto automático solo funciona con tu billetera protegida de BÓVEDA.");
    if (!(await hasAutopilotSigner(walletId, secret))) throw new Error("No se completó el permiso. Inténtalo de nuevo.");
    const db = await adminDb();
    const now = new Date().toISOString();
    const { data: before } = await db.from("autopilot_enrollments").select("enabled").eq("wallet", data.wallet).maybeSingle();
    // A wallet that switched Autopilot off never gets it back from the default; only its own switch can.
    if (data.auto && before?.enabled) throw new Error("El piloto automático ya está activo en esta billetera.");
    const { error } = await db.from("autopilot_enrollments").upsert({ wallet: data.wallet, privy_user_id: context.privyUserId, wallet_id: walletId, enabled: true, last_result: null, updated_at: now }, { onConflict: "wallet" });
    if (error) throw new Error("No se pudo activar el piloto automático. Inténtalo de nuevo.");
    // Information-only Telegram card (the bell shows the same notice from this status).
    // Transparent: no activation notice; users only hear about Autopilot when it re-centres a position.
    const { data: row } = await db.from("autopilot_enrollments").select("last_rebalance_at, last_signature").eq("wallet", data.wallet).maybeSingle();
    return { enabled: true, enrolled: true, enabledAt: now, lastRebalanceAt: row?.last_rebalance_at ?? null, lastSignature: row?.last_signature ?? null };
  });

/** Turns Autopilot off (the client also removes the signer at Privy, which is the real revocation). */
export const disableAutopilot = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => walletInput.parse(input))
  .handler(async ({ data, context }): Promise<AutopilotStatus> => {
    const db = await adminDb();
    await db.from("autopilot_enrollments").update({ enabled: false, updated_at: new Date().toISOString() }).eq("wallet", data.wallet).eq("privy_user_id", context.privyUserId);
    return { enabled: false, enrolled: true, enabledAt: null, lastRebalanceAt: null, lastSignature: null };
  });
