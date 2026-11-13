import { createFileRoute } from "@tanstack/react-router";
import { createHash, timingSafeEqual } from "crypto";

const secretFor = (k: string) => createHash("sha256").update(`telegram-webhook:${k}`).digest("base64url");
const same = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

export const Route = createFileRoute("/api/public/telegram/webhook")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["TELEGRAM_API_KEY"];
        if (!key) return new Response("Unavailable", { status: 503 });
        if (!same(request.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "", secretFor(key))) return new Response("Unauthorized", { status: 401 });
        const update = (await request.json().catch(() => null)) as { message?: { chat?: { id?: number; type?: string }; from?: { username?: string }; text?: string }; my_chat_member?: { chat?: { id?: number; type?: string }; new_chat_member?: { status?: string } } } | null;
        // User blocked or deleted the bot: release the link so the app shows "Conectar Telegram" again.
        const member = update?.my_chat_member;
        if (member?.chat?.type === "private" && typeof member.chat.id === "number" && (member.new_chat_member?.status === "kicked" || member.new_chat_member?.status === "left")) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          await supabaseAdmin.from("telegram_links").update({ chat_id: null }).eq("chat_id", member.chat.id);
          return Response.json({ ok: true });
        }
        const msg = update?.message;
        const chatId = msg?.chat?.id;
        if (!chatId || msg?.chat?.type !== "private" || typeof msg.text !== "string") return Response.json({ ok: true });
        const tg = await import("@/lib/telegram.server");
        const m = /^\/start(?:\s+([a-f0-9]{36}))?\s*$/.exec(msg.text.trim());
        if (!m) { if (msg.text.startsWith("/")) await tg.sendTelegram(String(chatId), "Para activar tus avisos abre BÓVEDA → Mi cuenta → «Conectar Telegram»."); return Response.json({ ok: true }); }
        if (!m[1]) { await tg.sendTelegram(String(chatId), "👋 Hola. Para recibir avisos de tu cuenta, abre bovedamarket.app → Mi cuenta → «Conectar Telegram»."); return Response.json({ ok: true }); }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: row } = await supabaseAdmin.from("telegram_links").select("privy_user_id, code_expires_at").eq("link_code", m[1]).maybeSingle();
        if (!row || !row.code_expires_at || new Date(row.code_expires_at).getTime() < Date.now()) {
          await tg.sendTelegram(String(chatId), "⚠️ Este enlace expiró. Genera uno nuevo desde BÓVEDA → Mi cuenta.");
          return Response.json({ ok: true });
        }
        // One chat per account: release this chat from any other account first.
        await supabaseAdmin.from("telegram_links").update({ chat_id: null }).eq("chat_id", chatId).neq("privy_user_id", row.privy_user_id);
        await supabaseAdmin.from("telegram_links").update({ chat_id: chatId, username: msg.from?.username?.slice(0, 64) ?? null, link_code: null, code_expires_at: null, alerts_enabled: true, linked_at: new Date().toISOString() }).eq("privy_user_id", row.privy_user_id);
        await tg.sendTelegram(String(chatId), "✅ <b>¡Cuenta conectada!</b>\nDesde ahora recibirás aquí los avisos de tu cuenta en BÓVEDA: cosechas, ganancias de Sube/Baja, retiros y comisiones de invitados.\n\nPuedes pausarlos o desconectarlos en Mi cuenta.\n🛡️ Nunca te pediremos claves ni frases secretas.");
        return Response.json({ ok: true });
      },
    },
  },
});
