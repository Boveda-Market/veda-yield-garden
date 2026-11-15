import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";
import { MARKET_ID_RE, PREDICT_ASSETS, PREDICT_WINDOWS, validPredictAmount } from "@/lib/predict";

const FAIL = "No se pudo preparar la predicción. Inténtalo de nuevo; no se ha movido dinero.";
const helius = () => process.env["HELIUS_API_KEY"];
const b64 = z.string().min(100).max(4000).regex(/^[A-Za-z0-9+/=]+$/);

export const getLiveRounds = createServerFn({ method: "GET" }).handler(async () => {
  try { const { listRounds } = await import("@/lib/predict.server"); return { success: true as const, rounds: await listRounds() }; }
  catch (e) { console.error("[predict] rounds", e instanceof Error ? e.message : e); return { success: false as const, rounds: [] }; }
});

/** Price to beat of one live or recent round, read from Polymarket (cached server-side, so visitors cannot amplify upstream calls). */
export const getPriceToBeat = createServerFn({ method: "GET" })
  .inputValidator((i: unknown) => z.object({
    asset: z.enum(PREDICT_ASSETS),
    window: z.enum(PREDICT_WINDOWS),
    openTime: z.number().int().refine((t) => t % 300 === 0 && Math.abs(t - Date.now() / 1000) < 2 * 86_400),
  }).strict().parse(i))
  .handler(async ({ data }) => {
    try { const { priceToBeat } = await import("@/lib/price-to-beat.server"); return { success: true as const, value: await priceToBeat(data.asset, data.window, data.openTime) }; }
    catch (e) { console.error("[predict] price to beat", e instanceof Error ? e.message : e); return { success: false as const, value: null }; }
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

/** Public venue history: recent orders that did not enter their round and were refunded. */
export const getPredictRefunds = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data }) => {
    try { const { listRefunds } = await import("@/lib/predict.server"); return { success: true as const, refunds: await listRefunds(data.wallet) }; }
    catch { return { success: false as const, refunds: [] }; }
  });

/** Fill state of the caller's just-submitted order so the app never claims an entry that was refunded. */
export const getPredictOrderStatus = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((i: unknown) => z.object({ order: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data }) => {
    try { const { orderStatus } = await import("@/lib/predict.server"); return { success: true as const, state: await orderStatus(data.order) }; }
    catch { return { success: false as const, state: "pending" as const }; }
  });

export const preparePredictBuy = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((i: unknown) => z.object({
    wallet: solanaAddressSchema,
    marketId: z.string().regex(MARKET_ID_RE),
    isYes: z.boolean(),
    amount: z.string().regex(/^\d{1,12}$/).transform((v) => BigInt(v)).refine(validPredictAmount),
  }).strict().parse(i))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const k = helius(); if (!k) return { success: false as const, error: FAIL };
    try { const { buildBuy } = await import("@/lib/predict.server"); return { success: true as const, ...(await buildBuy(k, data)) }; }
    catch (e) { console.error("[predict] buy", e instanceof Error ? e.message : e); return { success: false as const, error: FAIL }; }
  });

export const preparePredictSell = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const k = helius(); if (!k) return { success: false as const, error: FAIL };
    try { const { buildSell } = await import("@/lib/predict.server"); return { success: true as const, ...(await buildSell(k, data)) }; }
    catch (e) { console.error("[predict] sell", e instanceof Error ? e.message : e); return { success: false as const, error: FAIL }; }
  });

export const preparePredictClaim = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema, position: solanaAddressSchema }).strict().parse(i))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const k = helius(); if (!k) return { success: false as const, error: "No se pudo preparar el cobro. Si ya se acreditó, el USDC está en tu wallet." };
    try { const { buildClaim } = await import("@/lib/predict.server"); return { success: true as const, ...(await buildClaim(k, data)) }; }
    catch (e) { console.error("[predict] claim", e instanceof Error ? e.message : e); return { success: false as const, error: "No se pudo preparar el cobro. Si ya se acreditó, el USDC está en tu wallet." }; }
  });

export const executePredict = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((i: unknown) => z.object({ wallet: solanaAddressSchema, signed: b64, context: z.string().max(8000) }).strict().parse(i))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    try { const { execute } = await import("@/lib/predict.server"); return { success: true as const, signature: await execute(data.wallet, data.signed, data.context) }; }
    catch (e) { console.error("[predict] execute", e instanceof Error ? e.message : e); return { success: false as const, error: "No se pudo enviar la predicción. Revisa tu saldo e inténtalo de nuevo." }; }
  });
