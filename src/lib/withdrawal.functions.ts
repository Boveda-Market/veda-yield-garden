import { createServerFn } from "@tanstack/react-start";
import { withdrawalInput } from "@/lib/withdrawal";

export const simulateRealWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawalInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de Solana no está configurada.");
    const { simulateWithdrawal } = await import("@/lib/withdrawal.server");
    return simulateWithdrawal(key, data);
  });