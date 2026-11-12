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
