import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TELEGRAM_BOT = "bovedamarketbot";
const req = z.object({ token: z.string().min(20).max(12000) });
export type TelegramLinkStatus = { linked: boolean; enabled: boolean; username: string | null };

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
      const { data: row } = await db.from("telegram_links").select("chat_id, username, alerts_enabled").eq("privy_user_id", id).maybeSingle();
      return { linked: !!row?.chat_id, enabled: row?.alerts_enabled ?? true, username: row?.username ?? null };
    } catch { return { linked: false, enabled: false, username: null }; }
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
      await tg.userAlert(id, `${ACTION_TEXT[data.kind]}\n<a href="https://orbmarkets.io/tx/${data.signature}">Ver comprobante</a>`);
      return { success: true };
    } catch { return { success: false }; }
  });
