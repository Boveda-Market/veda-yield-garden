import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { meteoraHistoryInput, type MeteoraHistoryPage } from "./meteora-history";

export const getMeteoraHistory = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => meteoraHistoryInput.parse(input))
  .handler(async ({ data }): Promise<{ success: true; page: MeteoraHistoryPage } | { success: false; error: string }> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "Los registros de Meteora no están disponibles." };
    try {
      const { readMeteoraHistory } = await import("./meteora-history.server");
      return { success: true, page: await readMeteoraHistory(key, data.wallet, data.before) };
    } catch { return { success: false, error: "No pudimos consultar los registros de Meteora. Inténtalo de nuevo." }; }
  });