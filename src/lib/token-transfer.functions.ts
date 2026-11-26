import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { solanaAddressSchema } from "@/lib/solana-data";
import { transferToken } from "@/lib/wallet-actions";

/** Extra-coin sends are built and freshly simulated with live mint/account checks; only the owner signs. */
export const prepareTokenTransfer = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => z.object({
    from: solanaAddressSchema, to: solanaAddressSchema,
    asset: z.string().max(16), amount: z.string().regex(/^[1-9]\d{0,19}$/),
  }).strict().refine((v) => v.from !== v.to).parse(input))
  .handler(async ({ data, context }): Promise<{ success: true; transaction: number[] } | { success: false; error: string }> => {
    try {
      const asset = transferToken(data.asset);
      if (asset.symbol === "SOL") throw new Error("unsupported");
      const { assertTradingWallet } = await import("@/lib/trade-guard.server");
      await assertTradingWallet(context.privyUserId, data.from);
      const key = process.env["HELIUS_API_KEY"];
      if (!key) return { success: false, error: "No se pudo preparar el envío. Inténtalo de nuevo." };
      const { prepareCheckedTokenTransfer } = await import("@/lib/token-transfer.server");
      const transaction = await prepareCheckedTokenTransfer(key, data, asset);
      return { success: true, transaction: Array.from(transaction) };
    } catch {
      return { success: false, error: "No se pudo verificar o preparar el envío de esta moneda. No se ha movido dinero." };
    }
  });