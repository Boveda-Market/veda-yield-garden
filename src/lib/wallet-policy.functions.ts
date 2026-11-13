import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getWalletPolicy = createServerFn({ method: "GET" }).handler(async () => {
  try { const { externalWalletsBlocked } = await import("./wallet-policy.server"); return { blockExternal: await externalWalletsBlocked() }; }
  catch { return { blockExternal: false }; }
});

export const setWalletPolicy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096), blockExternal: z.boolean() }).strict().parse(input))
  .handler(async ({ data }) => {
    try {
      const { payoutAdmin } = await import("./affiliate.functions");
      await payoutAdmin(data.token);
      const { setExternalWalletsBlocked } = await import("./wallet-policy.server");
      await setExternalWalletsBlocked(data.blockExternal);
      return { success: true as const };
    } catch { return { success: false as const, error: "Solo la wallet de tesorería verificada puede cambiar este ajuste." }; }
  });
