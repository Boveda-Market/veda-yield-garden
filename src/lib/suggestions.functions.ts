import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { suggestionInput, overDailyLimit } from "@/lib/suggestions";

/** Signed-in users send one suggestion; capped per day, stored privately, operator alerted on Telegram (best-effort). */
export const submitSuggestion = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d: unknown) => suggestionInput.parse(d))
  .handler(async ({ data, context }): Promise<{ success: true } | { success: false; error: string }> => {
    try {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      const since = new Date(Date.now() - 86_400_000).toISOString();
      const { count } = await db.from("user_suggestions").select("id", { count: "exact", head: true }).eq("privy_user_id", context.privyUserId).gte("created_at", since);
      if (overDailyLimit(count ?? 0)) return { success: false, error: "Ya enviaste el máximo de sugerencias por hoy. Gracias, vuelve mañana." };
      const { error } = await db.from("user_suggestions").insert({ privy_user_id: context.privyUserId, wallet: data.wallet ?? null, category: data.category, message: data.message });
      if (error) return { success: false, error: "No se pudo enviar la sugerencia." };
      try {
        const tg = await import("@/lib/telegram.server");
        const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const w = data.wallet ? `${data.wallet.slice(0, 4)}…${data.wallet.slice(-4)}` : "sin wallet";
        await tg.treasuryAlert(`${data.category === "error" ? "🚨 <b>REPORTE DE PROBLEMA</b>" : `💡 <b>Nueva sugerencia en Bóveda Market</b> (${data.category})`}\n<b>Usuario:</b> <code>${w}</code>\n<b>Mensaje:</b> <i>${esc(data.message)}</i>`);
      } catch { /* alerts never block */ }
      return { success: true };
    } catch { return { success: false, error: "No se pudo enviar la sugerencia." }; }
  });
