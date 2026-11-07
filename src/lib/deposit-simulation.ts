import { z } from "zod";
import { solanaAddressSchema, tokenAmount } from "@/lib/solana-data";

export const simulationInput = z.object({
  wallet: solanaAddressSchema,
  vaultId: z.enum(["sol", "met", "rwa"]),
  amount: z.string().regex(/^\d{1,3}(\.\d{1,6})?$/).refine((value) => Number(value) >= 1 && Number(value) <= 2, "Simula entre 1 y 2 USDC"),
}).strict();
export type SimulationInput = z.infer<typeof simulationInput>;
export type SimulationStage = "pool" | "jupiter" | "composition" | "simulation";
export type SimulationResult = {
  success: boolean;
  stage: SimulationStage;
  message: string;
  gross: string;
  fee: string;
  net: string;
  sent: false;
  bytes?: number | undefined;
  units?: number | undefined;
  slot?: number;
  checks?: { fee: boolean; position: boolean };
};

export function simulationAmounts(amount: string) {
  if (!/^\d{1,3}(\.\d{1,6})?$/.test(amount)) throw new Error("Importe inválido");
  const [whole, fraction = ""] = amount.split(".");
  if (!whole) throw new Error("Importe inválido");
  const gross = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (gross < 1_000_000n || gross > 2_000_000n) throw new Error("Simula entre 1 y 2 USDC");
  const fee = gross / 100n;
  return { gross, fee, net: gross - fee };
}

export function simulationDisplay(amount: string) {
  const values = simulationAmounts(amount);
  return { gross: tokenAmount(values.gross.toString(), 6), fee: tokenAmount(values.fee.toString(), 6), net: tokenAmount(values.net.toString(), 6) };
}