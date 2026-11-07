import { createServerFn } from "@tanstack/react-start";
import { withdrawalInput, prepareWithdrawalInput, isWithdrawalPilot } from "@/lib/withdrawal";

export const simulateRealWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawalInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de Solana no está configurada.");
    const { simulateWithdrawal } = await import("@/lib/withdrawal.server");
    return simulateWithdrawal(key, data);
  });

export const prepareRealWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => prepareWithdrawalInput.parse(input))
  .handler(async ({ data }) => {
    if (!isWithdrawalPilot(data)) throw new Error("La firma de este retiro no está habilitada para esta posición.");
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de Solana no está configurada.");
    const { simulateWithdrawal } = await import("@/lib/withdrawal.server");
    return simulateWithdrawal(key, data, { prepare: true, maximumFeeRaw: data.maximumFeeRaw, minimumNetRaw: data.minimumNetRaw });
  });