import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { isBtcAddress, netAmountAllowed } from "@/lib/btc-offramp";
import { solanaAddressSchema } from "@/lib/solana-data";

export const quoteBtcWithdraw = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ amount: z.string().regex(/^\d+(\.\d{1,6})?$/) }).parse(d))
  .handler(async ({ data }) => {
    if (!netAmountAllowed(Number(data.amount))) throw new Error("Monto fuera del rango permitido.");
    const { sideshiftQuote } = await import("@/lib/btc-offramp.server");
    return sideshiftQuote(data.amount);
  });

export const createBtcWithdraw = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ quoteId: z.string().uuid(), btcAddress: z.string().max(100), wallet: solanaAddressSchema }).parse(d))
  .handler(async ({ data, context }) => {
    { const { assertTradingWallet } = await import("@/lib/trade-guard.server"); await assertTradingWallet(context.privyUserId, data.wallet); }
    if (!isBtcAddress(data.btcAddress)) throw new Error("La dirección de Bitcoin no es válida.");
    const { sideshiftCreate } = await import("@/lib/btc-offramp.server");
    return sideshiftCreate(data.quoteId, data.btcAddress.trim(), data.wallet);
  });

export const btcWithdrawStatus = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ shiftId: z.string().min(4).max(64).regex(/^[\w-]+$/) }).parse(d))
  .handler(async ({ data }) => {
    const { sideshiftStatus } = await import("@/lib/btc-offramp.server");
    return sideshiftStatus(data.shiftId);
  });

/** After the user signs, remember the withdrawal so Telegram announces delivery even if the app is closed; sends the "en camino" alert now. */
export const trackBtcWithdraw = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ shiftId: z.string().min(4).max(64).regex(/^[\w-]+$/), signature: z.string().regex(/^[1-9A-HJ-NP-Za-km-z]{64,90}$/), btc: z.string().regex(/^\d{1,4}(\.\d{1,8})?$/) }).parse(d))
  .handler(async ({ data, context }): Promise<{ linked: boolean }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: link } = await supabaseAdmin.from("telegram_links").select("chat_id, alerts_enabled").eq("privy_user_id", context.privyUserId).maybeSingle();
    const linked = !!link?.chat_id && link.alerts_enabled !== false;
    try {
      // The shift must exist at the provider; this also stops made-up ids from being tracked.
      const { sideshiftStatus } = await import("@/lib/btc-offramp.server");
      const s = await sideshiftStatus(data.shiftId);
      const { error } = await supabaseAdmin.from("cashapp_withdraw_alerts").insert({ shift_id: data.shiftId, privy_user_id: context.privyUserId, signature: data.signature, btc: data.btc, status: s.status });
      if (!error && linked) {
        const tg = await import("@/lib/telegram.server");
        const { cashAppSentText } = await import("@/lib/cashapp-alerts");
        await tg.userAlert(context.privyUserId, cashAppSentText(data.btc), "withdraw", { text: "🧾 Ver comprobante", url: `https://solscan.io/tx/${data.signature}` });
      }
    } catch (e) { console.error("trackBtcWithdraw", e); }
    return { linked };
  });
