import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { simulationInput, simulationDisplay, type SimulationResult } from "@/lib/deposit-simulation";

export const simulateRealDeposit = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => simulationInput.parse(input))
  .handler(async ({ data, context }): Promise<SimulationResult> => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, stage: "pool", message: "La conexión de Solana no está configurada.", ...simulationDisplay(data.amount), sent: false };
    const { simulateDeposit } = await import("@/lib/deposit-simulation.server");
    return simulateDeposit(key, data);
  });