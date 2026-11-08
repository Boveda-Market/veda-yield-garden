import { createServerFn } from "@tanstack/react-start";
import { movementReviewInput, sanitizeFlags, type MovementReviewResult } from "./movement-review";

const instructions = "Eres un revisor de riesgos para una app de ahorro. Recibes depósitos (deposit) y retiros (withdraw) de UNA persona, con bóveda, monto y fecha en milisegundos. Marca solo los que se salgan claramente del patrón habitual de esa persona: montos mucho mayores o menores que lo normal, varios movimientos muy seguidos, retiro poco después de depositar, o retiro mayor que lo depositado. Si hay pocos movimientos o todo parece normal, no marques nada. La razón debe ser breve (máx. 15 palabras), en español sencillo, sin jerga técnica ni nombres de redes. No des consejos financieros.";

export const reviewVaultMovements = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => movementReviewInput.parse(input))
  .handler(async ({ data }): Promise<MovementReviewResult> => {
    try {
      const { generateResponse } = await import("@lovable.dev/ai-gateway");
      const response = await generateResponse({
        model: "openai/gpt-6-astra",
        instructions,
        input: [{ role: "user", content: JSON.stringify(data.movements) }],
        text: { format: { type: "json_schema", name: "movement_flags", strict: true, schema: {
          type: "object", additionalProperties: false, required: ["flags"],
          properties: { flags: { type: "array", items: { type: "object", additionalProperties: false, required: ["id", "reason"], properties: { id: { type: "string" }, reason: { type: "string" } } } } },
        } } },
      });
      const text = (response.output ?? []).flatMap((item) => item.type === "message" ? item.content : []).map((part) => part.type === "output_text" ? part.text : "").join("");
      return { success: true, flags: sanitizeFlags(JSON.parse(text || "{}"), data.movements) };
    } catch (error) {
      console.error("movement review failed", error instanceof Error ? error.name : "unknown");
      return { success: false, error: "No pudimos revisar tus movimientos ahora. Inténtalo más tarde." };
    }
  });
