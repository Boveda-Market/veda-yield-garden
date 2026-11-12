import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { solanaAddressSchema } from "@/lib/solana-data";

const ORIGINS = ["https://bovedamarket.app", "https://www.bovedamarket.app", "https://veda-yield-garden.lovable.app"];

export const startCoinbaseSell = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ wallet: solanaAddressSchema, amount: z.string().regex(/^\d+(\.\d{1,2})?$/).optional(), origin: z.string().url() }).parse(d))
  .handler(async ({ data, context }) => {
    try {
      const { coinbaseSellUrl } = await import("@/lib/coinbase-offramp.server");
      const back = ORIGINS.includes(data.origin) ? data.origin : ORIGINS[0];
      const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
      return { success: true as const, url: await coinbaseSellUrl(data.wallet, context.privyUserId, ip, data.amount, `${back}/wallet`) };
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : "Coinbase no respondió." }; }
  });

export const coinbaseSellStatus = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .handler(async ({ context }) => {
    try {
      const { coinbasePendingSell } = await import("@/lib/coinbase-offramp.server");
      return { success: true as const, sell: await coinbasePendingSell(context.privyUserId) };
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : "Coinbase no respondió." }; }
  });

export const startCoinbaseBuy = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ wallet: solanaAddressSchema, asset: z.enum(["USDC", "SOL"]), origin: z.string().url() }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { coinbaseBuyUrl } = await import("@/lib/coinbase-offramp.server");
      const back = ORIGINS.includes(data.origin) ? data.origin : ORIGINS[0];
      const ip = getRequestHeader("cf-connecting-ip") ?? getRequestHeader("x-forwarded-for")?.split(",")[0]?.trim();
      return { success: true as const, url: await coinbaseBuyUrl(data.wallet, data.asset, ip, `${back}/wallet`) };
    } catch (e) { return { success: false as const, error: e instanceof Error ? e.message : "Coinbase no respondió." }; }
  });

/** Whether this account already completed a Coinbase onramp (unlocks the secondary card option). */
export const coinbaseOnrampStatus = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .handler(async ({ context }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.from("coinbase_onramps").select("privy_user_id").eq("privy_user_id", context.privyUserId).maybeSingle();
      return { done: !!data };
    } catch { return { done: false }; }
  });

/** Records the first confirmed Coinbase purchase for this account. */
export const recordCoinbaseOnramp = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("coinbase_onramps").upsert({ privy_user_id: context.privyUserId }, { onConflict: "privy_user_id", ignoreDuplicates: true });
    return { ok: true };
  });
