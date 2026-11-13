import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { compoundInput } from "@/lib/compound";

export const prepareRealCompound = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => compoundInput.parse(input))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { prepareCompound } = await import("@/lib/compound.server");
    return prepareCompound(key, data);
  });
