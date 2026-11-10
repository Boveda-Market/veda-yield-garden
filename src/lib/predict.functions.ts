import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { MARKET_ID_RE, validPredictAmount } from "@/lib/predict";

const FAIL = "No se pudo preparar la predicción. Inténtalo de nuevo; no se ha movido dinero.";
const helius = () => process.env["HELIUS_API_KEY"];
const b64 = z.string().min(100).max(4000).regex(/^[A-Za-z0-9+/=]+$/);

export const getLiveRounds = createServerFn({ method: "GET" }).handler(async () => {
  try { const { listRounds } = await import("@/lib/predict.server"); return { success: true as const, rounds: await listRounds() }; }
  catch (e) { console.error("[predict] rounds", e instanceof Error ? e.message : e); return { success: false as const, rounds: [] }; }
});

export const getPastRounds = createServerFn({ method: "GET" }).handler(async () => {
  try { const { listPastRounds } = await import("@/lib/predict.server"); return { success: true as const, rounds: await listPastRounds() }; }
  catch (e) { console.error("[predict] past", e instanceof Error ? e.message : e); return { success: false as const, rounds: [] }; }
});

export const getPredictPositions = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data }) => {
    try { const { listPositions } = await import("@/lib/predict.server"); return { success: true as const, positions: await listPositions(data.wallet) }; }
    catch { return { success: false as const, positions: [] }; }
  });

export const preparePredictBuy = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({
    wallet: solanaAddressSchema,
    marketId: z.string().regex(MARKET_ID_RE),
    isYes: z.boolean(),
    amount: z.string().regex(/^\d{1,12}$/).transform((v) => BigInt(v)).refine(validPredictAmount),
  }).strict().parse(i))
  .handler(async ({ data }) => {
    const k = helius(); if (!k) return { success: false as const, error: FAIL };
    try { const { buildBuy } = await import("@/lib/predict.server"); return { success: true as const, ...(await buildBuy(k, data)) }; }
    catch (e) { console.error("[predict] buy", e instanceof Error ? e.message : e); return { success: false as const, error: FAIL }; }
  });

export const preparePredictSell = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data }) => {
    const k = helius(); if (!k) return { success: false as const, error: FAIL };
    try { const { buildSell } = await import("@/lib/predict.server"); return { success: true as const, ...(await buildSell(k, data)) }; }
    catch (e) { console.error("[predict] sell", e instanceof Error ? e.message : e); return { success: false as const, error: FAIL }; }
  });

export const executePredict = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema, signed: b64, context: z.string().max(8000) }).strict().parse(i))
  .handler(async ({ data }) => {
    try { const { execute } = await import("@/lib/predict.server"); return { success: true as const, signature: await execute(data.wallet, data.signed, data.context) }; }
    catch (e) { console.error("[predict] execute", e instanceof Error ? e.message : e); return { success: false as const, error: "No se pudo enviar la predicción. Revisa tu saldo e inténtalo de nuevo." }; }
  });
