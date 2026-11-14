import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ALERT_KINDS, parseMuted, toggleMuted, type AlertKind } from "./alert-kinds";

export const TELEGRAM_BOT = "bovedamarketbot";
const req = z.object({ token: z.string().min(20).max(12000) });
export type TelegramLinkStatus = { linked: boolean; enabled: boolean; username: string | null; muted: AlertKind[] };

async function admin(token: string) {
  const { verifiedPrivyId } = await import("./account-profile.server");
  const id = await verifiedPrivyId(token);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { id, db: supabaseAdmin };
}

export const telegramLinkStatus = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.parse(i))
  .handler(async ({ data }): Promise<TelegramLinkStatus> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: found } = await db.from("telegram_links").select("*").eq("privy_user_id", id).maybeSingle();
      const row = found as { chat_id: number | null; username: string | null; alerts_enabled: boolean; muted_kinds?: unknown } | null;
      return { linked: !!row?.chat_id, enabled: row?.alerts_enabled ?? true, username: row?.username ?? null, muted: parseMuted(row?.muted_kinds) };
    } catch { return { linked: false, enabled: false, username: null, muted: [] }; }
  });

/** One-time code (10 min) embedded in the t.me deep link; the webhook binds it to the chat. */
export const startTelegramLink = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.parse(i))
  .handler(async ({ data }): Promise<{ success: boolean; url?: string }> => {
    try {
      const { id, db } = await admin(data.token);
      const bytes = crypto.getRandomValues(new Uint8Array(18));
      const code = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
      const { error } = await db.from("telegram_links").upsert({ privy_user_id: id, link_code: code, code_expires_at: new Date(Date.now() + 600_000).toISOString() }, { onConflict: "privy_user_id" });
      if (error) return { success: false };
      return { success: true, url: `https://t.me/${TELEGRAM_BOT}?start=${code}` };
    } catch { return { success: false }; }
  });

export const setTelegramAlerts = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ action: z.enum(["on", "off", "unlink"]) }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: row } = await db.from("telegram_links").select("chat_id").eq("privy_user_id", id).maybeSingle();
      const q = data.action === "unlink"
        ? db.from("telegram_links").delete().eq("privy_user_id", id)
        : db.from("telegram_links").update({ alerts_enabled: data.action === "on" }).eq("privy_user_id", id);
      const { error } = await q;
      if (!error && data.action === "unlink" && row?.chat_id) {
        const tg = await import("./telegram.server");
        await tg.sendTelegram(String(row.chat_id), "🔕 Desconectaste tu cuenta de BÓVEDA. Ya no recibirás avisos aquí.");
      }
      return { success: !error };
    } catch { return { success: false }; }
  });

/** Mutes or unmutes one alert kind for the caller's own link. */
export const setTelegramAlertKind = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ kind: z.enum(ALERT_KINDS), on: z.boolean() }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: cur } = await db.from("telegram_links").select("*").eq("privy_user_id", id).maybeSingle();
      if (!cur) return { success: false };
      const muted = toggleMuted(parseMuted((cur as { muted_kinds?: unknown }).muted_kinds), data.kind, data.on);
      const { error } = await db.from("telegram_links").update({ muted_kinds: muted } as never).eq("privy_user_id", id);
      return { success: !error };
    } catch { return { success: false }; }
  });

/** Sends a test message to the caller's own linked chat so they can confirm alerts arrive. */
export const sendTelegramTest = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const { data: row } = await db.from("telegram_links").select("chat_id").eq("privy_user_id", id).maybeSingle();
      if (!row?.chat_id) return { success: false };
      const tg = await import("./telegram.server");
      const ok = await tg.sendTelegram(String(row.chat_id), "✅ <b>Aviso de prueba</b>\nTus alertas de BÓVEDA funcionan. Aquí recibirás tus cosechas, retiros, Sube/Baja y comisiones.\n\n🛡️ BÓVEDA nunca te pedirá claves ni frases secretas.");
      return { success: ok };
    } catch { return { success: false }; }
  });

const ACTION_TEXT = {
  harvest: "🌾 <b>Cosecha completada</b>\nTus ganancias de la bóveda llegaron a tu wallet. Tu posición sigue abierta.",
  exit: "🏁 <b>Bóveda cerrada</b>\nTu capital y ganancias se liquidaron a USDC en tu wallet.",
  withdraw: "🏧 <b>Retiro enviado</b>\nTu retiro está en camino a tu banco, tarjeta o Cash App.",
  predict: "⚡ <b>Ganancias de Sube/Baja cobradas</b>\nTu premio ya está en USDC en tu wallet.",
  deposit: "🏦 <b>Depósito confirmado</b>\nTu dinero ya está trabajando en la bóveda.",
} as const;

/** Personal alert for the signed-in user's own confirmed action; only ever reaches that user's linked chat. */
export const notifyMyAction = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ kind: z.enum(["harvest", "exit", "withdraw", "predict", "deposit"]), signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/) }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id } = await admin(data.token);
      const tg = await import("./telegram.server");
      await tg.userAlert(id, `${ACTION_TEXT[data.kind]}\n<a href="https://orbmarkets.io/tx/${data.signature}">Ver comprobante</a>`, data.kind);
      return { success: true };
    } catch { return { success: false }; }
  });

/** Telegram alert when the caller's Sube/Baja rounds resolve (won → prize to claim, lost). Outcomes are re-read server-side; each round alerts once per account. */
export const notifyPredictResults = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/), positions: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)).min(1).max(20) }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const { listPositions } = await import("./predict.server");
      const { resolvedOutcome, predictAlertText } = await import("./predict-alerts");
      const t = db as unknown as { from: (x: string) => any };
      // Remember the wallet so the background job can alert even when the app is closed.
      await t.from("telegram_links").update({ wallet: data.wallet }).eq("privy_user_id", id);
      const live = await listPositions(data.wallet);
      const tg = await import("./telegram.server");
      for (const p of live.filter((x) => data.positions.includes(x.pubkey))) {
        const o = resolvedOutcome(p);
        if (!o) continue;
        const { data: ins, error } = await t.from("predict_result_alerts").upsert({ privy_user_id: id, position: p.pubkey, outcome: o }, { onConflict: "privy_user_id,position", ignoreDuplicates: true }).select("position");
        if (!error && ins?.length) await tg.userAlert(id, predictAlertText(p, o), "predict");
      }
      return { success: true };
    } catch { return { success: false }; }
  });

/** Telegram alert when the caller's Sube/Baja order was refunded instead of entering the round. Re-read server-side; once per account+order. */
export const notifyPredictRefunds = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/), orders: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)).min(1).max(20) }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const { listRefunds } = await import("./predict.server");
      const { refundAlertText } = await import("./predict-refunds");
      const t = db as unknown as { from: (x: string) => any };
      await t.from("telegram_links").update({ wallet: data.wallet }).eq("privy_user_id", id);
      const tg = await import("./telegram.server");
      for (const r of (await listRefunds(data.wallet)).filter((x) => data.orders.includes(x.order))) {
        const { data: ins, error } = await t.from("predict_result_alerts").upsert({ privy_user_id: id, position: `order:${r.order}`, outcome: "refunded" }, { onConflict: "privy_user_id,position", ignoreDuplicates: true }).select("position");
        if (!error && ins?.length) await tg.userAlert(id, refundAlertText(r), "predict");
      }
      return { success: true };
    } catch { return { success: false }; }
  });
