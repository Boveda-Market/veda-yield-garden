import { createServerFn } from "@tanstack/react-start";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { pilotInput, signatureInput, type PilotStatus } from "@/lib/pilot-deposit";

/** Re-simulates the chosen deposit and returns it only when budget and position verify. */
export const preparePilotDeposit = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => pilotInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de Solana no está configurada.");
    const { simulateDeposit } = await import("@/lib/deposit-simulation.server");
    return simulateDeposit(key, data, { preparePilot: true });
  });

export const pilotDepositStatus = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => signatureInput.parse(input))
  .handler(async ({ data }): Promise<{ status: PilotStatus }> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de Solana no está configurada.");
    const { heliusConnection } = await import("@/lib/solana-read.server");
    try {
      const { value } = await heliusConnection(key).getSignatureStatuses([data.signature], { searchTransactionHistory: true });
      const status = value[0];
      if (!status) return { status: "pending" };
      if (status.err) return { status: "failed" };
      return { status: status.confirmationStatus === "finalized" ? "finalized" : status.confirmationStatus === "confirmed" ? "confirmed" : "pending" };
    } catch {
      throw new Error("No se pudo consultar el estado de la transacción.");
    }
  });
