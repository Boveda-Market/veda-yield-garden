import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { realWalletInput, type RealWalletResult } from "@/lib/solana-data";

// Public chain data only. This endpoint neither proves account ownership nor
// grants access to Cloud records, signing, arbitrary RPC methods or transfers.
export const getRealWallet = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => realWalletInput.parse(input))
  .handler(async ({ data }): Promise<RealWalletResult> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, error: "La conexión con Solana todavía no está configurada." };
    try {
      const { readRealWallet } = await import("@/lib/solana-read.server");
      return { success: true, data: await readRealWallet(key, data.wallet) };
    } catch {
      // Provider errors may include the private RPC URL. Never serialize or log them.
      return { success: false, error: "No se pudo consultar Solana. Inténtalo de nuevo; no se ha movido dinero." };
    }
  });