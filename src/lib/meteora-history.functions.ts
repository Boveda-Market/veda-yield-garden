import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { meteoraHistoryInput, type MeteoraHistoryPage } from "./meteora-history";

export const getMeteoraHistory = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => meteoraHistoryInput.parse(input))
  .handler(async ({ data, context }): Promise<{ success: true; page: MeteoraHistoryPage } | { success: false; error: string }> => {
    try { const { assertReadableWallet } = await import("@/lib/trade-guard.server"); await assertReadableWallet(context.privyUserId, data.wallet); } catch (e) { return { success: false, error: e instanceof Error && e.message.startsWith("Solo puedes") ? e.message : "No se pudo verificar tu billetera. Inténtalo de nuevo." }; }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "Los registros de Meteora no están disponibles." };
    try {
      const { readMeteoraHistory } = await import("./meteora-history.server");
      return { success: true, page: await readMeteoraHistory(key, data.wallet, data.before) };
    } catch { return { success: false, error: "No pudimos consultar los registros de Meteora. Inténtalo de nuevo." }; }
  });