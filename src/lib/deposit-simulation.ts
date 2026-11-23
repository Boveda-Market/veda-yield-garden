import { z } from "zod";
import { solanaAddressSchema, tokenAmount } from "@/lib/solana-data";
import { depositFee } from "@/lib/fees";

export const MIN_DEPOSIT_USDC = 1;
export const MAX_DEPOSIT_USDC = 5_000;
export const depositAmountSchema = z.string().regex(/^\d{1,5}(\.\d{1,6})?$/).refine((value) => Number(value) >= MIN_DEPOSIT_USDC && Number(value) <= MAX_DEPOSIT_USDC, "Introduce entre 1 y 5,000 USDC");

export const simulationInput = z.object({
  wallet: solanaAddressSchema,
  vaultId: z.enum(["sol", "met", "gta6", "dcty", "trump", "btc"]),
  amount: depositAmountSchema,
  position: solanaAddressSchema.optional(),
  /** Moving between vaults: no Bóveda Market entry fee. */
  migrate: z.literal(true).optional(),
}).strict();
export type SimulationInput = z.infer<typeof simulationInput>;
/** "reserve": the wallet lacks the refundable network guarantee a range-based vault needs to open a position. */
export type SimulationStage = "pool" | "reserve" | "jupiter" | "composition" | "simulation";
export type SimulationResult = {
  success: boolean;
  stage: SimulationStage;
  message: string;
  /** The existing position is out of range: re-centre it first, then deposit. */
  outOfRange?: boolean;
  /** The wallet already has this vault open: deposit into that position instead of opening a duplicate. */
  existingPosition?: string;
  gross: string;
  fee: string;
  net: string;
  sent: false;
  bytes?: number | undefined;
  units?: number | undefined;
  slot?: number;
  checks?: { fee: boolean; position: boolean };
};

export function simulationAmounts(amount: string, migrate = false) {
  depositAmountSchema.parse(amount);
  const [whole, fraction = ""] = amount.split(".");
  if (!whole) throw new Error("Importe inválido");
  const gross = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
  if (gross < 1_000_000n || gross > 5_000_000_000n) throw new Error("Introduce entre 1 y 5,000 USDC");
  const fee = migrate ? 0n : depositFee(gross);
  return { gross, fee, net: gross - fee };
}

export function simulationDisplay(amount: string, migrate = false) {
  const values = simulationAmounts(amount, migrate);
  return { gross: tokenAmount(values.gross.toString(), 6), fee: tokenAmount(values.fee.toString(), 6), net: tokenAmount(values.net.toString(), 6) };
}
/** One position per vault: the open (unlocked) position a new deposit or move must add to, if any. */
export function openVaultPosition(positions: readonly { address: string; vaultId: string; locked?: boolean }[], vaultId: string): string | null {
  return positions.find((p) => p.vaultId === vaultId && !p.locked)?.address ?? null;
}
