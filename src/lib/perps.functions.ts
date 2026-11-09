import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { PERP_MARKETS, validLeverage, validPerpAmount } from "@/lib/perps";

const FAIL = "No se pudo preparar la operación. Inténtalo de nuevo; no se ha movido dinero.";
const key = () => process.env["HELIUS_API_KEY"];

export const getPerpPositions = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data }) => {
    try { const { listPositions } = await import("@/lib/perps.server"); return { success: true as const, positions: await listPositions(data.wallet) }; }
    catch { return { success: false as const, error: "No se pudieron leer tus posiciones." }; }
  });

const openInput = z.object({
  wallet: solanaAddressSchema,
  asset: z.enum(Object.keys(PERP_MARKETS) as ["SOL", "ETH", "BTC"]),
  side: z.enum(["long", "short"]),
  amount: z.string().regex(/^\d{1,12}$/).transform((v) => BigInt(v)).refine(validPerpAmount),
  leverage: z.number().refine(validLeverage),
}).strict();

export const preparePerpOpen = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => openInput.parse(i))
  .handler(async ({ data }) => {
    const k = key(); if (!k) return { success: false as const, error: FAIL };
    try { const { buildOpen } = await import("@/lib/perps.server"); return { success: true as const, ...(await buildOpen(k, data)) }; }
    catch (e) { console.error("[perps] open", e instanceof Error ? e.message : e); return { success: false as const, error: FAIL }; }
  });

export const preparePerpClose = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data }) => {
    const k = key(); if (!k) return { success: false as const, error: FAIL };
    try { const { buildClose } = await import("@/lib/perps.server"); return { success: true as const, ...(await buildClose(k, data)) }; }
    catch (e) { console.error("[perps] close", e instanceof Error ? e.message : e); return { success: false as const, error: FAIL }; }
  });
