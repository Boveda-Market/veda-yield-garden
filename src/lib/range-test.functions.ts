import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Operator-only: sends the exact out-of-range Telegram alert (text + "Rebalancear ahora" button) to the
 * operator's own linked chat, or the operator alert chat when none is linked. Moves no money.
 */
export const sendRangeTestAlert = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(12000), position: z.string().regex(/^[A-Za-z0-9]{32,44}$/) }).strict().parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; message: string }> => {
    try {
      const { payoutAdmin } = await import("./affiliate.functions");
      const { id, db } = await payoutAdmin(data.token);
      const { rangeAlertText, rangeAlertButton } = await import("./dlmm");
      const tg = await import("./telegram.server");
      const html = `🧪 <i>Prueba</i>\n\n${rangeAlertText("Bóveda GTA6", false)}`;
      const { data: link } = await db.from("telegram_links").select("chat_id").eq("privy_user_id", id).maybeSingle();
      const chat = link?.chat_id ? String(link.chat_id) : process.env["TELEGRAM_ALERT_CHAT_ID"];
      if (!chat) return { success: false, message: "Conecta tu Telegram en Notificaciones para recibir la prueba." };
      const ok = await tg.sendTelegram(chat, `${html}\n\n🛡️ BÓVEDA nunca te pedirá claves ni frases secretas.`, rangeAlertButton(data.position));
      return ok ? { success: true, message: "Aviso de prueba enviado a tu Telegram." } : { success: false, message: "Telegram no respondió. Inténtalo de nuevo." };
    } catch { return { success: false, message: "Solo la wallet de tesorería verificada puede enviar pruebas." }; }
  });
