import { z } from "zod";
import { solanaAddressSchema, tokenAmount } from "@/lib/solana-data";
import { depositFee } from "@/lib/fees";

export const MIN_DEPOSIT_USDC = 1;
export const MAX_DEPOSIT_USDC = 10_000;
export const depositAmountSchema = z.string().regex(/^\d{1,5}(\.\d{1,6})?$/).refine((value) => Number(value) >= MIN_DEPOSIT_USDC && Number(value) <= MAX_DEPOSIT_USDC, "Introduce entre 1 y 10,000 USDC");

export const simulationInput = z.object({
  wallet: solanaAddressSchema,
  vaultId: z.enum(["sol", "met", "rwa"]),
  amount: depositAmountSchema,
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
  depositAmountSchema.parse(amount);
  const [whole, fraction = ""] = amount.split(".");
  if (!whole) throw new Error("Importe inválido");
  const gross = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (gross < 1_000_000n || gross > 10_000_000_000n) throw new Error("Introduce entre 1 y 10,000 USDC");
  const fee = depositFee(gross);
  return { gross, fee, net: gross - fee };
}

export function simulationDisplay(amount: string) {
  const values = simulationAmounts(amount);
  return { gross: tokenAmount(values.gross.toString(), 6), fee: tokenAmount(values.fee.toString(), 6), net: tokenAmount(values.net.toString(), 6) };
}