import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAutopilotPolicy = createServerFn({ method: "GET" }).handler(async () => {
  try { const { autopilotGlobalOn } = await import("./autopilot-policy.server"); return { enabled: await autopilotGlobalOn() }; }
  catch { return { enabled: true }; }
});

export const setAutopilotPolicy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ token: z.string().min(1).max(4096), enabled: z.boolean() }).strict().parse(input))
  .handler(async ({ data }) => {
    try {
      const { payoutAdmin } = await import("./affiliate.functions");
      await payoutAdmin(data.token);
      const { setAutopilotGlobalOn } = await import("./autopilot-policy.server");
      await setAutopilotGlobalOn(data.enabled);
      return { success: true as const };
    } catch { return { success: false as const, error: "Solo la wallet de tesorería verificada puede cambiar este ajuste." }; }
  });
