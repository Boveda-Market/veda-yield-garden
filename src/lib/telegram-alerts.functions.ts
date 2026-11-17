import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { ALERT_KINDS, parseMuted, toggleMuted, type AlertKind } from "./alert-kinds";
import { TG_SAFETY, tgCard, tgRow } from "./telegram-format";

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
        await tg.sendTelegram(String(row.chat_id), tgCard("🔕", "Cuenta desconectada", ["Ya no recibirás avisos de BÓVEDA aquí.", "Vuelve a conectarla cuando quieras desde Mi cuenta."]));
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
      const ok = await tg.sendTelegram(String(row.chat_id), `${tgCard("✅", "Aviso de prueba", ["Tus alertas de BÓVEDA funcionan.", "", "🌾 Cosechas  ·  🏧 Retiros", "⚡ Doble o Nada  ·  🎯 Rebalanceos"])}\n\n${TG_SAFETY}`);
      return { success: ok };
    } catch { return { success: false }; }
  });

const ACTION_TEXT = {
  harvest: tgCard("🌾", "Cosecha completada", ["Tus ganancias ya están en tu billetera.", "✅ Tu bóveda sigue abierta y generando."]),
  exit: tgCard("🏁", "Bóveda cerrada", ["Tu capital y tus ganancias ya están en dólares en tu billetera."]),
  withdraw: tgCard("🏧", "Retiro enviado", ["Tu dinero va en camino a tu banco, tarjeta o Cash App."]),
  predict: tgCard("⚡", "Premio de Doble o Nada cobrado", ["💵 Tu premio ya está en dólares en tu billetera."]),
  deposit: tgCard("🏦", "Depósito confirmado", ["Tu dinero ya está trabajando en la bóveda.", "🌾 Te avisamos aquí cada vez que cosechas."]),
} as const;

/** Exit alert: partial withdrawals say the vault keeps generating; never mentions fees. */
export function exitAlertText(percent: number, amountUsd?: string, vault?: string) {
  const amount = amountUsd ? tgRow("💵", "Dólares a tu billetera", `$${Number(amountUsd).toFixed(2)}`) : null;
  const where = vault ? tgRow("🏦", "Bóveda", vault) : null;
  return percent < 100
    ? tgCard("💸", `Retiro completado (${percent}%)`, [where, amount, "", `✅ Tu bóveda sigue abierta y generando con el ${100 - percent}% restante.`])
    : tgCard("🏁", "Retiro total de bóveda", [where, amount, "", "Tu dinero y tus ganancias ya están disponibles en tu billetera."]);
}

/** Personal alert for the signed-in user's own confirmed action; only ever reaches that user's linked chat. */
export const notifyMyAction = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ kind: z.enum(["harvest", "exit", "withdraw", "predict", "deposit"]), signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/), percent: z.number().int().min(1).max(100).optional(), amountUsd: z.string().regex(/^\d{1,9}(\.\d{1,6})?$/).optional(), vault: z.string().regex(/^[A-Za-z0-9 ]{1,20}$/).optional() }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id } = await admin(data.token);
      const tg = await import("./telegram.server");
      const text = data.kind === "exit" ? exitAlertText(data.percent ?? 100, data.amountUsd, data.vault) : ACTION_TEXT[data.kind];
      await tg.userAlert(id, text, data.kind, { text: "🧾 Ver comprobante", url: `https://orbmarkets.io/tx/${data.signature}` });
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

/** Remembers the caller's wallet so the background job can send vault out-of-range alerts while the app is closed. */
export const registerAlertWallet = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => req.extend({ wallet: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/) }).parse(i))
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    try {
      const { id, db } = await admin(data.token);
      const t = db as unknown as { from: (x: string) => any };
      const { error } = await t.from("telegram_links").update({ wallet: data.wallet }).eq("privy_user_id", id);
      return { success: !error };
    } catch { return { success: false }; }
  });
