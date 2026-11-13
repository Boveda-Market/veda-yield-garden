import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { exitInput, prepareWithdrawalInput } from "@/lib/withdrawal";

export const simulateRealWithdrawal = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => exitInput.parse(input))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { simulateWithdrawal } = await import("@/lib/withdrawal.server");
    return simulateWithdrawal(key, data);
  });

export const prepareRealWithdrawal = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => prepareWithdrawalInput.parse(input))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { simulateWithdrawal } = await import("@/lib/withdrawal.server");
    return simulateWithdrawal(key, data, { prepare: true, maximumFeeRaw: data.maximumFeeRaw, minimumNetRaw: data.minimumNetRaw });
  });