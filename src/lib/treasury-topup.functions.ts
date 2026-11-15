import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Operator button: convert treasury dollars into network reserve now (payoutAdmin-gated). */
export const treasuryTopupNow = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096) }).strict().parse(input))
  .handler(async ({ data }) => {
    try { const { payoutAdmin } = await import("./affiliate.functions"); await payoutAdmin(data.token); }
    catch { return { success: false as const, error: "Solo la wallet de tesorería verificada puede hacer esto." }; }
    const { runTreasuryTopup } = await import("./treasury-topup.server");
    const r = await runTreasuryTopup({ lastAt: null, manual: true });
    if (!r.done) return { success: false as const, error: r.reason === "no-dollars" ? "La tesorería no tiene al menos $5 libres (fuera de comisiones pendientes)." : r.reason === "no-sol" ? "La reserva está por debajo de 0.0025 y no alcanza para pagar el cambio. Envía un poco de reserva manualmente." : "No se pudo hacer el cambio ahora. No se movió dinero." };
    try { const tg = await import("./telegram.server"); await tg.treasuryAlert(`🔄 <b>Recarga manual de tesorería</b>\n$${(Number(r.amountMicro) / 1e6).toFixed(2)} → ~${(Number(r.receivedLamports) / 1e9).toFixed(4)} SOL`); } catch { /* best-effort */ }
    return { success: true as const, amountMicro: r.amountMicro.toString(), receivedLamports: r.receivedLamports.toString(), signature: r.signature };
  });
