import { z } from "zod";
import { solanaAddressSchema } from "@/lib/solana-data";

export const MIN_TRANSFER_MICRO = 10_000n; // 0.01 USDC

/** Parses a user-typed USDC amount into integer micro-USDC, or null when invalid. */
export function parseUsdcMicro(input: string): bigint | null {
  const clean = input.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,6})?$/.test(clean)) return null;
  const [whole, frac = ""] = clean.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(frac.padEnd(6, "0"));
}

export const usdcTransferInput = z.object({
  from: solanaAddressSchema,
  to: solanaAddressSchema,
  amountMicro: z.string().regex(/^\d{1,15}$/),
}).strict().refine((v) => v.from !== v.to, { message: "same" })
  .refine((v) => BigInt(v.amountMicro) >= MIN_TRANSFER_MICRO, { message: "min" });
