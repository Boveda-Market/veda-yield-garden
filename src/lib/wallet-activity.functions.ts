import { createServerFn } from "@tanstack/react-start";
import { realWalletInput } from "./solana-data";

export type WalletActivity = { signature: string; at: number | null; failed: boolean; status: string };
export const getWalletActivity = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => realWalletInput.parse(input))
  .handler(async ({ data }): Promise<{ success: true; rows: WalletActivity[] } | { success: false; error: string }> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "La consulta de actividad no está disponible." };
    try {
      const { readWalletActivity } = await import("./wallet-activity.server");
      return { success: true, rows: await readWalletActivity(key, data.wallet) };
    } catch { return { success: false, error: "No pudimos consultar tu actividad en Solana. Inténtalo de nuevo." }; }
  });