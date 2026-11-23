import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { realWalletInput } from "./solana-data";

import type { WalletActivity } from "./wallet-activity";
export type { WalletActivity } from "./wallet-activity";
export const getWalletActivity = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => realWalletInput.parse(input))
  .handler(async ({ data, context }): Promise<{ success: true; rows: WalletActivity[] } | { success: false; error: string }> => {
    try { const { assertReadableWallet } = await import("@/lib/trade-guard.server"); await assertReadableWallet(context.privyUserId, data.wallet); } catch (e) { return { success: false, error: e instanceof Error && e.message.startsWith("Solo puedes") ? e.message : "No se pudo verificar tu billetera. Inténtalo de nuevo." }; }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "La consulta de actividad no está disponible." };
    try {
      const { readWalletActivity } = await import("./wallet-activity.server");
      return { success: true, rows: await readWalletActivity(key, data.wallet) };
    } catch { return { success: false, error: "No pudimos consultar tu actividad en Solana. Inténtalo de nuevo." }; }
  });