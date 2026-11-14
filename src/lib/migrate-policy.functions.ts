import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getMigratePolicy = createServerFn({ method: "GET" }).handler(async () => {
  try { const { migrateAlertsEnabled } = await import("./migrate-policy.server"); return { enabled: await migrateAlertsEnabled() }; }
  catch { return { enabled: false }; }
});

export const setMigratePolicy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096), enabled: z.boolean() }).strict().parse(input))
  .handler(async ({ data }) => {
    try {
      const { payoutAdmin } = await import("./affiliate.functions");
      await payoutAdmin(data.token);
      const { setMigrateAlertsEnabled } = await import("./migrate-policy.server");
      await setMigrateAlertsEnabled(data.enabled);
      return { success: true as const };
    } catch { return { success: false as const, error: "Solo la wallet de tesorería verificada puede cambiar este ajuste." }; }
  });
