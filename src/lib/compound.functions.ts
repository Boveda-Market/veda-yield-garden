import { createServerFn } from "@tanstack/react-start";
import { compoundInput } from "@/lib/compound";

export const prepareRealCompound = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => compoundInput.parse(input))
  .handler(async ({ data }) => {
    const key = process.env["HELIUS_API_KEY"];
    if (!key) throw new Error("La conexión de la red no está configurada.");
    const { prepareCompound } = await import("@/lib/compound.server");
    return prepareCompound(key, data);
  });
