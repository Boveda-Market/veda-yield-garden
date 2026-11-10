import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requirePrivyAuth } from "@/lib/privy-auth.middleware";
import { amountAllowed, isBtcAddress } from "@/lib/btc-offramp";
import { solanaAddressSchema } from "@/lib/solana-data";

export const quoteBtcWithdraw = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ amount: z.string().regex(/^\d+(\.\d{1,6})?$/) }).parse(d))
  .handler(async ({ data }) => {
    if (!amountAllowed(Number(data.amount))) throw new Error("Monto fuera del rango permitido.");
    const { sideshiftQuote } = await import("@/lib/btc-offramp.server");
    return sideshiftQuote(data.amount);
  });

export const createBtcWithdraw = createServerFn({ method: "POST" })
  .middleware([requirePrivyAuth])
  .inputValidator((d) => z.object({ quoteId: z.string().uuid(), btcAddress: z.string().max(100), wallet: solanaAddressSchema }).parse(d))
  .handler(async ({ data }) => {
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
