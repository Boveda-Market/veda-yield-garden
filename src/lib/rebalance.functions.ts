import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { withdrawalInput } from "@/lib/withdrawal";

const rebalanceInput = withdrawalInput.extend({ prepare: z.boolean().optional() }).strict();

/** One-signature 50/50 rebalance of an out-of-range range-vault position (simulated, owner-verified). */
export const prepareRealRebalance = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((input: unknown) => rebalanceInput.parse(input))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { heliusConnection } = await import("@/lib/solana-read.server");
    const { simulateDlmmRebalance } = await import("@/lib/dlmm.server");
    const { prepare, ...input } = data;
    return simulateDlmmRebalance(heliusConnection(key), input, { prepare: prepare === true });
  });

/** Out-of-range start times the background job recorded for these positions (public chain positions only). */
export const rangeAlertTimes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ positions: z.array(z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)).max(20) }).strict().parse(input))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    if (!data.positions.length) return {};
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { rangeKey } = await import("@/lib/dlmm");
      const db = supabaseAdmin as unknown as { from: (t: string) => any };
      const { data: rows } = await db.from("system_service_status").select("service, first_down_at").in("service", data.positions.map(rangeKey));
      return Object.fromEntries(((rows ?? []) as { service: string; first_down_at: string | null }[]).filter((r) => r.first_down_at).map((r) => [r.service.slice(6), r.first_down_at!]));
    } catch { return {}; }
  });
