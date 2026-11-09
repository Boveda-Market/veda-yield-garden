import { createServerFn } from "@tanstack/react-start";
import { usdcTransferInput } from "@/lib/usdc-transfer";

const reasons: Record<string, string> = {
  balance: "No tienes suficientes USDC para este monto.",
  address: "Esa dirección no es una wallet válida. Copia la dirección USDC (red Solana) de tu exchange.",
  simulation: "La transferencia no pasó la verificación previa. No se pidió ninguna firma.",
};

/** Prepares an unsigned transfer; the server never signs or broadcasts. */
export const prepareUsdcTransfer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => usdcTransferInput.parse(input))
  .handler(async ({ data }): Promise<{ success: boolean; transaction?: string; message?: string }> => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) return { success: false, message: "El servicio no está disponible ahora mismo." };
    try {
      const { prepareUsdcTransfer: prepare } = await import("@/lib/usdc-transfer.server");
      const result = await prepare(key, data.from, data.to, BigInt(data.amountMicro));
      return result.ok ? { success: true, transaction: result.transaction } : { success: false, message: reasons[result.reason] };
    } catch {
      return { success: false, message: "No se pudo preparar la transferencia. No se movió dinero." };
    }
  });
