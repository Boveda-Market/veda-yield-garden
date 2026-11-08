import { createServerFn } from "@tanstack/react-start";
import { withdrawalInput } from "@/lib/withdrawal";
import { prepareHarvestInput } from "@/lib/harvest";

export const simulateRealHarvest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => withdrawalInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { simulateHarvest } = await import("@/lib/harvest.server");
    return simulateHarvest(key, data);
  });

export const prepareRealHarvest = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => prepareHarvestInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { simulateHarvest } = await import("@/lib/harvest.server");
    return simulateHarvest(key, data, { prepare: true, maximumFeeRaw: data.maximumFeeRaw });
  });
